import { describe, it, expect } from "vitest";
import {
  splitThinking,
  stripThinking,
  finalizeUnclosedThinking,
} from "./thinking";

describe("stripThinking", () => {
  it("去掉思考段只留回答", () => {
    expect(stripThinking("<think>想</think>答案")).toBe("答案");
  });

  it("没有思考段原样返回", () => {
    expect(stripThinking("你好")).toBe("你好");
  });

  it("只有思考没有回答时退回思考内容", () => {
    expect(stripThinking("<think>只有想法")).toBe("只有想法");
  });
});

describe("finalizeUnclosedThinking", () => {
  it("未闭合思考在结束时转为正式回答", () => {
    expect(finalizeUnclosedThinking("<think>\n这就是回答")).toBe("这就是回答");
  });

  it("已闭合思考保持不变", () => {
    const s = "<think>想</think>答案";
    expect(finalizeUnclosedThinking(s)).toBe(s);
  });

  it("没有思考段保持不变", () => {
    expect(finalizeUnclosedThinking("答案")).toBe("答案");
  });
});

describe("splitThinking", () => {
  it("没有思考段时原样返回", () => {
    expect(splitThinking("你好")).toEqual({
      thinking: null,
      answer: "你好",
      done: true,
    });
  });

  it("完整思考段被拆分", () => {
    const r = splitThinking("<think>先想一下</think>答案是 42");
    expect(r.thinking).toBe("先想一下");
    expect(r.answer).toBe("答案是 42");
    expect(r.done).toBe(true);
  });

  it("未闭合的思考段视为思考中", () => {
    const r = splitThinking("<think>正在思考");
    expect(r.thinking).toBe("正在思考");
    expect(r.answer).toBe("");
    expect(r.done).toBe(false);
  });

  it("空内容", () => {
    expect(splitThinking("")).toEqual({ thinking: null, answer: "", done: true });
  });

  it("思考内容里包含尖括号文本不误判", () => {
    const r = splitThinking("<think>比较 a<b 与 b>c</think>结论");
    expect(r.thinking).toBe("比较 a<b 与 b>c");
    expect(r.answer).toBe("结论");
  });

  it("思考段前后空白被裁剪", () => {
    const r = splitThinking("<think>\n想法\n</think>\n\n答案");
    expect(r.thinking).toBe("想法");
    expect(r.answer).toBe("答案");
  });
});
