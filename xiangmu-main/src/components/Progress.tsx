function formatBytes(size: number) {
  const i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return (
    +(size / Math.pow(1024, i)).toFixed(2) + ["B", "KB", "MB", "GB", "TB"][i]
  );
}

interface ProgressProps {
  text: string;
  percentage?: number;
  total?: number;
}

export default function Progress({
  text,
  percentage = 0,
  total,
}: ProgressProps) {
  return (
    <div className="w-full mb-3">
      <div className="flex justify-between text-[12px] text-ink-2 mb-1.5">
        <span className="truncate max-w-[70%] font-mono">{text}</span>
        <span>
          {percentage.toFixed(1)}%{total ? ` / ${formatBytes(total)}` : ""}
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-hover overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
