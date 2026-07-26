import { describe, expect, it } from "vitest";
import {
  answerExcerpt,
  answerStart,
  confidenceBucket,
  plainSpeed,
  thinkingStepCount,
} from "./plainWords";
import type { TokenStep } from "./trace";

function mkStep(text: string, prob = 0.9): TokenStep {
  return { id: 1, text, prob, topk: [], entropy: 0.5, dt: 10 };
}

describe("confidenceBucket", () => {
  it("按真实 prob 分档", () => {
    expect(confidenceBucket(0.95)).toBe("high");
    expect(confidenceBucket(0.85)).toBe("high");
    expect(confidenceBucket(0.6)).toBe("mid");
    expect(confidenceBucket(0.3)).toBe("low");
    expect(confidenceBucket(0.05)).toBe("guess");
  });
});

describe("answerStart / thinkingStepCount", () => {
  it("无思考段从 0 开始", () => {
    const steps = [mkStep("你"), mkStep("好")];
    expect(answerStart(steps)).toBe(0);
    expect(thinkingStepCount(steps)).toBe(0);
  });
  it("</think> 之后为正式回答", () => {
    const steps = [mkStep("<think>"), mkStep("想"), mkStep("</think>"), mkStep("答")];
    expect(answerStart(steps)).toBe(3);
    expect(thinkingStepCount(steps)).toBe(3);
  });
});

describe("answerExcerpt", () => {
  it("空回答返回 null", () => {
    const steps = [mkStep("<think>"), mkStep("</think>")];
    expect(answerExcerpt(steps)).toBeNull();
  });
  it("按字符预算截取连续步", () => {
    const steps = [mkStep("abc"), mkStep("def"), mkStep("ghi")];
    const ex = answerExcerpt(steps, 5);
    expect(ex).toEqual({ from: 0, to: 1 });
  });
  it("跳过思考段", () => {
    const steps = [mkStep("<think>"), mkStep("想想"), mkStep("</think>"), mkStep("答案")];
    expect(answerExcerpt(steps, 80)).toEqual({ from: 3, to: 3 });
  });
});

describe("plainSpeed", () => {
  it("无实测诚实缺席", () => {
    expect(plainSpeed(null)).toBeNull();
    expect(plainSpeed(12.34)).toBe("12.3 词/秒");
  });
});
