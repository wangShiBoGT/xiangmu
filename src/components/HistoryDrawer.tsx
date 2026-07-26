import { useEffect, useRef, useState } from "react";
import {
  deleteExperiment,
  importReplay,
  listExperiments,
  saveExperiment,
  updateExperiment,
  type ExperimentRecord,
} from "../lib/experiments";
import { getModel } from "../lib/models";
import { Drawer } from "./Overlay";
import { IconDownload, IconStar, IconEdit, IconTrash } from "./icons";

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return sameDay ? hm : `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}

/** 观察记录抽屉（统一 Drawer 浮层）：每次生成自动存档于此，可命名/星标/删除/加载/对比/导入。 */
export default function HistoryDrawer({
  open,
  refreshKey,
  activeId,
  compareIds,
  onClose,
  onLoad,
  onToggleCompare,
  onCompare,
  onImported,
}: {
  open: boolean;
  refreshKey: number;
  activeId: string | null;
  compareIds: string[];
  onClose: () => void;
  onLoad: (rec: ExperimentRecord) => void;
  onToggleCompare: (id: string) => void;
  onCompare: () => void;
  onImported: (rec: ExperimentRecord) => void;
}) {
  const [records, setRecords] = useState<ExperimentRecord[]>([]);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    listExperiments().then((r) => {
      if (alive) setRecords(r);
    });
    return () => {
      alive = false;
    };
  }, [open, refreshKey]);

  if (!open) return null;

  const importFile = async (file: File) => {
    setError(null);
    try {
      const rec = importReplay(await file.text());
      await saveExperiment(rec);
      setRecords(await listExperiments());
      onImported(rec);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Drawer
      title={`观察记录 · ${records.length}`}
      width={320}
      onClose={onClose}
      headerExtra={
        <button
          aria-label="导入 Replay"
          title="导入 Replay JSON"
          className="rounded-md p-1.5 text-obs-ink2 hover:text-obs-ink transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <IconDownload className="h-4 w-4" />
        </button>
      }
      footer={
        <p className="px-4 py-2.5 text-[11px] leading-relaxed text-obs-ink2/60 select-none">
          保留最近 200 条（星标不淘汰）；记录是真实 trace 的忠实快照，跨设备重跑结果可能不同
        </p>
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept=".aitrace,.json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importFile(f);
          e.target.value = "";
        }}
      />
      {error && (
        <div className="mx-4 mt-3 rounded-md border border-red-400/30 bg-obs-2 px-3 py-2.5">
          <p className="text-[12px] leading-relaxed text-obs-ink">
            这个文件无法作为 Replay 导入：{error}
          </p>
          <button
            className="mt-1.5 text-[12px] text-obs-ink2 underline underline-offset-2 hover:text-obs-ink transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            换一个文件重试
          </button>
        </div>
      )}
      {compareIds.length > 0 && (
        <div className="mx-4 mt-3 mb-2 flex items-center justify-between rounded-md border border-obs-line bg-obs-wash/60 px-3 py-2">
          <span className="text-[12px] text-obs-ink2">
            已选 {compareIds.length}/2 用于对比
          </span>
          <button
            className="text-[12px] text-indigo-300 disabled:text-obs-ink2/50 hover:text-indigo-200 transition-colors"
            disabled={compareIds.length !== 2}
            onClick={onCompare}
          >
            对比
          </button>
        </div>
      )}
      <div className="space-y-1 px-2 py-3">
        {records.length === 0 && (
          <p className="px-3 pt-6 text-center text-[13px] leading-relaxed text-obs-ink2/70">
            还没有实验。每次生成会自动存档在这里，勾选两条即可并排对比。
          </p>
        )}
        {records.map((r) => {
          const checked = compareIds.includes(r.id);
          return (
            <div
              key={r.id}
              className={`group rounded-md px-3 py-2.5 transition-colors ${
                r.id === activeId ? "bg-obs-wash" : "hover:bg-obs-wash/60"
              }`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  aria-label="选入对比"
                  className="mt-1 h-3.5 w-3.5 shrink-0 accent-indigo-400"
                  checked={checked}
                  onChange={() => onToggleCompare(r.id)}
                />
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => onLoad(r)}
                >
                  {renaming === r.id ? (
                    <input
                      autoFocus
                      defaultValue={r.name}
                      className="w-full rounded bg-obs px-1.5 py-0.5 text-[13px] text-obs-ink focus:outline-none"
                      onClick={(e) => e.stopPropagation()}
                      onBlur={async (e) => {
                        const name = e.target.value.trim() || r.name;
                        await updateExperiment(r.id, { name });
                        setRenaming(null);
                        setRecords(await listExperiments());
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setRenaming(null);
                      }}
                    />
                  ) : (
                    <p className="truncate text-[13px] text-obs-ink">{r.name}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-obs-ink2/80">
                    {fmtTime(r.createdAt)} · {getModel(r.modelId)?.name ?? r.modelId} ·{" "}
                    {r.stats.tokens} tok
                    {r.stats.avgTps !== null && ` · ${r.stats.avgTps.toFixed(1)} tok/s`}
                    {r.source === "imported" && " · 导入"}
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    aria-label={r.starred ? "取消星标" : "星标"}
                    className={`rounded p-1 transition-colors ${r.starred ? "text-amber-300 opacity-100" : "text-obs-ink2 hover:text-obs-ink"}`}
                    style={r.starred ? { opacity: 1 } : undefined}
                    onClick={async () => {
                      await updateExperiment(r.id, { starred: !r.starred });
                      setRecords(await listExperiments());
                    }}
                  >
                    <IconStar className="h-3.5 w-3.5" filled={r.starred} />
                  </button>
                  <button
                    aria-label="重命名"
                    className="rounded p-1 text-obs-ink2 hover:text-obs-ink transition-colors"
                    onClick={() => setRenaming(r.id)}
                  >
                    <IconEdit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    aria-label="删除"
                    className="rounded p-1 text-obs-ink2 hover:text-red-400 transition-colors"
                    onClick={async () => {
                      await deleteExperiment(r.id);
                      setRecords(await listExperiments());
                    }}
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Drawer>
  );
}
