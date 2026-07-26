import { useState, useEffect, useRef } from "react";
import {
  IconChevronDown,
  IconFile,
  IconReasoning,
  IconCheck,
  IconCopy,
  IconRefresh,
} from "./icons";
import { splitThinking } from "../lib/thinking";
import { renderMarkdown } from "../lib/markdown";
import type { StoredMessage } from "../lib/chatStore";

interface Props {
  message: StoredMessage;
  showThinking: boolean;
  isLast: boolean;
  isRunning: boolean;
  onRegenerate: () => void;
}

export default function ChatMessage({
  message,
  showThinking,
  isLast,
  isRunning,
  onRegenerate,
}: Props) {
  // 推理段胶囊：生成中自动展开（让用户看到 <think> token 流），结束后自动收起
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  // 推理段计时：<think> 段开始时起表，结束时定格（仅本次生成可知，历史消息不显示用时）
  const thinkStartRef = useRef<number | null>(null);
  const [thinkSeconds, setThinkSeconds] = useState<number | null>(null);

  // 代码块复制按钮的事件委托
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const onClick = async (e: Event) => {
      const btn = (e.target as HTMLElement).closest(".code-copy");
      if (!btn) return;
      const code = btn
        .closest(".code-block")
        ?.querySelector("pre code")?.textContent;
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code);
        btn.textContent = "✓ 已复制";
        setTimeout(() => (btn.textContent = "复制"), 1500);
      } catch {
        /* 剪贴板不可用时静默忽略 */
      }
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, []);

  const { thinking, answer, done } =
    message.role === "user"
      ? { thinking: null, answer: "", done: false }
      : splitThinking(message.content);

  const hasThinking = thinking !== null;
  useEffect(() => {
    if (isRunning && hasThinking && !done) {
      thinkStartRef.current ??= performance.now();
      const t = setInterval(() => {
        if (thinkStartRef.current !== null) {
          setThinkSeconds(
            Math.round((performance.now() - thinkStartRef.current) / 1000),
          );
        }
      }, 1000);
      return () => clearInterval(t);
    }
    if (thinkStartRef.current !== null && (done || !isRunning)) {
      setThinkSeconds(
        Math.round((performance.now() - thinkStartRef.current) / 1000),
      );
    }
  }, [isRunning, hasThinking, done]);

  if (message.role === "user") {
    return (
      <div className="flex flex-col items-end gap-2" data-testid="msg-user">
        {message.images && message.images.length > 0 && (
          <div className="flex gap-1.5">
            {message.images.map((url, i) => (
              <img
                key={url.slice(-24) + i}
                src={url}
                alt={`用户图片 ${i + 1}`}
                className="h-24 max-w-40 rounded-md object-cover border border-line"
              />
            ))}
          </div>
        )}
        {message.attachments?.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1 text-[13px] text-ink-2"
          >
            <IconFile className="h-3.5 w-3.5 text-ink-3" />
            {name}
          </span>
        ))}
        <div className="max-w-[85%] rounded-md bg-wash px-4 py-2.5 text-[16px] leading-[1.75] text-ink whitespace-pre-wrap">
          {message.displayContent ?? message.content}
        </div>
      </div>
    );
  }

  // 生成已结束但 </think> 未闭合（如被中断/达到 token 上限）时，推理段视为已完成
  const thinkingDone = done || !isRunning;
  const isOpen = expanded ?? !thinkingDone;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(answer || message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用时静默忽略 */
    }
  };

  return (
    <div data-testid="msg-assistant" ref={bodyRef}>
      {!showThinking && thinking !== null && !thinkingDone && (
        // 推理段显示已关闭时也要有生成迹象，避免整个思考期间界面空白
        <div className="mb-4 inline-flex items-center gap-2 text-[13px] text-ink-3 select-none">
          <span className="relative flex h-3 w-3 items-center justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-ink-2" />
          </span>
          <span>
            正在推理…
            {thinkSeconds !== null && thinkSeconds > 0
              ? ` ${thinkSeconds} 秒`
              : ""}
            （推理段显示已在设置中关闭）
          </span>
        </div>
      )}
      {showThinking && thinking !== null && (
        <div className="mb-4">
          <button
            className="group inline-flex items-center gap-2 text-[13px] text-ink-3 hover:text-ink-2 transition-colors select-none"
            onClick={() => setExpanded(!isOpen)}
          >
            {thinkingDone ? (
              <IconReasoning className="h-3.5 w-3.5" />
            ) : (
              <span className="relative flex h-3 w-3 items-center justify-center">
                <span className="h-1.5 w-1.5 rounded-full bg-ink-2" />
              </span>
            )}
            <span>
              {thinkingDone
                ? thinkSeconds !== null
                  ? `推理段 · 共 ${thinkSeconds} 秒`
                  : "推理段（<think> 输出）"
                : thinkSeconds !== null && thinkSeconds > 0
                  ? `推理段 · 生成中 ${thinkSeconds} 秒`
                  : "推理段 · 生成中…"}
            </span>
            <IconChevronDown
              className={`h-3 w-3 opacity-0 group-hover:opacity-100 transition-all duration-150 ${isOpen ? "rotate-180 opacity-100" : ""}`}
            />
          </button>
          {isOpen && (
            <div
              data-testid="thinking"
              className="mt-2.5 pl-[22px] text-[13px] leading-[1.85] text-ink-3 whitespace-pre-wrap"
            >
              {thinking}
            </div>
          )}
        </div>
      )}
      {answer && (
        <div
          data-testid="answer"
          className={`md-answer text-[16px] leading-[1.75] text-ink ${
            isRunning ? "typing-cursor" : ""
          }`}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(answer) }}
        />
      )}
      {!isRunning && message.content && (
        <div className="mt-3 flex gap-1 text-[13px] text-ink-3">
          <button
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-hover hover:text-ink-2 transition-colors"
            onClick={copy}
          >
            {copied ? (
              <IconCheck className="h-3.5 w-3.5" />
            ) : (
              <IconCopy className="h-3.5 w-3.5" />
            )}
            {copied ? "已复制" : "复制"}
          </button>
          {isLast && (
            <button
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-hover hover:text-ink-2 transition-colors"
              onClick={onRegenerate}
            >
              <IconRefresh className="h-3.5 w-3.5" />
              重新生成
            </button>
          )}
        </div>
      )}
    </div>
  );
}
