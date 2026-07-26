import { describe, it, expect } from "vitest";
import { storiesFrom, storyOf } from "./story";
import type { Moment } from "./moments";

const coin: Moment = {
  kind: "coinflip",
  index: 3,
  winner: "天",
  loser: "空",
  winnerProb: 0.31,
  loserProb: 0.29,
  gap: 0.02,
  losers: [{ text: "空", prob: 0.29 }],
};

describe("Story Engine", () => {
  it("coinflip → 「差一点写了」模板，语法 collapse，回链 momentRef", () => {
    const s = storyOf(coin, 0);
    expect(s.text).toBe("它差一点写了「空」，最后写下了「天」");
    expect(s.grammar).toBe("collapse");
    expect(s.momentRef).toBe(0);
    expect(s.meaning).toContain("2.0%");
  });

  it("temp_override → 「没有写最有把握的」模板，语法 branch", () => {
    const s = storyOf(
      {
        kind: "temp_override",
        index: 1,
        chosen: "空",
        chosenProb: 0.1,
        rank: 2,
        rank1: "天",
        rank1Prob: 0.6,
        temperature: 0.9,
        losers: [],
      },
      1,
    );
    expect(s.text).toBe("它没有写最有把握的「天」，写了「空」");
    expect(s.grammar).toBe("branch");
    expect(s.meaning).toContain("温度 0.9");
  });

  it("scattered → 「同时想到了 n 种写法」，语法 birth", () => {
    const s = storyOf(
      {
        kind: "scattered",
        index: 2,
        chosen: "云",
        entropy: 3.21,
        candidateCount: 5,
        losers: [],
      },
      0,
    );
    expect(s.text).toBe("写这个词之前，它同时想到了 5 种写法");
    expect(s.grammar).toBe("birth");
    expect(s.meaning).toContain("3.21 nats");
  });

  it("slow → 「用了平时 x 倍的时间」，语法 flow", () => {
    const s = storyOf(
      {
        kind: "slow",
        index: 4,
        token: "蓝",
        factor: 4.2,
        dtMs: 420,
        meanMs: 100,
        losers: [],
      },
      0,
    );
    expect(s.text).toBe("写「蓝」这一步，它用了平时 4.2 倍的时间");
    expect(s.grammar).toBe("flow");
  });

  it("retrieval 成功/失败各有模板，失败保留错误原文", () => {
    const ok = storyOf(
      {
        kind: "retrieval",
        index: 0,
        ok: true,
        query: "why sky blue",
        resultCount: 8,
        keptCount: 4,
        durationMs: 1200,
      },
      0,
    );
    expect(ok.text).toBe(
      "它先去搜了「why sky blue」，把 8 篇里的 4 篇读进了上下文",
    );
    const fail = storyOf(
      {
        kind: "retrieval",
        index: 0,
        ok: false,
        query: "q",
        resultCount: 0,
        keptCount: 0,
        durationMs: 300,
        error: "network down",
      },
      0,
    );
    expect(fail.text).toContain("没搜到");
    expect(fail.meaning).toContain("network down");
  });

  it("plan 成功 → 「先给自己写了一份 n 字的计划」", () => {
    const s = storyOf(
      {
        kind: "plan",
        index: 0,
        ok: true,
        planner: "DeepSeek R1",
        chars: 120,
        durationMs: 7300,
      },
      0,
    );
    expect(s.text).toBe("动笔前，它先给自己写了一份 120 字的计划");
    expect(s.meaning).toContain("DeepSeek R1");
  });

  it("确定性：同一批 Moment 两次生成 Story 完全一致", () => {
    expect(storiesFrom([coin])).toEqual(storiesFrom([coin]));
  });
});
