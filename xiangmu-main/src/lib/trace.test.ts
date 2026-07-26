import { describe, it, expect } from "vitest";
import {
  analyzeLogits,
  entropyLevel,
  explainStep,
  countNodes,
  exportReplay,
  AITRACE_SCOPE,
  specialTokenLabel,
  splitPhases,
  MAX_BRANCH_NODES,
  type BranchNode,
  type TokenStep,
} from "./trace";

function step(partial: Partial<TokenStep> = {}): TokenStep {
  return {
    id: 1,
    text: "漂亮",
    prob: 0.29,
    topk: [
      { id: 0, text: "美丽", prob: 0.32 },
      { id: 1, text: "漂亮", prob: 0.29 },
      { id: 2, text: "好看", prob: 0.24 },
    ],
    entropy: 1.5,
    dt: 40,
    ...partial,
  };
}

describe("analyzeLogits", () => {
  it("均匀分布的熵等于 ln(n)，每个概率为 1/n", () => {
    const { entropy, topk, probOf } = analyzeLogits([0, 0, 0, 0], 2);
    expect(entropy).toBeCloseTo(Math.log(4), 5);
    expect(topk).toHaveLength(2);
    expect(probOf(3)).toBeCloseTo(0.25, 5);
  });

  it("top-k 按概率降序且概率精确", () => {
    // softmax([2,1,0]) = e^2/(e^2+e^1+1) ...
    const { topk } = analyzeLogits([0, 2, 1], 3);
    const denom = Math.exp(2) + Math.exp(1) + 1;
    expect(topk.map((c) => c.id)).toEqual([1, 2, 0]);
    expect(topk[0].prob).toBeCloseTo(Math.exp(2) / denom, 5);
    expect(topk[1].prob).toBeCloseTo(Math.exp(1) / denom, 5);
  });

  it("概率和为 1，确定性分布熵趋近 0", () => {
    const { entropy, topk } = analyzeLogits([100, 0, 0], 3);
    expect(entropy).toBeCloseTo(0, 5);
    expect(topk[0].prob).toBeCloseTo(1, 5);
  });

  it("数值稳定：大 logits 不产生 NaN", () => {
    const { entropy, probOf } = analyzeLogits([1e4, 1e4 - 1], 2);
    expect(Number.isFinite(entropy)).toBe(true);
    expect(Number.isFinite(probOf(0))).toBe(true);
  });

  it("-Infinity（被 Top-P 裁掉的）概率为 0", () => {
    const { probOf } = analyzeLogits([1, -Infinity, 1], 3);
    expect(probOf(1)).toBe(0);
  });
});

describe("entropyLevel", () => {
  it("熵 0 → 0，超过 ln(50) 封顶为 1", () => {
    expect(entropyLevel(0)).toBe(0);
    expect(entropyLevel(Math.log(50))).toBeCloseTo(1, 5);
    expect(entropyLevel(10)).toBe(1);
  });
});

describe("explainStep", () => {
  it("温度 0 解释为贪心", () => {
    expect(explainStep(step(), 0)).toContain("贪心");
  });
  it("选中非第一名时解释抽签结果", () => {
    const s = explainStep(step(), 0.9);
    expect(s).toContain("漂亮");
    expect(s).toContain("美丽");
    expect(s).toContain("0.9");
  });
  it("高置信时解释为几乎没有悬念", () => {
    const s = step({
      id: 0,
      text: "美丽",
      prob: 0.95,
      topk: [{ id: 0, text: "美丽", prob: 0.95 }],
    });
    expect(explainStep(s, 0.7)).toContain("没有悬念");
  });
});

describe("countNodes", () => {
  it("统计分岔树全部节点", () => {
    const leaf: BranchNode = {
      forkStep: 2,
      forcedId: 5,
      forcedText: "白",
      trace: null,
      children: [],
    };
    const root: BranchNode = {
      forkStep: 0,
      forcedId: -1,
      forcedText: "",
      trace: null,
      children: [leaf, { ...leaf, children: [{ ...leaf }] }],
    };
    expect(countNodes(root)).toBe(4);
    expect(MAX_BRANCH_NODES).toBe(8);
  });
});

