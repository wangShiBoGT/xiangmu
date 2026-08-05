/** 官方能力引用层（锚点 D1）：只引用发布方公开成绩，不冒充本机实测。
 *  纪律（推演"混层"生死线）：与本机实测永远不同表、不同色；
 *  每个数字带来源角标（发布方 + 可点链接 + 核实日期）；
 *  未逐条核实过的模型如实显示"未录入"——宁缺毋假。 */

export interface OfficialScore {
  /** 基准名（如 MATH-500） */
  benchmark: string;
  /** 计分口径（如 pass@1） */
  metric: string;
  /** 发布方公开数值 */
  value: number;
}

export interface OfficialBenchEntry {
  /** 本产品模型注册表里的 id（onnx-community 镜像） */
  modelId: string;
  /** 成绩所属的上游原始模型（镜像只是格式转换，成绩属于原模型） */
  upstream: string;
  /** 来源描述（人读的角标文字） */
  sourceLabel: string;
  /** 来源链接（可点核验） */
  sourceUrl: string;
  /** 从来源逐条核实的日期（YYYY-MM-DD） */
  verifiedAt: string;
  scores: OfficialScore[];
}

/** 已逐条核实的官方公开成绩。新增条目必须先打开 sourceUrl 核对每个数字。
 *
 *  D5 补录核查（2026-07-24，宁缺毋假，以下模型如实保持「未录入」）：
 *  - Qwen3-0.6B / 1.7B：官方模型卡无成绩表，blog 只给大尺寸对比图，无 0.6B/1.7B 可核数字；
 *  - google/gemma-3-1b-it、meta-llama/Llama-3.2-1B-Instruct：模型卡受限（gated），无法逐条核对；
 *  - THUDM/glm-edge-1.5b-chat：模型卡无评测表；
 *  - Qwen2.5-Coder-1.5B-Instruct：模型卡无表，官方 blog 的 1.5B 成绩只在图表图片里，无可核文本数值。 */
export const OFFICIAL_BENCH: OfficialBenchEntry[] = [
  {
    modelId: "onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX",
    upstream: "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B",
    sourceLabel: "DeepSeek-R1 官方模型卡（评测表）",
    sourceUrl:
      "https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B",
    verifiedAt: "2026-07-23",
    scores: [
      { benchmark: "AIME 2024", metric: "pass@1", value: 28.9 },
      { benchmark: "AIME 2024", metric: "cons@64", value: 52.7 },
      { benchmark: "MATH-500", metric: "pass@1", value: 83.9 },
      { benchmark: "GPQA Diamond", metric: "pass@1", value: 33.8 },
      { benchmark: "LiveCodeBench", metric: "pass@1", value: 16.9 },
      { benchmark: "CodeForces", metric: "rating", value: 954 },
    ],
  },
  {
    modelId: "onnx-community/Phi-3.5-mini-instruct-onnx-web",
    upstream: "microsoft/Phi-3.5-mini-instruct",
    sourceLabel: "Phi-3.5-mini 官方模型卡（评测表）",
    sourceUrl: "https://huggingface.co/microsoft/Phi-3.5-mini-instruct",
    verifiedAt: "2026-08-05",
    scores: [
      { benchmark: "MMLU", metric: "5-shot", value: 69 },
      { benchmark: "MMLU-Pro", metric: "0-shot, CoT", value: 47.4 },
      { benchmark: "GSM8K", metric: "8-shot, CoT", value: 86.2 },
      { benchmark: "HumanEval", metric: "0-shot", value: 62.8 },
      { benchmark: "MBPP", metric: "3-shot", value: 69.6 },
      { benchmark: "ARC Challenge", metric: "10-shot", value: 84.6 },
      { benchmark: "BoolQ", metric: "2-shot", value: 78 },
      { benchmark: "PIQA", metric: "5-shot", value: 84.1 },
      { benchmark: "TriviaQA", metric: "5-shot", value: 58.8 },
      { benchmark: "MATH", metric: "0-shot, CoT", value: 48.5 },
      { benchmark: "Arena Hard", metric: "0-shot", value: 37 },
    ],
  },
  {
    modelId: "onnx-community/DeepSeek-R1-Distill-Qwen-7B-ONNX",
    upstream: "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
    sourceLabel: "DeepSeek-R1 官方模型卡（评测表）",
    sourceUrl:
      "https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
    verifiedAt: "2026-08-05",
    scores: [
      { benchmark: "AIME 2024", metric: "pass@1", value: 55.5 },
      { benchmark: "AIME 2024", metric: "cons@64", value: 83.3 },
      { benchmark: "MATH-500", metric: "pass@1", value: 92.8 },
      { benchmark: "GPQA Diamond", metric: "pass@1", value: 49.1 },
      { benchmark: "LiveCodeBench", metric: "pass@1", value: 37.6 },
      { benchmark: "CodeForces", metric: "rating", value: 1189 },
    ],
  },
  {
    modelId: "onnx-community/DeepSeek-R1-Distill-Llama-8B-ONNX",
    upstream: "deepseek-ai/DeepSeek-R1-Distill-Llama-8B",
    sourceLabel: "DeepSeek-R1 官方模型卡（评测表）",
    sourceUrl:
      "https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Llama-8B",
    verifiedAt: "2026-08-05",
    scores: [
      { benchmark: "AIME 2024", metric: "pass@1", value: 50.4 },
      { benchmark: "AIME 2024", metric: "cons@64", value: 80 },
      { benchmark: "MATH-500", metric: "pass@1", value: 89.1 },
      { benchmark: "GPQA Diamond", metric: "pass@1", value: 49 },
      { benchmark: "LiveCodeBench", metric: "pass@1", value: 39.6 },
      { benchmark: "CodeForces", metric: "rating", value: 1205 },
    ],
  },
];

export function officialBenchFor(modelId: string): OfficialBenchEntry | null {
  return OFFICIAL_BENCH.find((e) => e.modelId === modelId) ?? null;
}
