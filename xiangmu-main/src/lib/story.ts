/** Story Engine（ACDL Sprint 3，模板见 docs/design-language/04-story.md）：
 *  Moment → 一句人话。全部为确定性规则模板 + 真实字段填空：
 *  不用 LLM 生成叙事、无随机数；同一 trace 永远得到同一批 Story；
 *  每条 Story 通过 momentRef 回链到 Moment（进而回链 trace step）。 */

import type { Moment } from "./moments";

export interface Story {
  /** 对应 moments 数组下标（Moment 自带 index 回链 trace step） */
  momentRef: number;
  /** 人话一句（真实 token 原文 + 真实读数填空） */
  text: string;
  /** 含义层（证据口径），可下钻时展示 */
  meaning?: string;
  /** 对应视觉语法（birth/branch/collapse/flow） */
  grammar: "birth" | "branch" | "collapse" | "flow";
}

const pct = (p: number) => `${(p * 100).toFixed(1)}%`;
const sec = (ms: number) => `${(ms / 1000).toFixed(1)} 秒`;

/** 单个 Moment → Story（纯函数，确定性） */
export function storyOf(moment: Moment, momentRef: number): Story {
  switch (moment.kind) {
    case "coinflip":
      return {
        momentRef,
        text: `它差一点写了「${moment.loser}」，最后写下了「${moment.winner}」`,
        meaning: `top-2 差距仅 ${pct(moment.gap)}（「${moment.winner}」${pct(moment.winnerProb)} 对「${moment.loser}」${pct(moment.loserProb)}），几乎并列 · 口径 P(vocab)`,
        grammar: "collapse",
      };
    case "temp_override":
      return {
        momentRef,
        text: `它没有写最有把握的「${moment.rank1}」，写了「${moment.chosen}」`,
        meaning: `${
          moment.temperature != null ? `温度 ${moment.temperature} ` : "抽签"
        }抽中第 ${moment.rank} 名（${pct(moment.chosenProb)}），第一名「${moment.rank1}」${pct(moment.rank1Prob)} · 采样自完整 softmax 分布`,
        grammar: "branch",
      };
    case "scattered":
      return {
        momentRef,
        text: `写这个词之前，它同时想到了 ${moment.candidateCount} 种写法`,
        meaning: `熵 ${moment.entropy.toFixed(2)} nats（全量 softmax），最终写下「${moment.chosen}」`,
        grammar: "birth",
      };
    case "slow":
      return {
        momentRef,
        text: `写「${moment.token}」这一步，它用了平时 ${moment.factor.toFixed(1)} 倍的时间`,
        meaning: `本步 ${moment.dtMs.toFixed(0)} ms · 全程均值 ${moment.meanMs.toFixed(0)} ms`,
        grammar: "flow",
      };
    case "retrieval":
      return moment.ok
        ? {
            momentRef,
            text: `它先去搜了「${moment.query}」，把 ${moment.resultCount} 篇里的 ${moment.keptCount} 篇读进了上下文`,
            meaning: `真实联网检索 · 实测 ${sec(moment.durationMs)} · 取舍全部记入 trace`,
            grammar: "flow",
          }
        : {
            momentRef,
            text: `它去搜了「${moment.query}」但没搜到，这次只能靠自己已有的知识`,
            meaning: `检索失败（如实入档）：${moment.error ?? "错误原文未记录"}`,
            grammar: "flow",
          };
    case "plan":
      return moment.ok
        ? {
            momentRef,
            text: `动笔前，它先给自己写了一份 ${moment.chars} 字的计划`,
            meaning: `${moment.planner ? `规划模型 ${moment.planner} · ` : ""}实测 ${sec(moment.durationMs)} · 计划原文在 trace 里`,
            grammar: "flow",
          }
        : {
            momentRef,
            text: `它想先写一份计划，但这一步失败了，只好直接开写`,
            meaning: `规划失败（如实入档）：${moment.error ?? "错误原文未记录"}`,
            grammar: "flow",
          };
  }
}

/** 整批 Moment → Story（顺序与输入一致，确定性） */
export function storiesFrom(moments: Moment[]): Story[] {
  return moments.map((m, i) => storyOf(m, i));
}
