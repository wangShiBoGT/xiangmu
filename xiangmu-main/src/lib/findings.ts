/** Findings：从长期实验存档中提出可验证的现象（Evidence Field 的数据层）。
 *  只允许四类证据化发现：首次分叉 / 候选分布异常 / 规则事件 / 性能变化，
 *  外加「完全一致」（分叉的零情形）。每条发现都携带 recIds + step + source
 *  字段路径，可一跳回真实 trace 核验；比较类发现只在严格可比较组内产生。 */

import {
  compatKey,
  firstDivergence,
  type ExperimentRecord,
} from "./experiments";
import { getModel } from "./models";
import { CORE_RULES, evaluateRules } from "./rules";

export interface Finding {
  /** 稳定 key：同一现象不重复提示 */
  key: string;
  kind: "divergence" | "reproducible" | "distribution" | "rule" | "performance";
  title: string;
  detail: string;
  /** 涉及的实验记录 id（1 条 = 查看，2 条 = 对比） */
  recIds: string[];
  /** 相关步骤（0-based），如分叉步或最高熵步 */
  step?: number;
  /** 证据的原始字段路径，如 steps[30].entropy */
  source: string;
}

function modelName(id: string): string {
  return getModel(id)?.name ?? id;
}

function clip(s: string, n = 30): string {
  return `${s.slice(0, n)}${s.length > n ? "…" : ""}`;
}

/** 从存档计算发现列表（纯函数，按价值排序）。 */
export function computeFindings(records: ExperimentRecord[]): Finding[] {
  const findings: Finding[] = [];
  const sorted = [...records].sort((a, b) => a.createdAt - b.createdAt);

  // 1) 首次分叉 / 完全一致：只在严格可比较组（同模型·prompt·参数·后端）内比较
  const byGroup = new Map<string, ExperimentRecord[]>();
  for (const r of sorted) {
    const k = compatKey(r);
    const list = byGroup.get(k) ?? [];
    list.push(r);
    byGroup.set(k, list);
  }
  for (const runs of byGroup.values()) {
    if (runs.length < 2) continue;
    const a = runs[runs.length - 2];
    const b = runs[runs.length - 1];
    const at = firstDivergence(
      a.root.trace?.steps ?? [],
      b.root.trace?.steps ?? [],
    );
    if (at < 0) {
      findings.push({
        key: `same:${a.id}:${b.id}`,
        kind: "reproducible",
        title: "两次可比较运行 token 序列完全一致",
        detail: `「${clip(a.prompt)}」在相同模型·参数·后端下的最近两次运行输出逐 token 相同（${modelName(a.modelId)}，seed ${a.seed ?? "—"} / ${b.seed ?? "—"}）。`,
        recIds: [a.id, b.id],
        source: "steps[].id（两条 run 逐位对齐）",
      });
    } else {
      const cause = a.seed !== b.seed ? `seed ${a.seed ?? "—"} 与 ${b.seed ?? "—"}` : "相同配置（采样随机性）";
      findings.push({
        key: `div:${a.id}:${b.id}`,
        kind: "divergence",
        title: `同一可比较组从第 ${at + 1} 步首次选中不同 token`,
        detail: `「${clip(a.prompt)}」（${modelName(a.modelId)}，${cause}）的两次运行共享前 ${at} 步前缀，第 ${at + 1} 步起走上不同路径。`,
        recIds: [a.id, b.id],
        step: at,
        source: `steps[${at}].id ≠ steps[${at}].id`,
      });
    }

    // 4) 性能变化：完全相同条件下 tok/s 相对差异 > 15%
    if (
      a.stats.avgTps !== null &&
      b.stats.avgTps !== null &&
      a.stats.avgTps > 0
    ) {
      const rel = Math.abs(b.stats.avgTps - a.stats.avgTps) / a.stats.avgTps;
      if (rel > 0.15) {
        findings.push({
          key: `perf:${a.id}:${b.id}`,
          kind: "performance",
          title: `相同条件下解码速度相差 ${(rel * 100).toFixed(0)}%`,
          detail: `「${clip(a.prompt)}」两次可比较运行的实测速度为 ${a.stats.avgTps.toFixed(1)} 与 ${b.stats.avgTps.toFixed(1)} tok/s（同模型·参数·后端，本机测量）。`,
          recIds: [a.id, b.id],
          source: "steps[].dt（逐 token 实测耗时）",
        });
      }
    }
  }

  // 2) 候选分布异常：平均熵最高的 run + 其组内百分位定位的峰值步
  if (sorted.length >= 2) {
    let worst: ExperimentRecord | null = null;
    for (const r of sorted) {
      if (r.stats.tokens === 0) continue;
      if (!worst || r.stats.avgEntropy > worst.stats.avgEntropy) worst = r;
    }
    if (worst) {
      const steps = worst.root.trace?.steps ?? [];
      let peak = -1;
      let best = -Infinity;
      steps.forEach((s, i) => {
        if (s.entropy > best) {
          best = s.entropy;
          peak = i;
        }
      });
      const below = steps.filter((s) => s.entropy < best).length;
      const pct = steps.length > 1 ? Math.round((below / (steps.length - 1)) * 100) : 100;
      findings.push({
        key: `dist:${worst.id}`,
        kind: "distribution",
        title: "已记录 Top-k 候选分布最分散的一次生成",
        detail: `「${clip(worst.prompt)}」平均熵 ${worst.stats.avgEntropy.toFixed(2)} nats 为全部存档最高${peak >= 0 ? `；第 ${peak + 1} 步熵 ${best.toFixed(2)} nats，位于该 run 的第 ${pct} 百分位` : ""}（记录范围内的描述统计，非全词表结论）。`,
        recIds: [worst.id],
        step: peak >= 0 ? peak : undefined,
        source: peak >= 0 ? `steps[${peak}].entropy` : "steps[].entropy",
      });
    }
  }

  // 3) 规则事件：内置/随档规则在最近 run 上的可回溯命中
  const recent = sorted.slice(-3);
  for (const r of recent) {
    const steps = r.root.trace?.steps ?? [];
    if (steps.length === 0) continue;
    const matches = evaluateRules(steps, r.ruleset ?? CORE_RULES);
    if (matches.length === 0) continue;
    const first = matches.reduce((m, x) => (x.from < m.from ? x : m));
    findings.push({
      key: `rule:${r.id}`,
      kind: "rule",
      title: `规则命中 ${matches.length} 处：首处「${first.label}」在第 ${first.from + 1} 步`,
      detail: `「${clip(r.prompt)}」的 trace 上有 ${matches.length} 处可回溯规则命中；${first.explain}`,
      recIds: [r.id],
      step: first.from,
      source: `rule ${first.ruleId} → steps[${first.from}..${first.to}]`,
    });
  }

  return findings;
}

const SEEN_KEY = "findings-seen-v1";

export function loadSeenFindings(storage: Pick<Storage, "getItem">): Set<string> {
  try {
    const raw = storage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export function saveSeenFindings(
  storage: Pick<Storage, "setItem">,
  keys: Iterable<string>,
): void {
  storage.setItem(SEEN_KEY, JSON.stringify([...keys]));
}

export function unreadCount(findings: Finding[], seen: Set<string>): number {
  return findings.filter((f) => !seen.has(f.key)).length;
}
