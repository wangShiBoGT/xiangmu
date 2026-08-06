/** 分享卡（F4）：把一次真实观察浓缩成一张可导出的图片。
 *  所有数字来自真实 trace 与规则命中，不做任何 AI 解读或美化。 */

import type { TokenStep } from "./trace";
import type { RuleMatch } from "./rules";

export interface ShareCardRuleHit {
  label: string;
  severity: "info" | "warn";
  count: number;
}

export interface ShareCardData {
  prompt: string;
  answer: string;
  modelName: string;
  device: string;
  temperature: number;
  topP: number;
  seed: number | null;
  dateText: string;
  tokens: number;
  avgEntropy: number;
  avgTps: number | null;
  /** 熵曲线（原始步序），绘制时按宽度重采样 */
  entropySeries: number[];
  /** 候选分布最分散的一步（熵最大），无 token 时为 null */
  peak: { index: number; text: string; entropy: number } | null;
  ruleHits: ShareCardRuleHit[];
}

export interface ShareCardMeta {
  prompt: string;
  modelName: string;
  device: string;
  temperature: number;
  topP: number;
  seed: number | null;
  now?: Date;
}

/** 纯函数：由真实 steps + 规则命中构造分享卡数据 */
export function buildShareCardData(
  steps: TokenStep[],
  matches: RuleMatch[],
  meta: ShareCardMeta,
): ShareCardData {
  const tokens = steps.length;
  const avgEntropy =
    tokens > 0 ? steps.reduce((a, s) => a + s.entropy, 0) / tokens : 0;
  const timed = steps.filter((s) => s.dt > 0);
  const avgTps =
    timed.length > 0
      ? timed.length / (timed.reduce((a, s) => a + s.dt, 0) / 1000)
      : null;
  let peak: ShareCardData["peak"] = null;
  for (let i = 0; i < steps.length; i++) {
    if (!peak || steps[i].entropy > peak.entropy) {
      peak = { index: i, text: steps[i].text, entropy: steps[i].entropy };
    }
  }
  const byLabel = new Map<string, ShareCardRuleHit>();
  for (const m of matches) {
    const cur = byLabel.get(m.label);
    if (cur) cur.count += 1;
    else byLabel.set(m.label, { label: m.label, severity: m.severity, count: 1 });
  }
  const ruleHits = [...byLabel.values()].sort((a, b) => b.count - a.count);
  const d = meta.now ?? new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    prompt: meta.prompt,
    answer: steps.map((s) => s.text).join(""),
    modelName: meta.modelName,
    device: meta.device,
    temperature: meta.temperature,
    topP: meta.topP,
    seed: meta.seed,
    dateText: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    tokens,
    avgEntropy,
    avgTps,
    entropySeries: steps.map((s) => s.entropy),
    peak,
    ruleHits,
  };
}

/** 把任意长度的序列重采样为 n 个点（分桶取均值，保持真实形状） */
export function resampleSeries(series: number[], n: number): number[] {
  if (series.length === 0 || n <= 0) return [];
  if (series.length <= n) return [...series];
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const from = Math.floor((i * series.length) / n);
    const to = Math.max(from + 1, Math.floor(((i + 1) * series.length) / n));
    let sum = 0;
    for (let j = from; j < to; j++) sum += series[j];
    out.push(sum / (to - from));
  }
  return out;
}

/** 单行截断（canvas 无自动换行） */
function ellipsize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (ctx.measureText(t).width <= maxWidth) return t;
  let lo = 0;
  let hi = t.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(`${t.slice(0, mid)}…`).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return `${t.slice(0, lo)}…`;
}

export const CARD_W = 1200;
export const CARD_H = 630;

const INK = "#E8EAF2";
const INK2 = "#a0a0a0";
const LINE = "rgba(232,234,242,0.12)";
const AMBER = "#E2A33C";
const MEASURE = "#10A0FF";
const BG = "#0C0D10";
const BG2 = "#13151B";

const SANS =
  '-apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
const MONO =
  '"SF Mono", "Cascadia Mono", Consolas, "PingFang SC", monospace';

