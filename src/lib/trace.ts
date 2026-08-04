/** Token 生成记录（TokenTrace）：Observe/Replay 的数据根基。
 *  一切数值来自真实推理（softmax 后、采样前的分布），绝不伪造。 */

import type { DeepCapture } from "./microscope";
import type { AgentEvent } from "./agentTrace";

export interface TokenCandidate {
  id: number;
  text: string;
  prob: number;
}

/** 单步生成记录：一个 token 的「出生档案」 */
export interface TokenStep {
  /** 选中 token 的 id 与解码文本 */
  id: number;
  text: string;
  /** 选中 token 在采样分布中的精确概率（全量 softmax） */
  prob: number;
  /** top-k 候选（按概率降序，k=8），含被选中者时其 prob 一致 */
  topk: TokenCandidate[];
  /** 该步分布的精确熵（nats）：越大表示候选分布越分散 */
  entropy: number;
  /** 该步耗时 ms */
  dt: number;
  /** 深度采集（E5a，默认关）：top-256 采样前 logits 快照 */
  deep?: DeepCapture;
}

/** 流水线阶段真实耗时（ms）。只记录能真实测到的三段：
 *  tokenize = prompt 编码；prefill = 提交推理到首 token；decode = 首 token 到结束。
 *  采样耗时无法与前向分离，不单独估造。 */
export interface PipelineTiming {
  tokenizeMs: number;
  prefillMs: number;
  decodeMs: number;
}

/** 一次生成的完整记录 */
export interface GenerationTrace {
  modelId: string;
  params: { temperature: number; topP: number; seed?: number | null };
  /** prompt 部分的 token ids（分岔重生成需要精确前缀） */
  promptIds: number[];
  steps: TokenStep[];
  device: "webgpu" | "wasm";
  /** 流水线阶段耗时（旧 trace/导入 Replay 可能缺失） */
  pipeline?: PipelineTiming;
  /** Agent 事件（E4a 加法式扩展）：工具调用/结果/决策点，锚定在 token 时间线上 */
  agent?: AgentEvent[];
  /** 开放扩展（Observation Trace v1）：各 runtime 命名空间自携数据
   *  （如 "openai.reasoning" / "anthropic.thinking"），导入/导出原样保留不解释。 */
  extensions?: Record<string, unknown>;
}

/** 分岔树节点：root 为原始生成，子节点为「从 forkStep 改选 forcedId 后重写」 */
export interface BranchNode {
  /** 在父分支 steps 中的分岔步序号 */
  forkStep: number;
  /** 被强制改选的 token id（root 为 -1） */
  forcedId: number;
  /** 改选 token 的展示文本 */
  forcedText: string;
  trace: GenerationTrace | null;
  children: BranchNode[];
}

/** 分岔树总节点数上限（含原始） */
export const MAX_BRANCH_NODES = 8;
/** 出生卡候选数 */
export const TOP_K = 8;

export function countNodes(node: BranchNode): number {
  return 1 + node.children.reduce((n, c) => n + countNodes(c), 0);
}

/** 对一行 logits 做全量 softmax：返回精确熵 + top-k 候选（id/prob）+ 概率查询用的 exps/sum。
 *  数值稳定（减最大值）；top-k 用单次扫描的部分选择，不做全量排序。 */
export function analyzeLogits(
  row: Float32Array | number[],
  k = TOP_K,
): {
  entropy: number;
  topk: { id: number; prob: number }[];
  probOf: (id: number) => number;
} {
  const n = row.length;
  let max = -Infinity;
  for (let i = 0; i < n; i++) if (row[i] > max) max = row[i];
  const exps = new Float32Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const e = Math.exp(row[i] - max);
    exps[i] = e;
    sum += e;
  }
  let entropy = 0;
  for (let i = 0; i < n; i++) {
    const p = exps[i] / sum;
    if (p > 0) entropy -= p * Math.log(p);
  }
  // 部分选择 top-k：维护一个小顶数组（k 很小，插入即可）
  const ids: number[] = [];
  const vals: number[] = [];
  for (let i = 0; i < n; i++) {
    const v = exps[i];
    if (vals.length < k) {
      let j = vals.length;
      ids.push(i);
      vals.push(v);
      while (j > 0 && vals[j] > vals[j - 1]) {
        [vals[j], vals[j - 1]] = [vals[j - 1], vals[j]];
        [ids[j], ids[j - 1]] = [ids[j - 1], ids[j]];
        j--;
      }
    } else if (v > vals[k - 1]) {
      let j = k - 1;
      vals[j] = v;
      ids[j] = i;
      while (j > 0 && vals[j] > vals[j - 1]) {
        [vals[j], vals[j - 1]] = [vals[j - 1], vals[j]];
        [ids[j], ids[j - 1]] = [ids[j - 1], ids[j]];
        j--;
      }
    }
  }
  return {
    entropy,
    topk: ids.map((id, i) => ({ id, prob: vals[i] / sum })),
    probOf: (id: number) => exps[id] / sum,
  };
}

