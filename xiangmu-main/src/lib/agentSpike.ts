/** 本机 Agent Demo spike（锚点 E4b）：最小 ReAct 素材——本地工具 + 工具调用解析。
 *  全部纯函数、无网络：calculator 是手写四则运算求值（不用 eval），now 读真实时钟。
 *  解析失败原样返回错误（失败也是数据），不猜测、不修复模型输出。
 *  spike 现状：小模型能否稳定产出可解析的工具调用 JSON 需在真机端到端验证，
 *  在验证通过前 Agent 数据只来自外部导入的 .aitrace（E4a 回放已可用）。 */

export interface ToolSpec {
  name: string;
  description: string;
  run: (input: string) => string;
}

/** 四则运算求值：+ - * / 括号与小数，递归下降，无 eval */
export function calc(expr: string): number {
  let i = 0;
  const s = expr.replace(/\s+/g, "");
  const parseExpr = (): number => {
    let v = parseTerm();
    while (s[i] === "+" || s[i] === "-") {
      const op = s[i++];
      const r = parseTerm();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  };
  const parseTerm = (): number => {
    let v = parseFactor();
    while (s[i] === "*" || s[i] === "/") {
      const op = s[i++];
      const r = parseFactor();
      v = op === "*" ? v * r : v / r;
    }
    return v;
  };
  const parseFactor = (): number => {
    if (s[i] === "-") {
      i++;
      return -parseFactor();
    }
    if (s[i] === "(") {
      i++;
      const v = parseExpr();
      if (s[i] !== ")") throw new Error(`位置 ${i} 缺少右括号`);
      i++;
      return v;
    }
    const m = /^\d+(\.\d+)?/.exec(s.slice(i));
    if (!m) throw new Error(`位置 ${i} 不是数字：「${s.slice(i, i + 8)}」`);
    i += m[0].length;
    return Number(m[0]);
  };
  const v = parseExpr();
  if (i !== s.length) throw new Error(`位置 ${i} 有多余内容：「${s.slice(i, i + 8)}」`);
  return v;
}

export const AGENT_TOOLS: ToolSpec[] = [
  {
    name: "calculator",
    description: "四则运算，input 为算式字符串，如 (3+4)*2",
    run: (input) => String(calc(input)),
  },
  {
    name: "now",
    description: "返回当前本机时间（ISO 8601）",
    run: () => new Date().toISOString(),
  },
];

export type ParsedToolCall =
  | { kind: "call"; tool: string; input: string }
  | { kind: "error"; raw: string; error: string }
  | { kind: "none" };

/** 从模型输出中解析工具调用 JSON：```json {"tool":"...","input":"..."}``` 或裸 JSON 对象。
 *  只认最先出现的一个；不可解析时原样返回错误，不做任何修复猜测。 */
export function parseToolCall(text: string): ParsedToolCall {
  const fence = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/.exec(text);
  const bare = /\{[^{}]*"tool"[^{}]*\}/.exec(text);
  const raw = fence?.[1] ?? bare?.[0];
  if (!raw) return { kind: "none" };
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (typeof o.tool !== "string" || typeof o.input !== "string") {
      return { kind: "error", raw, error: "JSON 缺少字符串字段 tool/input" };
    }
    return { kind: "call", tool: o.tool, input: o.input };
  } catch (e) {
    return { kind: "error", raw, error: e instanceof Error ? e.message : String(e) };
  }
}

/** 执行一次工具调用：结果与错误都如实返回（含真实耗时） */
export function runTool(
  tool: string,
  input: string,
): { output: string; ok: boolean; durationMs: number } {
  const t0 = performance.now();
  const spec = AGENT_TOOLS.find((s) => s.name === tool);
  if (!spec) {
    return {
      output: `未知工具：${tool}（可用：${AGENT_TOOLS.map((s) => s.name).join(", ")}）`,
      ok: false,
      durationMs: performance.now() - t0,
    };
  }
  try {
    return { output: spec.run(input), ok: true, durationMs: performance.now() - t0 };
  } catch (e) {
    return {
      output: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
      ok: false,
      durationMs: performance.now() - t0,
    };
  }
}
