import { describe, expect, it } from "vitest";
import { probeCapabilities } from "./capabilities";

describe("probeCapabilities", () => {
  it("返回全部五项能力，且探测不到时如实报不支持", async () => {
    const report = await probeCapabilities();
    expect(report.items.map((i) => i.key)).toEqual([
      "webgpu",
      "fp16",
      "simd",
      "sab",
      "coi",
    ]);
    // jsdom 无 WebGPU：必须如实报不支持，而不是猜测
    const webgpu = report.items.find((i) => i.key === "webgpu");
    expect(webgpu?.supported).toBe(false);
    for (const item of report.items) {
      expect(typeof item.supported).toBe("boolean");
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.meaning.length).toBeGreaterThan(0);
    }
  });

  it("核心数与内存字段类型正确", async () => {
    const report = await probeCapabilities();
    expect(typeof report.cores).toBe("number");
    expect(report.memoryGB === null || typeof report.memoryGB === "number").toBe(
      true,
    );
  });
});