/** 熵 → 0..1 的不确定性度量（用于正文热力着色，描述统计）。
 *  归一化基准 ln(50)≈3.9：有效候选超过 ~50 个即视为分布极分散。 */
export function entropyLevel(entropy: number): number {
  const norm = entropy / Math.log(50);
  return Math.min(1, Math.max(0, norm));
}

/** 模型控制 token（<think>、</think>、<｜end_of_sentence｜>、<|im_end|> 等各家格式）：
 *  真实生成的一步，但不是给人读的正文；返回人话标签，非控制 token 返回 null */
export function specialTokenLabel(text: string): string | null {
  const t = text.trim();

  // Thinking 标签
  if (/^<\/?think(ing)?>$/.test(t)) {
    return t.startsWith("</") ? "推理段结束" : "推理段开始";
  }

  // Reflection 标签
  if (/^<\/?reflection>$/.test(t)) {
    return t.startsWith("</") ? "反思段结束" : "反思段开始";
  }

  // Planning 标签
  if (/^<\/?plan(ning)?>$/.test(t)) {
    return t.startsWith("</") ? "规划段结束" : "规划段开始";
  }

  // Search 标签
  if (/^<\/?search>$/.test(t)) {
    return t.startsWith("</") ? "搜索段结束" : "搜索段开始";
  }

  // Code 标签
  if (/^<\/?code>$/.test(t)) {
    return t.startsWith("</") ? "代码段结束" : "代码段开始";
  }

  // Summary 标签
  if (/^<\/?summary>$/.test(t)) {
    return t.startsWith("</") ? "总结段结束" : "总结段开始";
  }

  // 通用结束标记
  const m = /^<[｜|]([a-zA-Z0-9_▁\- ]+)[｜|]>$/.exec(t);
  if (m) return m[1];

  if (/^<\|?(end_?of_?(text|sentence)|im_end|eos|eot_id)\|?>$/i.test(t)) {
    return t.replace(/[<>|｜]/g, "");
  }

  return null;
}

export interface TagSegment {
  /** 标签类型 */
  type: string;
  /** 开始位置（含开始标签） */
  start: number;
  /** 结束位置（含结束标签） */
  end: number;
  /** 是否已闭合 */
  closed: boolean;
}

export interface PhaseSegments {
  /** 推理段 [start, end)（含控制 token 本身），无推理段为 null */
  think: { start: number; end: number } | null;
  /** 回答阶段起点 */
  answerStart: number;
  /** 所有标签段（扩展支持多种标签） */
  tags?: TagSegment[];
}

/** 按 <think>…</think> 控制 token 划分生成阶段。
 *  R1 类模型可能不发 <think> 开头、直接输出到 </think>：此时推理段从 0 开始。
 *  支持多种标签类型：thinking, reflection, planning 等 */
export function splitPhases(texts: string[], modelId?: string): PhaseSegments {
  let open = -1;
  let close = -1;
  const tags: TagSegment[] = [];

  // 检测所有支持的标签类型
  const openTags: Array<{ type: string; start: number }> = [];

  for (let i = 0; i < texts.length; i++) {
    const t = texts[i].trim();

    // 优先处理 thinking 标签（向后兼容）
    if (open < 0 && /^<think(ing)?>$/.test(t)) {
      open = i;
      openTags.push({ type: "thinking", start: i });
    }

    if (/^<\/think(ing)?>$/.test(t)) {
      close = i;
      // 记录标签段
      const openTag = openTags.find(tag => tag.type === "thinking");
      if (openTag) {
        tags.push({
          type: "thinking",
          start: openTag.start,
          end: i + 1,
          closed: true,
        });
        openTags.splice(openTags.indexOf(openTag), 1);
      }
      break;
    }

    // 检测其他标签类型
    if (/^<reflection>$/.test(t)) {
      openTags.push({ type: "reflection", start: i });
    } else if (/^<\/reflection>$/.test(t)) {
      const openTag = openTags.find(tag => tag.type === "reflection");
      if (openTag) {
        tags.push({
          type: "reflection",
          start: openTag.start,
          end: i + 1,
          closed: true,
        });
        openTags.splice(openTags.indexOf(openTag), 1);
      }
    } else if (/^<plan(ning)?>$/.test(t)) {
      openTags.push({ type: "planning", start: i });
    } else if (/^<\/plan(ning)?>$/.test(t)) {
      const openTag = openTags.find(tag => tag.type === "planning");
      if (openTag) {
        tags.push({
          type: "planning",
          start: openTag.start,
          end: i + 1,
          closed: true,
        });
        openTags.splice(openTags.indexOf(openTag), 1);
      }
    }
  }

  // 未闭合的标签
  for (const openTag of openTags) {
    tags.push({
      type: openTag.type,
      start: openTag.start,
      end: texts.length,
      closed: false,
    });
  }

  if (close >= 0) {
    return {
      think: { start: Math.max(open, 0), end: close + 1 },
      answerStart: close + 1,
      tags,
    };
  }
  if (open >= 0) {
    return {
      think: { start: open, end: texts.length },
      answerStart: texts.length,
      tags,
    };
  }
  return { think: null, answerStart: 0, tags };
}

