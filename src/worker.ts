import {
  env,
  AutoTokenizer,
  AutoModelForCausalLM,
  AutoProcessor,
  AutoModelForVision2Seq,
  RawImage,
  TextStreamer,
  InterruptableStoppingCriteria,
  LogitsProcessor,
  Tensor,
  random,
  type PreTrainedTokenizer,
  type PreTrainedModel,
  type Processor,
  type ProgressInfo,
} from "@huggingface/transformers";
import type { GenerationParams } from "./lib/chatStore";
import {
  MODELS,
  getModel,
  registerCustomModels,
  VISION_MODEL,
} from "./lib/models";
import { DeepRecorder, TopPWarper, TraceRecorder } from "./lib/logits";
import type { PipelineTiming, TokenStep } from "./lib/trace";

// 内置模型从本服务 public/models/ 加载；其余模型从 hf-mirror 在线下载，浏览器自动缓存
env.allowLocalModels = true;
env.localModelPath = "/models/";
env.allowRemoteModels = true;
env.remoteHost = "https://hf-mirror.com";

type Device = "webgpu" | "wasm";

async function detectDevice(): Promise<Device> {
  try {
    const nav = navigator as Navigator & {
      gpu?: { requestAdapter(): Promise<unknown> };
    };
    if (!nav.gpu) return "wasm";
    const adapter = await nav.gpu.requestAdapter();
    return adapter ? "webgpu" : "wasm";
  } catch {
    return "wasm";
  }
}

class TextGenerationPipeline {
  static device: Device | null = null;
  static modelId: string | null = null;
  static tokenizer: Promise<PreTrainedTokenizer> | null = null;
  static model: Promise<PreTrainedModel> | null = null;

  static async getInstance(
    modelId: string,
    progress_callback?: (info: ProgressInfo) => void,
  ) {
    this.device ??= await detectDevice();
    if (this.modelId !== modelId) {
      // 切换模型：释放旧实例再加载新模型
      if (this.model) {
        try {
          const old = await this.model;
          await old.dispose();
        } catch {
          /* 旧模型释放失败不阻塞新模型加载 */
        }
      }
      this.tokenizer = null;
      this.model = null;
      this.modelId = modelId;
    }
    const info = getModel(modelId);
    if (this.device === "wasm" && info && !info.wasmOk) {
      throw new Error(
        `${info.name} 无法在 CPU(WASM) 模式加载（32 位内存上限）。请换用支持 WebGPU 的 Chrome/Edge 113+，或选择更小的模型。`,
      );
    }
    this.tokenizer ??= AutoTokenizer.from_pretrained(modelId, {
      progress_callback,
    });
    this.model ??= AutoModelForCausalLM.from_pretrained(modelId, {
      // 默认 WebGPU 用 q4f16、WASM(CPU) 用 q4；模型注册表可按设备覆盖（如 GLM-Edge 的 q4f16 数值溢出）
      dtype:
        info?.dtype?.[this.device] ??
        (this.device === "webgpu" ? "q4f16" : "q4"),
      device: this.device,
      use_external_data_format: info?.externalData ?? false,
      progress_callback,
    });
    const [tokenizer, model] = await Promise.all([this.tokenizer, this.model]);
    return { tokenizer, model, device: this.device };
  }
}

/** 图片理解专用管线：独立于聊天模型，首次带图提问时才加载 */
class VisionPipeline {
  static processor: Promise<Processor> | null = null;
  static model: Promise<PreTrainedModel> | null = null;

  static async getInstance(
    device: Device,
    progress_callback?: (info: ProgressInfo) => void,
  ) {
    this.processor ??= AutoProcessor.from_pretrained(VISION_MODEL.id, {
      progress_callback,
    });
    this.model ??= AutoModelForVision2Seq.from_pretrained(VISION_MODEL.id, {
      dtype:
        device === "webgpu"
          ? {
              embed_tokens: "q4f16",
              vision_encoder: "q4f16",
              decoder_model_merged: "q4f16",
            }
          : {
              embed_tokens: "int8",
              vision_encoder: "int8",
              decoder_model_merged: "int8",
            },
      device,
      progress_callback,
    });
    const [processor, model] = await Promise.all([this.processor, this.model]);
    return { processor, model };
  }
}

