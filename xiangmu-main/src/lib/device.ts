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
  } catch {
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
