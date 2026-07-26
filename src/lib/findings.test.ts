import { describe, expect, it } from "vitest";
import {
  computeFindings,
  loadSeenFindings,
  saveSeenFindings,
  unreadCount,
} from "./findings";
import type { ExperimentRecord } from "./experiments";
import type { BranchNode, TokenStep } from "./trace";

const step = (id: number, entropy = 1, dt = 100): TokenStep => ({
  id,
  text: `t${id}`,
  prob: 0.5,
  topk: [{ id, text: `t${id}`, prob: 0.5 }],
  entropy,
  dt,
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

describe("computeFindings", () => {
  it("空存档无发现", () => {
    expect(computeFindings([])).toEqual([]);
  });

  it("单条记录不产生发现", () => {
    expect(computeFindings([rec({ id: "a" })])).toEqual([]);
  });

  it("同 prompt 两次运行分叉 → divergence 发现并给出分叉步", () => {
    const a = rec({ id: "a", createdAt: 1, root: root([step(1), step(2)]) });
    const b = rec({ id: "b", createdAt: 2, root: root([step(1), step(3)]) });
    const fs = computeFindings([a, b]);
    const div = fs.find((f) => f.kind === "divergence");
    expect(div).toBeDefined();
    expect(div?.step).toBe(1);
    expect(div?.recIds).toEqual(["a", "b"]);
  });

  it("同 prompt 两次运行完全一致 → reproducible 发现", () => {
    const a = rec({ id: "a", createdAt: 1 });
    const b = rec({ id: "b", createdAt: 2 });
    const fs = computeFindings([a, b]);
    expect(fs.some((f) => f.kind === "reproducible")).toBe(true);
  });

  it("多条记录时报告平均熵最高的一次为 distribution，并指出峰值步与来源字段", () => {
    const calm = rec({
      id: "calm",
      createdAt: 1,
      prompt: "q1",
      stats: { tokens: 2, avgEntropy: 0.5, avgTps: 10, branches: 1 },
    });
    const wild = rec({
      id: "wild",
      createdAt: 2,
      prompt: "q2",
      root: root([step(1, 0.5), step(2, 3.2)]),
      stats: { tokens: 2, avgEntropy: 2.0, avgTps: 10, branches: 1 },
    });
    const fs = computeFindings([calm, wild]);
    const un = fs.find((f) => f.kind === "distribution");
    expect(un?.recIds).toEqual(["wild"]);
    expect(un?.step).toBe(1);
    expect(un?.source).toBe("steps[1].entropy");
  });

  it("不同 prompt 的 run 不产生分叉类发现（不兼容不比较）", () => {
    const a = rec({ id: "a", createdAt: 1, prompt: "p1" });
    const b = rec({ id: "b", createdAt: 2, prompt: "p2" });
    const fs = computeFindings([a, b]);
    expect(fs.some((f) => f.kind === "divergence" || f.kind === "reproducible")).toBe(false);
  });
});

describe("seen findings 持久化", () => {
  const mem = () => {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
    };
  };

  it("保存后可读回，unreadCount 只数未读", () => {
    const s = mem();
    saveSeenFindings(s, ["a", "b"]);
    const seen = loadSeenFindings(s);
    expect(seen.has("a")).toBe(true);
    const fs = computeFindings([
      rec({ id: "a", createdAt: 1 }),
      rec({ id: "b", createdAt: 2 }),
    ]);
    expect(unreadCount(fs, new Set(fs.map((f) => f.key)))).toBe(0);
    expect(unreadCount(fs, new Set())).toBe(fs.length);
  });

  it("损坏 JSON 安全降级为空集合", () => {
    expect(loadSeenFindings({ getItem: () => "{bad" }).size).toBe(0);
  });
});