export type ErrorKind = "heap" | "webgpu-runtime" | "numeric" | "network" | "unknown";

function classifyError(msg: string): ErrorKind {
  if (/bad_alloc|allocation failed|out of memory/i.test(msg)) return "heap";
  if (/mapAsync|GPUBuffer|DownloadWGPUBuffer|device.{0,8}lost|providers\/webgpu/i.test(msg))
    return "webgpu-runtime";
  if (/采样概率为 0 或 NaN/.test(msg)) return "numeric";
  if (/failed to fetch|networkerror|err_(connection|network|internet)|fetch.*(404|403|timed? ?out)/i.test(msg))
    return "network";
  return "unknown";
}

/** 把底层异常翻译成诚实、可行动的提示：只分类能从错误文本确认的原因，并附原始错误 */
function describeError(e: unknown, device: Device | null): { text: string; kind: ErrorKind } {
  const msg = String(e);
  const kind = classifyError(msg);
  const raw = (n: number) => `原始错误：${msg.slice(0, n)}`;
  if (kind === "heap") {
    return {
      kind,
      text:
        device === "webgpu"
          ? `模型权重超出浏览器推理运行时的 32 位内存上限（这是运行时限制，不代表你的电脑内存/显存不够）。请换更小的模型，或关掉其它占用内存的标签页后刷新重试。${raw(160)}`
          : `CPU(WASM) 模式下模型超出 32 位内存上限。请选择更小的模型。${raw(160)}`,
    };
  }
  if (kind === "webgpu-runtime") {
    return {
      kind,
      text: `该设备上的 WebGPU 推理出错（与内存大小无关），正在自动切换到 CPU 模式…${raw(200)}`,
    };
  }
  if (kind === "network") {
    return {
      kind,
      text: `模型文件下载失败（网络问题，不是设备性能问题）：请确认当前网络能访问模型源，或稍后重试。${raw(160)}`,
    };
  }
  return { kind, text: msg };
}

const stopping_criteria = new InterruptableStoppingCriteria();

interface ChatMessage {
  role: string;
  content: string;
  images?: string[];
}

interface GenerateOptions {
  /** 是否记录 TokenTrace（Observe 页开启） */
  trace?: boolean;
  /** 消息来源标识，原样回传给 UI 区分 Observe/Create */
  src?: string;
  /** 随机种子（可复现实验） */
  seed?: number | null;
  /** E5a 深度采集（默认关）：每步额外记录 top-256 采样前 logits */
  deep?: boolean;
}

