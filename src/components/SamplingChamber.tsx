import { useEffect, useMemo, useRef, useState } from "react";
import { specialTokenLabel, type TokenStep } from "../lib/trace";

/** 采样舱（Sampling Chamber）：产品的标志性视觉行为——
 *  每个被采样的 token 都穿过一张概率阈面。
 *  阈面前 = 该步已记录的候选分布；穿过阈面 = 实际采样结果；阈面后 = 已生成、可回放的路径。
 *  所有节点均来自真实 trace（steps[i].topk / prob / entropy），不渲染任何伪数据。 */

export type ChamberMode = "idle" | "waiting" | "sampling" | "settled";

const PATH_WINDOW = 14;

/** 特殊 token（结束符/思考标记）换成人话标签，不直接渲染 <｜end▁of▁sentence｜> */
function tokenLabel(text: string): { label: string; special: boolean } {
  const sp = specialTokenLabel(text);
  if (sp)
    return {
      label: /end|eos|eot|im_end/i.test(sp) ? "结束符" : sp,
      special: true,
    };
  return { label: text.trim() || text, special: false };
}

function candStyle(prob: number, i: number, n: number) {
  // 亮度与体积 ∝ 概率；水平位置按序排开（概率降序，中间最亮）
  const order = i % 2 === 0 ? i / 2 : -(i + 1) / 2; // 0,-1,1,-2,2…
  const x = order * (86 - n * 4);
  const alpha = 0.28 + prob * 0.72;
  const scale = 0.82 + prob * 0.3;
  return {
    transform: `translateX(${x}px) scale(${scale.toFixed(3)})`,
    opacity: alpha,
  } as const;
}

