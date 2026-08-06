/** 性能排行榜（阶段 1 · 零密钥方案）
 *
 *  本站是纯静态站点（GitHub Pages），没有服务端，因此两个方向都不由前端直接调
 *  GitHub API —— 读 Discussions 必须带 token（匿名 GraphQL 一律拒），写更需要
 *  client secret 换 token，两者都做不到「不在前端放密钥」。所以：
 *
 *  - 提交：前端只生成一个预填好标题与正文的「新建 Discussion」链接，用户用自己的
 *    GitHub 账号点发布。前端不持有任何 token；完整 trace 由用户自行作为附件上传，
 *    数据出设备必须是用户主动动作。
 *  - 读取：GitHub Actions 定时用内置 GITHUB_TOKEN 跑 GraphQL，生成静态
 *    leaderboard.json 提交回仓库，前端只 fetch 这个文件。
 *
 *  可信程度分级标注（verify），不用一个布尔糊过去：单机跑分本质上无法防篡改，
 *  能证明的只有「有 GitHub 账号发布」和「附了 trace 文件」，就只说这两件。 */

export const GITHUB_REPO = "wangShiBoGT/webgpu-llm-chat";
/** Discussions 分类 slug（仓库里需存在同名分类） */
export const LEADERBOARD_CATEGORY = "leaderboard";
/** 正文内嵌 JSON 的 schema 版本；改字段含义必须升版本 */
export const ENTRY_SCHEMA = 1;
/** 预填 URL 长度上限：超出浏览器/GitHub 容忍度就拒绝生成，不静默截断 */
export const MAX_PREFILL_URL = 6000;

/** 榜单条目的可信程度。account = 由真实 GitHub 账号发布；
 *  trace-attached = 帖子或评论里带了 .aitrace 附件（只核对存在，未复核内容）。 */
export type VerifyLevel = "account" | "trace-attached";

export const VERIFY_LABEL: Record<VerifyLevel, string> = {
  account: "GitHub 账号发布",
  "trace-attached": "已附 trace 文件（未复核内容）",
};

export interface LeaderboardEntry {
  id: string;
  /** Discussion 作者的 GitHub 登录名（身份来源） */
  author: string;
  avatarUrl: string | null;
  /** 正文里用户自填的昵称，仅作展示 */
  nickname: string;
  deviceName: string;
  deviceTier: 1 | 2 | 3;
  gpuName: string;
  modelId: string;
  device: "webgpu" | "wasm";
  /** 实测吞吐 tok/s（提交方自报） */
  tps: number;
  /** 本次生成的总步数 */
  tokens: number;
  /** 其中带真实耗时、计入吞吐的步数 */
  timedTokens: number;
  /** Machine Score（跑过设备页才有） */
  machineScore: { total: number; grade: string } | null;
  /** 导出 .aitrace 文件的 SHA-256，可与附件核对 */
  traceHash: string | null;
  verify: VerifyLevel;
  discussionUrl: string;
  discussionNumber: number;
  createdAt: string;
}

export interface LeaderboardFile {
  generatedAt: string;
  repo: string;
  entries: LeaderboardEntry[];
}

export type LeaderboardState =
  /** 榜单文件已生成 */
  | { status: "ok"; generatedAt: string; entries: LeaderboardEntry[] }
  /** 文件还不存在：定时任务没跑过，如实说没有，不假装空榜 */
  | { status: "absent" };

export const DEVICE_TIER_LABEL: Record<1 | 2 | 3, string> = {
  1: "集显组",
  2: "中端独显组",
  3: "高端显卡组",
};

/** 新建 Discussion 页面（不预填），给「分类还没建好」等情况兜底 */
export const DISCUSSIONS_URL = `https://github.com/${GITHUB_REPO}/discussions`;

// ---------- 读取：静态 leaderboard.json ----------

function isTier(v: unknown): v is 1 | 2 | 3 {
  return v === 1 || v === 2 || v === 3;
}

