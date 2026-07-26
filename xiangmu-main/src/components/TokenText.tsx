import { Fragment, useCallback, useMemo, useRef, useState } from "react";
import {
  entropyLevel,
  specialTokenLabel,
  splitPhases,
  type TokenStep,
} from "../lib/trace";
import type { RuleMatch } from "../lib/rules";
import type { SceneLevel } from "../lib/director";

/** token 内的换行符渲染为可见的 ⏎ 标记，避免标点孤悬在行间无法辨认 */
function renderTokenText(text: string) {
  if (!text.includes("\n")) return text;
  const parts = text.split("\n");
  return parts.map((p, j) => (
    <Fragment key={j}>
      {j > 0 && (
        <>
          <span aria-hidden className="token-nl">⏎</span>
          <br />
        </>
      )}
      {p}
    </Fragment>
  ));
}

export interface DisplayStep extends TokenStep {
  /** 该步是否为用户强制改选（分岔点） */
  forced?: boolean;
}

interface HoverState {
  index: number;
  x: number;
  y: number;
  above: boolean;
}

/** Observe 正文：以 token 为最小单元渲染，背景深浅 = 该步候选分布的熵（越深分布越分散）。
 *  hover 显示精细浮层（概率/熵/规则命中），点击打开出生卡。
 *  鼠标高速扫过时抑制 hover（扫过≠触摸，带迟滞区间防闪烁）；意图延迟 80ms。
 *  不做 markdown 富渲染——显微镜看的是原始输出。 */
