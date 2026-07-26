import { describe, expect, it } from "vitest";
import { momentReadout } from "./momentCard";
import type { TokenStep } from "./trace";

const step = (
  prob: number,
  top2: number,
  dt: number,
  entropy = 1,
): TokenStep => ({
  id: 1,
  text: "天",
  prob,
  topk: [
    { id: 1, text: "天", prob },
    { id: 2, text: "地", prob: top2 },
  ],
  entropy,
  dt,
});

describe("momentReadout", () => {
  it("空/越界返回 null", () => {
    expect(momentReadout([], 0)).toBeNull();
    expect(momentReadout([step(0.5, 0.3, 10)], 3)).toBeNull();
  });

  it("确定度分档与量条来自真实 top-1 概率", () => {
    const hi = momentReadout([step(0.92, 0.03, 10)], 0)!;
    expect(hi.certainty.level).toBe("高");
    expect(hi.certainty.bars).toBe(4);
    expect(hi.certainty.pct).toBe("92%");
    const lo = momentReadout([step(0.2, 0.18, 10)], 0)!;
    expect(lo.certainty.level).toBe("低");
    expect(lo.certainty.bars).toBe(1);
  });

  it("几乎并列仅在差距 < 5% 时出现（与犹豫口径一致）", () => {
    const close = momentReadout([step(0.31, 0.29, 10)], 0)!;
    expect(close.candidates.relation).toContain("几乎并列");
    const far = momentReadout([step(0.6, 0.2, 10)], 0)!;
    expect(far.candidates.relation).toContain("领先明显");
  });

  it("节奏 = 当步耗时 vs 全程中位数；无 dt 记录时缺席", () => {
    const steps = [step(0.5, 0.3, 10), step(0.5, 0.3, 10), step(0.5, 0.3, 30)];
    const r = momentReadout(steps, 2)!;
    expect(r.pace!.ratio).toBe(3);
    expect(r.pace!.text).toContain("变慢了 3.0 倍");
    const none = momentReadout([step(0.5, 0.3, 0)], 0)!;
    expect(none.pace).toBeNull();
  });
});