/** 远端文件是不可信输入：逐字段校验，坏条目丢弃而不是整表报废 */
export function parseLeaderboardFile(input: unknown): LeaderboardFile | null {
  if (typeof input !== "object" || input === null) return null;
  const f = input as Partial<LeaderboardFile>;
  if (typeof f.generatedAt !== "string" || !Array.isArray(f.entries))
    return null;
  const entries: LeaderboardEntry[] = [];
  for (const raw of f.entries) {
    const e = raw as Partial<LeaderboardEntry>;
    if (
      typeof e.id !== "string" ||
      typeof e.author !== "string" ||
      typeof e.deviceName !== "string" ||
      typeof e.gpuName !== "string" ||
      typeof e.modelId !== "string" ||
      typeof e.tps !== "number" ||
      !Number.isFinite(e.tps) ||
      typeof e.tokens !== "number" ||
      !isTier(e.deviceTier) ||
      (e.device !== "webgpu" && e.device !== "wasm") ||
      (e.verify !== "account" && e.verify !== "trace-attached") ||
      typeof e.discussionUrl !== "string" ||
      typeof e.discussionNumber !== "number" ||
      typeof e.createdAt !== "string"
    )
      continue;
    entries.push({
      id: e.id,
      author: e.author,
      avatarUrl: typeof e.avatarUrl === "string" ? e.avatarUrl : null,
      nickname: typeof e.nickname === "string" ? e.nickname : e.author,
      deviceName: e.deviceName,
      deviceTier: e.deviceTier,
      gpuName: e.gpuName,
      modelId: e.modelId,
      device: e.device,
      tps: e.tps,
      tokens: e.tokens,
      // 旧文件没有这个字段：退回总步数而不是丢弃整条
      timedTokens:
        typeof e.timedTokens === "number" && e.timedTokens > 0
          ? e.timedTokens
          : e.tokens,
      machineScore:
        e.machineScore &&
        typeof e.machineScore.total === "number" &&
        typeof e.machineScore.grade === "string"
          ? { total: e.machineScore.total, grade: e.machineScore.grade }
          : null,
      traceHash: typeof e.traceHash === "string" ? e.traceHash : null,
      verify: e.verify,
      discussionUrl: e.discussionUrl,
      discussionNumber: e.discussionNumber,
      createdAt: e.createdAt,
    });
  }
  return {
    generatedAt: f.generatedAt,
    repo: typeof f.repo === "string" ? f.repo : GITHUB_REPO,
    entries,
  };
}

/** 榜单地址：随站点一起部署的静态文件（由 Actions 生成） */
export function leaderboardUrl(): string {
  const base =
    typeof import.meta !== "undefined" && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : "/";
  return `${base}leaderboard.json`;
}

export async function fetchLeaderboard(): Promise<LeaderboardState> {
  const res = await fetch(leaderboardUrl(), { cache: "no-cache" });
  // 文件没生成过就是没有：不编空榜，让 UI 如实说明
  if (res.status === 404) return { status: "absent" };
  if (!res.ok) throw new Error(`榜单读取失败：HTTP ${res.status}`);
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    // 静态托管 404 常被重写成 index.html，解析失败等同于文件不存在
    return { status: "absent" };
  }
  const file = parseLeaderboardFile(json);
  if (!file) return { status: "absent" };
  return {
    status: "ok",
    generatedAt: file.generatedAt,
    entries: file.entries.sort((a, b) => b.tps - a.tps),
  };
}

// ---------- 提交：预填 Discussion ----------

export interface SubmissionInput {
  nickname: string;
  deviceName: string;
  deviceTier: 1 | 2 | 3;
  gpuName: string;
  modelId: string;
  modelName: string;
  device: "webgpu" | "wasm";
  /** 由 trace 真实耗时算出的吞吐（分母只含带耗时的步） */
  tps: number;
  /** 本次生成的总步数 */
  tokens: number;
  /** 其中带真实耗时、计入吞吐的步数 */
  timedTokens: number;
  /** timedTokens 这些步的耗时之和 */
  totalMs: number;
  temperature: number;
  topP: number;
  seed: number | null;
  machineScore: { total: number; grade: string } | null;
  /** 导出 .aitrace 文件内容的 SHA-256（十六进制） */
  traceHash: string;
  browser: string;
}

