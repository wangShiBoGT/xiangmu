/** AI Machine Score：本机 AI 推理能力单机跑分。
 *  一切输入实测可复现：速度来自真实生成的 tok/s，稳定性来自逐 token 耗时序列，
 *  后端是实际使用的推理路径。分数只在同一测试条件（模型/后端）下可比，
 *  卡面强制印测试条件；V1 无榜单，只出本机分数。 */

export interface ScoreInput {
  /** 实测吞吐（tok/s） */
  tps: number;
  /** 逐 token 真实耗时序列（ms），来自 trace 的 dt */
  dts: number[];
  /** 实际推理后端 */
  device: "webgpu" | "wasm";
  /** GPU 是否支持 shader-f16（wasm 时忽略） */
  fp16: boolean;
}

export interface MachineScore {
  /** 总分 0–10000 */
  total: number;
  /** 分项 0–1 */
  parts: { speed: number; backend: number; steady: number };
  /** 稳定性原始指标：耗时变异系数（越小越稳），样本不足为 null */
  cv: number | null;
  grade: "S" | "A" | "B" | "C" | "D";
}

/** 速度归一化参考天花板（tok/s）：对数刻度下 240 tok/s 记满分。
 *  参考物是内置最小参考模型在旗舰桌面 GPU 上的实测量级。 */
export const SPEED_CEILING_TPS = 240;

const WEIGHTS = { speed: 0.6, backend: 0.25, steady: 0.15 };

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** 耗时变异系数 std/mean：需要 ≥8 个有效样本才有统计意义 */
export function dtCV(dts: number[]): number | null {
  const valid = dts.filter((d) => d > 0);
  if (valid.length < 8) return null;
  const m = mean(valid);
  if (m <= 0) return null;
  const sd = Math.sqrt(mean(valid.map((d) => (d - m) ** 2)));
  return sd / m;
}

export function computeMachineScore(input: ScoreInput): MachineScore {
  // 速度：对数归一（低速段区分度大、高速段收敛），钳位到 [0,1]
  const speed = Math.min(
    1,
    Math.max(0, Math.log2(1 + Math.max(0, input.tps)) / Math.log2(1 + SPEED_CEILING_TPS)),
  );
  // 后端：实测路径，不按 UA 猜。fp16 是现代 GPU 标配，缺失小幅扣分
  const backend =
    input.device === "webgpu" ? (input.fp16 ? 1 : 0.85) : 0.4;
  // 稳定性：1 - min(cv,1)；样本不足给中性值 0.5（不奖不罚）
  const cv = dtCV(input.dts);
  const steady = cv === null ? 0.5 : 1 - Math.min(cv, 1);

  const total = Math.round(
    10000 *
      (WEIGHTS.speed * speed +
        WEIGHTS.backend * backend +
        WEIGHTS.steady * steady),
  );
  const grade =
    total >= 8500 ? "S" : total >= 7000 ? "A" : total >= 5000 ? "B" : total >= 3000 ? "C" : "D";
  return { total, parts: { speed, backend, steady }, cv, grade };
}
