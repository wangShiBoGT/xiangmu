/** 理解层四幕旅程的数据源：一份由「理解层演示模型」离线实测生成的真实记录。
 *  英文 = distilgpt2，中文 = UER GPT2-distil；注意力 = 最后一层各头平均、
 *  对 prompt 段归一化。明确标注这是演示模型的真实内部数据，
 *  不冒充当前主聊天模型；主模型 trace 无注意力时第一幕诚实缺席。 */

export interface JourneyCandidate {
  text: string;
  prob: number;
}

export interface JourneyStep {
  /** 当前步对 prompt 各 token 的真实注意力（已归一化，长度 = promptTokens.length） */
  attention: number[];
  /** 真实 top-8 候选（按概率降序） */
  topk: JourneyCandidate[];
  /** 实际采样选中的词与其真实概率 */
  chosen: JourneyCandidate;
}

export interface JourneyData {
  label: string;
  modelId: string;
  prompt: string;
  promptTokens: string[];
  attentionNote: string;
  steps: JourneyStep[];
}

export type JourneyLang = "zh" | "en";

/** 懒加载演示数据（JSON 资产，仅进入旅程时下载） */
export async function loadJourney(lang: JourneyLang): Promise<JourneyData> {
  const mod =
    lang === "zh"
      ? await import("../assets/journey.zh.json")
      : await import("../assets/journey.en.json");
  return mod.default as JourneyData;
}

/** 注意力最强的前 n 个 prompt token 序号（用于连线/高亮，只取真实权重排序） */
export function topAttention(weights: number[], n = 3): number[] {
  return weights
    .map((w, i) => [w, i] as const)
    .sort((a, b) => b[0] - a[0])
    .slice(0, n)
    .map(([, i]) => i);
}