/** 把分享卡绘制到 canvas（1200×630）。暗场仪器风：环境全暗，只有数据发光 */
export function renderShareCard(
  canvas: HTMLCanvasElement,
  data: ShareCardData,
): void {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建 canvas 2d 上下文");

  // 机身
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const PAD = 64;

  // 顶部：产品名 + 日期
  ctx.fillStyle = INK2;
  ctx.font = `600 20px ${SANS}`;
  ctx.fillText("BROWSER AI MICROSCOPE", PAD, PAD + 6);
  ctx.font = `400 18px ${MONO}`;
  const dateW = ctx.measureText(data.dateText).width;
  ctx.fillText(data.dateText, CARD_W - PAD - dateW, PAD + 6);

  // Prompt（主标题）
  ctx.fillStyle = INK;
  ctx.font = `600 40px ${SANS}`;
  ctx.fillText(ellipsize(ctx, data.prompt, CARD_W - PAD * 2), PAD, PAD + 76);

  // 回答摘录
  ctx.fillStyle = INK2;
  ctx.font = `400 22px ${SANS}`;
  ctx.fillText(ellipsize(ctx, data.answer, CARD_W - PAD * 2), PAD, PAD + 122);

  // 熵曲线（真实数据重采样）
  const chartX = PAD;
  const chartY = 268;
  const chartW = CARD_W - PAD * 2;
  const chartH = 150;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.strokeRect(chartX, chartY, chartW, chartH);
  const series = resampleSeries(data.entropySeries, 120);
  if (series.length > 1) {
    const maxE = Math.max(...series, 0.001);
    const px = (i: number) => chartX + (i / (series.length - 1)) * chartW;
    const py = (v: number) => chartY + chartH - (v / maxE) * (chartH - 12) - 6;
    const grad = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
    grad.addColorStop(0, "rgba(129,140,248,0.28)");
    grad.addColorStop(1, "rgba(129,140,248,0)");
    ctx.beginPath();
    ctx.moveTo(px(0), chartY + chartH);
    for (let i = 0; i < series.length; i++) ctx.lineTo(px(i), py(series[i]));
    ctx.lineTo(px(series.length - 1), chartY + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < series.length; i++) {
      if (i === 0) ctx.moveTo(px(i), py(series[i]));
      else ctx.lineTo(px(i), py(series[i]));
    }
    ctx.strokeStyle = MEASURE;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.fillStyle = INK2;
  ctx.font = `400 15px ${MONO}`;
  ctx.fillText("ENTROPY / step", chartX + 12, chartY + 26);

  // 分布最分散的一步
  if (data.peak) {
    ctx.fillStyle = AMBER;
    ctx.font = `500 19px ${SANS}`;
    const peakText = `分布最分散的一步：第 ${data.peak.index + 1} 词「${
      data.peak.text.trim() || data.peak.text
    }」 熵 ${data.peak.entropy.toFixed(2)}`;
    ctx.fillText(
      ellipsize(ctx, peakText, chartW - 24),
      chartX,
      chartY + chartH + 36,
    );
  }

  // 规则命中胶囊
  let hx = chartX;
  const hy = chartY + chartH + 62;
  ctx.font = `400 16px ${SANS}`;
  for (const hit of data.ruleHits.slice(0, 5)) {
    const label = `${hit.label} ×${hit.count}`;
    const w = ctx.measureText(label).width + 34;
    if (hx + w > CARD_W - PAD) break;
    ctx.fillStyle = BG2;
    ctx.strokeStyle = LINE;
    ctx.beginPath();
    ctx.roundRect(hx, hy, w, 34, 17);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = hit.severity === "warn" ? AMBER : INK2;
    ctx.beginPath();
    ctx.arc(hx + 16, hy + 17, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.fillText(label, hx + 27, hy + 22.5);
    hx += w + 10;
  }
  if (data.ruleHits.length === 0) {
    ctx.fillStyle = INK2;
    ctx.fillText("本次生成很平稳，无规则命中", chartX, hy + 22.5);
  }

  // 底部指标行
  const by = CARD_H - PAD;
  ctx.fillStyle = INK2;
  ctx.font = `400 17px ${MONO}`;
  const parts = [
    data.modelName,
    data.device === "webgpu" ? "WebGPU" : "CPU (WASM)",
    `T=${data.temperature}`,
    `top-p=${data.topP}`,
    ...(data.seed !== null ? [`seed=${data.seed}`] : []),
    `${data.tokens} tokens`,
    `均熵 ${data.avgEntropy.toFixed(2)}`,
    ...(data.avgTps !== null ? [`${data.avgTps.toFixed(1)} tok/s`] : []),
  ];
  ctx.fillText(ellipsize(ctx, parts.join("  ·  "), CARD_W - PAD * 2), PAD, by);

  ctx.strokeStyle = LINE;
  ctx.beginPath();
  ctx.moveTo(PAD, by - 34);
  ctx.lineTo(CARD_W - PAD, by - 34);
  ctx.stroke();
}

/** 渲染并导出 PNG Blob */
export function exportShareCard(data: ShareCardData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  renderShareCard(canvas, data);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("图片导出失败"));
    }, "image/png");
  });
}
