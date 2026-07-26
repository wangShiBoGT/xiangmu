/** Story Mode（Sprint A）：把一条真实 trace 按章节讲成纪录片。
 *  不新造播放器：播放 = 沿既有 token 时间线匀速步进选中（复用 onStep 跳步机制）；
 *  章末自动停点等用户「继续」（留思考空间原则）；
 *  章节与旁白全部来自 storyChapters（真实口径），无对应字段的章不出现。 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildStoryChapters, type StoryChapter } from "../lib/storyChapters";
import type { GenerationTrace } from "../lib/trace";

/** 匀速回放步进间隔（ms）——是回放节奏，不冒充真实耗时（真实 dt 在 Performance 层） */
const TICK_MS = 130;

export default function StoryPlayer({
  trace,
  onStep,
  onClose,
}: {
  trace: GenerationTrace;
  /** 跳到该步（复用既有 token 定位机制） */
  onStep: (index: number) => void;
  onClose: () => void;
}) {
  const chapters = useMemo(() => buildStoryChapters(trace), [trace]);
  const [chapterIdx, setChapterIdx] = useState(0);
  const [cursor, setCursor] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "playing" | "chapter_end" | "done">(
    "idle",
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  useEffect(() => stopTimer, [stopTimer]);

  const cur: StoryChapter | undefined = chapters[chapterIdx];

  const playChapter = useCallback(
    (idx: number) => {
      const ch = chapters[idx];
      if (!ch) return;
      stopTimer();
      setChapterIdx(idx);
      setState("playing");
      if (ch.fromStep === null || ch.toStep === null) {
        // 无 token 锚点的章（启动）：只展示旁白，短停后直接到章末停点
        setCursor(null);
        setState("chapter_end");
        return;
      }
      let pos = ch.fromStep;
      setCursor(pos);
      onStep(pos);
      const to = ch.toStep;
      timerRef.current = setInterval(() => {
        pos += 1;
        if (pos > to) {
          stopTimer();
          setState(idx >= chapters.length - 1 ? "done" : "chapter_end");
          return;
        }
        setCursor(pos);
        onStep(pos);
      }, TICK_MS);
    },
    [chapters, onStep, stopTimer],
  );

  if (chapters.length === 0) return null;

  return (
    <section className="mt-4 rounded-md border border-obs-line bg-obs-2/85 px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium tracking-[0.2em] text-amber-300/90 select-none">
          STORY MODE · 这次 Run 的纪录片
        </p>
        <button
          className="text-[11px] text-obs-ink2 underline underline-offset-2 hover:text-obs-ink"
          onClick={() => {
            stopTimer();
            onClose();
          }}
        >
          关闭
        </button>
      </div>

      {/* 章节轨：点章跳段；当前章琥珀 */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {chapters.map((ch, i) => (
          <button
            key={ch.key}
            className={`rounded-md border px-2.5 py-0.5 text-[11px] transition-colors ${
              i === chapterIdx
                ? "border-amber-400/60 bg-amber-500/10 text-amber-200"
                : "border-obs-line text-obs-ink2 hover:border-obs-ink2/50 hover:text-obs-ink"
            }`}
            onClick={() => playChapter(i)}
            title={
              ch.fromStep !== null
                ? `第 ${ch.fromStep + 1}–${(ch.toStep ?? ch.fromStep) + 1} 步`
                : "运行启动阶段（无 token 锚点）"
            }
          >
            {i + 1} · {ch.title}
          </button>
        ))}
      </div>

      {/* 旁白字幕条：当前章的真实读数叙述 */}
      {cur && (
        <div className="mt-3 rounded-md border border-obs-line/70 bg-obs/50 px-3 py-2.5">
          <p className="text-[11px] font-medium tracking-[0.18em] text-obs-ink2/60 select-none">
            第 {chapterIdx + 1} 章 · {cur.title}
            {cur.fromStep !== null && (
              <span className="ml-2 font-mono tabular-nums">
                步 {cur.fromStep + 1}–{(cur.toStep ?? cur.fromStep) + 1}
                {cursor !== null && state === "playing" && ` · 当前 ${cursor + 1}`}
              </span>
            )}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-obs-ink">
            {cur.narration}
          </p>
        </div>
      )}

      {/* 传输控制：播放 / 章末停点继续 / 重看本章 */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {state === "idle" && (
          <button
            className="rounded-md border border-obs-line px-3 py-1 text-[12px] text-obs-ink transition-colors hover:bg-obs"
            onClick={() => playChapter(0)}
          >
            ▶ 从头讲起
          </button>
        )}
        {state === "playing" && (
          <button
            className="rounded-md border border-obs-line px-3 py-1 text-[12px] text-obs-ink transition-colors hover:bg-obs"
            onClick={() => {
              stopTimer();
              setState(
                chapterIdx >= chapters.length - 1 ? "done" : "chapter_end",
              );
            }}
          >
            ⏸ 停在这里
          </button>
        )}
        {state === "chapter_end" && (
          <button
            className="rounded-md border border-amber-400/60 bg-amber-500/10 px-3 py-1 text-[12px] text-amber-200 transition-colors hover:bg-amber-500/20"
            onClick={() => playChapter(chapterIdx + 1)}
          >
            继续 · 下一章
          </button>
        )}
        {(state === "chapter_end" || state === "done") && (
          <button
            className="rounded-md border border-obs-line px-3 py-1 text-[12px] text-obs-ink2 transition-colors hover:bg-obs hover:text-obs-ink"
            onClick={() => playChapter(chapterIdx)}
          >
            ↺ 重看本章
          </button>
        )}
        {state === "done" && (
          <span className="text-[11px] text-obs-ink2/70 select-none">
            全片播完 · 点任一章可重看
          </span>
        )}
        <span className="ml-auto text-[11px] text-obs-ink2/50 select-none">
          匀速回放（真实逐步耗时见 Performance）· 章节与旁白全部来自本次 trace 实录
        </span>
      </div>
    </section>
  );
}
