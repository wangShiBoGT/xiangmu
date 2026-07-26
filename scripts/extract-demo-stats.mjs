// 构建期数据管道（锚点 A10）：从真实 demo trace 提取首屏/收束统计，
// 产出 src/lib/demoStats.generated.ts。运行时零网络依赖；换 demo trace 只需重跑本脚本。
// 用法：npm run extract-stats（build 前置钩子自动执行）
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tracePath = resolve(root, "src/assets/demo.aitrace.json");
const outPath = resolve(root, "src/lib/demoStats.generated.ts");

const data = JSON.parse(readFileSync(tracePath, "utf8"));
const steps = data.steps;
if (!Array.isArray(steps) || steps.length === 0) {
  throw new Error("demo trace 缺少 steps");
}

// 口径：close = topk[0].prob − topk[1].prob < 0.05 且 topk[0].prob > 0.05
// restMass = 1 − (top1 + top2)：含 top3–8 与记录外尾部质量（P(vocab) 口径）
const closeSteps = [];
for (let i = 0; i < steps.length; i++) {
  const tk = steps[i].topk;
  if (!Array.isArray(tk) || tk.length < 2) continue;
  const gap = tk[0].prob - tk[1].prob;
  if (tk[0].prob > 0.05 && gap < 0.05) {
    closeSteps.push({
      index: i,
      gap,
      a: { text: tk[0].text, prob: tk[0].prob },
      b: { text: tk[1].text, prob: tk[1].prob },
      restMass: 1 - (tk[0].prob + tk[1].prob),
      topkCount: tk.length,
      topk: tk.map((t) => ({ text: t.text, prob: t.prob })),
    });
  }
}
closeSteps.sort((x, y) => x.gap - y.gap);
if (closeSteps.length === 0) throw new Error("demo trace 无犹豫点，请检查数据");

const stats = {
  totalSteps: steps.length,
  closeThreshold: 0.05,
  closeSteps,
  tightest: closeSteps[0],
  prompt: data.prompt,
  modelId: data.modelId,
  params: data.params,
  device: data.device,
};

const banner = `// 本文件由 scripts/extract-demo-stats.mjs 从 src/assets/demo.aitrace.json 生成，禁止手改。
// 数据全部来自真实本机推理 trace（锚点 A10：运行时零网络依赖，换 trace 重跑脚本即可）。

export interface DemoCloseStep {
  /** 0-based 步索引（展示时 +1） */
  index: number;
  /** 前两名概率差（P(vocab) 口径） */
  gap: number;
  a: { text: string; prob: number };
  b: { text: string; prob: number };
  /** 1 − (top1+top2)：其余候选与尾部合计质量 */
  restMass: number;
  topkCount: number;
  /** 原始 top-k 记录（P1：陈述可展开到原始数据） */
  topk: { text: string; prob: number }[];
}

export interface DemoStats {
  totalSteps: number;
  closeThreshold: number;
  /** 按 gap 升序 */
  closeSteps: DemoCloseStep[];
  tightest: DemoCloseStep;
  prompt: string;
  modelId: string;
  params: { temperature: number; topP: number; seed: number };
  device: string;
}

export const DEMO_STATS: DemoStats = `;

writeFileSync(outPath, banner + JSON.stringify(stats, null, 2) + ";\n");
console.log(
  `demoStats: ${stats.totalSteps} steps, ${closeSteps.length} close, tightest #${stats.tightest.index + 1} gap ${(stats.tightest.gap * 100).toFixed(4)}%`,
);
