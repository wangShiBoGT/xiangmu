import { useEffect, type ReactNode } from "react";
import { IconClose } from "./icons";

/** 统一浮层 · L3 Drawer：右侧滑入、视口全高、头/底钉死、中间内滚。
 *  永不把页面撑高、永不产生页面级第二滚动条；Esc 与遮罩点击关闭。 */
export function Drawer({
  title,
  width = 320,
  onClose,
  headerExtra,
  footer,
  children,
}: {
  title: string;
  width?: number;
  onClose: () => void;
  headerExtra?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="ovl-mask fixed inset-0 z-50 bg-black/50"
      onClick={onClose}
    >
      <aside
        className="ovl-drawer observe-dark fixed inset-y-0 right-0 flex flex-col border-l border-obs-line bg-obs text-obs-ink shadow-float"
        style={{ width, maxWidth: "92vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-obs-line px-4 py-3.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
            {title}
          </p>
          <div className="flex items-center gap-1">
            {headerExtra}
            <button
              aria-label="关闭"
              className="rounded-md p-1.5 text-obs-ink2 hover:text-obs-ink transition-colors"
              onClick={onClose}
            >
              <IconClose className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-obs-line">{footer}</div>
        )}
      </aside>
    </div>
  );
}
