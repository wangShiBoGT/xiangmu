/** 全局 TraceFocus：跨页面共享的「当前选中 run / step / 分支」。
 *  发现、档案、实验台、检查器都以它为锚点联动；
 *  只是一个内存态选择句柄，不含任何 trace 数据本身。 */

export interface TraceFocus {
  runId: string;
  /** 0-based 生成步；null = 只选中 run */
  stepIndex: number | null;
  /** 分支路径：从 root 依次取第几个 child；空数组 = 主干 */
  branchPath: number[];
  /** 处于对比语境时的另一条 run */
  comparisonRunId?: string;
}

let current: TraceFocus | null = null;
const subs = new Set<(f: TraceFocus | null) => void>();

export function getTraceFocus(): TraceFocus | null {
  return current;
}

export function setTraceFocus(f: TraceFocus | null): void {
  current = f;
  for (const s of subs) s(f);
}

export function subscribeTraceFocus(
  fn: (f: TraceFocus | null) => void,
): () => void {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}