/** 从 trace 步骤算真实吞吐。
 *  只有带耗时的步能进分母：没有 dt 的步（回放导入、被截断的记录）不知道花了多久，
 *  计入就是编数字。tokens 是本次生成的全部步数，timedTokens 才是吞吐的样本量，
 *  两个都上报，收录方才能重算校验。 */
export function traceStats(steps: { dt: number }[]): {
  tokens: number;
  timedTokens: number;
  totalMs: number;
  tps: number;
} | null {
  const timed = steps.filter((s) => s.dt > 0);
  if (timed.length === 0) return null;
  const totalMs = timed.reduce((a, s) => a + s.dt, 0);
  if (totalMs <= 0) return null;
  return {
    tokens: steps.length,
    timedTokens: timed.length,
    totalMs,
    tps: timed.length / (totalMs / 1000),
  };
}

/** 文件指纹：与用户实际上传的附件字节一致才有意义，故对导出字符串取哈希 */
export async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 机器可读载荷：Actions 只认这个 JSON 块，展示文字随便改都不影响收录 */
export function buildEntryPayload(i: SubmissionInput): Record<string, unknown> {
  return {
    v: ENTRY_SCHEMA,
    nickname: i.nickname,
    deviceName: i.deviceName,
    deviceTier: i.deviceTier,
    gpuName: i.gpuName,
    modelId: i.modelId,
    device: i.device,
    tps: Number(i.tps.toFixed(2)),
    tokens: i.tokens,
    timedTokens: i.timedTokens,
    totalMs: Math.round(i.totalMs),
    machineScore: i.machineScore,
    traceHash: i.traceHash,
  };
}

export function buildSubmissionTitle(i: SubmissionInput): string {
  return `[Benchmark] ${i.deviceName} · ${i.modelName} · ${i.tps.toFixed(1)} tok/s`;
}

export function buildSubmissionBody(i: SubmissionInput): string {
  const payload = JSON.stringify(buildEntryPayload(i), null, 2);
  const fence = "```";
  return `## 性能提交

| 项目 | 值 |
| --- | --- |
| 昵称 | ${i.nickname} |
| 设备 | ${i.deviceName} |
| GPU | ${i.gpuName} |
| 档位 | ${DEVICE_TIER_LABEL[i.deviceTier]}（提交方自选） |
| 模型 | \`${i.modelId}\` |
| 后端 | ${i.device === "webgpu" ? "WebGPU" : "CPU (WASM)"} |
| 浏览器 | ${i.browser} |
| 实测吞吐 | **${i.tps.toFixed(1)} tok/s** |
| tokens | 共 ${i.tokens} 步，其中 ${i.timedTokens} 步有耗时（计时 ${(i.totalMs / 1000).toFixed(2)}s） |
| 采样 | T${i.temperature} · topP ${i.topP} · seed ${i.seed ?? "—"} |
| Machine Score | ${i.machineScore ? `${i.machineScore.total} · ${i.machineScore.grade} 级` : "未测（设备页可跑）"} |

${fence}json
${payload}
${fence}

以上 JSON 供排行榜自动收录，字段名请勿手改。

### 完整 trace（可选，但强烈建议）

把导出的 \`.aitrace\` 文件拖进本帖或评论作为附件，其他人才能复现这次运行。
文件指纹 SHA-256：\`${i.traceHash}\`

> 说明：吞吐由提交方本机测得、数值自报，榜单只能证明「由 GitHub 账号发布」与
> 「是否附了 trace 文件」，不声称已复核数字真实性。分数只在同一模型与后端下可比。
`;
}

/** 预填「新建 Discussion」链接。超长直接抛错，绝不静默截断正文。 */
export function buildSubmissionUrl(i: SubmissionInput): string {
  const params = new URLSearchParams({
    category: LEADERBOARD_CATEGORY,
    title: buildSubmissionTitle(i),
    body: buildSubmissionBody(i),
  });
  const url = `https://github.com/${GITHUB_REPO}/discussions/new?${params.toString()}`;
  if (url.length > MAX_PREFILL_URL)
    throw new Error(
      `预填内容过长（${url.length} 字符），请缩短设备名或 GPU 名后重试`,
    );
  return url;
}
