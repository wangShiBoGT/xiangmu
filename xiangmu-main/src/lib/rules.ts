/** 规则引擎（Observation Rules，F2）：条件 + 标注，作用在真实 trace 上。
 *  纯函数确定性触发，无 AI 参与——ESLint/Wireshark 过滤器模式。
 *  可解释性铁律：每条标注必须能给出规则 ID、阈值与该步实际数值。 */

import type { TokenStep } from "./trace";

export type RuleOp = ">" | "<" | ">=" | "<=" | "==" | "!=";

export interface RuleCondition {
  /** 可用字段：entropy / prob / dt / rank(0=top-1) / topProb / dtMedianRatio */
  field: string;
  op: RuleOp;
  value: number;
}

export interface Rule {
  id: string;
  scope: "step" | "window" | "trace";
  /** AND 组合；scope=window 时要求窗口内每一步都满足 */
  when: RuleCondition[];
  window?: { size: number };
  /** scope=trace 的特例：重复 n-gram 检测（DSL 表达不了的内置能力） */
  ngram?: { n: number; times: number };
  annotate: { label: string; severity: "info" | "warn"; explain: string };
  enabled: boolean;
}

/** 一次规则命中：标注在 [from, to] 闭区间的 token 上 */
export interface RuleMatch {
  ruleId: string;
  label: string;
  severity: "info" | "warn";
  from: number;
  to: number;
  explain: string;
  /** 可解释性：字段 / 阈值 / 实际值 */
  values: { field: string; op: RuleOp; threshold: number; actual: number }[];
}

/** 内置官方规则集 Core Rules v1（产品观点输出） */
export const CORE_RULES: Rule[] = [
  {
    id: "core/high-entropy",
    scope: "step",
    when: [{ field: "entropy", op: ">", value: 2.5 }],
    annotate: {
      label: "高不确定性步",
      severity: "warn",
      explain: "该步候选分布的熵为 {entropy}，分布明显分散（输出不确定性较高）",
    },
    enabled: true,
  },
  {
    id: "core/long-tail",
    scope: "step",
    when: [{ field: "prob", op: "<", value: 0.05 }],
    annotate: {
      label: "长尾采样",
      severity: "warn",
      explain: "被选中 token 的真实概率仅 {prob}，来自分布长尾",
    },
    enabled: true,
  },
  {
    id: "core/on-rails",
    scope: "window",
    window: { size: 12 },
    when: [
      { field: "rank", op: "==", value: 0 },
      { field: "prob", op: ">", value: 0.9 },
    ],
    annotate: {
      label: "模型在背书",
      severity: "info",
      explain: "连续 12 步都以 >90% 概率选 top-1，模型没有做选择",
    },
    enabled: true,
  },
  {
    id: "core/loop-suspect",
    scope: "trace",
    when: [],
    ngram: { n: 3, times: 3 },
    annotate: {
      label: "疑似复读",
      severity: "warn",
      explain: "3-gram 在文中重复出现 ≥3 次，疑似进入复读循环",
    },
    enabled: true,
  },
  {
    id: "core/slow-step",
    scope: "step",
    // 双条件：相对中位数 ×3 且绝对耗时 >250ms——WebGPU 批量回报时大量步 dt≈0，
    // 仅用相对比值会把半数步误报成慢步
    when: [
      { field: "dtMedianRatio", op: ">", value: 3 },
      { field: "dt", op: ">", value: 250 },
    ],
    annotate: {
      label: "异常慢步",
      severity: "info",
      explain: "该步耗时 {dt}ms，是本次生成中位数的 {dtMedianRatio} 倍",
    },
    enabled: true,
  },
];

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** 取某步的规则字段实际值（全部来自真实 trace） */
export function fieldValue(
  step: TokenStep,
  field: string,
  ctx: { dtMedian: number },
): number | null {
  switch (field) {
    case "entropy":
      return step.entropy;
    case "prob":
      return step.prob;
    case "dt":
      return step.dt;
    case "rank": {
      const r = step.topk.findIndex((c) => c.id === step.id);
      return r >= 0 ? r : step.topk.length;
    }
    case "topProb":
      return step.topk[0]?.prob ?? 0;
    case "dtMedianRatio":
      return ctx.dtMedian > 0 ? step.dt / ctx.dtMedian : 0;
    default:
      return null;
  }
}

function cmp(a: number, op: RuleOp, b: number): boolean {
  switch (op) {
    case ">":
      return a > b;
    case "<":
      return a < b;
    case ">=":
      return a >= b;
    case "<=":
      return a <= b;
    case "==":
      return a === b;
    case "!=":
      return a !== b;
  }
}

const FIELDS = ["entropy", "prob", "dt", "rank", "topProb", "dtMedianRatio"];
const OPS: RuleOp[] = [">", "<", ">=", "<=", "==", "!="];

