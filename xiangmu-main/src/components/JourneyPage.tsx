import { useEffect, useMemo, useRef, useState } from "react";
import {
  loadJourney,
  topAttention,
  type JourneyData,
  type JourneyLang,
} from "../lib/journeyDemo";
import { CONFIDENCE_CLASS, confidenceBucket } from "../lib/plainWords";

/** 理解层 · 四幕旅程：同一次真实运行里，一个词从「读问题 → 想到一堆候选 →
 *  选中一个 → 重复 N 次」的完整接力。数据 = 理解层演示模型离线实测
 *  （注意力/候选/概率全部真实），明确标注不冒充主聊天模型。 */
export default function JourneyPage({ onClose }: { onClose: () => void }) {
  const [lang, setLang] = useState<JourneyLang>("zh");
  const [data, setData] = useState<JourneyData | null>(null);
  const [k, setK] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setData(null);
    setK(0);
    setPlaying(false);
    void loadJourney(lang).then(setData);
  }, [lang]);

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (playing && data) {
      timer.current = setInterval(() => {
        setK((prev) => {
          if (prev >= data.steps.length - 1) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1800);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, data]);

  const step = data?.steps[k] ?? null;
  const maxAtt = useMemo(
    () => (step ? Math.max(...step.attention, 1e-6) : 1),
    [step],
  );
  const hot = useMemo(
    () => new Set(step ? topAttention(step.attention, 3) : []),
    [step],
  );

  if (!data || !step) {
    return (
      <div className="flex flex-1 items-center justify-center bg-obs text-[13px] text-obs-ink2">
        载入演示数据…
      </div>
    );
  }

  const written = data.steps.slice(0, k).map((s) => s.chosen);
  const maxProb = Math.max(...step.topk.map((c) => c.prob), 1e-6);

  return (
    <div className="flex-1 overflow-y-auto bg-obs text-obs-ink">
      <div className="mx-auto w-full max-w-[880px] px-6 pb-16 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-obs-ink2/60 select-none">
              理解层 · 四幕旅程
            </p>
            <h2 className="mt-1 text-[24px] font-semibold tracking-tight">
              看懂它怎么写出一个词
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-sm border border-obs-line">
              {(["zh", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`px-3.5 py-1.5 text-[12px] transition-colors ${
                    lang === l
                      ? "bg-indigo-500/80 text-white"
                      : "text-obs-ink2 hover:text-obs-ink"
                  }`}
                  onClick={() => setLang(l)}
                >
                  {l === "zh" ? "中文演示" : "English demo"}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="rounded-md border border-obs-line px-3.5 py-1.5 text-[12px] text-obs-ink2 hover:text-obs-ink"
              onClick={onClose}
            >
              关闭 ✕
            </button>
          </div>
        </div>
        <p className="mt-2 text-[12px] leading-[1.8] text-obs-ink2">
          {data.label} · 下面所有亮度、柱高、颜色都来自这台演示模型的真实内部数据
          （不是当前主聊天模型的数据）。
        </p>

        {/* 播放控制 */}
        <div className="mt-5 flex items-center gap-3 rounded-md border border-obs-line bg-obs-2 px-4 py-2.5">
          <button
            type="button"
            className="rounded-md bg-accent px-4 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-85"
            onClick={() => {
              if (k >= data.steps.length - 1) setK(0);
              setPlaying((v) => !v);
            }}
          >
            {playing ? "⏸ 暂停" : "▶ 播放"}
          </button>
          <input
            type="range"
            min={0}
            max={data.steps.length - 1}
            value={k}
            className="flex-1 accent-indigo-400"
            onChange={(e) => {
              setPlaying(false);
              setK(Number(e.target.value));
            }}
          />
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-obs-ink2">
            第 {k + 1} / {data.steps.length} 个词
          </span>
        </div>

        {/* 第一幕 · 它在读你的问题 */}
        <section className="mt-6 rounded-md border border-obs-line bg-obs-2 p-5">
          <h3 className="text-[12px] font-medium text-amber-200/90">
            第一幕 · 它在读你的问题
          </h3>
          <p className="mt-1 text-[12px] text-obs-ink2">
            写第 {k + 1} 个词之前，它在盯着问题里的这些词——亮度 = 真实注意力权重。
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {data.promptTokens.map((t, i) => {
              const w = step.attention[i] / maxAtt;
              return (
                <span
                  key={i}
                  className={`rounded-md px-2 py-1 text-[16px] transition-all ${
                    hot.has(i) ? "ring-1 ring-amber-300/70" : ""
                  }`}
                  style={{
                    backgroundColor: `rgba(251, 191, 36, ${(0.05 + w * 0.5).toFixed(3)})`,
                    color: w > 0.5 ? "#fef3c7" : undefined,
                  }}
                  title={`注意力 ${(step.attention[i] * 100).toFixed(1)}%`}
                >
                  {t}
                </span>
              );
            })}
          </div>
          <p className="mt-2.5 text-[11px] text-obs-ink2/60">{data.attentionNote}</p>
        </section>

        {/* 第二幕 · 它想到了一堆词 */}
        <section className="mt-4 rounded-md border border-obs-line bg-obs-2 p-5">
          <h3 className="text-[12px] font-medium text-sky-300/90">
            第二幕 · 它想到了一堆词
          </h3>
          <p className="mt-1 text-[12px] text-obs-ink2">
            被盯住的词引出这些候选——柱子越高，它越想选这个词（柱高 = 真实概率）。
          </p>
          <div className="mt-4 flex items-end justify-around gap-1.5" style={{ height: 150 }}>
            {step.topk.map((c, i) => {
              const isChosen = c.text === step.chosen.text;
              return (
                <div key={i} className="flex h-full w-full max-w-[76px] flex-col items-center justify-end">
                  <span className="mb-1 font-mono text-[11px] tabular-nums text-obs-ink2">
                    {(c.prob * 100).toFixed(0)}%
                  </span>
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      isChosen ? "bg-indigo-400" : "bg-sky-400/25"
                    }`}
                    style={{ height: `${Math.max((c.prob / maxProb) * 100, 3)}%` }}
                  />
                  <span
                    className={`mt-1.5 max-w-full truncate text-center text-[13px] ${
                      isChosen ? "font-semibold text-obs-ink" : "text-obs-ink2"
                    }`}
                  >
                    {c.text.trim() || "␣"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 第三幕 · 它选了一个 */}
        <section className="mt-4 rounded-md border border-obs-line bg-obs-2 p-5">
          <h3 className="text-[12px] font-medium text-indigo-300/90">
            第三幕 · 它选了一个
          </h3>
          <p className="mt-1 text-[12px] text-obs-ink2">
            这次它选中了「{step.chosen.text.trim() || "␣"}」——当时的把握度{" "}
            {(step.chosen.prob * 100).toFixed(1)}%。选中的词落进正在生成的回答里：
          </p>
          <p className="mt-3 rounded-md border border-obs-line bg-obs p-3 text-[14px] leading-[2]">
            <span className="text-obs-ink2">{data.prompt}</span>
            {written.map((c, i) => (
              <span key={i} className={CONFIDENCE_CLASS[confidenceBucket(c.prob)]}>
                {c.text}
              </span>
            ))}
            <span
              className={`rounded bg-indigo-500/20 ring-1 ring-indigo-400/60 ${
                CONFIDENCE_CLASS[confidenceBucket(step.chosen.prob)]
              }`}
            >
              {step.chosen.text}
            </span>
          </p>
        </section>

        {/* 第四幕 · 这样重复了 N 次 */}
        <section className="mt-4 rounded-md border border-obs-line bg-obs-2 p-5">
          <h3 className="text-[12px] font-medium text-emerald-300/90">
            第四幕 · 这样重复了 {data.steps.length} 次
          </h3>
          <p className="mt-1 text-[12px] text-obs-ink2">
            每个词都经历了「读问题 → 一堆候选 → 选一个」——颜色 =
            当时的把握度（绿=很有把握 · 琥珀=犹豫 · 红=在猜）。
          </p>
          <p className="mt-3 text-[14px] leading-[2]">
            <span className="text-obs-ink2">{data.prompt}</span>
            {data.steps.map((s, i) => (
              <button
                key={i}
                type="button"
                className={`rounded hover:bg-obs ${CONFIDENCE_CLASS[confidenceBucket(s.chosen.prob)]} ${
                  i === k ? "bg-obs ring-1 ring-indigo-400/60" : ""
                }`}
                title={`第 ${i + 1} 个词 · 把握度 ${(s.chosen.prob * 100).toFixed(1)}%（点击回到这一步）`}
                onClick={() => {
                  setPlaying(false);
                  setK(i);
                }}
              >
                {s.chosen.text}
              </button>
            ))}
          </p>
          <p className="mt-3 border-t border-obs-line pt-2.5 text-[12px] leading-[1.8] text-obs-ink2">
            你自己的每次运行也是这样被完整录下来的——回到工作台跑一次，
            然后在「运行档案」里回放它的每一次选择。
          </p>
        </section>
      </div>
    </div>
  );
}
