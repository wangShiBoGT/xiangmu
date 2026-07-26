export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  /** 随消息上传的文档文件名（仅展示用，文档内容已拼进 content） */
  attachments?: string[];
  /** 展示用的原始提问（content 含文档全文时用它渲染气泡） */
  displayContent?: string;
  /** 随消息上传的图片（压缩后的 dataURL），带图时走视觉模型 */
  images?: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: StoredMessage[];
}

export interface GenerationParams {
  maxTokens: number;
  temperature: number;
  topP: number;
  /** 默认用中文系统提示约束思考与回答（小模型思考段天然偏英文），可在设置中关闭 */
  chineseOnly: boolean;
}

export const DEFAULT_PARAMS: GenerationParams = {
  maxTokens: 2048,
  // DeepSeek-R1 官方推荐 0.5~0.7，贪心解码（0）会导致严重复读
  temperature: 0.7,
  topP: 0.95,
  chineseOnly: true,
};

const SESSIONS_KEY = "webgpu-llm-chat.sessions.v1";
const PARAMS_KEY = "webgpu-llm-chat.params.v1";
const MODEL_KEY = "webgpu-llm-chat.model.v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadSessions(): ChatSession[] {
  const list = safeParse<ChatSession[]>(
    localStorage.getItem(SESSIONS_KEY),
    [],
  );
  return Array.isArray(list)
    ? list.filter(
        (s) =>
          s &&
          typeof s.id === "string" &&
          Array.isArray(s.messages),
      )
    : [];
}

export function saveSessions(sessions: ChatSession[]): void {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function createSession(): ChatSession {
  const now = Date.now();
  return {
    id: `s-${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: "新对话",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

/** 用首条用户消息生成会话标题 */
export function titleFromMessage(content: string, maxLen = 20): string {
  const line = content.trim().split("\n")[0];
  return line.length > maxLen ? line.slice(0, maxLen) + "…" : line || "新对话";
}

export function loadParams(): GenerationParams {
  const p = safeParse<Partial<GenerationParams>>(
    localStorage.getItem(PARAMS_KEY),
    {},
  );
  return {
    maxTokens: clamp(Number(p.maxTokens ?? DEFAULT_PARAMS.maxTokens), 16, 8192),
    temperature: clamp(Number(p.temperature ?? DEFAULT_PARAMS.temperature), 0, 2),
    topP: clamp(Number(p.topP ?? DEFAULT_PARAMS.topP), 0, 1),
    chineseOnly: p.chineseOnly !== false,
  };
}

export function saveParams(params: GenerationParams): void {
  localStorage.setItem(PARAMS_KEY, JSON.stringify(params));
}

export function loadModelId(): string | null {
  return localStorage.getItem(MODEL_KEY);
}

export function saveModelId(id: string): void {
  localStorage.setItem(MODEL_KEY, id);
}

/** 会话按时间分组：今天 / 昨天 / 本周 / 更早 */
export function groupSessions(
  sessions: ChatSession[],
  now = Date.now(),
): { label: string; items: ChatSession[] }[] {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const today = startOfDay.getTime();
  const yesterday = today - 86400e3;
  const week = today - 6 * 86400e3;
  const groups = [
    { label: "今天", items: [] as ChatSession[] },
    { label: "昨天", items: [] as ChatSession[] },
    { label: "本周", items: [] as ChatSession[] },
    { label: "更早", items: [] as ChatSession[] },
  ];
  for (const s of sessions) {
    const t = s.updatedAt;
    if (t >= today) groups[0].items.push(s);
    else if (t >= yesterday) groups[1].items.push(s);
    else if (t >= week) groups[2].items.push(s);
    else groups[3].items.push(s);
  }
  return groups.filter((g) => g.items.length > 0);
}

export function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}
