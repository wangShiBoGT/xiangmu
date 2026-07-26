/** 双结局判定（锚点 C3）：从同一分岔步出发的两条真实续写，
 *  用确定性文本规则分类为三种结果——不同 / 殊途同归 / 退化，
 *  三种都如实呈现，不挑蝴蝶效应案例（P1）。 */

export type DualOutcome = "different" | "converged" | "degenerate";

export interface DualEndingResult {
  outcome: DualOutcome;
  /** 两条结局去空白后的公共后缀长度（字符） */
  commonSuffixLen: number;
  /** 判定所用的确定性依据（用户可核验） */
  basis: string;
}

/** 殊途同归阈值：公共后缀 ≥12 字符视为重新汇合 */
const CONVERGE_SUFFIX = 12;
/** 退化阈值：结局不足 6 个非空白字符，或同一字符连续重复 ≥12 次 */
const DEGENERATE_MIN_CHARS = 6;
const DEGENERATE_REPEAT = 12;

function normalize(s: string): string {
  return s.replace(/\s+/g, "");
}

function maxCharRun(s: string): number {
  let best = 0;
  for (let i = 0; i < s.length; ) {
    let j = i;
    while (j < s.length && s[j] === s[i]) j++;
    best = Math.max(best, j - i);
    i = j;
  }
  return best;
}

function commonSuffix(a: string, b: string): number {
  let n = 0;
  while (
    n < a.length &&
    n < b.length &&
    a[a.length - 1 - n] === b[b.length - 1 - n]
  )
    n++;
  return n;
}

export interface SharedPrefixView {
  /** 两条 token 序列的首个分歧位置；两序列在可比范围内完全一致时为 -1 */
  divergeIndex: number;
  /** 分歧前共享前缀的文本（token text 原样拼接） */
  prefixText: string;
}

/** C3.2 共享前缀头（纯函数）：对两条真实 token 序列按 id 逐位对齐，
 *  找 first-divergence，返回分歧位置与共享前缀文本。不改动任何序列。 */
export function sharedPrefixView(
  a: { id: number; text: string }[],
  b: { id: number; text: string }[],
): SharedPrefixView {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i].id === b[i].id) i++;
  const divergeIndex = i === n && a.length === b.length ? -1 : i;
  const upto = divergeIndex === -1 ? n : divergeIndex;
  return {
    divergeIndex,
    prefixText: a
      .slice(0, upto)
      .map((s) => s.text)
      .join(""),
  };
}

/** 对分岔步之后的两段结局文本做判定。a = 原路径结局，b = 改选后的结局。 */
export function classifyDualEnding(
  endingA: string,
  endingB: string,
): DualEndingResult {
  const a = normalize(endingA);
  const b = normalize(endingB);
  for (const [label, s] of [
    ["原路径", a],
    ["改选路径", b],
  ] as const) {
    if (s.length < DEGENERATE_MIN_CHARS)
      return {
        outcome: "degenerate",
        commonSuffixLen: commonSuffix(a, b),
        basis: `${label}结局仅 ${s.length} 个非空白字符（< ${DEGENERATE_MIN_CHARS}）`,
      };
    const run = maxCharRun(s);
    if (run >= DEGENERATE_REPEAT)
      return {
        outcome: "degenerate",
        commonSuffixLen: commonSuffix(a, b),
        basis: `${label}结局出现同一字符连续重复 ${run} 次（≥ ${DEGENERATE_REPEAT}）`,
      };
  }
  const suffix = commonSuffix(a, b);
  if (suffix >= CONVERGE_SUFFIX)
    return {
      outcome: "converged",
      commonSuffixLen: suffix,
      basis: `两条结局的末尾 ${suffix} 个字符完全相同（≥ ${CONVERGE_SUFFIX}）`,
    };
  return {
    outcome: "different",
    commonSuffixLen: suffix,
    basis: `公共后缀仅 ${suffix} 个字符（< ${CONVERGE_SUFFIX}），两条结局走向不同`,
  };
}
