import { describe, expect, it } from "vitest";
import { decaySummary, latencyStats } from "./latencyStats";

describe("latencyStats", () => {
  it("样本 <8 返回 null（不硬算）", () => {
    expect(latencyStats([10, 10, 10])).toBeNull();
    expect(latencyStats([])).toBeNull();
  });

  it("过滤无效 dt（≤0）后不足 8 个也返回 null", () => {
    expect(latencyStats([0, 0, 0, 0, 10, 10, 10, 10, 10])).toBeNull();
  });

  it("均匀序列 p50=p95=定值", () => {
    const s = latencyStats(Array(20).fill(25));
    expect(s).not.toBeNull();
    expect(s!.p50).toBe(25);
    expect(s!.p95).toBe(25);
    expect(s!.n).toBe(20);
  });

  it("尾部慢样本抬高 p95 但不动 p50", () => {
    const dts = [...Array(19).fill(20), 200];
    const s = latencyStats(dts)!;
    expect(s.p50).toBe(20);
    expect(s.p95).toBeGreaterThan(20);
  });
});

describe("decaySummary", () => {
  it("样本 <32 返回 null", () => {
    expect(decaySummary(Array(31).fill(10))).toBeNull();
  });

  it("匀速序列四个窗口吞吐一致、减速比 1", () => {
    const d = decaySummary(Array(64).fill(20))!;
    expect(d.samples).toHaveLength(4);
    for (const s of d.samples) expect(s.tps).toBeCloseTo(50);
    expect(d.slowdown).toBeCloseTo(1);
  });

  it("越写越慢：末窗口吞吐低于首窗口、减速比 >1", () => {
    // 首 32 个 dt=10ms（100 tok/s），末 32 个 dt=20ms（50 tok/s）
    const dts = [...Array(32).fill(10), ...Array(32).fill(20)];
    const d = decaySummary(dts)!;
    expect(d.samples[0].tps).toBeCloseTo(100);
    expect(d.samples[3].tps).toBeCloseTo(50);
    expect(d.slowdown).toBeCloseTo(2);
  });

  it("窗口标签覆盖完整序列", () => {
    const d = decaySummary(Array(100).fill(10))!;
    expect(d.samples[0].label).toBe("1–25");
    expect(d.samples[3].label).toBe("76–100");
  });
});
