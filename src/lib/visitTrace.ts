/** 首访行为 trace（锚点 A8）：只存 localStorage，永不上传，可关闭可清除。
 *  用途：本机测量 P0-3 的两个代理指标——
 *  ① 看到犹豫点暂停帧后产生互动（点候选/点继续）的比例；
 *  ② 首访最终跑自己 prompt 的比例。 */

const KEY = "aiobs.visitTrace.v1";
const OPTOUT_KEY = "aiobs.visitTrace.optout";

export type VisitEvent =
  | "landing_view"
  | "hero_cta" // 首屏「亲眼看这一刻」
  | "hero_slice_expand" // 首屏切片展开原始数据
  | "hero_pick_model"
  | "demo_pause_reached" // 到达犹豫点暂停帧
  | "demo_pause_candidate" // 暂停帧点了候选
  | "demo_pause_resume" // 暂停帧点了继续
  | "demo_done"
  | "done_moments_open" // 收束卡展开 N 个瞬间
  | "done_moment_jump"
  | "own_run_start" // 跑了自己的 prompt
  | "replay_verify_start" // 同 seed 再跑一次验证复现
  | "predict_shown" // 犹豫点先猜后验的预测邀请出现
  | "predict_answered"; // 用户在揭示前做了预测

export interface VisitRecord {
  startedAt: number;
  events: { t: number; e: VisitEvent }[];
}

function read(): VisitRecord | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as VisitRecord) : null;
  } catch {
    return null;
  }
}

export function visitTraceEnabled(): boolean {
  try {
    return localStorage.getItem(OPTOUT_KEY) !== "1";
  } catch {
    return false;
  }
}

export function setVisitTraceEnabled(on: boolean): void {
  try {
    if (on) localStorage.removeItem(OPTOUT_KEY);
    else localStorage.setItem(OPTOUT_KEY, "1");
  } catch {
    /* 忽略：隐私模式等场景下静默失效 */
  }
}

export function clearVisitTrace(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 同上 */
  }
}

export function logVisit(e: VisitEvent): void {
  if (!visitTraceEnabled()) return;
  try {
    const rec = read() ?? { startedAt: Date.now(), events: [] };
    rec.events.push({ t: Date.now(), e });
    if (rec.events.length > 500) rec.events.splice(0, rec.events.length - 500);
    localStorage.setItem(KEY, JSON.stringify(rec));
  } catch {
    /* 同上 */
  }
}

export function getVisitTrace(): VisitRecord | null {
  return read();
}

/** 本机首访漏斗（样本仅本机访客） */
export function visitFunnel(): {
  label: string;
  event: VisitEvent;
  hit: boolean;
}[] {
  const rec = read();
  const has = (e: VisitEvent) => !!rec?.events.some((x) => x.e === e);
  const rows: { label: string; event: VisitEvent }[] = [
    { label: "看到首屏", event: "landing_view" },
    { label: "点了「亲眼看这一刻」", event: "hero_cta" },
    { label: "到达犹豫点暂停帧", event: "demo_pause_reached" },
    { label: "暂停帧互动（候选/继续）", event: "demo_pause_resume" },
    { label: "看完整场演示", event: "demo_done" },
    { label: "跑了自己的 prompt", event: "own_run_start" },
  ];
  return rows.map((r) => ({
    ...r,
    hit:
      r.event === "demo_pause_resume"
        ? has("demo_pause_resume") || has("demo_pause_candidate")
        : has(r.event),
  }));
}
