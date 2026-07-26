import {
  LogitsProcessor,
  type Tensor,
  type PreTrainedTokenizer,
} from "@huggingface/transformers";
import { analyzeLogits, TOP_K, type TokenStep } from "./trace";
import type { DeepCapture } from "./microscope";

/** 深度采集器（E5a，默认不启用）：排在 TopPWarper 之前 = 看到采样前
 *  （温度之后、Top-P 截断之前）的完整分布。logit 乘回温度还原温度前值，
 *  只存 top-256（头部 32 个带解码文本），截断外聚合成 restCount/restMass。 */
export class DeepRecorder extends LogitsProcessor {
  private pending: DeepCapture | null = null;
  private tokenizer: PreTrainedTokenizer;
  private temperature: number;
  constructor(tokenizer: PreTrainedTokenizer, temperature: number) {
    super();
    this.tokenizer = tokenizer;
    this.temperature = temperature;
  }
  override _call(_input_ids: bigint[][], logits: Tensor): Tensor {
    const data = logits.data as Float32Array;
    const vocab = logits.dims[logits.dims.length - 1];
    const offset = data.length - vocab;
    let max = -Infinity;
    for (let i = 0; i < vocab; i++)
      if (data[offset + i] > max) max = data[offset + i];
    let sum = 0;
    const exps = new Float32Array(vocab);
    for (let i = 0; i < vocab; i++) {
      exps[i] = Math.exp(data[offset + i] - max);
      sum += exps[i];
    }
    // 与 TopPWarper 同法：只对概率 > 1e-7 的候选排序，再取前 256
    const cand: number[] = [];
    const floor = sum * 1e-7;
    for (let i = 0; i < vocab; i++) if (exps[i] > floor) cand.push(i);
    cand.sort((a, b) => exps[b] - exps[a]);
    const top = cand.slice(0, 256);
    let covered = 0;
    for (const i of top) covered += exps[i] / sum;
    const t = this.temperature > 0 ? this.temperature : 1;
    this.pending = {
      temperature: this.temperature,
      entries: top.map((i, rank) => ({
        id: i,
        logit: data[offset + i] * t,
        ...(rank < 32
          ? { text: this.tokenizer.decode([i], { skip_special_tokens: false }) }
          : {}),
      })),
      restCount: vocab - top.length,
      restMass: Math.max(0, 1 - covered),
    };
    return logits;
  }
  /** 与 TraceRecorder.onToken 配对：取走本步快照 */
  take(): DeepCapture | null {
    const p = this.pending;
    this.pending = null;
    return p;
  }
}

/** 真实 Top-P（nucleus）过滤：当前 transformers.js 版本未实现 top_p，这里自实现。
 *  排在温度之后：保留累计概率达到 p 的最小候选集，其余 logits 置 -Inf。 */
export class TopPWarper extends LogitsProcessor {
  private p: number;
  constructor(p: number) {
    super();
    this.p = p;
  }
  override _call(_input_ids: bigint[][], logits: Tensor): Tensor {
    if (this.p >= 1) return logits;
    const data = logits.data as Float32Array;
    const vocab = logits.dims[logits.dims.length - 1];
    const offset = data.length - vocab;
    let max = -Infinity;
    for (let i = 0; i < vocab; i++)
      if (data[offset + i] > max) max = data[offset + i];
    let sum = 0;
    const exps = new Float32Array(vocab);
    for (let i = 0; i < vocab; i++) {
      exps[i] = Math.exp(data[offset + i] - max);
      sum += exps[i];
    }
    // 只收集概率 > 1e-7 的候选再排序（核心集外的尾部无需参与）
    const cand: number[] = [];
    const floor = sum * 1e-7;
    for (let i = 0; i < vocab; i++) if (exps[i] > floor) cand.push(i);
    cand.sort((a, b) => exps[b] - exps[a]);
    let cum = 0;
    const keep = new Set<number>();
    for (const i of cand) {
      keep.add(i);
      cum += exps[i] / sum;
      if (cum >= this.p) break;
    }
    for (let i = 0; i < vocab; i++) {
      if (!keep.has(i)) data[offset + i] = -Infinity;
    }
    return logits;
  }
}

/** 只读记录器：不改动 logits，记录每步采样分布的 top-k/精确熵/选中概率。
 *  排在处理链最后（温度、Top-P 之后）= 真实采样分布。 */
export class TraceRecorder extends LogitsProcessor {
  steps: TokenStep[] = [];
  private pending: ReturnType<typeof analyzeLogits> | null = null;
  private lastT = 0;
  private genIds: number[] = [];
  private tokenizer: PreTrainedTokenizer;
  constructor(tokenizer: PreTrainedTokenizer) {
    super();
    this.tokenizer = tokenizer;
  }
  override _call(_input_ids: bigint[][], logits: Tensor): Tensor {
    const data = logits.data as Float32Array;
    const vocab = logits.dims[logits.dims.length - 1];
    this.pending = analyzeLogits(data.subarray(data.length - vocab), TOP_K);
    return logits;
  }
  /** streamer 拿到实际选中的 token id，与 pending 分布配对成一步 */
  onToken(id: number): TokenStep | null {
    const p = this.pending;
    if (!p) return null;
    this.pending = null;
    const now = performance.now();
    const dt = this.lastT ? now - this.lastT : 0;
    this.lastT = now;
    this.genIds.push(id);
    // 窗口差分解码：多字节字符可能跨 token，用最近 8 个 token 的上下文解码出本 token 文本
    const win = this.genIds.slice(-8);
    const withCur = this.tokenizer.decode(win, { skip_special_tokens: false });
    const withoutCur =
      win.length > 1
        ? this.tokenizer.decode(win.slice(0, -1), {
            skip_special_tokens: false,
          })
        : "";
    const text = withCur.startsWith(withoutCur)
      ? withCur.slice(withoutCur.length)
      : this.tokenizer.decode([id], { skip_special_tokens: false });
    const step: TokenStep = {
      id,
      text,
      prob: p.probOf(id),
      topk: p.topk.map((c) => ({
        ...c,
        text: this.tokenizer.decode([c.id], { skip_special_tokens: false }),
      })),
      entropy: p.entropy,
      dt,
    };
    this.steps.push(step);
    return step;
  }
}
