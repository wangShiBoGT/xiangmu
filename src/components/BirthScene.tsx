import { useMemo } from "react";
import type { TokenStep } from "../lib/trace";
import { formatGap } from "../lib/closeSteps";

/** Birth Scene · 词表投票（ACDL Sprint 5 深化：粒子成字）。仅在生成命中真实犹豫点时出现——
 *  一步生成 = 整个词表按概率投票（不是查词典）：外圈淡点 = 未记录的尾部质量
 *  （点数∵ 1-Σtopk，确定性圆周分布）；每个候选先化作一颗粒子飞向中心（大小/时长 ∝
 *  真实概率，确定性无随机），胜者在汇聚处凝聚成字（Birth），落选者按真实概率飘散淡出
 *  （Collapse）。一次性 600ms 场面，数据全部来自该步 topk；reduced-motion 下静态呈现。 */
export default function BirthScene({
  step,
  index,
  storm,
}: {
  step: TokenStep;
  index: number;
  /** 连续犹豫段（Particle Storm）：琥珀强化配色 */
  storm?: boolean;
}) {
  const losers = step.topk.filter((c) => c.id !== step.id);
  const maxProb = step.topk[0]?.prob ?? 1;
  const gap =
    step.topk.length >= 2 ? step.topk[0].prob - step.topk[1].prob : null;
  // 尾部质量：top-k 之外整个词表分摊的真实概率（投票的「其余选民」）
  const tailMass = Math.max(
    0,
    1 - step.topk.reduce((a, c) => a + c.prob, 0),
  );
  // 外圈淡点：点数 ∝ 尾部质量（每 4% 一点，上限 24），确定性圆周分布，无随机数
  const tailDots = useMemo(() => {
    const n = Math.min(24, Math.round(tailMass * 25));
    return Array.from({ length: n }, (_, i) => {
      const ang = (i / Math.max(n, 1)) * Math.PI * 2;
      return {
        x: Math.cos(ang) * 150,
        y: Math.sin(ang) * 96,
      };
    });
  }, [tailMass]);
  // 落选者按序均匀分布在圆周上（布局是排版，不是数据；大小/时长/透明度才由概率驱动）
  const placed = useMemo(
    () =>
      losers.map((c, i) => {
        const ang = (i / Math.max(losers.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const r = 90 + 40 * (1 - c.prob / maxProb);
        return {
          ...c,
          dx: Math.cos(ang) * r,
          dy: Math.sin(ang) * r * 0.62,
          scale: 0.7 + 0.6 * (c.prob / maxProb),
          dur: 380 + 220 * (c.prob / maxProb),
        };
      }),
    [losers, maxProb],
  );

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
      data-testid="birth-scene"
      aria-hidden
    >
      <div className="relative">
        {/* 尾部选民：词表里没进 top-k 的其余质量，亮度 = 真实尾部占比 */}
        {tailDots.map((d, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 h-[3px] w-[3px] rounded-full bg-obs-ink2"
            style={{
              transform: `translate(${d.x.toFixed(0)}px, ${d.y.toFixed(0)}px)`,
              opacity: Math.min(0.5, 0.15 + tailMass * 0.5),
            }}
          />
        ))}
        {/* 粒子成字：每个候选化作一颗粒子从自己的位置飞向中心，大小/时长 ∝ 真实概率；
            胜者在汇聚处凝聚成字（下方 birth-scene-winner） */}
        {placed.map((c) => (
          <span
            key={`p-${c.id}`}
            className={`birth-scene-converge absolute left-1/2 top-1/2 rounded-full ${
              storm ? "bg-amber-300" : "bg-indigo-300"
            }`}
            style={
              {
                width: `${(3 + 4 * (c.prob / maxProb)).toFixed(1)}px`,
                height: `${(3 + 4 * (c.prob / maxProb)).toFixed(1)}px`,
                animationDuration: `${(240 + 160 * (c.prob / maxProb)).toFixed(0)}ms`,
                "--bs-dx": `${c.dx.toFixed(1)}px`,
                "--bs-dy": `${c.dy.toFixed(1)}px`,
              } as React.CSSProperties
            }
          />
        ))}
        {placed.map((c) => (
          <span
            key={c.id}
            className={`birth-scene-cand absolute left-1/2 top-1/2 font-mono ${
              storm ? "text-amber-300/90" : "text-indigo-300/90"
            }`}
            style={
              {
                fontSize: `${(13 * c.scale).toFixed(1)}px`,
                animationDuration: `${c.dur.toFixed(0)}ms`,
                "--bs-dx": `${c.dx.toFixed(1)}px`,
                "--bs-dy": `${c.dy.toFixed(1)}px`,
              } as React.CSSProperties
            }
          >
            {c.text.trim() || "␣"}
            <span className="ml-1 text-[11px] tabular-nums opacity-70">
              {(c.prob * 100).toFixed(0)}%
            </span>
          </span>
        ))}
        <span
          className={`birth-scene-winner relative z-10 font-mono text-[24px] ${
            storm ? "text-amber-200" : "text-obs-ink"
          }`}
        >
          {step.text.trim() || "␣"}
        </span>
        <p className="birth-scene-note absolute left-1/2 top-full mt-3 w-max -translate-x-1/2 text-[11px] tabular-nums text-obs-ink2/80 select-none">
          第 {index + 1} 步{storm ? " · 连续犹豫段" : " · 犹豫点"}
          {gap !== null ? ` · top-2 差${formatGap(gap)}` : ""} ·{" "}
          {step.topk.length} 个真实候选
          {tailMass > 0.005
            ? ` · 其余词表分摊 ${(tailMass * 100).toFixed(0)}%`
            : ""}
        </p>
        <p className="birth-scene-note absolute left-1/2 top-full mt-8 w-max -translate-x-1/2 text-[11px] text-obs-ink2/55 select-none">
          不是查词典——整个词表按概率投票，胜者由采样抽出
        </p>
      </div>
    </div>
  );
}
