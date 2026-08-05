import { MODELS, type ModelInfo } from "./models";

export interface DeviceReport {
  /** WebGPU 可用（决定 GPU / CPU 路径） */
  webgpu: boolean;
  /** GPU 支持 fp16（shader-f16） */
  fp16: boolean;
  /** GPU 厂商/架构描述（拿不到时为 null） */
  gpuInfo: string | null;
  /** navigator.deviceMemory，浏览器最高只报 8（GB）；不支持时为 null */
  memoryGB: number | null;
  /** 逻辑核心数 */
  cores: number;
  /** 综合档位：1=无 GPU/低配，2=一般 GPU，3=高性能 GPU */
  tier: 1 | 2 | 3;
}

interface GPUAdapterLike {
  features?: { has(name: string): boolean };
  info?: { vendor?: string; architecture?: string; description?: string };
}

export async function probeDevice(): Promise<DeviceReport> {
  const nav = navigator as Navigator & {
    gpu?: { requestAdapter(): Promise<GPUAdapterLike | null> };
    deviceMemory?: number;
  };
  const cores = nav.hardwareConcurrency || 4;
  const memoryGB = typeof nav.deviceMemory === "number" ? nav.deviceMemory : null;

  let webgpu = false;
  let fp16 = false;
  let gpuInfo: string | null = null;
  try {
    const adapter = nav.gpu ? await nav.gpu.requestAdapter() : null;
    if (adapter) {
      webgpu = true;
      fp16 = adapter.features?.has("shader-f16") ?? false;
      const info = adapter.info;
      if (info) {
        gpuInfo =
          [info.vendor, info.architecture].filter(Boolean).join(" ") ||
          info.description ||
          null;
      }
    }
  } catch (error) {
    // WebGPU 初始化失败，记录详细原因
    console.warn("WebGPU 探测失败:", error);
    webgpu = false;
  }

  let tier: 1 | 2 | 3 = 1;
  if (webgpu) {
    // 内存/核数是最可得的旁证：大内存+多核大概率是台像样的机器
    tier = (memoryGB === null || memoryGB >= 8) && cores >= 8 ? 3 : 2;
  }
  return { webgpu, fp16, gpuInfo, memoryGB, cores, tier };
}

/** 按设备档位推荐模型：只从内置模型（内网秒加载）里选该档位下能力最强的 */
export function recommendModel(report: DeviceReport): ModelInfo {
  const usable = MODELS.filter(
    (m) =>
      m.builtin && m.minTier <= report.tier && (report.webgpu || m.wasmOk),
  );
  return usable.at(-1) ?? MODELS[0];
}

/** 某模型在当前设备上是否可用 */
export function modelUsable(report: DeviceReport, m: ModelInfo): boolean {
  return report.webgpu ? true : m.wasmOk;
}

/** 估算模型在指定设备上的内存需求（字节）
 *  ONNX Runtime 运行时开销约为模型权重的 1.8 倍 */
export function estimateMemoryRequirement(
  model: ModelInfo,
  device: "webgpu" | "wasm",
): number {
  const baseSize = device === "webgpu" ? model.sizeWebgpu : model.sizeWasm;
  return Math.ceil(baseSize * 1.8);
}

/** 检查模型是否可能因内存不足而加载失败
 *  返回 null 表示无法确定，返回 true 表示可能内存不足 */
export function checkMemoryRisk(
  model: ModelInfo,
  report: DeviceReport,
  device: "webgpu" | "wasm",
): boolean | null {
  // deviceMemory 只在某些浏览器可用，且上限为 8GB
  if (report.memoryGB === null) return null;

  const required = estimateMemoryRequirement(model, device);
  const availableBytes = report.memoryGB * 1024 * 1024 * 1024;

  // WASM 有 32 位地址空间限制（约 4GB）
  if (device === "wasm" && required > 3.5 * 1024 * 1024 * 1024) {
    return true;
  }

  // 保守估计：需求 > 可用内存的 60% 就认为有风险
  return required > availableBytes * 0.6;
}
