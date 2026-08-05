/** 思考过程可视化时间轴：显示推理阶段的进展和关键步骤 */

import { useMemo } from "react";

interface ThinkingSegment {
  type: "reasoning" | "assumption" | "conclusion" | "question";
  text: string;
  startTime: number;
  duration: number;
}

interface ThinkingTimelineProps {
  /** 思考内容 */
  content: string;
  /** 总耗时（秒） */
  totalDuration: number;
  /** 是否正在进行 */
  isRunning?: boolean;
}

/** 解析思考内容为时间轴段落 */
function parseThinkingSegments(content: string, totalDuration: number): ThinkingSegment[] {
  const lines = content.split("\n").filter(l => l.trim());
  if (lines.length === 0) return [];

  const segments: ThinkingSegment[] = [];
  const avgDuration = totalDuration / lines.length;

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    let type: ThinkingSegment["type"] = "reasoning";

    if (/^(假设|假定|如果|若|设|Given|Assume)/i.test(trimmed)) {
      type = "assumption";
    } else if (/^(结论|得出|推断|综上|总结|Therefore|Conclusion)/i.test(trimmed)) {
      type = "conclusion";
    } else if (/\?|？/.test(trimmed)) {
      type = "question";
    }

    segments.push({
      type,
      text: line,
      startTime: i * avgDuration,
      duration: avgDuration,
    });
  });

  return segments;
}

export default function ThinkingTimeline({
  content,
  totalDuration,
  isRunning = false,
}: ThinkingTimelineProps) {
  const segments = useMemo(
    () => parseThinkingSegments(content, totalDuration),
    [content, totalDuration]
  );

  if (segments.length === 0) return null;

  const getSegmentColor = (type: ThinkingSegment["type"]) => {
    switch (type) {
      case "reasoning":
        return "bg-brand-400/70";
      case "assumption":
        return "bg-amber-400/70";
      case "conclusion":
        return "bg-success-500/70";
      case "question":
        return "bg-measure-400/70";
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 text-[11px] text-obs-ink3">
        <span>思考时间轴</span>
        <div className="h-px flex-1 bg-obs-line" />
        <span>{totalDuration.toFixed(1)}s</span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-obs-line/30">
        {segments.map((seg, i) => {
          const leftPercent = (seg.startTime / totalDuration) * 100;
          const widthPercent = (seg.duration / totalDuration) * 100;
          return (
            <div
              key={i}
              className={`absolute h-full ${getSegmentColor(seg.type)} transition-all`}
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
              }}
              title={`${seg.type}: ${seg.text.slice(0, 50)}...`}
            />
          );
        })}
      </div>
      {!isRunning && (
        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-brand-400/70" />
            推理
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400/70" />
            假设
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-success-500/70" />
            结论
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-measure-400/70" />
            疑问
          </span>
        </div>
      )}
    </div>
  );
}
