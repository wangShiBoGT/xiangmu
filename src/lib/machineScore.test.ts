import { describe, expect, it } from "vitest";
import {
  SPEED_CEILING_TPS,
  computeMachineScore,
  dtCV,
} from "./machineScore";

describe("dtCV", () => {
  it("样本不足返回 null", () => {
    expect(dtCV([])).toBeNull();
    expect(dtCV([10, 10, 10])).toBeNull();
    // dt=0 的批量回报步不计入有效样本
    expect(dtCV([0, 0, 0, 0, 0, 0, 10, 10])).toBeNull();
  });

  it("完全均匀的耗时 cv=0", () => {
    expect(dtCV(Array(20).fill(50))).toBe(0);
  });

  it("波动越大 cv 越大", () => {
    const stable = dtCV([...Array(20).fill(50), 55]) ?? NaN;
    const jittery = dtCV([...Array(20).fill(50), 500]) ?? NaN;
    expect(jittery).toBeGreaterThan(stable);
  });
});

describe("computeMachineScore", () => {
  const dts = Array(48).fill(20);

  it("速度天花板处 speed 分项为 1", () => {
    const s = computeMachineScore({
      tps: SPEED_CEILING_TPS,
      dts,
      device: "webgpu",
      fp16: true,
    });
    expect(s.parts.speed).toBeCloseTo(1, 5);
    expect(s.total).toBe(10000);
    expect(s.grade).toBe("S");
  });

  it("tps=0 时 speed 分项为 0，总分只剩后端+稳定性", () => {
    const s = computeMachineScore({ tps: 0, dts, device: "webgpu", fp16: true });
    expect(s.parts.speed).toBe(0);
    expect(s.total).toBe(Math.round(10000 * (0.25 + 0.15)));
  });

  it("wasm 后端明显低于 webgpu", () => {
    const gpu = computeMachineScore({ tps: 50, dts, device: "webgpu", fp16: true });
    const cpu = computeMachineScore({ tps: 50, dts, device: "wasm", fp16: false });
    expect(gpu.total).toBeGreaterThan(cpu.total);
    expect(cpu.parts.backend).toBe(0.4);
  });

  it("无 fp16 的 webgpu 小幅扣分", () => {
    const a = computeMachineScore({ tps: 50, dts, device: "webgpu", fp16: true });
    const b = computeMachineScore({ tps: 50, dts, device: "webgpu", fp16: false });
    expect(a.total).toBeGreaterThan(b.total);
    expect(b.parts.backend).toBe(0.85);
  });

  it("耗时序列不足时稳定性给中性值 0.5", () => {
    const s = computeMachineScore({ tps: 50, dts: [], device: "webgpu", fp16: true });
    expect(s.cv).toBeNull();
    expect(s.parts.steady).toBe(0.5);
  });

  it("抖动大的序列稳定性更低", () => {
    const stable = computeMachineScore({ tps: 50, dts, device: "webgpu", fp16: true });
    const jittery = computeMachineScore({
      tps: 50,
      dts: dts.map((d: number, i: number) => (i % 2 ? d * 6 : d)),
      device: "webgpu",
      fp16: true,
    });
    expect(stable.parts.steady).toBeGreaterThan(jittery.parts.steady);
  });
});
