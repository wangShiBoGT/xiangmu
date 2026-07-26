import { IconPlus, IconClose, IconAperture } from "./icons";
import { groupSessions, type ChatSession } from "../lib/chatStore";

interface Props {
  sessions: ChatSession[];
  activeId: string | null;
  disabled: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export default function Sidebar({
  sessions,
  activeId,
  disabled,
  onSelect,
  onNew,
  onDelete,
}: Props) {
  return (
    <aside className="w-64 shrink-0 hidden md:flex flex-col bg-paper">
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-2.5 px-1 pb-5 select-none">
          <IconAperture className="h-[19px] w-[19px] text-ink" />
          <span className="text-[14px] font-semibold text-ink tracking-tight">
            Browser AI Microscope
          </span>
        </div>
        <button
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-[14px] text-ink-2 hover:bg-hover hover:text-ink transition-colors disabled:opacity-50 disabled:pointer-events-none"
          disabled={disabled}
          onClick={onNew}
        >
          <IconPlus className="h-4 w-4" />
          新对话
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {sessions.length === 0 && (
          <p className="text-[13px] text-ink-3 text-center mt-8">
            暂无历史会话
          </p>
        )}
        {groupSessions(sessions).map((g) => (
          <div key={g.label} className="mb-3">
            <p className="px-2 pb-1.5 pt-2 text-[12px] font-medium text-ink-3 select-none">
              {g.label}
            </p>
            <div className="space-y-px">
              {g.items.map((s) => (
                <div
                  key={s.id}
                  className={`group flex items-center rounded-md px-2.5 py-2 text-[13px] cursor-pointer transition-colors ${
                    s.id === activeId
                      ? "bg-hover text-ink font-medium"
                      : "text-ink-2 hover:bg-hover/60"
                  } ${disabled ? "pointer-events-none opacity-60" : ""}`}
                  onClick={() => onSelect(s.id)}
                  title={s.title}
                >
                  <span className="flex-1 truncate">{s.title}</span>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-ink ml-1 px-1 transition-all"
                    aria-label="删除会话"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(s.id);
                    }}
                  >
                    <IconClose className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="px-5 py-4 text-[11px] tracking-wide text-ink-3 select-none">
        Local-first · 推理完全在本机，数据不出设备
      </div>
    </aside>
  );
}
