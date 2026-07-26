import { describe, expect, it } from "vitest";
import { CORE_RULES } from "./rules";
import { exportRulePack, parseRulePack, RULE_PACK_FORMAT } from "./rulePack";

describe("rulePack", () => {
  it("导出→导入往返一致", () => {
    const json = exportRulePack("我的规则", "1.2", CORE_RULES);
    const r = parseRulePack(json);
    if ("error" in r) throw new Error(r.error);
    expect(r.rules).toEqual(CORE_RULES);
    expect(r.label).toBe("我的规则 v1.2");
  });

  it("空名称/版本回退默认", () => {
    const pack = JSON.parse(exportRulePack("  ", "", CORE_RULES));
    expect(pack.name).toBe("未命名规则集");
    expect(pack.version).toBe("1");
    expect(pack.format).toBe(RULE_PACK_FORMAT);
  });

  it("兼容裸规则数组", () => {
    const r = parseRulePack(JSON.stringify(CORE_RULES));
    if ("error" in r) throw new Error(r.error);
    expect(r.rules).toEqual(CORE_RULES);
    expect(r.label).toBe("裸规则数组");
  });

  it("非法 JSON / 未知格式 / 坏规则均给人话错误", () => {
    expect(parseRulePack("{oops")).toHaveProperty("error", "不是有效的 JSON");
    expect(
      parseRulePack(JSON.stringify({ format: "other/1", rules: [] })),
    ).toHaveProperty("error", `无法识别的格式（期望 ${RULE_PACK_FORMAT}）`);
    const bad = parseRulePack(
      JSON.stringify({
        format: RULE_PACK_FORMAT,
        name: "x",
        version: "1",
        rules: [{ id: "" }],
      }),
    );
    expect(bad).toHaveProperty("error");
  });
});
