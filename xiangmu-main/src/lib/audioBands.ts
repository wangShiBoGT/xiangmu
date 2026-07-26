/** 多频段音频分析（Landing 矩阵背景的驱动信号层）。
 *  不用单一总幅值驱动：把频谱拆成对数频段，低/中/高各自独立的
 *  attack/release 包络，另给出瞬态（谱通量）、质心与声相，
 *  让高频造浪、颗粒与配器织体都能被看见。全部纯计算，可单测。 */

export interface BandConfig {
  /** 频段数（对数等分） */
  bands: number;
  minHz: number;
  maxHz: number;
  sampleRate: number;
  fftSize: number;
}

export const DEFAULT_BAND_CONFIG: BandConfig = {
  bands: 40,
  minHz: 36,
  maxHz: 15000,
  sampleRate: 48000,
  fftSize: 2048,
};

/** 对数等分的频段边界，长度 bands+1，严格递增 */
export function bandEdges(cfg: BandConfig): number[] {
  const edges: number[] = [];
  const ratio = Math.log(cfg.maxHz / cfg.minHz);
  for (let i = 0; i <= cfg.bands; i++) {
    edges.push(cfg.minHz * Math.exp((ratio * i) / cfg.bands));
  }
  return edges;
}

export function dbToLin(db: number): number {
  return 10 ** (db / 20);
}

/** 频谱倾斜补偿：高频能量天然偏低，按 dB/oct 提升让高频细节不被低频淹没 */
export function tiltGain(hz: number, dbPerOct: number, refHz = 250): number {
  return 10 ** ((dbPerOct * Math.log2(Math.max(hz, 1) / refHz)) / 20);
}

/** 把 AnalyserNode 的 dB 频谱聚合成各频段能量（0..1，含倾斜补偿）。
 *  spectrumDb：getFloatFrequencyData 输出（长度 fftSize/2，-Infinity 为静音） */
export function bandEnergies(
  spectrumDb: Float32Array,
  cfg: BandConfig,
  edges: number[],
  tiltDbPerOct = 3,
): number[] {
  const hzPerBin = cfg.sampleRate / cfg.fftSize;
  const out: number[] = [];
  for (let b = 0; b < cfg.bands; b++) {
    const lo = Math.max(1, Math.floor(edges[b] / hzPerBin));
    const hi = Math.max(lo + 1, Math.ceil(edges[b + 1] / hzPerBin));
    let sum = 0;
    let n = 0;
    for (let k = lo; k < hi && k < spectrumDb.length; k++) {
      const db = spectrumDb[k];
      if (Number.isFinite(db)) sum += dbToLin(db);
      n++;
    }
    const centerHz = Math.sqrt(edges[b] * edges[b + 1]);
    const avg = n > 0 ? (sum / n) * tiltGain(centerHz, tiltDbPerOct) : 0;
    // 线性幅度 → 感知压缩（近似响度），再钳到 0..1
    out.push(Math.min(1, Math.sqrt(avg * 24)));
  }
  return out;
}

/** 频段包络组：每段独立 attack/release（单位秒，指数趋近）。
 *  低频惯性大、高频响应快，靠不同时间常数把织体分层。 */
export class EnvelopeBank {
  private env: number[];
  private attackSec: number[];
  private releaseSec: number[];
  constructor(attackSec: number[], releaseSec: number[]) {
    if (attackSec.length !== releaseSec.length)
      throw new Error("attack/release 长度不一致");
    this.attackSec = attackSec;
    this.releaseSec = releaseSec;
    this.env = new Array(attackSec.length).fill(0);
  }

  /** 输入本帧各段能量与帧间隔（秒），返回平滑后的包络（就地更新） */
  step(values: number[], dtSec: number): number[] {
    for (let i = 0; i < this.env.length; i++) {
      const v = values[i] ?? 0;
      const tau = v > this.env[i] ? this.attackSec[i] : this.releaseSec[i];
      const k = 1 - Math.exp(-dtSec / Math.max(tau, 1e-4));
      this.env[i] += (v - this.env[i]) * k;
    }
    return this.env;
  }

  get values(): number[] {
    return this.env;
  }
}

/** 按频段位置生成低/中/高三档时间常数：
 *  低频慢起慢落（山体呼吸），高频快起稍慢落（造浪+颗粒残影） */
export function defaultTimeConstants(bands: number): {
  attackSec: number[];
  releaseSec: number[];
} {
  const attackSec: number[] = [];
  const releaseSec: number[] = [];
  for (let i = 0; i < bands; i++) {
    const t = i / Math.max(1, bands - 1); // 0=最低频 1=最高频
    if (t < 0.3) {
      attackSec.push(0.045);
      releaseSec.push(0.28);
    } else if (t < 0.65) {
      attackSec.push(0.025);
      releaseSec.push(0.2);
    } else {
      attackSec.push(0.012);
      releaseSec.push(0.14);
    }
  }
  return { attackSec, releaseSec };
}

/** 谱通量（本帧相对上帧的正向能量增量之和）：瞬态/打击点检测 */
export function spectralFlux(prev: number[], cur: number[]): number {
  let flux = 0;
  const n = Math.min(prev.length, cur.length);
  for (let i = 0; i < n; i++) {
    const d = cur[i] - prev[i];
    if (d > 0) flux += d;
  }
  return flux;
}

/** 谱质心（0..1，按频段对数位置加权）：亮度/配器重心，映射到色彩 */
export function spectralCentroid(bandValues: number[]): number {
  let num = 0;
  let den = 0;
  for (let i = 0; i < bandValues.length; i++) {
    num += bandValues[i] * i;
    den += bandValues[i];
  }
  if (den <= 0) return 0;
  return num / den / Math.max(1, bandValues.length - 1);
}

/** 声相平衡：-1 全左 … +1 全右（输入左右声道总能量） */
export function stereoBalance(left: number, right: number): number {
  const sum = left + right;
  if (sum <= 0) return 0;
  return (right - left) / sum;
}
