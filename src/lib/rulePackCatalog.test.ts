import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { RULE_PACK_CATALOG } from "./rulePackCatalog";
import { evaluateRules, validateRuleset } from "./rules";
import type { TokenStep } from "./trace";

const demo = JSON.parse(
  readFileSync(resolve(__dirname, "../assets/demo.aitrace.json"), "utf8"),
) as { steps: TokenStep[] };

describe("规则包目录（E1 校准守门）", () => {
  it("目录规模为 3–5 个官方包，id/版本齐全且不重复", () => {
    expect(RULE_PACK_CATALOG.length).toBeGreaterThanOrEqual(3);
    expect(RULE_PACK_CATALOG.length).toBeLessThanOrEqual(5);
    const ids = new Set(RULE_PACK_CATALOG.map((p) => p.id));
    expect(ids.size).toBe(RULE_PACK_CATALOG.length);
    for (const p of RULE_PACK_CATALOG) {
      expect(p.name).toBeTruthy();
      expect(p.version).toBeTruthy();
      expect(p.calibration).toContain("trace");
    }
  });

  it("每个包的规则集都通过 validateRuleset", () => {
    for (const p of RULE_PACK_CATALOG) {
      expect(validateRuleset(p.rules), p.id).toBeNull();
    }
  });

  it("每个包在录制示例 trace 上命中率 >0 且 ≤30/100 token（否则退回校准）", () => {
    expect(demo.steps.length).toBeGreaterThan(0);
    for (const p of RULE_PACK_CATALOG) {
      const hits = evaluateRules(demo.steps, p.rules).length;
      const per100 = (hits / demo.steps.length) * 100;
      expect(hits, `${p.id} 命中为 0，规则失真`).toBeGreaterThan(0);
      expect(per100, `${p.id} 命中率 ${per100.toFixed(1)}/100 超限`).toBeLessThanOrEqual(30);
    }
  });
});
