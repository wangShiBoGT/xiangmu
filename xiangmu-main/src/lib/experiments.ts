/** 实验存档（F1）：给产品加上「时间维度」。
 *  每次 Observe 生成自动存档到 IndexedDB，可命名/星标/删除/对比。
 *  记录的是真实 trace 的忠实快照；跨设备导入后重跑结果可能不同（硬件/后端差异）。 */

import type { BranchNode, GenerationTrace, TokenStep } from "./trace";
import {
  AITRACE_FORMAT,
  MAX_BRANCH_NODES,
  REPLAY_V1_FORMAT,
  countNodes,
} from "./trace";
import { validateRuleset, type Rule } from "./rules";
import { sanitizeAgentEvents } from "./agentTrace";

export interface ExperimentStats {
  tokens: number;
  avgEntropy: number;
  avgTps: number | null;
  branches: number;
}

export interface ExperimentRecord {
  id: string;
  createdAt: number;
  name: string;
  starred: boolean;
  source: "run" | "imported";
  prompt: string;
  modelId: string;
  params: { temperature: number; topP: number };
  seed: number | null;
  device: string | null;
  root: BranchNode;
  stats: ExperimentStats;
  /** 随 Replay 导入的规则集（annotationsRuleset）：加载时可重现导出方的标注 */
  ruleset?: Rule[];
}

/** 存档容量上限：超出后按 LRU 淘汰未星标记录 */
export const MAX_EXPERIMENTS = 200;

export function computeStats(root: BranchNode): ExperimentStats {
  const steps = root.trace?.steps ?? [];
  const tokens = steps.length;
  const avgEntropy =
    tokens > 0 ? steps.reduce((a, s) => a + s.entropy, 0) / tokens : 0;
  const timed = steps.filter((s) => s.dt > 0);
  const avgTps =
    timed.length > 0
      ? timed.length / (timed.reduce((a, s) => a + s.dt, 0) / 1000)
      : null;
  return { tokens, avgEntropy, avgTps, branches: countNodes(root) };
}

/** 默认名称：prompt 前 40 字 */
export function defaultName(prompt: string): string {
  const t = prompt.trim().replace(/\s+/g, " ");
  return t.length > 40 ? `${t.slice(0, 40)}…` : t;
}

/** 纯函数：给定全部记录，返回应被淘汰的 id（未星标、最旧优先） */
export function selectEvictions(
  records: { id: string; createdAt: number; starred: boolean }[],
  cap = MAX_EXPERIMENTS,
): string[] {
  if (records.length <= cap) return [];
  const excess = records.length - cap;
  return records
    .filter((r) => !r.starred)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, excess)
    .map((r) => r.id);
}

/** 两条 token 序列的首个分歧位置；完全一致返回 -1 */
export function firstDivergence(a: TokenStep[], b: TokenStep[]): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i].id !== b[i].id) return i;
  }
  return a.length === b.length ? -1 : n;
}

/** 严格可比较：模型、prompt、温度、Top-P、后端全部一致才允许数值比较。
 *  seed 不同不影响可比性（正是要比较的变量之一）。 */
export function isComparable(a: ExperimentRecord, b: ExperimentRecord): boolean {
  return (
    a.modelId === b.modelId &&
    a.prompt === b.prompt &&
    a.params.temperature === b.params.temperature &&
    a.params.topP === b.params.topP &&
    a.device === b.device
  );
}

/** 可比较组 key：同 key 的 run 才互相出现「比较」入口 */
export function compatKey(r: ExperimentRecord): string {
  return [r.modelId, r.params.temperature, r.params.topP, r.device, r.prompt].join("\u0000");
}

/** 两组参数的差异字段列表 */
export function paramsDiff(
  a: ExperimentRecord,
  b: ExperimentRecord,
): { label: string; a: string; b: string }[] {
  const out: { label: string; a: string; b: string }[] = [];
  if (a.modelId !== b.modelId)
    out.push({ label: "模型", a: a.modelId, b: b.modelId });
  if (a.params.temperature !== b.params.temperature)
    out.push({
      label: "温度",
      a: String(a.params.temperature),
      b: String(b.params.temperature),
    });
  if (a.params.topP !== b.params.topP)
    out.push({ label: "Top-P", a: String(a.params.topP), b: String(b.params.topP) });
  if (a.seed !== b.seed)
    out.push({ label: "种子", a: String(a.seed ?? "—"), b: String(b.seed ?? "—") });
  if (a.prompt !== b.prompt) out.push({ label: "Prompt", a: a.prompt, b: b.prompt });
  return out;
}

// ---------- IndexedDB 层（环境无 IDB 时安全降级为 no-op） ----------

const DB_NAME = "browser-ai-microscope";
const STORE = "experiments";

function hasIDB(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      }),
  );
}

