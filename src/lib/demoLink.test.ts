import { describe, expect, it } from "vitest";
import { buildDemoHash, parseDemoHash } from "./demoLink";

describe("演示切片链接（E2）", () => {
  it("构建与解析互逆", () => {
    expect(parseDemoHash(buildDemoHash(68))).toEqual({ step: 68, dual: false });
    expect(parseDemoHash(buildDemoHash(68, true))).toEqual({
      step: 68,
      dual: true,
    });
  });

  it("拒绝非法 hash", () => {
    expect(parseDemoHash("")).toBeNull();
    expect(parseDemoHash("#demo/step/")).toBeNull();
    expect(parseDemoHash("#demo/step/-1")).toBeNull();
    expect(parseDemoHash("#demo/step/abc")).toBeNull();
    expect(parseDemoHash("#other/step/3")).toBeNull();
    expect(parseDemoHash("#demo/step/3/other")).toBeNull();
  });
});
