import { describe, it, expect } from "vitest";
import { directScenes, sceneStats, type SceneLevel } from "./director";

// entropyLevel 归一化基准 ln(50)≈3.912：0.3 档 ≈1.174 nats，0.7 档 ≈2.738 nats
const CALM = { entropy: 0.2, topk: [{ id: 0, text: "a", prob: 0.9 }, { id: 1, text: "b", prob: 0.05 }] };
const FLOW = { entropy: 1.8, topk: [{ id: 0, text: "a", prob: 0.5 }, { id: 1, text: "b", prob: 0.2 }] };
const HOT = { entropy: 3.2, topk: [{ id: 0, text: "a", prob: 0.3 }, { id: 1, text: "b", prob: 0.2 }] };
// 熵不高但 top-2 接近：犹豫点口径（gap<5% 且 top1>5%）
const CLOSE = { entropy: 0.9, topk: [{ id: 0, text: "巴黎", prob: 0.42 }, { id: 1, text: "伦敦", prob: 0.4 }] };

describe("directScenes", () => {
  it("空输入返回空", () => {
    expect(directScenes([])).toEqual([]);
  });

  it("平静步 = plain，中档熵 = flow", () => {
    expect(directScenes([CALM, FLOW, CALM])).toEqual(["plain", "flow", "plain"]);
  });

  it("孤立高熵步 = birth；top-2 接近（犹豫点口径）也触发 birth", () => {
    expect(directScenes([CALM, HOT, CALM])[1]).toBe("birth");
    expect(directScenes([CALM, CLOSE, CALM])[1]).toBe("birth");
  });

  it("连续 ≥3 个 birth 候选升级为 storm（整段）", () => {
    const lv = directScenes([CALM, HOT, HOT, CLOSE, CALM]);
    expect(lv).toEqual(["plain", "storm", "storm", "storm", "plain"]);
    expect(sceneStats(lv).storm).toBe(1);
  });

  it("冷却预算：大场面之后 cooldown 步内的 birth 候选降级为 flow", () => {
    const steps = [HOT, CALM, CALM, HOT, ...Array(12).fill(CALM), HOT];
    const lv = directScenes(steps, { cooldown: 12 });
    expect(lv[0]).toBe("birth");
    expect(lv[3]).toBe("flow"); // 距上次大场面仅 3 步，降级
    expect(lv[16]).toBe("birth"); // 冷却期已过
  });

  it("一直爆就是没有爆：全程高熵也只产出有限大场面", () => {
    const lv = directScenes(Array(40).fill(HOT), { cooldown: 12 });
    const stats = sceneStats(lv);
    expect(stats.birth + stats.storm).toBeLessThanOrEqual(4);
  });

  it("增量稳定：前缀的排片结果不因后续步而改变", () => {
    const steps = [CALM, HOT, CALM, FLOW, HOT, CALM];
    const partial = directScenes(steps.slice(0, 3));
    const full = directScenes(steps);
    expect(full.slice(0, 3)).toEqual(partial);
  });

  it("sceneStats 按场景数统计 storm", () => {
    const lv: SceneLevel[] = ["storm", "storm", "plain", "storm", "birth", "flow"];
    expect(sceneStats(lv)).toEqual({ birth: 1, storm: 2, flow: 1 });
  });
});
