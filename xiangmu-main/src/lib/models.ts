/**
 * 模型注册表。
 * builtin=true：模型文件在本服务 public/models/ 下，内网秒加载；
 * builtin=false：选择后从 hf-mirror 在线下载，浏览器自动缓存，下一次就不用再下。
 */

/** ONNX 权重精度档位（对应仓库 onnx/ 目录下的各份权重） */
export type ModelDtype = "q4f16" | "q4" | "fp16" | "int8" | "uint8" | "fp32";

export interface ModelInfo {
  /** HuggingFace 仓库路径；内置模型同时是 public/models/ 下的目录名 */
  id: string;
  /** 显示名 */
  name: string;
  /** 出品方 */
  vendor: string;
  /** 参数量标签 */
  params: string;
  /** 是否输出 <think> 推理链 */
  thinking: boolean;
  /** 模型文件内置在本服务，否则在线下载 */
  builtin: boolean;
  /** ONNX 权重使用外部数据文件（.onnx_data） */
  externalData?: boolean;
  /** 按设备覆盖默认精度（默认 webgpu=q4f16 / wasm=q4）：部分模型的 fp16 权重数值溢出会产生乱码 */
  dtype?: { webgpu?: ModelDtype; wasm?: ModelDtype };
  /** WebGPU (q4f16) 权重大小，字节 */
  sizeWebgpu: number;
  /** WASM/CPU (q4) 权重大小，字节 */
  sizeWasm: number;
  /** 能在 32 位 WASM 堆内加载（约 <1.5GB 权重）才允许 CPU 模式使用 */
  wasmOk: boolean;
  /** 推荐所需设备档位：1=无独显/低配，2=一般核显/独显，3=高性能显卡 */
  minTier: 1 | 2 | 3;
  /** 一句话介绍（导读用） */
  description: string;
}

export const MODELS: ModelInfo[] = [
  {
    id: "onnx-community/Qwen3-0.6B-ONNX",
    name: "Qwen3 0.6B",
    vendor: "阿里",
    params: "0.6B",
    thinking: true,
    builtin: true,
    sizeWebgpu: 570e6,
    sizeWasm: 919e6,
    wasmOk: true,
    minTier: 1,
    description: "最轻量，任何电脑都能跑，支持推理链（<think> 输出），适合快速问答",
  },
  {
    id: "onnx-community/glm-edge-1.5b-chat-ONNX",
    name: "GLM-Edge 1.5B",
    vendor: "智谱",
    params: "1.5B",
    thinking: false,
    builtin: true,
    // 官方示例指定 q4：q4f16 权重在 WebGPU 上数值溢出（全部候选概率为 0，输出乱码）
    dtype: { webgpu: "q4" },
    sizeWebgpu: 1331e6,
    sizeWasm: 1331e6,
    wasmOk: true,
    minTier: 2,
    description: "智谱端侧模型，直接作答、不输出推理链，回复速度快",
  },
  {
    id: "onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX",
    name: "DeepSeek-R1 1.5B",
    vendor: "深度求索",
    params: "1.5B",
    thinking: true,
    builtin: true,
    sizeWebgpu: 1369e6,
    sizeWasm: 1966e6,
    wasmOk: false,
    minTier: 2,
    description: "R1 蒸馏版，输出完整推理链（<think> 段），适合推理类问题",
  },
  {
    id: "onnx-community/Qwen3-1.7B-ONNX",
    name: "Qwen3 1.7B",
    vendor: "阿里",
    params: "1.7B",
    thinking: true,
    builtin: true,
    sizeWebgpu: 1426e6,
    sizeWasm: 2147e6,
    wasmOk: false,
    minTier: 3,
    description: "内置模型里能力最强，需要较好的显卡，回答质量最高",
  },
  {
    id: "onnx-community/gemma-3-1b-it-ONNX",
    name: "Gemma 3 1B",
    vendor: "Google",
    params: "1B",
    thinking: false,
    builtin: false,
    externalData: true,
    sizeWebgpu: 764e6,
    sizeWasm: 860e6,
    wasmOk: true,
    minTier: 2,
    description: "Google 最新端侧模型，体积小、多语言能力好",
  },
  {
    id: "onnx-community/Llama-3.2-1B-Instruct-ONNX",
    name: "Llama 3.2 1B",
    vendor: "Meta",
    params: "1B",
    thinking: false,
    builtin: false,
    externalData: true,
    sizeWebgpu: 1090e6,
    sizeWasm: 1693e6,
    wasmOk: false,
    minTier: 2,
    description: "Meta 开源模型，英文能力强，指令跟随稳定",
  },
  {
    id: "onnx-community/Qwen2.5-Coder-1.5B-Instruct",
    name: "Qwen2.5-Coder 1.5B",
    vendor: "阿里",
    params: "1.5B",
    thinking: false,
    builtin: false,
    sizeWebgpu: 1344e6,
    sizeWasm: 1916e6,
    wasmOk: false,
    minTier: 2,
    description: "代码专精模型，写代码、改 bug、解释代码更在行",
  },
  {
    id: "onnx-community/Phi-3.5-mini-instruct-onnx-web",
    name: "Phi-3.5 mini 3.8B",
    vendor: "微软",
    params: "3.8B",
    thinking: false,
    builtin: false,
    externalData: true,
    sizeWebgpu: 2317e6,
    sizeWasm: 2317e6,
    wasmOk: false,
    minTier: 3,
    description: "微软 3.8B 模型，全列表能力最强，需要高性能显卡",
  },
];

