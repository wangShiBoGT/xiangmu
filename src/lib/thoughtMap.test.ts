import { describe, expect, it } from "vitest";
import { MIN_SEGMENT, buildThoughtMap } from "./thoughtMap";
import type { TokenStep } from "./trace";

const step = (text: string, entropy: number, id = 1): TokenStep => ({
  id,
  text,
  prob: 0.5,
  topk: [{ id, text, prob: 0.5 }],
  entropy,
  dt: 10,
});

/** 造一条带 <think> 段的 trace：前段低熵、中段高熵、后段低熵，再接正文 */
function makeSteps(): TokenStep[] {
  const out: TokenStep[] = [step("<think>", 0.5)];
  for (let i = 0; i < 20; i++) out.push(step(`想${i}`, 0.3));
  for (let i = 0; i < 20; i++) out.push(step(`纠${i}`, 2.5));
  for (let i = 0; i < 20; i++) out.push(step(`定${i}`, 0.3));
  out.push(step("</think>", 0.2));
  for (let i = 0; i < 15; i++) out.push(step(`答${i}`, 0.4));
  return out;
}

describe("buildThoughtMap", () => {
  it("无 </think> 边界时诚实缺席", () => {
    expect(buildThoughtMap([step("你", 1), step("好", 1)])).toBeNull();
  });

  it("按 think 边界 + 熵拐点分站，站区间连续覆盖全程", () => {
    const steps = makeSteps();
    const map = buildThoughtMap(steps)!;
    expect(steps[map.thinkEnd].text).toBe("</think>");
    const st = map.stations;
    expect(st[0].start).toBe(1); // 跳过 <think> 标记步
    expect(st[0].label).toBe("审题");
    expect(st[st.length - 1].label).toBe("收束作答");
    expect(st[st.length - 1].phase).toBe("answer");
    for (let i = 1; i < st.length; i++)
      expect(st[i].start).toBeGreaterThan(st[i - 1].end);
    for (const s of st) expect(s.end - s.start + 1).toBeGreaterThanOrEqual(1);
  });

  it("熵最高段被标为反复权衡，均值来自真实熵", () => {
    const map = buildThoughtMap(makeSteps())!;
    const peak = map.stations.find((s) => s.label.startsWith("反复权衡"));
    expect(peak).toBeDefined();
    expect(peak!.meanEntropy).toBeGreaterThan(1);
    for (const s of map.stations.filter((x) => x !== peak && x.phase === "think"))
      expect(peak!.meanEntropy).toBeGreaterThanOrEqual(s.meanEntropy);
  });

  it("headline 数字实算；段长下限生效", () => {
    const map = buildThoughtMap(makeSteps())!;
    expect(map.headline).toContain(`${map.thinkEnd - 1} 步`);
    for (const s of map.stations.filter((x) => x.phase === "think"))
      expect(s.end - s.start + 1).toBeGreaterThanOrEqual(MIN_SEGMENT);
  });
});