/** 核心生成：支持从 messages（常规）或 prefixIds（分岔重生成）启动 */
async function runGeneration(
  input:
    | { kind: "messages"; messages: ChatMessage[] }
    | { kind: "prefix"; prefixIds: number[] },
  params: GenerationParams,
  modelId: string,
  opts: GenerateOptions = {},
) {
  const { tokenizer, model } = await TextGenerationPipeline.getInstance(modelId);
  const src = opts.src;

  let inputs: { input_ids: Tensor; attention_mask: Tensor };
  let sentThinkPrefix = false;
  const tTokenize = performance.now();
  if (input.kind === "messages") {
    const thinkingModel = getModel(modelId)?.thinking ?? true;
    // 中文约束以系统提示注入，会进入 promptIds 被 trace 如实记录，不影响可复现性
    const withSystem =
      params.chineseOnly && !input.messages.some((m) => m.role === "system")
        ? [
            { role: "system", content: "请始终用中文思考和回答。" },
            ...input.messages,
          ]
        : input.messages;
    // DeepSeek 官方建议：思考类模型强制回复以 "<think>\n" 开头，避免跳过思考直接给出低质量回答
    const prompt = tokenizer.apply_chat_template(withSystem, {
      add_generation_prompt: true,
      tokenize: false,
    }) as string;
    inputs = tokenizer(
      thinkingModel ? prompt + "<think>\n" : prompt,
    ) as unknown as { input_ids: Tensor; attention_mask: Tensor };
    sentThinkPrefix = thinkingModel;
  } else {
    const ids = BigInt64Array.from(input.prefixIds.map((n) => BigInt(n)));
    const dims = [1, input.prefixIds.length];
    inputs = {
      input_ids: new Tensor("int64", ids, dims),
      attention_mask: new Tensor(
        "int64",
        BigInt64Array.from(input.prefixIds.map(() => 1n)),
        dims,
      ),
    };
  }
  const promptIds = Array.from(inputs.input_ids.data as BigInt64Array).map(
    Number,
  );
  const tokenizeMs = performance.now() - tTokenize;

  let startTime: number | null = null;
  let numTokens = 0;
  let tps = 0;

  const doSample = params.temperature > 0;
  const recorder = opts.trace ? new TraceRecorder(tokenizer) : null;
  const deepRecorder =
    recorder && opts.deep ? new DeepRecorder(tokenizer, doSample ? params.temperature : 0) : null;
  let stepBuffer: TokenStep[] = [];
  let lastFlush = 0;
  const flushSteps = () => {
    if (stepBuffer.length === 0) return;
    self.postMessage({ status: "trace-steps", steps: stepBuffer, src });
    stepBuffer = [];
    lastFlush = performance.now();
  };

  // 数值健康度哨兵：选中 token 的采样概率不可能为 0/NaN，
  // 连续出现即说明该设备上推理数值已坏（如 WebGPU fp16 异常），停止而不是继续记录不可信的乱码
  let badNumericRun = 0;
  let numericBroken = false;

  // WASM 模式下的中断检查：定期检查停止信号
  let lastInterruptCheck = performance.now();
  const INTERRUPT_CHECK_INTERVAL = 100; // 每 100ms 检查一次

  const token_callback_function = (ids: bigint[] | number[]) => {
    startTime ??= performance.now();
    const now = performance.now();
    if (numTokens++ > 0) {
      tps = (numTokens / (now - startTime)) * 1000;
    }

    // WASM 模式下定期检查中断信号，改善响应性
    if (TextGenerationPipeline.device === "wasm") {
      if (now - lastInterruptCheck > INTERRUPT_CHECK_INTERVAL) {
        lastInterruptCheck = now;
        if (stopping_criteria.wasInterrupted()) {
          return; // 已中断，直接返回
        }
      }
    }

    if (recorder) {
      const step = recorder.onToken(Number(ids[ids.length - 1]));
      if (step) {
        const deep = deepRecorder?.take();
        if (deep) step.deep = deep;
        if (!Number.isFinite(step.prob) || step.prob <= 0) {
          if (++badNumericRun >= 4 && !numericBroken) {
            numericBroken = true;
            stopping_criteria.interrupt();
          }
        } else {
          badNumericRun = 0;
        }
        stepBuffer.push(step);
        // 合批推送：每 4 步或 100ms，避免高频 postMessage 拖慢生成
        if (stepBuffer.length >= 4 || now - lastFlush > 100) {
          flushSteps();
        }
      }
    }
  };

  const callback_function = (output: string) => {
    self.postMessage({ status: "update", output, tps, numTokens, src });
  };

  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function,
    token_callback_function,
  });

  self.postMessage({ status: "start", src });
  if (sentThinkPrefix) {
    // 强制的 <think> 前缀在 prompt 里不会被流式输出，这里补发给 UI 用于思考面板解析
    self.postMessage({
      status: "update",
      output: "<think>\n",
      tps: 0,
      numTokens: 0,
      src,
    });
  }

  try {
    if (typeof opts.seed === "number") random.seed(opts.seed);
    // 自定义处理链：真 Top-P（库未实现）+ 只读记录器，都排在内置处理器（重复惩罚/温度）之后
    const extraProcessors: LogitsProcessor[] = [];
    // 深度采集必须排在 TopPWarper 之前：看到的是采样前、截断前的完整分布
    if (deepRecorder) extraProcessors.push(deepRecorder);
    if (doSample && params.topP < 1) extraProcessors.push(new TopPWarper(params.topP));
    if (recorder) extraProcessors.push(recorder);

    const tGenerate = performance.now();

    // 设置生成超时保护（WASM 模式特别需要）
    const generateTimeout = 5 * 60 * 1000; // 5 分钟超时
    const timeoutId = setTimeout(() => {
      stopping_criteria.interrupt();
      console.warn("生成超时，已自动停止");
    }, generateTimeout);

    const { sequences } = (await model.generate({
      ...inputs,
      do_sample: doSample,
      ...(doSample ? { temperature: params.temperature } : {}),
      max_new_tokens: params.maxTokens,
      repetition_penalty: 1.1,
      ...(extraProcessors.length > 0
        ? { logits_processor: extraProcessors }
        : {}),
      streamer,
      stopping_criteria,
      return_dict_in_generate: true,
    } as unknown as Parameters<PreTrainedModel["generate"]>[0])) as {
      sequences: unknown;
    };

    clearTimeout(timeoutId);

    if (numericBroken) {
      throw new Error(
        "连续多步选中 token 的采样概率为 0 或 NaN：该设备上的推理数值异常（常见于 WebGPU fp16 兼容问题），输出不可信，已停止记录。建议更新显卡驱动与 Chrome/Edge，或换更小的模型重试。",
      );
    }
    const tEnd = performance.now();
    // 首 token 回调时刻即 prefill 结束；若一个 token 都没产出则无法划分，不记录
    const pipeline: PipelineTiming | null =
      startTime !== null
        ? {
            tokenizeMs,
            prefillMs: startTime - tGenerate,
            decodeMs: tEnd - startTime,
          }
        : null;
    flushSteps();
    const decoded = tokenizer.batch_decode(
      sequences as Parameters<PreTrainedTokenizer["batch_decode"]>[0],
      { skip_special_tokens: true },
    );
    const device = TextGenerationPipeline.device ?? "wasm";
    self.postMessage({
      status: "complete",
      output: decoded,
      src,
      ...(recorder
        ? {
            trace: {
              modelId,
              params: {
                temperature: params.temperature,
                topP: params.topP,
                seed: opts.seed ?? null,
              },
              promptIds,
              steps: recorder.steps,
              device,
              ...(pipeline ? { pipeline } : {}),
            },
          }
        : {}),
    });
  } catch (e) {
    const { text, kind } = describeError(e, TextGenerationPipeline.device);
    self.postMessage({
      status: "error",
      data: text,
      errorKind: kind,
      device: TextGenerationPipeline.device,
      src,
    });
  }
}

