import { describe, it, expect } from "vitest";
import { recommendModel, modelUsable, type DeviceReport } from "./device";
import { MODELS } from "./models";

const base: Omit<DeviceReport, "webgpu" | "tier"> = {
  fp16: true,
  gpuInfo: null,
  memoryGB: 8,
  cores: 8,
};

describe("recommendModel", () => {
  it("无 WebGPU 时只推荐能在 WASM 内加载的模型", () => {
    const m = recommendModel({ ...base, webgpu: false, tier: 1 });
    expect(m.wasmOk).toBe(true);
  });

  it("高性能设备推荐内置模型里最强的（在线模型不参与推荐）", () => {
    const m = recommendModel({ ...base, webgpu: true, tier: 3 });
    expect(m.id).toBe("onnx-community/Qwen3-1.7B-ONNX");
    expect(m.builtin).toBe(true);
  });

  it("一般 GPU 设备推荐 2 档内最强模型", () => {
    const m = recommendModel({ ...base, webgpu: true, tier: 2 });
    expect(m.minTier).toBeLessThanOrEqual(2);
  });
});

describe("modelUsable", () => {
  it("WASM 下大模型不可用", () => {
    const report: DeviceReport = { ...base, webgpu: false, tier: 1 };
    const big = MODELS.find((m) => !m.wasmOk)!;
    expect(modelUsable(report, big)).toBe(false);
  });

  it("WebGPU 下全部可用", () => {
    const report: DeviceReport = { ...base, webgpu: true, tier: 2 };
    expect(MODELS.every((m) => modelUsable(report, m))).toBe(true);
  });
});
