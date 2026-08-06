import { describe, expect, it } from "vitest";
import {
  ENTRY_SCHEMA,
  GITHUB_REPO,
  LEADERBOARD_CATEGORY,
  MAX_PREFILL_URL,
  buildEntryPayload,
  buildSubmissionBody,
  buildSubmissionTitle,
  buildSubmissionUrl,
  parseLeaderboardFile,
  traceStats,
  type SubmissionInput,
} from "./leaderboard";

function input(over: Partial<SubmissionInput> = {}): SubmissionInput {
  return {
    nickname: "小王",
    deviceName: "ThinkBook 14",
    deviceTier: 2,
    gpuName: "RTX 4060 Laptop",
    modelId: "onnx-community/Qwen3-0.6B-ONNX",
    modelName: "Qwen3 0.6B",
    device: "webgpu",
    tps: 24.5,
    tokens: 100,
    timedTokens: 98,
    totalMs: 4000,
    temperature: 0.7,
    topP: 0.9,
    seed: 123,
    machineScore: { total: 7200, grade: "A" },
    traceHash: "a".repeat(64),
    browser: "Chrome 124",
    ...over,
  };
}

describe("traceStats", () => {
  it("只把有耗时的步计入吞吐分母，总步数单独上报", () => {
    // 5 步里只有 4 步有 dt，共 2000ms → 2 tok/s
    const s = traceStats([
      { dt: 0 },
      { dt: 500 },
      { dt: 500 },
      { dt: 500 },
      { dt: 500 },
    ]);
    expect(s).not.toBeNull();
    expect(s!.tokens).toBe(5);
    expect(s!.timedTokens).toBe(4);
    expect(s!.totalMs).toBe(2000);
    expect(s!.tps).toBeCloseTo(2, 6);
  });

  it("没有任何耗时样本时返回 null（不编吞吐）", () => {
    expect(traceStats([{ dt: 0 }, { dt: 0 }])).toBeNull();
    expect(traceStats([])).toBeNull();
  });
});

describe("提交载荷", () => {
  it("载荷自洽：tps ≈ timedTokens / totalMs，收录方可重算", () => {
    const p = buildEntryPayload(input({ tps: 24.5, timedTokens: 98, totalMs: 4000 }));
    expect(p.v).toBe(ENTRY_SCHEMA);
    const derived =
      (p.timedTokens as number) / ((p.totalMs as number) / 1000);
    expect(Math.abs(derived - (p.tps as number)) / (p.tps as number)).toBeLessThan(
      0.15,
    );
  });

  it("正文含可被 Actions 解析的 json 代码块", () => {
    const body = buildSubmissionBody(input());
    const m = /```json\s*([\s\S]*?)```/.exec(body);
    expect(m).not.toBeNull();
    expect(JSON.parse(m![1]).v).toBe(ENTRY_SCHEMA);
  });

  it("正文明示数值自报，不声称已复核", () => {
    expect(buildSubmissionBody(input())).toContain("自报");
  });

  it("标题带设备与吞吐，便于人工扫读", () => {
    expect(buildSubmissionTitle(input())).toBe(
      "[Benchmark] ThinkBook 14 · Qwen3 0.6B · 24.5 tok/s",
    );
  });

  it("预填链接指向正确仓库与分类", () => {
    const url = buildSubmissionUrl(input());
    expect(url.startsWith(`https://github.com/${GITHUB_REPO}/discussions/new?`)).toBe(
      true,
    );
    expect(new URL(url).searchParams.get("category")).toBe(LEADERBOARD_CATEGORY);
    expect(url.length).toBeLessThanOrEqual(MAX_PREFILL_URL);
  });

  it("超长内容抛错而不是静默截断正文", () => {
    expect(() =>
      buildSubmissionUrl(input({ deviceName: "长".repeat(4000) })),
    ).toThrow(/过长/);
  });
});

describe("parseLeaderboardFile", () => {
  const entry = {
    id: "gh-1",
    author: "octocat",
    avatarUrl: null,
    nickname: "小王",
    deviceName: "ThinkBook 14",
    deviceTier: 2,
    gpuName: "RTX 4060",
    modelId: "qwen3-0.6b",
    device: "webgpu",
    tps: 24.5,
    tokens: 100,
    timedTokens: 98,
    machineScore: null,
    traceHash: null,
    verify: "account",
    discussionUrl: "https://github.com/x/y/discussions/1",
    discussionNumber: 1,
    createdAt: "2026-08-01T00:00:00Z",
  };

  it("接受合法文件", () => {
    const f = parseLeaderboardFile({
      generatedAt: "2026-08-01T00:00:00Z",
      repo: GITHUB_REPO,
      entries: [entry],
    });
    expect(f?.entries).toHaveLength(1);
    expect(f?.entries[0].timedTokens).toBe(98);
  });

  it("坏条目单独丢弃，不让整表报废", () => {
    const f = parseLeaderboardFile({
      generatedAt: "2026-08-01T00:00:00Z",
      entries: [entry, { ...entry, id: "gh-2", tps: "快" }, { ...entry, id: "gh-3" }],
    });
    expect(f?.entries.map((e) => e.id)).toEqual(["gh-1", "gh-3"]);
  });

  it("旧条目缺 timedTokens 时退回总步数而不是丢弃", () => {
    const { timedTokens: _drop, ...old } = entry;
    const f = parseLeaderboardFile({
      generatedAt: "2026-08-01T00:00:00Z",
      entries: [old],
    });
    expect(f?.entries[0].timedTokens).toBe(100);
  });

  it("整体结构不符返回 null", () => {
    expect(parseLeaderboardFile(null)).toBeNull();
    expect(parseLeaderboardFile({ entries: [] })).toBeNull();
    expect(parseLeaderboardFile("<html>")).toBeNull();
  });
});