async function load(modelId: string, forceDevice?: Device) {
  try {
    if (forceDevice) TextGenerationPipeline.device = forceDevice;
    const name = getModel(modelId)?.name ?? modelId;
    const builtin = getModel(modelId)?.builtin ?? false;

    // 阶段 1: 准备加载
    self.postMessage({
      status: "loading",
      data: builtin
        ? `正在读取 ${name}（模型需读入内存并初始化，请稍候）...`
        : `正在准备 ${name}（首次需在线下载，之后缓存免重下；每次打开仍需读入内存并初始化）...`,
    });

    // 阶段 2: 加载模型文件
    const loadStart = performance.now();
    const { tokenizer, model, device } =
      await TextGenerationPipeline.getInstance(modelId, (x) =>
        self.postMessage(x),
      );
    const loadTime = performance.now() - loadStart;

    // 阶段 3: 编译与预热
    self.postMessage({
      status: "loading",
      data:
        device === "webgpu"
          ? "模型已读入，正在编译着色器、预热模型（视显卡性能可能需要数十秒）..."
          : "未检测到 WebGPU，使用 CPU(WASM) 模式，速度较慢；正在预热模型...",
    });

    // 使用多样化输入预热，检测数值稳定性
    const warmupStart = performance.now();
    const warmupInputs = ["Hello", "你好"];
    for (const text of warmupInputs) {
      const inputs = tokenizer(text);
      await model.generate({ ...inputs, max_new_tokens: 1 });
    }
    const warmupTime = performance.now() - warmupStart;

    self.postMessage({
      status: "ready",
      device,
      modelId,
      loadTime: Math.round(loadTime),
      warmupTime: Math.round(warmupTime),
    });
  } catch (e) {
    // 清掉失败的半成品实例，同一个模型也能重试
    TextGenerationPipeline.modelId = null;
    TextGenerationPipeline.tokenizer = null;
    TextGenerationPipeline.model = null;
    const { text, kind } = describeError(e, TextGenerationPipeline.device);
    self.postMessage({
      status: "error",
      data: text,
      errorKind: kind,
      device: TextGenerationPipeline.device,
    });
  }
}