/** 图片理解专用视觉模型：消息带图时自动启用（在线下载，浏览器缓存） */
export const VISION_MODEL = {
  id: "HuggingFaceTB/SmolVLM-256M-Instruct",
  name: "SmolVLM 256M",
  vendor: "HuggingFace",
  /** WebGPU q4f16 三件套（视觉编码+词嵌入+解码器）合计 */
  sizeWebgpu: 189e6,
  /** WASM int8 合计 */
  sizeWasm: 260e6,
  description: "轻量视觉模型，看图说话/识别图中文字，中文能力有限（回答可能偏英文）",
} as const;

/** 该模型是否已有浏览器缓存（transformers.js 的 Cache Storage）：已缓存 = 免下载。
 *  缓存按站点来源（origin）隔离，换地址访问缓存不共享。 */
export async function isModelCached(id: string): Promise<boolean> {
  try {
    if (!("caches" in globalThis)) return false;
    const cache = await caches.open("transformers-cache");
    const keys = await cache.keys();
    return keys.some((r) => r.url.includes(`/${id}/`) && r.url.includes(".onnx"));
  } catch {
    return false;
  }
}

export function getModel(id: string): ModelInfo | undefined {
  return MODELS.find((m) => m.id === id) ?? customModels.find((m) => m.id === id);
}

export function formatSize(bytes: number): string {
  return `${(bytes / 1e9).toFixed(1)}GB`;
}

// ---------- 自定义模型导入（F5）：任意 HuggingFace ONNX 模型 ID ----------

const CUSTOM_KEY = "custom-models-v1";

/** 模块级注册表：主线程从 localStorage 加载；worker 无 localStorage，靠消息同步 */
let customModels: ModelInfo[] = [];

export interface CustomModelInput {
  id: string;
  thinking: boolean;
  externalData: boolean;
  /** 手动指定权重精度；缺省按设备默认（输出乱码时可改选 q4 / fp16） */
  dtype?: ModelDtype | null;
}

/** 校验 HF 模型 ID（org/name）；返回错误信息，合法返回 null */
export function validateModelId(id: string): string | null {
  const t = id.trim();
  if (!t) return "模型 ID 不能为空";
  if (!/^[\w.-]+\/[\w.-]+$/.test(t)) {
    return "格式应为 org/name，例如 onnx-community/Qwen3-0.6B-ONNX";
  }
  if (getModel(t)) return "该模型已在列表中";
  return null;
}

/** 由用户输入构造自定义模型条目。体积/能力未知处如实标注，不臆造数字 */
export function makeCustomModel(input: CustomModelInput): ModelInfo {
  const id = input.id.trim();
  return {
    id,
    name: id.split("/")[1] ?? id,
    vendor: "自定义",
    params: "未知",
    thinking: input.thinking,
    builtin: false,
    externalData: input.externalData,
    ...(input.dtype
      ? { dtype: { webgpu: input.dtype, wasm: input.dtype } }
      : {}),
    sizeWebgpu: 0,
    sizeWasm: 0,
    wasmOk: true,
    minTier: 1,
    description: "自定义导入的 HuggingFace 模型，需带 ONNX 权重（onnx/ 目录）",
  };
}

export function getCustomModels(): ModelInfo[] {
  return customModels;
}

/** worker 侧注册（主线程通过消息把列表同步过来） */
export function registerCustomModels(list: ModelInfo[]): void {
  customModels = list;
}

/** 主线程：从 localStorage 恢复自定义模型 */
export function loadCustomModels(): ModelInfo[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) customModels = parsed as ModelInfo[];
    }
  } catch {
    // 损坏则视为无自定义模型
  }
  return customModels;
}

function persistCustomModels(): void {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(customModels));
  } catch {
    // 存不下不阻塞使用（本次会话内仍可用）
  }
}

/** 添加自定义模型；输入不合法时抛出人话错误 */
export function addCustomModel(input: CustomModelInput): ModelInfo {
  const err = validateModelId(input.id);
  if (err) throw new Error(err);
  const model = makeCustomModel(input);
  customModels = [...customModels, model];
  persistCustomModels();
  return model;
}

export function removeCustomModel(id: string): void {
  customModels = customModels.filter((m) => m.id !== id);
  persistCustomModels();
}
