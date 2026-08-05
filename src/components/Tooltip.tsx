import { useState, useRef, useEffect, type ReactNode } from "react";

interface TooltipProps {
  /** 术语名称 */
  term: string;
  /** 一句人话解释 */
  explanation: string;
  /** 具体例子（可选）*/
  example?: string;
  /** 深入链接（可选）*/
  learnMoreUrl?: string;
  /** 子元素（通常是术语文本）*/
  children: ReactNode;
}

export function Tooltip({ term, explanation, example, learnMoreUrl, children }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<"top" | "bottom">("bottom");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // 如果下方空间不足 200px,显示在上方
      setPosition(spaceBelow < 200 && spaceAbove > 200 ? "top" : "bottom");
    }
  }, [isOpen]);

  const handleMouseEnter = () => {
    timeoutRef.current = window.setTimeout(() => setIsOpen(true), 300);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <span className="relative inline-flex items-center gap-1">
      {children}
      <button
        ref={buttonRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="inline-flex h-4 w-4 items-center justify-center
                   rounded-full bg-measure-500/20 text-measure-300
                   text-[11px] cursor-help hover:bg-measure-500/30
                   transition-colors flex-shrink-0"
        aria-label={`解释：${term}`}
        type="button"
      >
        ?
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 z-50 w-80 max-w-[90vw] rounded-lg
                      border border-obs-line bg-surface p-3 shadow-float
                      animate-[pop-in_180ms_cubic-bezier(0.16,1,0.3,1)]
                      ${position === "top" ? "bottom-6" : "top-6"}`}
          onMouseEnter={() => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setIsOpen(true);
          }}
          onMouseLeave={handleMouseLeave}
        >
          <p className="text-[13px] font-medium text-ink mb-1">{term}</p>
          <p className="text-[12px] leading-relaxed text-ink-2 whitespace-pre-line">
            {explanation}
          </p>
          {example && (
            <p className="mt-2 text-[11px] text-ink-3 border-l-2 border-obs-line pl-2 whitespace-pre-line">
              {example}
            </p>
          )}
          {learnMoreUrl && (
            <a
              href={learnMoreUrl}
              className="mt-2 inline-block text-[11px] text-measure-300 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              点击了解更多 →
            </a>
          )}
        </div>
      )}
    </span>
  );
}