/** 带图提问：自动切到视觉模型，只看当前问题+图片（小视觉模型不喂历史） */
async function generateVision(
  question: string,
  images: string[],
  params: GenerationParams,
) {
  const device = await detectDevice();
  const loaded = VisionPipeline.model !== null;
  if (!loaded) {
    self.postMessage({
      status: "vision-loading",
      data: `检测到图片，正在准备视觉模型 ${VISION_MODEL.name}（首次需在线下载约 ${Math.round((device === "webgpu" ? VISION_MODEL.sizeWebgpu : VISION_MODEL.sizeWasm) / 1e6)}MB，之后走缓存）...`,
    });
  }
  const { processor, model } = await VisionPipeline.getInstance(device);
  if (!processor.tokenizer) {
    throw new Error("视觉模型 processor 缺少 tokenizer");
  }

  const rawImages = await Promise.all(images.map((u) => RawImage.fromURL(u)));
  const messages = [
    {
      role: "user",
      content: [
        ...images.map(() => ({ type: "image" })),
        { type: "text", text: question },
      ],
    },
  ];
  const text = processor.apply_chat_template(messages, {
    add_generation_prompt: true,
  }) as string;
  const inputs = await processor(text, rawImages, {
    do_image_splitting: false,
  });

  let startTime: number | null = null;
  let numTokens = 0;
  let tps = 0;
  const streamer = new TextStreamer(processor.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (output: string) => {
      self.postMessage({ status: "update", output, tps, numTokens });
    },
    token_callback_function: () => {
      startTime ??= performance.now();
      if (numTokens++ > 0) {
        tps = (numTokens / (performance.now() - startTime)) * 1000;
      }
    },
  });

  self.postMessage({ status: "start" });
  try {
    await model.generate({
      ...inputs,
      do_sample: false,
      max_new_tokens: params.maxTokens,
      repetition_penalty: 1.1,
      streamer,
      stopping_criteria,
    } as Parameters<PreTrainedModel["generate"]>[0]);
    self.postMessage({ status: "complete", output: [] });
  } catch (e) {
    const { text, kind } = describeError(e, device);
    self.postMessage({ status: "error", data: text, errorKind: kind, device });
  }
}

self.addEventListener("message", async (e: MessageEvent) => {
  const { type, data } = e.data;
  const fallbackId = MODELS[0].id;
  switch (type) {
    case "custom-models":
      // 主线程同步自定义模型列表（worker 无 localStorage）
      registerCustomModels(data.models ?? []);
      break;
    case "load":
      load(data?.modelId ?? fallbackId, data?.device);
      break;
    case "generate": {
      stopping_criteria.reset();
      const last = data.messages.at(-1) as ChatMessage | undefined;
      if (last?.images?.length) {
        generateVision(last.content, last.images, data.params);
      } else {
        runGeneration(
          { kind: "messages", messages: data.messages },
          data.params,
          data.modelId ?? fallbackId,
          { trace: data.trace, src: data.src, seed: data.seed, deep: data.deep },
        );
      }
      break;
    }
    case "regenerate":
      // 分岔重生成：prefixIds = prompt + 分岔前的 token + 强制改选的 token，真实重新推理
      stopping_criteria.reset();
      runGeneration(
        { kind: "prefix", prefixIds: data.prefixIds },
        data.params,
        data.modelId ?? fallbackId,
        { trace: true, src: data.src, seed: data.seed, deep: data.deep },
      );
      break;
    case "interrupt":
      stopping_criteria.interrupt();
      break;
  }
});
