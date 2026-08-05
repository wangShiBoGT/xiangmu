import { useState, useEffect, useRef } from "react";
import {
  IconFile,
  IconCheck,
  IconCopy,
  IconRefresh,
  IconThinking,
} from "./icons";
import ActivityCard from "./ActivityCard";
import ThinkingTimeline from "./ThinkingTimeline";
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

/** 思考内容语义高亮：关键推理步骤、假设、结论 */
function highlightThinking(text: string): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const trimmed = line.trim();
    // 推理步骤标记
    if (/^(第[一二三四五六七八九十\d]+步|Step \d+|首先|然后|接着|最后|因此|所以)/i.test(trimmed)) {
      return (
        <div key={i} className="my-1 text-brand-400">
          {line}
        </div>
      );
    }
    // 假设与条件
    if (/^(假设|假定|如果|若|设|Given|Assume)/i.test(trimmed)) {
      return (
        <div key={i} className="my-1 text-amber-400/90">
          {line}
        </div>
      );
    }
    // 结论与推断
    if (/^(结论|得出|推断|综上|总结|Therefore|Conclusion)/i.test(trimmed)) {
      return (
        <div key={i} className="my-1 font-medium text-success-500">
          {line}
        </div>
      );
    }
    return <div key={i}>{line}</div>;
  });
}

export default function ChatMessage({
  message,
  showThinking,
  isLast,
  isRunning,
  onRegenerate,
}: Props) {
  // 推理段胶囊：生成中自动展开（让用户看到 <think> token 流），结束后自动收起
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
                className="h-24 max-w-40 rounded-lg object-cover border border-obs-line shadow-sm"
              />
            ))}
          </div>
        )}
        {message.attachments?.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1.5 rounded-lg border border-obs-line bg-obs-2 px-3 py-1.5 text-[13px] text-obs-ink2 shadow-sm"
          >
            <IconFile className="h-3.5 w-3.5 text-obs-ink3" />
            {name}
          </span>
        ))}
        <div className="max-w-[70%] rounded-2xl bg-brand-500 px-4 py-3 text-[15px] leading-[1.75] text-white shadow-md whitespace-pre-wrap">
          {message.displayContent ?? message.content}
        </div>
      </div>
    );
  }

  // 生成已结束但 </think> 未闭合（如被中断/达到 token 上限）时，推理段视为已完成
  const thinkingDone = done || !isRunning;

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
        <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-brand-500/10 px-3 py-2 text-[13px] text-brand-400 select-none">
          <IconThinking className="h-4 w-4 animate-pulse" />
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
        <ActivityCard
          type="thinking"
          title={thinkingDone ? "Thought" : "正在思考"}
          duration={thinkingDone && thinkSeconds !== null ? thinkSeconds : undefined}
          isRunning={!thinkingDone}
          defaultExpanded={!thinkingDone}
        >
          <div className="relative">
            {/* 思考内容语义高亮 */}
            <div className="whitespace-pre-wrap text-[13px] leading-relaxed">
              {highlightThinking(thinking)}
            </div>
            {/* 思考时间轴 */}
            {thinkingDone && thinkSeconds !== null && thinkSeconds > 0 && (
              <ThinkingTimeline
                content={thinking}
                totalDuration={thinkSeconds}
                isRunning={false}
              />
            )}
            {/* 流式渲染中显示思考进度 */}
            {!thinkingDone && thinkSeconds !== null && thinkSeconds > 5 && (
              <div className="mt-3 flex items-center gap-2 text-[11px] text-obs-ink3">
                <div className="h-px flex-1 bg-gradient-to-r from-brand-500/40 to-transparent" />
                <span>{thinkSeconds} 秒</span>
              </div>
            )}
          </div>
        </ActivityCard>
      )}
      {answer && (
        <div
          data-testid="answer"
          className={`md-answer text-[15px] leading-[1.75] text-obs-ink ${
            isRunning ? "typing-cursor" : ""
          }`}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(answer) }}
        />
      )}
      {/* AI 正在生成但还没有内容时显示思考状态 */}
      {isRunning && !answer && thinking === null && (
        <div className="flex items-center gap-3 rounded-lg bg-brand-500/10 px-3 py-2 text-[14px] text-brand-400">
          <IconThinking className="h-5 w-5 animate-pulse" />
          <span>正在生成回答...</span>
        </div>
      )}
      {!isRunning && message.content && (
        <div className="mt-3 flex gap-1">
          <button
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] text-obs-ink3 transition-colors hover:bg-obs-line/30 hover:text-obs-ink"
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
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] text-obs-ink3 transition-colors hover:bg-obs-line/30 hover:text-obs-ink"
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