describe("exportReplay", () => {
  it("导出 aitrace/v2：含 schema/source/env 与 prompt/模型/参数/步骤", () => {
    const json = JSON.parse(
      exportReplay(
        {
          modelId: "m",
          params: { temperature: 0.7, topP: 0.95, seed: 42 },
          promptIds: [1, 2],
          steps: [step()],
          device: "webgpu",
        },
        "你好",
      ),
    );
    expect(json.format).toBe("aitrace/v2");
    expect(json.schema).toBe(2);
    expect(json.source.app).toBe("browser-ai-observatory");
    expect(json.env.device).toBe("webgpu");
    expect(json.prompt).toBe("你好");
    expect(json.params.seed).toBe(42);
    expect(json.steps).toHaveLength(1);
    expect(json.branches).toBeUndefined();
  });

  it("携带分岔树 branches；空分岔省略字段", () => {
    const trace = {
      modelId: "m",
      params: { temperature: 1, topP: 1, seed: null },
      promptIds: [1],
      steps: [step()],
      device: "wasm" as const,
    };
    const branch = {
      forkStep: 0,
      forcedId: 9,
      forcedText: "另",
      trace,
      children: [],
    };
    const json = JSON.parse(exportReplay(trace, "p", undefined, [branch]));
    expect(json.branches).toHaveLength(1);
    expect(json.branches[0].forcedId).toBe(9);
    const empty = JSON.parse(exportReplay(trace, "p", undefined, []));
    expect(empty.branches).toBeUndefined();
  });

  it("Trace Scope 与导出字段同源：recorded key 均在导出 JSON 中，optional key 为合法顶层字段", () => {
    const trace = {
      modelId: "m",
      params: { temperature: 0.7, topP: 0.95, seed: 42 },
      promptIds: [1],
      steps: [step()],
      device: "webgpu" as const,
      pipeline: { tokenizeMs: 1, prefillMs: 2, decodeMs: 3 },
      agent: [{ type: "decision_point" as const, atStep: 0 }],
      extensions: { "openai.reasoning": { effort: "high" } },
    };
    const branch = {
      forkStep: 0,
      forcedId: 9,
      forcedText: "另",
      trace,
      children: [],
    };
    const json = JSON.parse(exportReplay(trace, "p", [], [branch]));
    for (const f of AITRACE_SCOPE.recorded) {
      expect(json, `recorded 字段 ${f.key} 应存在于导出`).toHaveProperty(f.key);
    }
    for (const f of AITRACE_SCOPE.optional) {
      expect(json, `optional 字段 ${f.key} 在数据存在时应导出`).toHaveProperty(f.key);
    }
  });
});

describe("specialTokenLabel", () => {
  it("识别 think 控制标签", () => {
    expect(specialTokenLabel("<think>")).toBe("推理段开始");
    expect(specialTokenLabel("</think>")).toBe("推理段结束");
    expect(specialTokenLabel(" </think> ")).toBe("推理段结束");
  });
  it("识别各家结束 token", () => {
    expect(specialTokenLabel("<｜end▁of▁sentence｜>")).toBe("end▁of▁sentence");
    expect(specialTokenLabel("<|im_end|>")).toBe("im_end");
    expect(specialTokenLabel("<|endoftext|>")).toBe("endoftext");
  });
  it("普通文本返回 null", () => {
    expect(specialTokenLabel("天空")).toBeNull();
    expect(specialTokenLabel("<div>")).toBeNull();
  });
});

describe("splitPhases", () => {
  it("无思考标签时全部是回答", () => {
    const r = splitPhases(["天", "空"]);
    expect(r.think).toBeNull();
    expect(r.answerStart).toBe(0);
  });
  it("R1 式无开标签、以 </think> 收束", () => {
    const r = splitPhases(["想", "一", "下", "</think>", "答", "案"]);
    expect(r.think).toEqual({ start: 0, end: 4 });
    expect(r.answerStart).toBe(4);
  });
  it("带 <think> 开标签", () => {
    const r = splitPhases(["<think>", "推", "理", "</think>", "答"]);
    expect(r.think).toEqual({ start: 0, end: 4 });
    expect(r.answerStart).toBe(4);
  });
  it("生成中未闭合时思考段延伸到末尾", () => {
    const r = splitPhases(["<think>", "推", "理"]);
    expect(r.think).toEqual({ start: 0, end: 3 });
    expect(r.answerStart).toBe(3);
  });
});
