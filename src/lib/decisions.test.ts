import { describe, it, expect } from "vitest";
import { decisionEvents } from "./decisions";
import type { TokenStep } from "./trace";

const step = (over: Partial<TokenStep>): TokenStep => ({
  id: 0,
  text: "天",
  prob: 0.9,
  topk: [
    { id: 0, text: "天", prob: 0.9 },
    { id: 1, text: "空", prob: 0.05 },
  ],
  entropy: 0.3,
  dt: 100,
  ...over,
});

describe("decisionEvents", () => {
  it("空输入返回空；必然步（rank1 高概率）静默不生成事件", () => {
    expect(decisionEvents([])).toEqual([]);
    expect(decisionEvents([step({}), step({})])).toEqual([]);
  });

  it("掷硬币：top-2 差<5% 且 top1>5%（closeSteps 同口径），人话含双方原文与概率", () => {
    const s = step({
      id: 0,
      text: "本身",
      prob: 0.2,
      topk: [
        { id: 0, text: "本身", prob: 0.2 },
        { id: 1, text: "这个词", prob: 0.19 },
      ],
    });
    const ev = decisionEvents([s]);
    expect(ev).toHaveLength(1);
    expect(ev[0].kind).toBe("coinflip");
    expect(ev[0].text).toContain("本身");
    expect(ev[0].text).toContain("这个词");
    expect(ev[0].text).toContain("20.0%");
    expect(ev[0].losers).toEqual([{ text: "这个词", prob: 0.19 }]);
  });

  it("温度改命：选中 rank>1，句子含第一名与实际选中者；传入温度则点名温度", () => {
    const s = step({
      id: 1,
      text: "空",
      prob: 0.05,
      topk: [
        { id: 0, text: "天", prob: 0.8 },
        { id: 1, text: "空", prob: 0.05 },
      ],
    });
    const ev = decisionEvents([s], { temperature: 0.7 });
    expect(ev[0].kind).toBe("temp_override");
    expect(ev[0].text).toContain("温度 0.7");
    expect(ev[0].text).toContain("第 2 名");
    expect(ev[0].text).toContain("「天」");
  });

  it("想法很散：entropyLevel≥0.7（≈2.74 nats）触发 scattered，证据带 nats 单位", () => {
    const ev = decisionEvents([step({ entropy: 3.2 })]);
    expect(ev[0].kind).toBe("scattered");
    expect(ev[0].evidence).toContain("nats");
  });

  it("卡住了：dt 超过全程均值 3 倍触发 slow", () => {
    const steps = [step({}), step({}), step({}), step({ dt: 2000 })];
    const ev = decisionEvents(steps);
    expect(ev).toHaveLength(1);
    expect(ev[0].kind).toBe("slow");
    expect(ev[0].index).toBe(3);
  });

  it("同一步可同时命中多类（互相独立成立）", () => {
    const s = step({
      id: 1,
      text: "空",
      prob: 0.19,
      entropy: 3.2,
      topk: [
        { id: 0, text: "天", prob: 0.2 },
        { id: 1, text: "空", prob: 0.19 },
      ],
    });
    const kinds = decisionEvents([s]).map((e) => e.kind);
    expect(kinds).toContain("coinflip");
    expect(kinds).toContain("temp_override");
    expect(kinds).toContain("scattered");
  });

  it("maxPerKind 预算：每类只留最显著的几个，且按步序输出", () => {
    const close = (a: number, b: number) =>
      step({
        id: 0,
        text: "x",
        prob: a,
        topk: [
          { id: 0, text: "x", prob: a },
          { id: 1, text: "y", prob: b },
        ],
      });
    const steps = [
      close(0.2, 0.19), // 差 1%
      close(0.2, 0.199), // 差 0.1%（更险）
      close(0.2, 0.16), // 差 4%
      close(0.2, 0.17), // 差 3%
    ];
    const ev = decisionEvents(steps, { maxPerKind: 2 });
    expect(ev.map((e) => e.index)).toEqual([0, 1]);
  });
});
