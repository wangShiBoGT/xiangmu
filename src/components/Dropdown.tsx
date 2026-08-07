/** 自绘下拉（ACDL 06 §3）：全站禁用原生 <select> 弹出层的统一替代。
 *  listbox 语义 + 键盘可达（↑↓/Enter/Esc/Home/End）+ 点击外部关闭 + 上下自适应展开；
 *  tone 对应双体系（obs=观察室暗色 / paper=报告纸亮色），弹层同一气质：
 *  rounded-md · 描边 · 层板底 · shadow-float。 */

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconChevronDown } from "./icons";

export interface DropdownOption {
  value: string;
  label: string;
  /** 次级说明（弹层内选项右侧/下方的小字） */
  hint?: string;
  disabled?: boolean;
}

interface Props {
  options: DropdownOption[];
  value?: string;
  selected?: string;
  onChange: (value: string) => void;
  /** 触发器上显示的文案；缺省 = 选中项 label */
  triggerLabel?: string;
  ariaLabel: string;
  disabled?: boolean;
  title?: string;
  /** obs = 观察室（暗），paper = 报告纸（亮） */
  tone?: "obs" | "paper";
  /** 触发器自定义样式（完全接管；不给则用内置紧凑样式） */
  triggerClassName?: string;
  /** 弹层宽度类，默认 w-56 */
  menuWidthClassName?: string;
  /** 弹层对齐：left | right（默认 left） */
  align?: "left" | "right";
}

export default function Dropdown({
  options,
  value,
  selected,
  onChange,
  triggerLabel,
  ariaLabel,
  disabled,
  title,
  tone = "obs",
  triggerClassName,
  menuWidthClassName = "w-56",
  align = "left",
}: Props) {
  const currentValue = selected ?? value ?? "";
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [dropUp, setDropUp] = useState(false);
  // 弹层用 portal 挂到 body（fixed 定位），避免被 overflow-hidden 祖先裁剪
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selectedIdx = options.findIndex((o) => o.value === currentValue);
  const selectedOption = selectedIdx >= 0 ? options[selectedIdx] : null;

  const openMenu = () => {
    if (disabled) return;
    const rect = rootRef.current?.getBoundingClientRect();
    // 上下自适应：下方空间不足且上方更宽裕时向上展开
    if (rect) {
      const below = window.innerHeight - rect.bottom;
      setDropUp(below < 240 && rect.top > below);
      setAnchor(rect);
    }
    setActive(selectedIdx >= 0 ? selectedIdx : 0);
    setOpen(true);
  };

  const commit = (idx: number) => {
    const opt = options[idx];
    if (!opt || opt.disabled) return;
    setOpen(false);
    if (opt.value !== currentValue) onChange(opt.value);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !listRef.current?.contains(t))
        setOpen(false);
    };
    const onAway = (e?: Event) => {
      // 来自 listbox 内部的滚动（scrollIntoView 触发）不关菜单
      if (e instanceof Event && listRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onAway);
    window.addEventListener("scroll", onAway, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onAway);
      window.removeEventListener("scroll", onAway, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current
      ?.querySelector(`[data-idx="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const move = (dir: 1 | -1) => {
    setActive((prev) => {
      let i = prev;
      for (let n = 0; n < options.length; n++) {
        i = (i + dir + options.length) % options.length;
        if (!options[i].disabled) return i;
      }
      return prev;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        move(-1);
        break;
      case "Home":
        e.preventDefault();
        setActive(options.findIndex((o) => !o.disabled));
        break;
      case "End":
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(active);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  const isObs = tone === "obs";
  const trigger =
    triggerClassName ??
    (isObs
      ? "flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-obs-ink2 transition-colors hover:bg-obs-line/40 hover:text-obs-ink focus:outline-none disabled:opacity-50 cursor-pointer"
      : "flex items-center gap-1 rounded-md border border-line bg-paper px-2 py-1 text-[11px] text-ink transition-colors hover:bg-hover focus:outline-none disabled:opacity-50 cursor-pointer");
  const menu = isObs
    ? "border-obs-line bg-obs-2/95 shadow-float"
    : "border-line bg-surface shadow-float";
  const optionBase = isObs
    ? "text-obs-ink hover:bg-obs-line/40"
    : "text-ink hover:bg-hover";
  const optionActive = isObs ? "bg-obs-line/50" : "bg-hover";
  const hintCls = isObs ? "text-obs-ink2/70" : "text-ink-3";

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        disabled={disabled}
        title={title}
        className={trigger}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className="min-w-0 truncate">
          {triggerLabel ?? selectedOption?.label ?? ariaLabel}
        </span>
        <IconChevronDown
          className={`h-2.5 w-2.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open &&
        anchor &&
        createPortal(
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className={`fixed z-[80] max-h-64 overflow-y-auto overscroll-contain rounded-md border p-1 ${menu} ${menuWidthClassName}`}
          style={{
            ...(align === "right"
              ? { right: Math.max(8, window.innerWidth - anchor.right) }
              : { left: Math.max(8, anchor.left) }),
            ...(dropUp
              ? { bottom: window.innerHeight - anchor.top + 6 }
              : { top: anchor.bottom + 6 }),
          }}
        >
          {options.map((o, i) => {
            const isSel = o.value === currentValue;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                data-idx={i}
                aria-selected={isSel}
                disabled={o.disabled}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] transition-colors ${optionBase} ${
                  active === i ? optionActive : ""
                } ${o.disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(i)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{o.label}</span>
                  {o.hint && (
                    <span className={`block truncate text-[11px] ${hintCls}`}>
                      {o.hint}
                    </span>
                  )}
                </span>
                {isSel && <IconCheck className="h-3 w-3 shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
