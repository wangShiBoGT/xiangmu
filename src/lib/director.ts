/** 导演系统（Director）：给每一步真实生成分配一个「场面等级」。
 *  节奏原则：一直爆就是没有爆——一次回答只保留少数大场面，其余安静打印。
 *  判定全部来自 trace 真实字段（熵 / top-2 差距），与犹豫点口径同源，无随机、无美化。 */

import { entropyLevel, type TokenStep } from "./trace";

/** 场面等级：
 *  plain  —— 分布集中，直接打印（无动画，仅轻微淡入）
 *  flow   —— 分布开始分散，轻量高光流过
 *  birth  —— 真实犹豫点（熵高或 top-2 接近），进入 Birth Scene 大动画
 *  storm  —— 连续多步犹豫，整段升级为 Particle Storm */
export type SceneLevel = "plain" | "flow" | "birth" | "storm";

export interface DirectorOptions {
  /** entropyLevel ≥ 此值进入 flow（默认 0.3） */
  flowAt?: number;
  /** entropyLevel ≥ 此值成为 birth 候选（默认 0.7） */
  birthAt?: number;
  /** top-2 概率差 < 此值也成为 birth 候选（与 closeSteps 犹豫点同口径，默认 0.05） */
  closeGap?: number;
  /** 两次大场面（birth/storm）之间的最小步距：预算约束，超频降级为 flow（默认 12） */
  cooldown?: number;
  /** 连续 birth 候选达到此步数，整段升级 storm（默认 3） */
  stormRun?: number;
}

const DEFAULTS: Required<DirectorOptions> = {
  flowAt: 0.3,
  birthAt: 0.7,
  closeGap: 0.05,
  cooldown: 12,
  stormRun: 3,
};

/** 单步是否为 birth 候选：熵档位够高，或 top-2 差距小于犹豫点阈值 */
function isBirthCandidate(
  s: Pick<TokenStep, "entropy" | "topk">,
  o: Required<DirectorOptions>,
): boolean {
  if (entropyLevel(s.entropy) >= o.birthAt) return true;
  const tk = s.topk;
  if (tk.length >= 2 && tk[0].prob > 0.05 && tk[0].prob - tk[1].prob < o.closeGap)
    return true;
  return false;
}

/** 为整段 steps 排片：返回与 steps 等长的场面等级数组。
 *  纯函数、O(n)，生成中可随增量重算（前缀结果稳定：只依赖历史，不依赖未来之后的步）。 */
export function directScenes(
  steps: Pick<TokenStep, "entropy" | "topk">[],
  opts?: DirectorOptions,
): SceneLevel[] {
  const o = { ...DEFAULTS, ...opts };
  const n = steps.length;
  const out: SceneLevel[] = new Array(n);
  // 上一次大场面（birth/storm）最后一步的序号；-Infinity 表示尚未有大场面
  let lastBig = -Infinity;
  let i = 0;
  while (i < n) {
    const s = steps[i];
    if (!isBirthCandidate(s, o)) {
      out[i] = entropyLevel(s.entropy) >= o.flowAt ? "flow" : "plain";
      i++;
      continue;
    }
    // 向后数连续 birth 候选长度
    let j = i;
    while (j < n && isBirthCandidate(steps[j], o)) j++;
    const runLen = j - i;
    const allowed = i - lastBig >= o.cooldown;
    if (runLen >= o.stormRun && allowed) {
      for (let k = i; k < j; k++) out[k] = "storm";
      lastBig = j - 1;
    } else if (allowed) {
      out[i] = "birth";
      lastBig = i;
      for (let k = i + 1; k < j; k++) out[k] = "flow";
    } else {
      // 预算内已有大场面：降级为 flow，保持节奏
      for (let k = i; k < j; k++) out[k] = "flow";
    }
    i = j;
  }
  return out;
}

/** 大场面统计（按场景数计，storm 连续段算一场）：用于诚实标注与预算自检 */
export function sceneStats(levels: SceneLevel[]): {
  birth: number;
  storm: number;
  flow: number;
} {
  let birth = 0;
  let storm = 0;
  let flow = 0;
  for (let i = 0; i < levels.length; i++) {
    if (levels[i] === "birth") birth++;
    else if (levels[i] === "flow") flow++;
    else if (levels[i] === "storm" && (i === 0 || levels[i - 1] !== "storm"))
      storm++;
  }
  return { birth, storm, flow };
}
