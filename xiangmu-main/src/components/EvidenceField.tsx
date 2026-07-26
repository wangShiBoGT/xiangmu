import { useEffect, useRef } from "react";
import { entropyLevel, type TokenStep } from "../lib/trace";

/** 背景证据流场：极淡的流线铺在正文之后，波动幅度逐段 = 本次运行逐步真实熵。
 *  确定段平顺、犹豫段湍流——背景的每一次起伏都能追溯到 steps[].entropy。
 *  无真实数据（无 steps）时不渲染；reduced-motion 时静止呈现同一曲线。 */
export default function EvidenceField({
  steps,
  running,
}: {
  steps: Pick<TokenStep, "entropy">[];
  running: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let raf = 0;
    let stopped = false;

    const draw = (t: number) => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const all = stepsRef.current;
      // 窗口最近 160 步：x 轴 = 步序，波幅 = 该步熵档位（真实数据，无插值美化）
      const win = all.slice(-160);
      if (win.length < 2) return;
      const lines = 3;
      for (let li = 0; li < lines; li++) {
        ctx.beginPath();
        const baseY = h * (0.3 + 0.2 * li);
        for (let x = 0; x <= w; x += 6) {
          const f = x / w;
          const si = Math.min(win.length - 1, Math.floor(f * win.length));
          const amp = entropyLevel(win[si].entropy);
          const phase =
            (reduced ? 0 : t / (900 + li * 260)) + f * (6 + amp * 14) + li * 1.7;
          const y = baseY + Math.sin(phase) * amp * 16;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(139, 143, 248, ${0.05 + 0.02 * li})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      if (!reduced && !stopped) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
    // steps.length：reduced-motion 静态模式下数据更新也要重绘一帧
  }, [running, steps.length]);

  if (steps.length < 2) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
      data-testid="evidence-field"
      title="背景流动 = 本次运行逐步熵（本机实测，steps[].entropy）；确定段平顺，犹豫段湍流"
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
