import { describe, expect, it } from "vitest";
import { classifyDualEnding, sharedPrefixView } from "./dualEnding";

describe("sharedPrefixView（C3.2 first-divergence 纯函数）", () => {
  const tok = (id: number, text: string) => ({ id, text });

  it("中途分歧：返回分歧位置与共享前缀文本", () => {
    const a = [tok(1, "天"), tok(2, "空"), tok(3, "是"), tok(4, "蓝")];
    const b = [tok(1, "天"), tok(2, "空"), tok(9, "为"), tok(4, "蓝")];
    const r = sharedPrefixView(a, b);
    expect(r.divergeIndex).toBe(2);
    expect(r.prefixText).toBe("天空");
  });

  it("完全一致：divergeIndex = -1，前缀为全文", () => {
    const a = [tok(1, "同"), tok(2, "样")];
    const r = sharedPrefixView(a, [...a]);
    expect(r.divergeIndex).toBe(-1);
    expect(r.prefixText).toBe("同样");
  });

  it("一条是另一条的前缀：分歧位置 = 短序列长度", () => {
    const a = [tok(1, "短")];
    const b = [tok(1, "短"), tok(2, "更长")];
    const r = sharedPrefixView(a, b);
    expect(r.divergeIndex).toBe(1);
    expect(r.prefixText).toBe("短");
  });

  it("首位即分歧：前缀为空", () => {
    const r = sharedPrefixView([tok(1, "甲")], [tok(2, "乙")]);
    expect(r.divergeIndex).toBe(0);
    expect(r.prefixText).toBe("");
  });
});

describe("classifyDualEnding", () => {
  it("结局走向不同 → different", () => {
    const r = classifyDualEnding(
      "因为水分子会散射蓝光，所以看起来是蓝色的。",
      "本质上是光的瑞利散射造成的视觉效果。",
    );
    expect(r.outcome).toBe("different");
    expect(r.basis).toContain("公共后缀");
  });

  it("末尾重新汇合 ≥12 字符 → converged", () => {
    const tail = "水对红光的吸收比蓝光更强所致。";
    const r = classifyDualEnding(`用词一：${tail}`, `另一种说法——${tail}`);
    expect(r.outcome).toBe("converged");
    expect(r.commonSuffixLen).toBeGreaterThanOrEqual(12);
  });

  it("结局过短 → degenerate 并说明依据", () => {
    const r = classifyDualEnding("完整的一条结局在这里。", "嗯。");
    expect(r.outcome).toBe("degenerate");
    expect(r.basis).toContain("非空白字符");
  });

  it("同一字符长重复 → degenerate", () => {
    const r = classifyDualEnding(
      "正常的一条结局文本内容。",
      `复读开始${"啊".repeat(12)}`,
    );
    expect(r.outcome).toBe("degenerate");
    expect(r.basis).toContain("连续重复");
  });

  it("空白不影响判定", () => {
    const tail = "结论完全相同的一段结尾文本";
    const r = classifyDualEnding(`A 前缀 ${tail}`, `B前缀\n${tail} `);
    expect(r.outcome).toBe("converged");
  });
});
