import type { ExperimentRecord } from "./experiments";
import { importReplay } from "./experiments";
import { getModel } from "./models";

/** 预录采样演示：一份真实的 .aitrace v2 记录（本机 WebGPU 实测，无任何伪造数据）。
 *  JSON 资产懒加载，只有用户点「观看一次采样」才下载。 */
export interface DemoTrace {
  record: ExperimentRecord;
  /** 「录制示例 · <模型> · <n> steps · 本机 trace」标注 */
  label: string;
}

let cached: DemoTrace | null = null;

export async function loadDemoTrace(): Promise<DemoTrace> {
  if (cached) return cached;
  const { default: url } = await import("../assets/demo.aitrace.json?url");
  const res = await fetch(url);
  if (!res.ok) throw new Error("示例 trace 加载失败");
  const record = importReplay(await res.text());
  record.name = `录制示例 · ${record.prompt}`;
  const modelName = getModel(record.modelId)?.name ?? record.modelId;
  const steps = record.root.trace?.steps.length ?? 0;
  cached = {
    record,
    label: `录制示例 · ${modelName} · ${steps} steps · 本机 trace`,
  };
  return cached;
}