export async function saveExperiment(rec: ExperimentRecord): Promise<void> {
  if (!hasIDB()) return;
  await tx("readwrite", (s) => s.put(rec));
  const all = await listExperiments();
  const evict = selectEvictions(all);
  for (const id of evict) await deleteExperiment(id);
}

export async function listExperiments(): Promise<ExperimentRecord[]> {
  if (!hasIDB()) return [];
  const all = await tx<ExperimentRecord[]>("readonly", (s) => s.getAll());
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getExperiment(
  id: string,
): Promise<ExperimentRecord | undefined> {
  if (!hasIDB()) return undefined;
  return tx<ExperimentRecord | undefined>("readonly", (s) => s.get(id));
}

export async function updateExperiment(
  id: string,
  patch: Partial<Pick<ExperimentRecord, "name" | "starred" | "root" | "stats">>,
): Promise<void> {
  if (!hasIDB()) return;
  const rec = await getExperiment(id);
  if (!rec) return;
  await tx("readwrite", (s) => s.put({ ...rec, ...patch }));
}

export async function deleteExperiment(id: string): Promise<void> {
  if (!hasIDB()) return;
  await tx("readwrite", (s) => s.delete(id));
}

/** 分岔子树校验：结构不符或节点超限时丢弃（导入不因分岔损坏而失败） */
function sanitizeBranches(input: unknown): BranchNode[] {
  if (!Array.isArray(input)) return [];
  const valid = (n: unknown): n is BranchNode => {
    if (typeof n !== "object" || n === null) return false;
    const b = n as BranchNode;
    return (
      typeof b.forkStep === "number" &&
      typeof b.forcedId === "number" &&
      typeof b.forcedText === "string" &&
      (b.trace === null ||
        (typeof b.trace === "object" && Array.isArray(b.trace?.steps))) &&
      Array.isArray(b.children) &&
      b.children.every(valid)
    );
  };
  const nodes = input.filter(valid);
  let total = 1;
  const out: BranchNode[] = [];
  for (const n of nodes) {
    total += countNodes(n);
    if (total > MAX_BRANCH_NODES) break;
    out.push(n);
  }
  return out;
}

/** 从 .aitrace v2 / Replay v1 JSON 导入为存档记录；格式不符抛出人话错误 */
export function importReplay(json: string): ExperimentRecord {
  let data: {
    format?: string;
    prompt?: string;
    modelId?: string;
    params?: { temperature: number; topP: number; seed?: number | null };
    device?: string;
    promptIds?: number[];
    steps?: TokenStep[];
    pipeline?: { tokenizeMs: number; prefillMs: number; decodeMs: number };
    branches?: unknown;
    annotationsRuleset?: unknown;
    agent?: unknown;
    extensions?: unknown;
  };
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("不是有效的 JSON 文件");
  }
  const isV1 = data.format === REPLAY_V1_FORMAT;
  const isV2 = data.format === AITRACE_FORMAT;
  if ((!isV1 && !isV2) || !Array.isArray(data.steps)) {
    throw new Error(
      `不是 ${AITRACE_FORMAT} 或 ${REPLAY_V1_FORMAT} 格式的观测文件`,
    );
  }
  const trace: GenerationTrace = {
    modelId: data.modelId ?? "unknown",
    params: {
      temperature: data.params?.temperature ?? 1,
      topP: data.params?.topP ?? 1,
      seed: data.params?.seed ?? null,
    },
    promptIds: data.promptIds ?? [],
    steps: data.steps,
    device: (data.device as "webgpu" | "wasm") ?? "wasm",
    ...(data.pipeline ? { pipeline: data.pipeline } : {}),
  };
  // Agent 事件（E4a）：逐条校验，坏事件丢弃不影响主链
  const agent = sanitizeAgentEvents(data.agent, trace.steps.length);
  if (agent && agent.length > 0) trace.agent = agent;
  // 开放扩展：只要求是普通对象，内容原样保留不解释（命名空间属于各 runtime）
  if (
    typeof data.extensions === "object" &&
    data.extensions !== null &&
    !Array.isArray(data.extensions)
  )
    trace.extensions = data.extensions as Record<string, unknown>;
  const root: BranchNode = {
    forkStep: 0,
    forcedId: -1,
    forcedText: "",
    trace,
    children: isV2 ? sanitizeBranches(data.branches) : [],
  };
  const ruleset =
    data.annotationsRuleset !== undefined &&
    validateRuleset(data.annotationsRuleset) === null
      ? (data.annotationsRuleset as Rule[])
      : undefined;
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    name: defaultName(data.prompt ?? "导入的 Replay"),
    starred: false,
    source: "imported",
    prompt: data.prompt ?? "",
    modelId: trace.modelId,
    params: { temperature: trace.params.temperature, topP: trace.params.topP },
    seed: trace.params.seed ?? null,
    device: trace.device,
    root,
    stats: computeStats(root),
    ...(ruleset ? { ruleset } : {}),
  };
}
