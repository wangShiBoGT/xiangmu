/** Machine Score 跑分卡：1200×630 可分享 PNG。
 *  卡面强制印测试条件（模型/后端/tokens/浏览器），明示单机跑分无榜单——
 *  分数只在同一测试条件下可比，防误导。 */

import type { MachineScore } from "./machineScore";

export interface ScoreCardData {
  score: MachineScore;
  tps: number;
  modelName: string;
  device: "webgpu" | "wasm";
  gpuInfo: string | null;
  cores: number;
  memoryGB: number | null;
  numTokens: number;
  browser: string;
  dateText: string;
}

export const SCORE_CARD_W = 1200;
export const SCORE_CARD_H = 630;

const INK = "#E8EAF2";
const INK2 = "#a0a0a0";
const LINE = "rgba(232,234,242,0.12)";
const MEASURE = "#10A0FF";
const BG = "#0C0D10";

const SANS =
  '-apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
const MONO = '"SF Mono", "Cascadia Mono", Consolas, "PingFang SC", monospace';

/** navigator.userAgent 提炼为简短浏览器标识（拿不到就原样截断） */
export function browserLabel(ua: string): string {
  const m =
    /Edg\/(\d+)/.exec(ua) ??
    /Chrome\/(\d+)/.exec(ua) ??
    /Firefox\/(\d+)/.exec(ua) ??
    /Version\/(\d+).*Safari/.exec(ua);
  if (m) {
    const name = ua.includes("Edg/")
      ? "Edge"
      : ua.includes("Chrome/")
        ? "Chrome"
        : ua.includes("Firefox/")
          ? "Firefox"
          : "Safari";
    return `${name} ${m[1]}`;
  }
  return ua.slice(0, 32);
}

export function renderScoreCard(
  canvas: HTMLCanvasElement,
  data: ScoreCardData,
): void {
  canvas.width = SCORE_CARD_W;
  canvas.height = SCORE_CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建 canvas 2d 上下文");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, SCORE_CARD_W, SCORE_CARD_H);

  const PAD = 64;

  // 顶部：产品名 + 日期
  ctx.fillStyle = INK2;
  ctx.font = `600 20px ${SANS}`;
  ctx.fillText("AI MACHINE SCORE", PAD, PAD + 6);
  ctx.font = `400 18px ${MONO}`;
  const dateW = ctx.measureText(data.dateText).width;
  ctx.fillText(data.dateText, SCORE_CARD_W - PAD - dateW, PAD + 6);

  // 主读数：总分 + 等级
  ctx.fillStyle = INK;
  ctx.font = `700 128px ${MONO}`;
  const scoreText = String(data.score.total);
  ctx.fillText(scoreText, PAD - 6, 268);
  const scoreW = ctx.measureText(scoreText).width;
  ctx.fillStyle = MEASURE;
  ctx.font = `700 54px ${SANS}`;
  ctx.fillText(data.score.grade, PAD + scoreW + 24, 268);
  ctx.fillStyle = INK2;
  ctx.font = `400 19px ${SANS}`;
  ctx.fillText("本机浏览器 AI 推理单机跑分 · 无榜单，同条件才可比", PAD, 308);

  // 分项条
  const bars: { label: string; v: number; note: string }[] = [
    {
      label: "速度",
      v: data.score.parts.speed,
      note: `${data.tps.toFixed(1)} tok/s 实测`,
    },
    {
      label: "后端",
      v: data.score.parts.backend,
      note: data.device === "webgpu" ? "WebGPU" : "CPU (WASM)",
    },
    {
      label: "稳定性",
      v: data.score.parts.steady,
      note:
        data.score.cv !== null
          ? `耗时变异系数 ${data.score.cv.toFixed(2)}`
          : "样本不足",
    },
  ];
  const barX = PAD;
  const barW = SCORE_CARD_W - PAD * 2 - 280;
  let by = 372;
  for (const b of bars) {
    ctx.fillStyle = INK2;
    ctx.font = `500 17px ${SANS}`;
    ctx.fillText(b.label, barX, by + 5);
    ctx.fillStyle = LINE;
    ctx.fillRect(barX + 90, by - 8, barW, 10);
    ctx.fillStyle = MEASURE;
    ctx.fillRect(barX + 90, by - 8, barW * Math.max(0, Math.min(1, b.v)), 10);
    ctx.fillStyle = INK2;
    ctx.font = `400 15px ${MONO}`;
    ctx.fillText(b.note, barX + 90 + barW + 18, by + 4);
    by += 44;
  }

  // 测试条件（可复现性铁律：条件不全的分数没有意义）
  const cy = SCORE_CARD_H - PAD;
  ctx.strokeStyle = LINE;
  ctx.beginPath();
  ctx.moveTo(PAD, cy - 62);
  ctx.lineTo(SCORE_CARD_W - PAD, cy - 62);
  ctx.stroke();
  ctx.fillStyle = INK2;
  ctx.font = `400 16px ${MONO}`;
  const cond1 = [
    data.modelName,
    data.device === "webgpu" ? "WebGPU" : "CPU (WASM)",
    ...(data.gpuInfo ? [data.gpuInfo] : []),
    `${data.numTokens} tokens 实测`,
  ].join("  ·  ");
  const cond2 = [
    data.browser,
    `${data.cores} 核`,
    ...(data.memoryGB !== null ? [`内存 ≥${data.memoryGB} GB`] : []),
  ].join("  ·  ");
  ctx.fillText(cond1, PAD, cy - 28);
  ctx.fillText(cond2, PAD, cy);
}

/** 渲染并导出 PNG Blob */
export function exportScoreCard(data: ScoreCardData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  renderScoreCard(canvas, data);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("图片导出失败"));
    }, "image/png");
  });
}
