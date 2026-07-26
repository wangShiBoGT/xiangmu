/** 思考字幕（Sprint 6）：每一步生成一条电影字幕式的人话翻译。
 *  每个模板都有触发条件与字段依据（概率 / 差距 / 温度 / rank），禁止无依据措辞；
 *  与此刻卡同源（closeSteps 犹豫口径、explainStep 高集中口径），读数必然一致。 */

import type { TokenStep } from "./trace";

/** 「一次抽签决定走向」阈值：top-1 与 top-2 差距 < 2% */
export const COIN_FLIP_GAP = 0.02;
/** 「几乎没有悬念」阈值 */
export const RUNAWAY_PROB = 0.9;

export interface Caption {
  text: string;
  /** 等宽元数据行：step / 熵 / top-2 差距（差距缺失时为 null） */
  meta: { step: number; entropy: number; gap: number | null };
}

const t = (s: string) => s.trim() || "␣";
const pc = (p: number) => `${(p * 100).toFixed(p >= 0.1 ? 0 : 1)}%`;

export function thinkingCaption(
  steps: TokenStep[],
  index: number,
  temperature: number,
): Caption | null {
  const step = steps[index];
  if (!step) return null;
  const top = step.topk;
  const gap = top.length >= 2 ? top[0].prob - top[1].prob : null;
  const meta = { step: index + 1, entropy: step.entropy, gap };
  const rank = top.findIndex((c) => c.id === step.id);

  let text: string;
  if (temperature === 0) {
    text = `贪心模式：没有抽签，永远选第一名「${t(step.text)}」（${pc(step.prob)}）`;
  } else if (gap !== null && gap < COIN_FLIP_GAP) {
    text = `「${t(top[0].text)}」和「${t(top[1].text)}」只差 ${(gap * 100).toFixed(1)}%，一次抽签决定走向`;
  } else if (rank > 0) {
    text = `温度 ${temperature} 让它没选第一名，抽中了第 ${rank + 1} 名「${t(step.text)}」（${pc(step.prob)}）`;
  } else if (step.prob >= RUNAWAY_PROB) {
    text = `一路领先：「${t(step.text)}」独占 ${pc(step.prob)}，几乎没有悬念`;
  } else if (gap !== null && gap < 0.05) {
    text = `它在「${t(top[0].text)}」（${pc(top[0].prob)}）和「${t(top[1].text)}」（${pc(top[1].prob)}）之间犹豫`;
  } else {
    text = `前几名有竞争，这次抽中了「${t(step.text)}」（${pc(step.prob)}）`;
  }
  return { text, meta };
}
