import { describe, expect, it } from "vitest";
import {
  DEFAULT_BAND_CONFIG,
  EnvelopeBank,
  bandEdges,
  bandEnergies,
  defaultTimeConstants,
  spectralCentroid,
  spectralFlux,
  stereoBalance,
  tiltGain,
} from "./audioBands";

describe("bandEdges", () => {
  it("对数等分：严格递增且首尾等于 minHz/maxHz", () => {
    const edges = bandEdges(DEFAULT_BAND_CONFIG);
    expect(edges.length).toBe(DEFAULT_BAND_CONFIG.bands + 1);
    expect(edges[0]).toBeCloseTo(DEFAULT_BAND_CONFIG.minHz);
    expect(edges[edges.length - 1]).toBeCloseTo(DEFAULT_BAND_CONFIG.maxHz);
    for (let i = 1; i < edges.length; i++) expect(edges[i]).toBeGreaterThan(edges[i - 1]);
    // 对数等分：相邻比值恒定
    const r0 = edges[1] / edges[0];
    const r1 = edges[edges.length - 1] / edges[edges.length - 2];
    expect(r0).toBeCloseTo(r1, 6);
  });
});

describe("tiltGain", () => {
  it("每倍频程 +3dB：高频获得补偿，参考点为 1", () => {
    expect(tiltGain(250, 3)).toBeCloseTo(1);
    expect(tiltGain(500, 3)).toBeCloseTo(10 ** (3 / 20));
    expect(tiltGain(125, 3)).toBeCloseTo(10 ** (-3 / 20));
  });
});

describe("bandEnergies", () => {
  const cfg = { ...DEFAULT_BAND_CONFIG, bands: 8 };
  const edges = bandEdges(cfg);
  it("静音（-Infinity）输出全 0", () => {
    const spec = new Float32Array(cfg.fftSize / 2).fill(-Infinity);
    expect(bandEnergies(spec, cfg, edges).every((v) => v === 0)).toBe(true);
  });
  it("只有低频有能量时，仅低段非零", () => {
    const spec = new Float32Array(cfg.fftSize / 2).fill(-Infinity);
    const hzPerBin = cfg.sampleRate / cfg.fftSize;
    const bin = Math.round(60 / hzPerBin); // ~60Hz
    spec[bin] = -20;
    const out = bandEnergies(spec, cfg, edges);
    expect(out[0]).toBeGreaterThan(0);
    expect(out.slice(3).every((v) => v === 0)).toBe(true);
  });
  it("输出钳制在 0..1", () => {
    const spec = new Float32Array(cfg.fftSize / 2).fill(0); // 0dB 全频满
    const out = bandEnergies(spec, cfg, edges);
    expect(out.every((v) => v >= 0 && v <= 1)).toBe(true);
  });
});

describe("EnvelopeBank", () => {
  it("attack 快 release 慢：上行接近目标快，下行拖尾", () => {
    const bank = new EnvelopeBank([0.01], [0.5]);
    bank.step([1], 0.05); // dt >> attack → 接近 1
    expect(bank.values[0]).toBeGreaterThan(0.9);
    bank.step([0], 0.05); // dt << release → 只降一点
    expect(bank.values[0]).toBeGreaterThan(0.8);
  });
  it("高频段时间常数比低频快（独立 smoothing）", () => {
    const { attackSec, releaseSec } = defaultTimeConstants(40);
    expect(attackSec[39]).toBeLessThan(attackSec[0]);
    expect(releaseSec[39]).toBeLessThan(releaseSec[0]);
  });
});

describe("spectralFlux / spectralCentroid / stereoBalance", () => {
  it("flux 只累计正向增量", () => {
    expect(spectralFlux([0.5, 0.5], [1, 0])).toBeCloseTo(0.5);
    expect(spectralFlux([1, 1], [0, 0])).toBe(0);
  });
  it("质心：能量全在最高段=1，全在最低段=0，静音=0", () => {
    expect(spectralCentroid([0, 0, 0, 1])).toBeCloseTo(1);
    expect(spectralCentroid([1, 0, 0, 0])).toBe(0);
    expect(spectralCentroid([0, 0, 0, 0])).toBe(0);
  });
  it("声相：全左=-1，全右=+1，均衡=0，静音=0", () => {
    expect(stereoBalance(1, 0)).toBe(-1);
    expect(stereoBalance(0, 1)).toBe(1);
    expect(stereoBalance(0.5, 0.5)).toBe(0);
    expect(stereoBalance(0, 0)).toBe(0);
  });
});