/** 校验一条规则（自定义 JSON 编辑器的即时校验用）；合法返回 null，否则返回人话错误 */
export function validateRule(r: unknown): string | null {
  if (typeof r !== "object" || r === null) return "规则必须是对象";
  const o = r as Record<string, unknown>;
  if (typeof o.id !== "string" || !o.id) return "缺少字符串 id";
  if (o.scope !== "step" && o.scope !== "window" && o.scope !== "trace")
    return `scope 必须是 step/window/trace（${o.id}）`;
  if (!Array.isArray(o.when)) return `when 必须是数组（${o.id}）`;
  for (const c of o.when as unknown[]) {
    const cc = c as Record<string, unknown>;
    if (typeof cc?.field !== "string" || !FIELDS.includes(cc.field))
      return `when.field 必须是 ${FIELDS.join("/")}（${o.id}）`;
    if (!OPS.includes(cc.op as RuleOp)) return `when.op 非法（${o.id}）`;
    if (typeof cc.value !== "number") return `when.value 必须是数字（${o.id}）`;
  }
  if (o.scope === "window") {
    const w = o.window as Record<string, unknown> | undefined;
    if (typeof w?.size !== "number" || w.size < 2)
      return `scope=window 需要 window.size ≥ 2（${o.id}）`;
  }
  const a = o.annotate as Record<string, unknown> | undefined;
  if (typeof a?.label !== "string" || !a.label)
    return `缺少 annotate.label（${o.id}）`;
  if (a.severity !== "info" && a.severity !== "warn")
    return `annotate.severity 必须是 info/warn（${o.id}）`;
  if (typeof a.explain !== "string") return `缺少 annotate.explain（${o.id}）`;
  if (typeof o.enabled !== "boolean") return `缺少 enabled（${o.id}）`;
  return null;
}

export function validateRuleset(rs: unknown): string | null {
  if (!Array.isArray(rs)) return "规则集必须是数组";
  const seen = new Set<string>();
  for (const r of rs) {
    const err = validateRule(r);
    if (err) return err;
    const id = (r as Rule).id;
    if (seen.has(id)) return `重复的规则 id：${id}`;
    seen.add(id);
  }
  return null;
}

function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(v < 0.1 ? 3 : 2);
}

function interpolate(
  tpl: string,
  values: RuleMatch["values"],
): string {
  return tpl.replace(/\{(\w+)\}/g, (m, f: string) => {
    const hit = values.find((v) => v.field === f);
    return hit ? fmt(hit.actual) : m;
  });
}

/** 在 token 流上求值全部启用规则（生成中增量、生成后全量都调它，纯函数） */
export function evaluateRules(
  steps: TokenStep[],
  rules: Rule[],
): RuleMatch[] {
  const out: RuleMatch[] = [];
  const dtMedian = median(steps.filter((s) => s.dt > 0).map((s) => s.dt));
  const ctx = { dtMedian };

  for (const rule of rules) {
    if (!rule.enabled) continue;

    if (rule.scope === "step") {
      for (let i = 0; i < steps.length; i++) {
        const values = rule.when.map((c) => ({
          field: c.field,
          op: c.op,
          threshold: c.value,
          actual: fieldValue(steps[i], c.field, ctx) ?? NaN,
        }));
        if (
          values.length > 0 &&
          values.every((v) => !Number.isNaN(v.actual) && cmp(v.actual, v.op, v.threshold))
        ) {
          out.push({
            ruleId: rule.id,
            label: rule.annotate.label,
            severity: rule.annotate.severity,
            from: i,
            to: i,
            explain: interpolate(rule.annotate.explain, values),
            values,
          });
        }
      }
    } else if (rule.scope === "window" && rule.window) {
      const size = rule.window.size;
      let runStart = -1;
      for (let i = 0; i <= steps.length; i++) {
        const ok =
          i < steps.length &&
          rule.when.every((c) => {
            const v = fieldValue(steps[i], c.field, ctx);
            return v !== null && cmp(v, c.op, c.value);
          });
        if (ok && runStart < 0) runStart = i;
        if (!ok && runStart >= 0) {
          if (i - runStart >= size) {
            const last = steps[i - 1];
            const values = rule.when.map((c) => ({
              field: c.field,
              op: c.op,
              threshold: c.value,
              actual: fieldValue(last, c.field, ctx) ?? NaN,
            }));
            out.push({
              ruleId: rule.id,
              label: rule.annotate.label,
              severity: rule.annotate.severity,
              from: runStart,
              to: i - 1,
              explain: interpolate(rule.annotate.explain, values),
              values,
            });
          }
          runStart = -1;
        }
      }
    } else if (rule.scope === "trace" && rule.ngram) {
      const { n, times } = rule.ngram;
      const seen = new Map<string, number[]>();
      for (let i = 0; i + n <= steps.length; i++) {
        const key = steps
          .slice(i, i + n)
          .map((s) => s.id)
          .join(",");
        const list = seen.get(key) ?? [];
        list.push(i);
        seen.set(key, list);
      }
      for (const [, starts] of seen) {
        // 去掉重叠出现（复读判定要求独立重复）
        const kept: number[] = [];
        for (const s of starts) {
          if (kept.length === 0 || s >= kept[kept.length - 1] + n) kept.push(s);
        }
        if (kept.length >= times) {
          const values = [
            { field: "repeats", op: ">=" as RuleOp, threshold: times, actual: kept.length },
          ];
          for (const s of kept) {
            out.push({
              ruleId: rule.id,
              label: rule.annotate.label,
              severity: rule.annotate.severity,
              from: s,
              to: s + n - 1,
              explain: `${interpolate(rule.annotate.explain, values)}（共出现 ${kept.length} 次）`,
              values,
            });
          }
        }
      }
    }
  }
  return out;
}

/** 按 token 位置索引命中（正文渲染用）：index → 覆盖该位置的所有命中 */
export function matchesByToken(
  matches: RuleMatch[],
  length: number,
): RuleMatch[][] {
  const byToken: RuleMatch[][] = Array.from({ length }, () => []);
  for (const m of matches) {
    for (let i = m.from; i <= m.to && i < length; i++) byToken[i].push(m);
  }
  return byToken;
}
