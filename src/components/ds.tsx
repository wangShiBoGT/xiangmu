/** DS3 交互纪律组件：主动作/键盘提示的唯一事实源（See docs/AODL/02-Visual-DNA.md §交互）。
 *  - PrimaryAction：每屏唯一主动作，实心 accent；同屏挂载 >1 个时 dev 警告（不阻断渲染）。
 *  - Kbd：键盘提示统一用 <kbd> 呈现。 */

import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import {
  registerPrimaryAction,
  unregisterPrimaryAction,
} from "../lib/dsDiscipline";

export function PrimaryAction({
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  useEffect(() => {
    registerPrimaryAction(import.meta.env.DEV);
    return unregisterPrimaryAction;
  }, []);
  return (
    <button
      className={`rounded-md bg-indigo-500 font-medium text-white transition-opacity hover:opacity-85 disabled:bg-obs-wash disabled:text-obs-ink2 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-obs-line bg-obs-2 px-1 py-0.5 font-mono text-[11px] text-obs-ink2">
      {children}
    </kbd>
  );
}
