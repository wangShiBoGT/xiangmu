/** 规则包 V1（锚点 D4）：现有 Rule 结构的命名 + 版本化 JSON 导出/导入。
 *  零新 DSL——只是给规则集加一层可分享的信封；裸 Rule[] 数组仍可导入（向后兼容）。 */

import { validateRuleset, type Rule } from "./rules";

export const RULE_PACK_FORMAT = "aiobs.rulepack/1";

export interface RulePack {
  format: typeof RULE_PACK_FORMAT;
  name: string;
  version: string;
  exportedAt: string;
  rules: Rule[];
}

export function exportRulePack(
  name: string,
  version: string,
  rules: Rule[],
): string {
  const pack: RulePack = {
    format: RULE_PACK_FORMAT,
    name: name.trim() || "未命名规则集",
    version: version.trim() || "1",
    exportedAt: new Date().toISOString(),
    rules,
  };
  return JSON.stringify(pack, null, 2);
}

/** 解析规则包或裸规则数组；返回规则与来源描述，或人话错误。 */
export function parseRulePack(
  json: string,
): { rules: Rule[]; label: string } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { error: "不是有效的 JSON" };
  }
  if (Array.isArray(parsed)) {
    const err = validateRuleset(parsed);
    if (err) return { error: err };
    return { rules: parsed as Rule[], label: "裸规则数组" };
  }
  if (typeof parsed === "object" && parsed !== null) {
    const o = parsed as Record<string, unknown>;
    if (o.format !== RULE_PACK_FORMAT)
      return { error: `无法识别的格式（期望 ${RULE_PACK_FORMAT}）` };
    if (typeof o.name !== "string" || !o.name) return { error: "规则包缺少 name" };
    if (typeof o.version !== "string" || !o.version)
      return { error: "规则包缺少 version" };
    const err = validateRuleset(o.rules);
    if (err) return { error: err };
    return {
      rules: o.rules as Rule[],
      label: `${o.name} v${o.version}`,
    };
  }
  return { error: "规则包必须是对象或规则数组" };
}
