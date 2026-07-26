import { describe, expect, it } from "vitest";
import {
  computeStats,
  defaultName,
  firstDivergence,
  importReplay,
  paramsDiff,
  selectEvictions,
  type ExperimentRecord,
} from "./experiments";
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

describe("experiments", () => {
  it("computeStats 计算 token 数/平均熵/速度/分支数", () => {
    const s = computeStats(root([step(1, 2, 100), step(2, 4, 100)]));
    expect(s.tokens).toBe(2);
    expect(s.avgEntropy).toBeCloseTo(3);
    expect(s.avgTps).toBeCloseTo(10);
    expect(s.branches).toBe(1);
  });

  it("defaultName 截断到 40 字", () => {
    expect(defaultName("短问题")).toBe("短问题");
    expect(defaultName("很".repeat(50))).toHaveLength(41);
  });

  it("selectEvictions 只淘汰未星标且最旧的", () => {
    const records = [
      { id: "a", createdAt: 1, starred: false },
      { id: "b", createdAt: 2, starred: true },
      { id: "c", createdAt: 3, starred: false },
      { id: "d", createdAt: 4, starred: false },
    ];
    expect(selectEvictions(records, 2)).toEqual(["a", "c"]);
    expect(selectEvictions(records, 4)).toEqual([]);
  });

  it("firstDivergence 返回首个不同 token 位置", () => {
    expect(firstDivergence([step(1), step(2)], [step(1), step(3)])).toBe(1);
    expect(firstDivergence([step(1)], [step(1)])).toBe(-1);
    expect(firstDivergence([step(1)], [step(1), step(2)])).toBe(1);
  });

  it("paramsDiff 列出差异字段", () => {
    const a = rec({ params: { temperature: 0.2, topP: 0.9 } });
    const b = rec({ params: { temperature: 1.1, topP: 0.9 }, seed: 7 });
    const d = paramsDiff(a, b);
    expect(d.map((x) => x.label)).toEqual(["温度", "种子"]);
  });

  it("importReplay 解析 v1 格式并拒绝坏文件", () => {
    const good = JSON.stringify({
      format: "browser-ai-replay/v1",
      prompt: "你好",
      modelId: "m",
      params: { temperature: 1, topP: 0.9, seed: 42 },
      device: "wasm",
      promptIds: [1],
      steps: [step(1)],
    });
    const r = importReplay(good);
    expect(r.source).toBe("imported");
    expect(r.seed).toBe(42);
    expect(r.root.trace?.steps).toHaveLength(1);
    expect(() => importReplay("not json")).toThrow("JSON");
    expect(() => importReplay("{}")).toThrow("aitrace/v2");
  });

  it("importReplay 解析 aitrace/v2 并恢复分岔树", () => {
    const trace = {
      modelId: "m",
      params: { temperature: 1, topP: 0.9, seed: 7 },
      promptIds: [1],
      steps: [step(1)],
      device: "webgpu",
    };
    const v2 = JSON.stringify({
      format: "aitrace/v2",
      schema: 2,
      source: { app: "browser-ai-observatory" },
      env: { device: "webgpu" },
      prompt: "你好",
      ...trace,
      branches: [
        { forkStep: 0, forcedId: 9, forcedText: "另", trace, children: [] },
      ],
    });
    const r = importReplay(v2);
    expect(r.seed).toBe(7);
    expect(r.device).toBe("webgpu");
    expect(r.root.children).toHaveLength(1);
    expect(r.root.children[0].forcedId).toBe(9);
    expect(r.stats.branches).toBe(2);
  });

  it("importReplay 对损坏的 branches 安全降级（保留主链）", () => {
    const v2 = JSON.stringify({
      format: "aitrace/v2",
      prompt: "p",
      modelId: "m",
      params: { temperature: 1, topP: 1 },
      device: "wasm",
      promptIds: [],
      steps: [step(1)],
      branches: [{ bogus: true }, "junk"],
    });
    const r = importReplay(v2);
    expect(r.root.trace?.steps).toHaveLength(1);
    expect(r.root.children).toHaveLength(0);
  });

  it("importReplay 原样保留 extensions 对象，非对象丢弃", () => {
    const base = {
      format: "aitrace/v2",
      prompt: "p",
      modelId: "m",
      params: { temperature: 1, topP: 1 },
      device: "wasm",
      promptIds: [],
      steps: [step(1)],
    };
    const ext = { "openai.reasoning": { effort: "high" }, "x.y": [1, 2] };
    const r = importReplay(JSON.stringify({ ...base, extensions: ext }));
    expect(r.root.trace?.extensions).toEqual(ext);
    const bad = importReplay(JSON.stringify({ ...base, extensions: [1] }));
    expect(bad.root.trace?.extensions).toBeUndefined();
  });
});
