/**
 * AI Capability Report：浏览器 AI 运行能力的真实探测。
 * 所有项都是当场实测，探测不到就如实报 false/null，不估不编。
 */

export interface CapabilityItem {
  key: string;
  /** 英文名（技术名词保持原文） */
  label: string;
  /** 一句话中文说明：这项能力对跑 AI 意味着什么 */
  meaning: string;
  supported: boolean;
  /** 附加细节（如 GPU 型号） */
  detail?: string | null;
}

export interface CapabilityReport {
  items: CapabilityItem[];
  gpuInfo: string | null;
  cores: number;
  memoryGB: number | null;
}

interface GPUAdapterLike {
  features?: { has(name: string): boolean };
  info?: { vendor?: string; architecture?: string; description?: string };
}

/** WASM SIMD 探测：validate 一段含 SIMD 指令的最小模块（wasm-feature-detect 同款） */
function wasmSimd(): boolean {
  try {
    return WebAssembly.validate(
      new Uint8Array([
        0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10,
        10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
      ]),
    );
  } catch {
    return false;
  }
}

export async function probeCapabilities(): Promise<CapabilityReport> {
  const nav = navigator as Navigator & {
    gpu?: { requestAdapter(): Promise<GPUAdapterLike | null> };
    deviceMemory?: number;
  };

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

  const cores = nav.hardwareConcurrency || 0;
  const memoryGB =
    typeof nav.deviceMemory === "number" ? nav.deviceMemory : null;

  const items: CapabilityItem[] = [
    {
      key: "webgpu",
      label: "WebGPU",
      meaning: "GPU 加速推理的入口，没有它只能走 CPU（慢一个数量级）",
      supported: webgpu,
      detail: gpuInfo,
    },
    {
      key: "fp16",
      label: "Shader FP16",
      meaning: "半精度计算：权重减半、速度更快，现代显卡的标配",
      supported: fp16,
    },
    {
      key: "simd",
      label: "WASM SIMD",
      meaning: "CPU 路径的向量化指令，无 GPU 时的救命稻草",
      supported: wasmSimd(),
    },
    {
      key: "sab",
      label: "SharedArrayBuffer",
      meaning: "多线程共享内存，WASM 多线程推理的前提",
      supported: typeof SharedArrayBuffer !== "undefined",
    },
    {
      key: "coi",
      label: "Cross-Origin Isolated",
      meaning: "站点隔离状态，决定 SharedArrayBuffer 是否真正可用",
      supported:
        typeof crossOriginIsolated !== "undefined" && crossOriginIsolated,
    },
  ];

  return { items, gpuInfo, cores, memoryGB };
}
