import { describe, expect, it } from "vitest";
import { benchComparableGroups, ruleHitRate } from "./behaviorBench";
import type { ExperimentRecord } from "./experiments";
import type { BranchNode, TokenStep } from "./trace";
import type { Rule } from "./rules";

const step = (id: number, entropy = 1): TokenStep => ({
  id,
  text: `t${id}`,
  prob: 0.5,
  topk: [{ id, text: `t${id}`, prob: 0.5 }],
  entropy,
  dt: 100,
});

const root = (steps: TokenStep[]): BranchNode => ({
  forkStep: 0,
  forcedId: -1,
  forcedText: "",
  trace: {
    modelId: "m",
    params: { temperature: 1, topP: 1, seed: 42 },
    promptIds: [1],
    steps,
    device: "wasm",
  },
  children: [],
});

const rec = (over: Partial<ExperimentRecord>): ExperimentRecord => ({
  id: "x",
  createdAt: 0,
  name: "n",
  starred: false,
  source: "run",
  prompt: "p",
  modelId: "m",
  params: { temperature: 1, topP: 0.9 },
  seed: 42,
  device: "wasm",
  root: root([step(1)]),
  stats: { tokens: 1, avgEntropy: 1, avgTps: 10, branches: 1 },
  ...over,
});

// 单条件规则：entropy > 2 命中
const HOT: Rule[] = [
  {
    id: "t/hot",
    scope: "step",
    when: [{ field: "entropy", op: ">", value: 2 }],
    annotate: { label: "热", severity: "info", explain: "e={entropy}" },
    enabled: true,
  },
];

describe("ruleHitRate", () => {
  it("每 100 token 命中数", () => {
    // 4 步中 1 步命中 → 25
    const steps = [step(1, 3), step(2), step(3), step(4)];
    expect(ruleHitRate(steps, HOT)).toBe(25);
  });
  it("空 trace 得 0", () => {
    expect(ruleHitRate([], HOT)).toBe(0);
  });
});

describe("benchComparableGroups", () => {
  it("组内 <2 次运行不产生分数", () => {
    expect(benchComparableGroups([rec({ id: "a" })], HOT)).toEqual([]);
  });

  it("不同 prompt 不混组", () => {
    const out = benchComparableGroups(
      [rec({ id: "a", prompt: "p1" }), rec({ id: "b", prompt: "p2" })],
      HOT,
    );
    expect(out).toEqual([]);
  });

  it("同组多 seed → 分布分数（values/median/range）", () => {
    const a = rec({
      id: "a",
      createdAt: 1,
      seed: 1,
      root: root([step(1, 3), step(2)]), // 1/2 命中 → 50
    });
    const b = rec({
      id: "b",
      createdAt: 2,
      seed: 2,
      root: root([step(1), step(2), step(3), step(4)]), // 0 命中 → 0
    });
    const c = rec({
      id: "c",
      createdAt: 3,
      seed: 3,
      root: root([step(1, 3), step(2, 3), step(3), step(4)]), // 2/4 → 50
    });
    const [g] = benchComparableGroups([a, b, c], HOT);
    expect(g.recIds).toEqual(["a", "b", "c"]);
    expect(g.score.values).toEqual([50, 0, 50]);
    expect(g.score.seeds).toEqual([1, 2, 3]);
    expect(g.score.median).toBe(50);
    expect(g.score.range).toEqual([0, 50]);
  });
});