/** 出生卡「为什么选它」人话解释：全部由真实概率与参数模板化生成 */
export function explainStep(
  step: TokenStep,
  temperature: number,
): string {
  const pct = (p: number) => `${(p * 100).toFixed(p >= 0.1 ? 0 : 1)}%`;
  const top = step.topk[0];
  const isTop = top && step.id === top.id;
  if (temperature === 0) {
    return `贪心模式（温度 0）：永远选概率第一名，这里就是「${step.text.trim() || step.text}」（${pct(step.prob)}）。`;
  }
  if (isTop && step.prob >= 0.8) {
    return `分布高度集中：「${step.text.trim() || step.text}」独占 ${pct(step.prob)}，几乎没有悬念。`;
  }
  const rivals = step.topk
    .slice(0, 3)
    .map((c) => `「${c.text.trim() || c.text}」${pct(c.prob)}`)
    .join("、");
  if (isTop) {
    return `温度 ${temperature} 下前几名 ${rivals} 有竞争，这次抽签抽中了第一名。`;
  }
  return `温度 ${temperature} 让分布变平：${rivals}，这次没有选第一名，而是抽中了「${step.text.trim() || step.text}」（${pct(step.prob)}）。`;
}

/** 限制会话内 trace 数量：只保留最近 keep 条消息的 trace（返回被清除数量） */
export function trimTraces<T extends { trace?: GenerationTrace | null }>(
  messages: T[],
  keep = 20,
): number {
  let cleared = 0;
  const withTrace = messages.filter((m) => m.trace);
  const excess = withTrace.length - keep;
  if (excess > 0) {
    for (let i = 0, c = 0; i < messages.length && c < excess; i++) {
      if (messages[i].trace) {
        messages[i].trace = undefined;
        c++;
        cleared++;
      }
    }
  }
  return cleared;
}

/** .aitrace 当前导出格式标识 */
export const AITRACE_FORMAT = "aitrace/v2";
/** 旧版 Replay 格式标识（导入永久兼容） */
export const REPLAY_V1_FORMAT = "browser-ai-replay/v1";

/** Trace Scope：本次记录什么 / 不记录什么。
 *  与 exportReplay 的字段同源定义，UI 与 .aitrace 格式永远一致；
 *  recorded[].key 必须是导出 JSON 的顶层字段名（单测校验）。 */
export const AITRACE_SCOPE = {
  recorded: [
    { key: "prompt", label: "输入与提示词" },
    { key: "params", label: "采样配置（温度 / Top-P / seed）" },
    { key: "modelId", label: "模型标识" },
    { key: "steps", label: "每一步选中 token 与 Top-k 候选分布" },
    { key: "env", label: "运行后端与环境（WebGPU / WASM）" },
    { key: "promptIds", label: "prompt token ids（可复现前缀）" },
  ],
  optional: [
    { key: "pipeline", label: "分段耗时（tokenize / prefill / decode）" },
    { key: "branches", label: "干预记录与分岔树" },
    { key: "annotationsRuleset", label: "标注规则集" },
    { key: "agent", label: "Agent 事件（工具调用 / 结果 / 决策点）" },
    { key: "extensions", label: "开放扩展（各 runtime 命名空间自携数据，原样保留）" },
  ],
  notRecorded: [
    "模型的因果推理过程",
    "未公开的内部张量（attention / activation）",
  ],
} as const;

/** Export .aitrace v2：可复现实验数据（含 seed 时导入方可精确复现）。
 *  相比 v1 增加 schema/source/env 与 branches（分岔树），字段只增不改；
 *  env 只收录真实可测的信息（ua），拿不到的（gpu 型号等）省略而不是编。
 *  annotationsRuleset：随文件携带规则集，导入方看到完全相同的标注。 */
export function exportReplay(
  trace: GenerationTrace,
  prompt: string,
  annotationsRuleset?: unknown[],
  branches?: BranchNode[],
): string {
  return JSON.stringify(
    {
      format: AITRACE_FORMAT,
      schema: 2,
      source: { app: "browser-ai-observatory" },
      env: {
        device: trace.device,
        ...(typeof navigator !== "undefined" && navigator.userAgent
          ? { ua: navigator.userAgent }
          : {}),
      },
      prompt,
      modelId: trace.modelId,
      params: trace.params,
      device: trace.device,
      promptIds: trace.promptIds,
      steps: trace.steps,
      ...(trace.pipeline ? { pipeline: trace.pipeline } : {}),
      ...(trace.agent && trace.agent.length > 0 ? { agent: trace.agent } : {}),
      ...(trace.extensions && Object.keys(trace.extensions).length > 0
        ? { extensions: trace.extensions }
        : {}),
      ...(branches && branches.length > 0 ? { branches } : {}),
      ...(annotationsRuleset ? { annotationsRuleset } : {}),
    },
    null,
    2,
  );
}
