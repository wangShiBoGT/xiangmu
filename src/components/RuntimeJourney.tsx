/** Runtime Journey（Sprint 2）：Replay 开场的真实启动序列——tokenize → prefill → decode。
 *  所有数字来自 trace.pipeline / promptIds / steps 的真实测量；无 pipeline 数据时组件不渲染（诚实缺席）。
 *  它回答的用户问题：「这段回答从哪里开始？」
 *  视觉语法（视觉稿定调）：暖白大标题 + 青绿小标签 = 本机 trace；节点竖列 = 时间先后；
 *  「本机记录」徽章 = 出处，不是装饰。 */

import type { PipelineTiming } from "../lib/trace";

function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms.toFixed(0)} ms`;
}

/** 出处徽章：左侧灰标「本机记录」+ 分隔线 + 真实读数 */
function RecordChip({ value }: { value: string }) {
  return (
    <span className="mt-1.5 inline-flex items-center overflow-hidden rounded-md border border-obs-line bg-obs/60 text-[11px]">
      <span className="border-r border-obs-line px-2 py-1 text-obs-ink2/70 select-none">
        本机记录
      </span>
      <span className="px-2 py-1 font-mono tabular-nums text-obs-ink">{value}</span>
    </span>
  );
}

export default function RuntimeJourney({
  stage,
  pipeline,
  promptTokens,
  stepCount,
  onSkip,
}: {
  /** 当前阶段：0 = tokenize，1 = prefill，2 = decode（即将开始逐 token 播放） */
  stage: number;
  pipeline: PipelineTiming;
  /** 提示词 token 数（trace.promptIds.length）；未记录则为 null，如实不显示 */
  promptTokens: number | null;
  stepCount: number;
  onSkip: () => void;
}) {
  const stages: { title: string; detail: string; chip: string }[] = [
    {
      title: "输入已切分",
      detail: `这句话被拆为${promptTokens !== null ? ` ${promptTokens} 个` : ""}输入 token，准备进入上下文窗口。`,
      chip: `tokenize ${fmtMs(pipeline.tokenizeMs)}`,
    },
    {
      title: "上下文已送入模型",
      detail: "输入 token 已完成预填充；此阶段不输出文字。",
      chip: `prefill ${fmtMs(pipeline.prefillMs)}`,
    },
    {
      title: `正在生成 ${stepCount} 个 token`,
      detail: "每个字都从候选里按概率选出；回放会在关键步停下，留给你看清候选如何竞争。",
      chip: `decode ${fmtMs(pipeline.decodeMs)} · ${stepCount} 步`,
    },
    {
      title: "生成完成",
      detail: "回放会收束为一条可保存、可重放、可对比的运行记录。",
      chip: "",
    },
  ];
  return (
    <div className="observe-dark fixed inset-0 z-40 flex items-center justify-center bg-obs/85">
      <div className="w-[min(620px,92vw)] px-6">
        <p className="text-center text-[11px] font-medium uppercase tracking-[0.3em] text-teal-300/80 select-none">
          Runtime Journey · A Trace Told in Time
        </p>
        <h2 className="mt-2 text-center text-[24px] font-medium leading-snug text-obs-ink select-none">
          这段回答从哪里开始？
        </h2>
        <p className="mt-1.5 text-center text-[12px] text-obs-ink2/80 select-none">
          不是让 AI「苏醒」，而是让一条真实运行记录按自己的节奏显现。
        </p>
        <ol className="mx-auto mt-7 w-fit max-w-full space-y-6">
          {stages.map((s, i) => (
            <li
              key={s.title}
              className={`relative pl-6 transition-opacity duration-500 ${
                i <= stage ? "opacity-100" : "opacity-35"
              }`}
            >
              <span
                className={`absolute left-0 top-[5px] h-2 w-2 rounded-full ${
                  i < stage
                    ? "bg-obs-ink2/50"
                    : i === stage
                      ? "bg-teal-300"
                      : "border border-obs-line bg-transparent"
                }`}
              />
              <p className="text-[13px] font-semibold text-obs-ink select-none">
                {s.title}
              </p>
              <p className="mt-0.5 max-w-[440px] text-[12px] leading-relaxed text-obs-ink2 select-none">
                {s.detail}
              </p>
              {s.chip && <RecordChip value={s.chip} />}
            </li>
          ))}
        </ol>
        <div className="mt-7 text-center">
          <button
            className="rounded-md border border-obs-line px-4 py-1.5 text-[12px] text-obs-ink2 transition-colors hover:border-obs-ink2/50 hover:text-obs-ink"
            onClick={onSkip}
          >
            跳过铺垫，直接看第一个字 →
          </button>
        </div>
      </div>
    </div>
  );
}