export default function TokenText({
  steps,
  selected,
  running,
  annotations,
  onSelect,
  onInteract,
  heat = false,
  director,
}: {
  steps: DisplayStep[];
  selected: number | null;
  running: boolean;
  /** 规则命中（按 token 位置索引）：warn 波浪线、info 点线 */
  annotations?: RuleMatch[][];
  onSelect: (index: number) => void;
  /** 用户首次 hover/点击 token 时回调一次（用于淡出操作提示） */
  onInteract?: () => void;
  /** 专家热力模式：每个 token 背景深浅 = 该步熵；默认关闭，正文安静可读 */
  heat?: boolean;
  /** 导演系统排片（生成中）：plain 直接打印 / flow 高光流 / birth·storm 大场面入场 */
  director?: SceneLevel[];
}) {
  const [hover, setHover] = useState<HoverState | null>(null);
  // Token 即入口：点击的词原地裂变成候选堆（不弹 Modal，永远留在现场）
  const [fission, setFission] = useState<number | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 鼠标速度迟滞：>800px/s 关、<400px/s 开，避免临界速度附近浮层忽隐忽现
  const fastRef = useRef(false);
  const lastMove = useRef<{ x: number; y: number; t: number } | null>(null);

  const trackVelocity = useCallback((e: React.MouseEvent) => {
    const now = performance.now();
    const prev = lastMove.current;
    lastMove.current = { x: e.clientX, y: e.clientY, t: now };
    if (!prev) return;
    const dt = now - prev.t;
    if (dt <= 0) return;
    const v = (Math.hypot(e.clientX - prev.x, e.clientY - prev.y) / dt) * 1000;
    if (v > 800) fastRef.current = true;
    else if (v < 400) fastRef.current = false;
  }, []);

  const show = useCallback(
    (index: number, el: HTMLElement) => {
      if (running) return;
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (showTimer.current) clearTimeout(showTimer.current);
      showTimer.current = setTimeout(() => {
        if (fastRef.current) return;
        onInteract?.();
        const r = el.getBoundingClientRect();
        const above = r.top > 140;
        setHover({
          index,
          x: Math.min(
            Math.max(r.left + r.width / 2, 130),
            window.innerWidth - 130,
          ),
          y: above ? r.top - 8 : r.bottom + 8,
          above,
        });
      }, 80);
    },
    [running, onInteract],
  );

  const hide = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    hideTimer.current = setTimeout(() => setHover(null), 60);
  }, []);

  if (fission !== null && (running || fission >= steps.length)) setFission(null);

  const hovered = hover !== null ? steps[hover.index] : null;
  const hoveredMatches = hover !== null ? (annotations?.[hover.index] ?? []) : [];

  // 阶段划分：思考模型的 <think>…</think> 段落单独成区，非思考模型保持原样
  const phases = useMemo(
    () => splitPhases(steps.map((s) => s.text)),
    [steps],
  );
  const [thinkOpen, setThinkOpen] = useState(true);

  const renderFission = (s: DisplayStep, i: number) => {
    if (fission !== i) return null;
    const maxProb = s.topk[0]?.prob ?? 1;
    return (
      <span key={`fission-${i}`} className="token-fission" data-testid={`fission-${i}`}>
        {s.topk.map((c) => {
          const chosen = c.id === s.id;
          return (
            <span
              key={c.id}
              className={`token-fission-cand ${chosen ? "token-fission-chosen" : ""}`}
              style={{ opacity: chosen ? 1 : 0.45 + 0.55 * (c.prob / maxProb) }}
            >
              <span className="font-mono">{c.text.trim() || "␣"}</span>
              <span className="tabular-nums text-[11px] opacity-80">
                {(c.prob * 100).toFixed(1)}%
              </span>
            </span>
          );
        })}
        <button
          type="button"
          className="token-fission-act"
          data-testid={`fission-open-${i}`}
          onClick={() => onSelect(i)}
        >
          出生档案 ▸
        </button>
        <button
          type="button"
          className="token-fission-act"
          aria-label="收起候选"
          onClick={() => setFission(null)}
        >
          收起
        </button>
      </span>
    );
  };

  const renderToken = (s: DisplayStep, i: number) => {
    const lvl = entropyLevel(s.entropy);
    const ms = annotations?.[i] ?? [];
    // 正文只承载 warn 事件标记；info 级只进摘要条与出生档案，保持载玻片干净
    const warn = ms.some((m) => m.severity === "warn");
    // 安静阅读模式下异常词微微发光吸引注意——异常来找你，而不是满屏调试器
    const ruleClass = warn
      ? heat
        ? "token-rule-warn"
        : "token-rule-warn token-anomaly"
      : "";
    const special = specialTokenLabel(s.text);
    // 导演系统：只在生成中赋予入场场面（生成后整篇静止，列表不做入场动画）
    const scene = running ? (director?.[i] ?? "plain") : "plain";
    const sceneClass =
      scene === "flow"
        ? "token-scene-flow"
        : scene === "birth"
          ? "token-scene-birth"
          : scene === "storm"
            ? "token-scene-storm"
            : "";
    return (
      <Fragment key={i}>
      <button
        type="button"
        data-testid={`token-${i}`}
        data-token-index={i}
        className={`token-unit ${special ? "token-special" : ""} ${
          s.forced ? "token-forced" : ""
        } ${selected === i ? "token-selected" : ""} ${ruleClass} ${sceneClass}`}
        style={
          heat
            ? { backgroundColor: `rgba(140, 150, 255, ${lvl * 0.28})` }
            : undefined
        }
        disabled={running}
        onClick={() => {
          onInteract?.();
          setFission((prev) => (prev === i ? null : i));
        }}
        onMouseEnter={(e) => show(i, e.currentTarget)}
        onMouseLeave={hide}
        onFocus={(e) => show(i, e.currentTarget)}
        onBlur={hide}
      >
        {special ?? renderTokenText(s.text)}
      </button>
      {renderFission(s, i)}
      </Fragment>
    );
  };

  const think = phases.think;
  const thinkCount = think ? think.end - think.start : 0;
  const answerSteps = steps.slice(phases.answerStart);

  return (
    <div
      className={`whitespace-pre-wrap break-words font-mono text-[14px] leading-[1.9] text-obs-ink ${
        running ? "typing-cursor" : ""
      }`}
      data-testid="token-text"
      onMouseMove={trackVelocity}
    >
      {think && think.start > 0 &&
        steps.slice(0, think.start).map((s, i) => renderToken(s, i))}

      {think && (
        <div className="phase-think my-2">
          <button
            type="button"
            className="phase-head"
            onClick={() => setThinkOpen((v) => !v)}
          >
            <span
              className={`phase-caret ${thinkOpen ? "rotate-90" : ""}`}
              aria-hidden
            >
              ▸
            </span>
            推理段（&lt;think&gt; 输出）
            <span className="tabular-nums text-obs-ink2/70">
              {thinkCount} tokens
              {running && phases.answerStart >= steps.length ? " · 进行中" : ""}
            </span>
          </button>
          {thinkOpen && (
            <div className="phase-body">
              {steps
                .slice(think.start, think.end)
                .map((s, j) => renderToken(s, think.start + j))}
            </div>
          )}
        </div>
      )}

      {think && answerSteps.length > 0 && (
        <div className="phase-label" aria-hidden>
          回答阶段
        </div>
      )}
      {answerSteps.map((s, j) => renderToken(s, phases.answerStart + j))}

      {hovered && hover && (
        <div
          className="token-tip pointer-events-none fixed z-40"
          style={{
            left: hover.x,
            top: hover.y,
            transform: `translate(-50%, ${hover.above ? "-100%" : "0"})`,
          }}
        >
          <div className="rounded-md border border-obs-line bg-obs-2/95 px-3 py-2 shadow-float">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[13px] text-obs-ink">
                「{hovered.text.trim() || hovered.text}」
              </span>
              <span className="text-[11px] tabular-nums text-obs-ink2">
                #{hover.index + 1}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-3 text-[11px] tabular-nums text-obs-ink2">
              <span>
                概率{" "}
                <span className="text-obs-ink">
                  {(hovered.prob * 100).toFixed(1)}%
                </span>
              </span>
              <span>
                熵{" "}
                <span className="text-obs-ink">{hovered.entropy.toFixed(2)}</span>
              </span>
              {hovered.dt > 0 && (
                <span>
                  {hovered.dt.toFixed(0)}
                  <span className="ml-0.5">ms</span>
                </span>
              )}
            </div>
            {hoveredMatches.length > 0 && (
              <div className="mt-1.5 space-y-0.5 border-t border-obs-line/70 pt-1.5">
                {hoveredMatches.map((m, mi) => (
                  <p key={mi} className="flex items-center gap-1.5 text-[11px]">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        m.severity === "warn" ? "bg-amber-400" : "bg-obs-ink2"
                      }`}
                    />
                    <span className="text-obs-ink">{m.label}</span>
                    <span className="font-mono text-obs-ink2/80">{m.ruleId}</span>
                  </p>
                ))}
              </div>
            )}
            <p className="mt-1 text-[11px] text-obs-ink2/60">点击原地展开候选</p>
          </div>
        </div>
      )}
    </div>
  );
}
