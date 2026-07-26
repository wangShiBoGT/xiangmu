import { describe, expect, it } from "vitest";
import {
  CORE_RULES,
  evaluateRules,
  fieldValue,
  matchesByToken,
  validateRule,
  validateRuleset,
  type Rule,
} from "./rules";
import type { TokenStep } from "./trace";

const step = (over: Partial<TokenStep>): TokenStep => ({
  id: 1,
  text: "t",
  prob: 0.5,
  topk: [
    { id: 1, text: "t", prob: 0.5 },
    { id: 2, text: "u", prob: 0.3 },
  ],
  entropy: 1,
  dt: 100,
  ...over,
});

describe("rules", () => {
  it("fieldValue 提供 entropy/prob/dt/rank/topProb/dtMedianRatio", () => {
    const s = step({ dt: 300 });
    const ctx = { dtMedian: 100 };
    expect(fieldValue(s, "entropy", ctx)).toBe(1);
    expect(fieldValue(s, "prob", ctx)).toBe(0.5);
    expect(fieldValue(s, "rank", ctx)).toBe(0);
    expect(fieldValue(step({ id: 2, prob: 0.3 }), "rank", ctx)).toBe(1);
    expect(fieldValue(s, "topProb", ctx)).toBe(0.5);
    expect(fieldValue(s, "dtMedianRatio", ctx)).toBe(3);
    expect(fieldValue(s, "nope", ctx)).toBeNull();
  });

  it("core/high-entropy 与 core/long-tail 按步触发且带阈值/实际值", () => {
    const steps = [step({ entropy: 3 }), step({ entropy: 1, prob: 0.01 })];
    const ms = evaluateRules(steps, CORE_RULES);
    const he = ms.find((m) => m.ruleId === "core/high-entropy");
    expect(he?.from).toBe(0);
    expect(he?.values[0]).toMatchObject({ field: "entropy", threshold: 2.5, actual: 3 });
    expect(he?.explain).toContain("3");
    const lt = ms.find((m) => m.ruleId === "core/long-tail");
    expect(lt?.from).toBe(1);
  });

  it("core/on-rails 需要连续 12 步 top-1 且 prob>0.9", () => {
    const rail = Array.from({ length: 12 }, () =>
      step({ prob: 0.95, topk: [{ id: 1, text: "t", prob: 0.95 }] }),
    );
    const ms = evaluateRules(rail, CORE_RULES);
    const or = ms.find((m) => m.ruleId === "core/on-rails");
    expect(or).toMatchObject({ from: 0, to: 11 });
    expect(
      evaluateRules(rail.slice(0, 11), CORE_RULES).find(
        (m) => m.ruleId === "core/on-rails",
      ),
    ).toBeUndefined();
  });

  it("core/loop-suspect 检出不重叠重复 3-gram ≥3 次", () => {
    const ids = [7, 8, 9, 1, 7, 8, 9, 2, 7, 8, 9];
    const steps = ids.map((id) => step({ id, topk: [{ id, text: "t", prob: 0.5 }] }));
    const ms = evaluateRules(steps, CORE_RULES).filter(
      (m) => m.ruleId === "core/loop-suspect",
    );
    expect(ms).toHaveLength(3);
    expect(ms[0]).toMatchObject({ from: 0, to: 2 });
  });

  it("core/slow-step 用 3× 中位数触发", () => {
    const steps = [step({}), step({}), step({}), step({ dt: 400 })];
    const ms = evaluateRules(steps, CORE_RULES);
    const ss = ms.find((m) => m.ruleId === "core/slow-step");
    expect(ss?.from).toBe(3);
  });

  it("禁用的规则不触发", () => {
    const rules: Rule[] = CORE_RULES.map((r) => ({ ...r, enabled: false }));
    expect(evaluateRules([step({ entropy: 5 })], rules)).toHaveLength(0);
  });

  it("validateRule/validateRuleset 校验 DSL", () => {
    expect(validateRule(CORE_RULES[0])).toBeNull();
    expect(validateRuleset(CORE_RULES)).toBeNull();
    expect(validateRule({})).toContain("id");
    expect(validateRule({ ...CORE_RULES[0], scope: "x" })).toContain("scope");
    expect(
      validateRule({
        ...CORE_RULES[0],
        when: [{ field: "magic", op: ">", value: 1 }],
      }),
    ).toContain("field");
    expect(validateRuleset([CORE_RULES[0], CORE_RULES[0]])).toContain("重复");
    expect(validateRuleset("x")).toContain("数组");
  });

  it("matchesByToken 展开为按位置索引", () => {
    const ms = evaluateRules([step({ entropy: 3 })], CORE_RULES);
    const byToken = matchesByToken(ms, 1);
    expect(byToken[0].map((m) => m.ruleId)).toContain("core/high-entropy");
  });
});
