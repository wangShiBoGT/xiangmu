/** 本机实测成绩的本地留存（锚点 D6）：只存设备页真实跑过的测量摘要，
 *  永不上传；没跑过就是空——成绩单页读到空态时引导去实测，不估不编。 */

export interface MachineBenchRecord {
  modelId: string;
  device: "webgpu" | "wasm";
  /** 实测吞吐 tok/s */
  tps: number;
  /** 逐 token 延迟分位（ms），样本不足为 null */
  p50: number | null;
  p95: number | null;
  /** 有效延迟样本数 */
  n: number;
  score: { total: number; grade: string; cv: number | null };
  /** 采样衰减（Context Decay 测过才有） */
  decay: { headTps: number; tailTps: number; tokens: number } | null;
  /** 测量时刻（epoch ms） */
  at: number;
}

const KEY = "machine-bench-v1";

export function saveMachineBench(rec: MachineBenchRecord): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(rec));
  } catch {
    // 存储不可用时静默放弃（成绩单页会如实显示空态）
  }
}

export function loadMachineBench(): MachineBenchRecord | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<MachineBenchRecord>;
    if (
      typeof v.modelId !== "string" ||
      (v.device !== "webgpu" && v.device !== "wasm") ||
      typeof v.tps !== "number" ||
      typeof v.n !== "number" ||
      typeof v.at !== "number" ||
      typeof v.score?.total !== "number" ||
      typeof v.score?.grade !== "string"
    )
      return null;
    return v as MachineBenchRecord;
  } catch {
    return null;
  }
}
