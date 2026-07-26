import { describe, expect, it } from "vitest";
import { calc, parseToolCall, runTool } from "./agentSpike";

describe("E4b spike：本地工具与工具调用解析", () => {
  it("calculator：四则运算、括号、小数、负号", () => {
    expect(calc("1+2*3")).toBe(7);
    expect(calc("(3+4)*2")).toBe(14);
    expect(calc("10/4")).toBe(2.5);
    expect(calc("-3+5")).toBe(2);
    expect(calc("1.5*2")).toBe(3);
  });

  it("calculator：非法输入抛出可读错误", () => {
    expect(() => calc("1+")).toThrow("不是数字");
    expect(() => calc("(1+2")).toThrow("右括号");
    expect(() => calc("1+2)x")).toThrow("多余内容");
  });

  it("parseToolCall：围栏 JSON 与裸 JSON 都可解析", () => {
    expect(
      parseToolCall('先算一下\n```json\n{"tool":"calculator","input":"1+1"}\n```'),
    ).toEqual({ kind: "call", tool: "calculator", input: "1+1" });
    expect(parseToolCall('{"tool":"now","input":""}')).toEqual({
      kind: "call",
      tool: "now",
      input: "",
    });
  });

  it("parseToolCall：无调用返回 none；坏 JSON 原样报错不修复", () => {
    expect(parseToolCall("普通回答，没有工具")).toEqual({ kind: "none" });
    const r = parseToolCall('{"tool":"calculator","input":1+1}');
    expect(r.kind).toBe("error");
    const r2 = parseToolCall('{"tool":"calculator"}');
    expect(r2.kind).toBe("error");
  });

  it("runTool：成功、失败、未知工具都如实返回", () => {
    expect(runTool("calculator", "2*8").output).toBe("16");
    const bad = runTool("calculator", "abc");
    expect(bad.ok).toBe(false);
    expect(bad.output).toContain("Error");
    const unknown = runTool("search", "x");
    expect(unknown.ok).toBe(false);
    expect(unknown.output).toContain("未知工具");
    expect(runTool("now", "").ok).toBe(true);
  });
});
