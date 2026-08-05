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
  /** WebGPU 失败原因（如果有） */
  webgpuFailReason?: string;
}

interface GPUAdapterLike {
  features?: { has(name: string): boolean };
  info?: { vendor?: string; architecture?: string; description?: string };
  limits?: Record<string, number>;
}

/** 获取 WebGPU 降级建议 */
export function getWebGPUFallbackAdvice(report: DeviceReport): string | null {
  if (report.webgpu) return null;

  if (report.webgpuFailReason) {
    if (report.webgpuFailReason.includes("不支持")) {
      return "当前浏览器不支持 WebGPU。建议使用 Chrome 113+ 或 Edge 113+ 以获得最佳性能。";
    }
    if (report.webgpuFailReason.includes("blocked")) {
      return "WebGPU 被浏览器安全策略阻止。请检查浏览器设置或在 chrome://flags 中启用 WebGPU。";
    }
    if (report.webgpuFailReason.includes("adapter")) {
      return "未找到可用的 GPU 适配器。可能是显卡驱动过旧，建议更新显卡驱动后重试。";
    }
  }

  return "WebGPU 不可用，将使用 CPU(WASM) 模式运行。性能会显著下降，建议升级浏览器或更新显卡驱动。";
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
  let webgpuFailReason: string | undefined;

  try {
    if (!nav.gpu) {
      webgpuFailReason = "浏览器不支持 WebGPU API";
    } else {
      const adapter = await nav.gpu.requestAdapter();
      if (!adapter) {
        webgpuFailReason = "未找到可用的 GPU adapter（可能是显卡驱动过旧）";
      } else {
        webgpu = true;
        fp16 = adapter.features?.has("shader-f16") ?? false;
        const info = adapter.info;
        if (info) {
          gpuInfo =
            [info.vendor, info.architecture].filter(Boolean).join(" ") ||
            info.description ||
            null;
        }

        // 检查 GPU 内存限制
        if (adapter.limits) {
          const maxBufferSize = adapter.limits.maxBufferSize ?? 0;
          const maxStorageBufferBindingSize = adapter.limits.maxStorageBufferBindingSize ?? 0;
          if (maxBufferSize < 256 * 1024 * 1024) {
            console.warn(`GPU 缓冲区限制较低: ${(maxBufferSize / 1024 / 1024).toFixed(0)} MB`);
          }
        }
      }
    }
  } catch (error) {
    // WebGPU 初始化失败，记录详细原因
    const msg = String(error);
    console.warn("WebGPU 探测失败:", error);
    webgpuFailReason = msg.includes("blocked")
      ? "WebGPU 被浏览器安全策略阻止"
      : `初始化失败: ${msg.slice(0, 100)}`;
    webgpu = false;
  }

  let tier: 1 | 2 | 3 = 1;
  if (webgpu) {
    // 内存/核数是最可得的旁证：大内存+多核大概率是台像样的机器
    tier = (memoryGB === null || memoryGB >= 8) && cores >= 8 ? 3 : 2;
  }
  return { webgpu, fp16, gpuInfo, memoryGB, cores, tier, webgpuFailReason };
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

/** 优化建议：根据设备能力推荐最佳配置 */
export interface OptimizationAdvice {
  /** 推荐的量化精度 */
  recommendedDtype: "q4" | "q4f16" | "int8";
  /** 是否建议使用外部数据格式（分片加载） */
  useExternalData: boolean;
  /** 内存风险等级：low=安全，medium=可能不够，high=大概率失败 */
  memoryRisk: "low" | "medium" | "high";
  /** 给用户的建议文字 */
  advice: string;
}

export function getOptimizationAdvice(
  model: ModelInfo,
  report: DeviceReport,
  device: "webgpu" | "wasm",
): OptimizationAdvice {
  const memoryRisk = checkMemoryRisk(model, report, device);
  const sizeGB = (device === "webgpu" ? model.sizeWebgpu : model.sizeWasm) / 1024 / 1024 / 1024;

  // 默认配置
  let recommendedDtype: "q4" | "q4f16" | "int8" = device === "webgpu" ? "q4f16" : "q4";
  let useExternalData = model.externalData ?? false;
  let riskLevel: "low" | "medium" | "high" = "low";
  let advice = "";

  // 大模型（>2GB）建议分片加载
  if (sizeGB > 2) {
    useExternalData = true;
    advice = "模型较大，已启用分片加载以减少峰值内存占用。";
  }

  // 内存风险评估
  if (memoryRisk === true) {
    riskLevel = "high";
    if (device === "webgpu") {
      recommendedDtype = "q4"; // 降低精度
      advice = "内存可能不足，已自动降低量化精度到 q4。建议关闭其他标签页后重试。";
    } else {
      advice = "WASM 模式内存不足，建议选择更小的模型或使用支持 WebGPU 的浏览器。";
    }
  } else if (memoryRisk === null && sizeGB > 1.5) {
    riskLevel = "medium";
    advice = "无法准确评估内存使用，但模型较大。如遇到加载失败，请尝试关闭其他标签页。";
  }

  // 低端设备优化
  if (report.tier === 1 && device === "webgpu") {
    recommendedDtype = "q4";
    advice = "检测到低配置设备，已启用最大压缩（q4）以提升加载成功率。";
  }

  return { recommendedDtype, useExternalData, memoryRisk: riskLevel, advice };
}
