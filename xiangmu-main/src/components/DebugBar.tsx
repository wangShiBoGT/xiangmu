/** Debugger 工具条（Sprint 4 · Replay-Debug 闭环）。
 *  每个按钮都是真实运行时能力，没有假按钮：
 *  ⏸ Pause=真实中断生成；⏭/↩=步进检查已记录步；▶ Continue=从当前全部 token 真实续跑；
 *  🌱 Fork=点 token 改选后真实续跑（既有能力）；🎲 New Seed=同提示词新 seed 重跑。
 *  所有续跑/重跑产物都标注为非原始记录（分支树/存档如实区分）。
 *  Live-Debug 断点：命中真实犹豫点（top-2 差距 <5%，与犹豫点同源口径）自动暂停并定位该步。 */
export default function DebugBar({
  phase,
  stepCount,
  selected,
  onPause,
  onStep,
  onContinue,
  onNewSeed,
  canRunAgain,
  bpOn,
  onToggleBp,
}: {
  phase: "idle" | "running" | "done";
  stepCount: number;
  selected: number | null;
  onPause: () => void;
  onStep: (index: number) => void;
  onContinue?: () => void;
  onNewSeed?: () => void;
  canRunAgain: boolean;
  /** Live-Debug 犹豫断点开关；不传则按钮缺席 */
  bpOn?: boolean;
  onToggleBp?: () => void;
}) {
  if (phase === "idle") return null;
  const cur = selected ?? stepCount - 1;
  const btn =
    "rounded-md px-2.5 py-1 text-[12px] transition-colors disabled:opacity-30";

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t border-obs-line/60 pt-3">
      <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/60 select-none">
        Debug
      </span>
      {phase === "running" ? (
        <>
          <button
            className={`${btn} text-obs-ink hover:bg-obs`}
            onClick={onPause}
            title="真实中断生成：已生成的步全部保留，可检查后续跑"
          >
            ⏸ Pause
          </button>
          {onToggleBp && (
            <button
              className={`${btn} ${bpOn ? "bg-amber-400/10 text-amber-200" : "text-obs-ink2 hover:text-obs-ink hover:bg-obs"}`}
              onClick={onToggleBp}
              title="Live-Debug 断点：生成中命中犹豫点（top-2 差距 <5%）自动暂停并定位该步，检查后可 Continue 续跑"
            >
              ◉ 断点{bpOn ? " · 犹豫点" : ""}
            </button>
          )}
        </>
      ) : (
        <>
          <button
            className={`${btn} text-obs-ink2 hover:text-obs-ink hover:bg-obs`}
            disabled={stepCount === 0 || cur <= 0}
            onClick={() => onStep(Math.max(0, cur - 1))}
            title="回到上一步（检查该步候选与概率）"
          >
            ↩ Back
          </button>
          <button
            className={`${btn} text-obs-ink2 hover:text-obs-ink hover:bg-obs`}
            disabled={stepCount === 0 || cur >= stepCount - 1}
            onClick={() => onStep(Math.min(stepCount - 1, cur + 1))}
            title="步进到下一步"
          >
            ⏭ Step
          </button>
          {onContinue && (
            <button
              className={`${btn} text-obs-ink hover:bg-obs`}
              disabled={!canRunAgain}
              onClick={onContinue}
              title="从当前全部已生成 token 之后真实续跑（新 seed，挂为分支，标注非原始记录）"
            >
              ▶ Continue
            </button>
          )}
          {onNewSeed && (
            <button
              className={`${btn} text-obs-ink2 hover:text-obs-ink hover:bg-obs`}
              disabled={!canRunAgain}
              onClick={onNewSeed}
              title="同一提示词换 seed 整体重跑，跑完可在实验档案对比两次记录"
            >
              🎲 New Seed
            </button>
          )}
          {onToggleBp && (
            <button
              className={`${btn} ${bpOn ? "bg-amber-400/10 text-amber-200" : "text-obs-ink2 hover:text-obs-ink hover:bg-obs"}`}
              onClick={onToggleBp}
              title="Live-Debug 断点：下次生成中命中犹豫点（top-2 差距 <5%）自动暂停并定位该步"
            >
              ◉ 断点{bpOn ? " · 犹豫点" : ""}
            </button>
          )}
          <span className="ml-1 font-mono text-[11px] tabular-nums text-obs-ink2/70 select-none">
            {stepCount > 0 ? `step ${cur + 1}/${stepCount}` : "—"}
          </span>
          <span className="ml-auto text-[11px] text-obs-ink2/50 select-none">
            续跑/改选产物 = 模拟续跑 · 非原始记录
          </span>
        </>
      )}
    </div>
  );
}
