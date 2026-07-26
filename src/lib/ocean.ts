/** Token Probability Landscape（Token 概率地形）：把真实 GenerationTrace 映射到三维空间的纯函数。
 *  每个维度都可解释：X=时间步，Y=候选概率排位，Z=该步熵；
 *  缩放=概率，颜色=熵冷暖。不新增任何采集字段，不伪造数据。 */

import type { TokenStep } from "./trace";

/** 单个三维节点：一个候选 token 在概率空间中的位置 */
export interface OceanNode {
  /** 所属生成步 */
  step: number;
  /** 在该步 top-k 中的序号（按概率降序） */
  rank: number;
  /** 是否为被采样选中的 token */
  chosen: boolean;
  /** 该候选的真实概率 */
  prob: number;
  /** 候选文本（用于拾取后展示） */
  text: string;
  x: number;
  y: number;
  z: number;
  /** 实例缩放：流宽=概率 */
  scale: number;
  /** 0..1 热度：该步熵相对全序列最大熵（颜色映射用） */
  heat: number;
}

export interface OceanLayout {
  nodes: OceanNode[];
  /** 主流路径（被选中 token 的连线顶点，与 nodes 中 chosen 点一致） */
  spine: { x: number; y: number; z: number }[];
  /** 全序列最大熵（HUD 展示用） */
  maxEntropy: number;
  /** X 轴总长度（相机取景用） */
  length: number;
}

/** X 轴步距 */
export const STEP_DX = 1.0;
/** Y 轴排位间距 */
export const RANK_DY = 1.6;
/** Z 轴熵放大系数 */
export const ENTROPY_DZ = 2.2;

/** 无状态伪随机（同一位置永远同一抖动，保证布局可复现） */
export function jitter(seed: number): number {
  const h = (seed * 2654435761) % 4294967295;
  return ((h >>> 8) % 10000) / 10000 - 0.5;
}

/** 把真实 steps 映射为三维布局。纯函数：同一 trace 永远得到同一空间。 */
export function oceanLayout(steps: TokenStep[]): OceanLayout {
  const nodes: OceanNode[] = [];
  const spine: { x: number; y: number; z: number }[] = [];
  let maxEntropy = 0;
  for (const s of steps) if (s.entropy > maxEntropy) maxEntropy = s.entropy;
  const entNorm = maxEntropy > 0 ? maxEntropy : 1;

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const z = s.entropy * ENTROPY_DZ;
    const heat = s.entropy / entNorm;
    for (let k = 0; k < s.topk.length; k++) {
      const c = s.topk[k];
      const chosen = c.id === s.id;
      // 主流走中轴；暗流按排位上下交替展开，离主轴越远概率越低
      const lane = chosen ? 0 : Math.ceil((k + 1) / 2) * (k % 2 === 0 ? 1 : -1);
      const node: OceanNode = {
        step: i,
        rank: k,
        chosen,
        prob: c.prob,
        text: c.text,
        x: i * STEP_DX,
        y: lane * RANK_DY + jitter(i * 31 + k) * 0.5,
        z: chosen ? z : z + jitter(i * 17 + k * 3) * 1.2,
        scale: 0.18 + Math.sqrt(c.prob) * 0.9,
        heat,
      };
      nodes.push(node);
      if (chosen) spine.push({ x: node.x, y: node.y, z: node.z });
    }
    // 选中 token 不在 top-k 内（低概率采样命中长尾）：以真实 prob 单独成点
    if (!s.topk.some((c) => c.id === s.id)) {
      const node: OceanNode = {
        step: i,
        rank: s.topk.length,
        chosen: true,
        prob: s.prob,
        text: s.text,
        x: i * STEP_DX,
        y: 0,
        z,
        scale: 0.18 + Math.sqrt(s.prob) * 0.9,
        heat,
      };
      nodes.push(node);
      spine.push({ x: node.x, y: node.y, z: node.z });
    }
  }
  return { nodes, spine, maxEntropy, length: steps.length * STEP_DX };
}

/** 颜色映射：冷靛（低熵）→ 暖粉（高熵）。返回 HSL 分量，渲染层转 Color。 */
export function oceanColor(
  heat: number,
  chosen: boolean,
): { h: number; s: number; l: number } {
  const h = (258 - heat * 60) / 360;
  return chosen
    ? { h, s: 0.72, l: 0.62 }
    : { h, s: 0.5, l: 0.2 + heat * 0.14 };
}

/** 软件光栅检测：SwiftShader/llvmpipe 等 CPU 渲染下 3D 不可用，必须降级。
 *  实测（SwiftShader）：满载场景仅 ~3fps。 */
export function isSoftwareRenderer(renderer: string): boolean {
  return /swiftshader|llvmpipe|software|microsoft basic render/i.test(renderer);
}

/** 读取当前环境的 WebGL renderer 字符串；无 WebGL 返回 null */
export function detectGLRenderer(): string | null {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return null;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return renderer;
  } catch {
    return null;
  }
}