export default function SamplingChamber({
  mode,
  steps,
  index,
  prompt,
  runLabel,
  note,
  children,
}: {
  mode: ChamberMode;
  /** 全部已知步骤（live 为已到达的，demo 为整份 trace） */
  steps: TokenStep[];
  /** 当前正在展示采样的步序号；-1 = 尚无 */
  index: number;
  /** 悬浮在舱内上方的问题（实验对象） */
  prompt: string | null;
  /** 实验标签：模型 · 后端 · 温度 · seed（demo 时为录制示例标注） */
  runLabel: string | null;
  /** 演示暂留时的说明（如「候选分布最分散的一步」「标注规则命中」） */
  note?: string | null;
  /** 舱底自定义内容（idle 态的动作按钮等） */
  children?: React.ReactNode;
}) {
  const step = index >= 0 ? steps[index] : null;
  const active = mode === "sampling" && step !== null;
  // 阈面后的已生成路径（最近若干个，最新的带穿越动效）
  const path = useMemo(
    () => (index >= 0 ? steps.slice(Math.max(0, index - PATH_WINDOW + 1), index + 1) : []),
    [steps, index],
  );
  const cands = useMemo(() => (step ? step.topk.slice(0, 5) : []), [step]);

  // settled 收束：淡出候选，仅保留路径
  const prevIndex = useRef(index);
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    if (index !== prevIndex.current) {
      prevIndex.current = index;
      setFlash((f) => f + 1);
    }
  }, [index]);

  return (
    <div className="chamber relative overflow-hidden rounded-md border border-obs-line bg-obs-2">
      {runLabel && (
        <p className="absolute left-4 top-3 z-10 flex items-center gap-1.5 text-[11px] tabular-nums tracking-wide text-obs-ink2/80 select-none">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              active ? "bg-emerald-400" : "bg-obs-ink2/40"
            }`}
          />
          {runLabel}
        </p>
      )}

      <div className="flex min-h-[380px] flex-col items-center justify-between px-6 pb-5 pt-10">
        {/* 实验对象：悬浮在空间中的问题 */}
        <p
          className={`max-w-[520px] text-center text-[16px] leading-relaxed transition-colors duration-300 ${
            prompt ? "text-obs-ink" : "text-obs-ink2/50"
          } select-none`}
        >
          {prompt ?? "把一个问题装载进采样舱"}
        </p>

        {/* 阈面前：当前步已记录的候选分布（真实 topk，亮度/体积 ∝ 概率） */}
        <div className="relative flex h-16 w-full items-center justify-center">
          {step && mode === "sampling" ? (
            cands.map((c, i) => {
              const chosen = c.id === step.id;
              const t = tokenLabel(c.text);
              return (
                <span
                  key={`${flash}-${c.id}`}
                  className={`chamber-cand absolute rounded-md border px-2.5 py-1 text-[12px] whitespace-pre tabular-nums ${
                    chosen
                      ? "border-measure-400/70 bg-measure-500/15 text-obs-ink"
                      : "border-obs-line bg-obs-2/70 text-obs-ink2"
                  } ${t.special ? "italic opacity-80" : ""}`}
                  style={candStyle(c.prob, i, cands.length)}
                  title={`steps[${index}].topk · p=${c.prob.toFixed(3)}`}
                >
                  {t.label}
                  <span className="ml-1.5 text-[11px] opacity-70">
                    {(c.prob * 100).toFixed(0)}%
                  </span>
                </span>
              );
            })
          ) : mode === "settled" ? null : (
            <span className="flex gap-6">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="h-6 w-14 rounded-md border border-obs-line/50 bg-obs-2/40"
                />
              ))}
            </span>
          )}
        </div>

        {/* 采样阈面：一条居中的水平光学阈线；首个 token 到来时点亮 */}
        <div className="relative h-10 w-full">
          <div
            className={`absolute left-1/2 top-1/2 h-px w-[min(520px,88%)] -translate-x-1/2 -translate-y-1/2 transition-all duration-600 ${
              active
                ? "bg-measure-400/80"
                : "bg-obs-line"
            }`}
          />
          {active && (
            <span
              key={`pulse-${flash}`}
              className="chamber-bar-pulse absolute left-1/2 top-1/2 h-[3px] w-[min(240px,50%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-measure-300/90"
            />
          )}
          {step && mode === "sampling" && (
            <span
              key={flash}
              className="chamber-drop absolute left-1/2 top-0 -translate-x-1/2 rounded-md bg-measure-500/90 px-2 py-0.5 text-[13px] font-medium whitespace-pre text-white"
            >
              {tokenLabel(step.text).label}
            </span>
          )}
        </div>

        {/* 阈面后：已经形成、可回放的生成路径 */}
        <div className="flex min-h-[44px] w-full max-w-[560px] flex-wrap items-center justify-center gap-y-0.5 text-[13px] leading-6">
          {path.length > 0 ? (
            <>
              {index >= PATH_WINDOW && (
                <span className="mr-1 text-obs-ink2/40 select-none">…</span>
              )}
              {path.map((s, i) => {
                const t = tokenLabel(s.text);
                return (
                  <span
                    key={index - path.length + 1 + i}
                    className={
                      t.special
                        ? "mx-1 rounded border border-obs-line px-1 text-[11px] text-obs-ink2/60"
                        : `whitespace-pre ${
                            i === path.length - 1 && active
                              ? "text-obs-ink"
                              : "text-obs-ink2/80"
                          }`
                    }
                  >
                    {t.special ? t.label : s.text}
                  </span>
                );
              })}
            </>
          ) : (
            <span className="text-[12px] text-obs-ink2/40 select-none">
              {mode === "waiting" ? "正在等待首个可记录输出…" : "尚未开始记录"}
            </span>
          )}
        </div>

        {/* 舱底状态行 / 自定义动作 */}
        <div className="flex min-h-[30px] w-full flex-col items-center gap-2">
          {note && (
            <p className="rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[12px] text-amber-200/90 select-none">
              {note}
            </p>
          )}
          {step && !note && (
            <p className="text-[11px] tabular-nums text-obs-ink2/50 select-none">
              第 {index + 1} 步 · p={step.prob.toFixed(2)} · 熵 {step.entropy.toFixed(2)} nats
              <span className="ml-2 font-mono text-obs-ink2/35">steps[{index}].topk</span>
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
