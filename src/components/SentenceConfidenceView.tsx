import { useState } from "react";
import type { TokenStep } from "../lib/trace";
import {
  splitSentences,
  buildConfidenceReport,
  exportReportAsCSV,
} from "../lib/sentenceAnalysis";

/** 句子级置信度视图：按句子拆分 token 流，显示平均熵值和颜色条
 *  点击展开查看内部 token 详情
 *
 *  颜色规则：
 *  - < 2.0: 绿色（高置信）
 *  - 2.0-3.5: 蓝色（正常）
 *  - 3.5-4.5: 琥珀（谨慎）
 *  - > 4.5: 红色（警示）
 */
export default function SentenceConfidenceView({
  steps,
  modelId,
}: {
  steps: TokenStep[];
  modelId: string;
}) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const sentences = splitSentences(steps);

  const toggleExpand = (index: number) => {
    setExpanded(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const getEntropyColor = (entropy: number): string => {
    if (entropy < 2.0) return "bg-brand-500"; // 绿色
    if (entropy < 3.5) return "bg-measure-500"; // 蓝色
    if (entropy < 4.5) return "bg-caution-500"; // 琥珀
    return "bg-alert-500"; // 红色
  };

  const getEntropyLabel = (entropy: number): string => {
    if (entropy < 2.0) return "高置信";
    if (entropy < 3.5) return "正常";
    if (entropy < 4.5) return "谨慎";
    return "警示";
  };

  const handleExportJSON = () => {
    const report = buildConfidenceReport(steps, modelId);
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `confidence-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const report = buildConfidenceReport(steps, modelId);
    const csv = exportReportAsCSV(report);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `confidence-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (sentences.length === 0) {
    return (
      <div className="rounded-xl border border-obs-line bg-obs-2 p-6 text-center">
        <p className="text-sm text-obs-ink2">暂无句子数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 导出按钮 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleExportJSON}
          className="rounded-full border border-obs-line bg-obs-2 px-4 py-2 text-sm text-obs-ink transition-colors hover:bg-obs-3"
        >
          导出 JSON
        </button>
        <button
          type="button"
          onClick={handleExportCSV}
          className="rounded-full border border-obs-line bg-obs-2 px-4 py-2 text-sm text-obs-ink transition-colors hover:bg-obs-3"
        >
          导出 CSV
        </button>
      </div>

      {/* 句子卡片列表 */}
      <div className="space-y-2">
        {sentences.map((sent) => (
          <div
            key={sent.index}
            className="rounded-md border border-obs-line bg-obs-2 p-3 transition-colors hover:bg-obs-3 cursor-pointer"
            onClick={() => toggleExpand(sent.index)}
          >
            <div className="flex items-center gap-3">
              <span className="flex-1 text-sm text-obs-ink leading-relaxed">
                {sent.text}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-obs-ink2 tabular-nums">
                  熵 {sent.avgEntropy.toFixed(1)}
                </span>
                <span className="text-xs text-obs-ink2">
                  {getEntropyLabel(sent.avgEntropy)}
                </span>
                <div className="h-2 w-24 rounded-full bg-obs overflow-hidden">
                  <div
                    className={`h-full transition-all ${getEntropyColor(sent.avgEntropy)}`}
                    style={{ width: `${Math.min((sent.avgEntropy / 5) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 展开内部 token */}
            {expanded[sent.index] && (
              <div className="mt-3 pt-3 border-t border-obs-line">
                <div className="flex flex-wrap gap-1">
                  {sent.tokens.map((tok, j) => (
                    <span
                      key={j}
                      className={`inline-block rounded px-1.5 py-0.5 font-mono text-xs ${
                        tok.entropy > 4.0
                          ? "bg-alert-500/20 text-alert-500"
                          : tok.entropy > 3.0
                            ? "bg-caution-500/20 text-caution-500"
                            : "bg-obs-3 text-obs-ink2"
                      }`}
                      title={`熵: ${tok.entropy.toFixed(2)}, 概率: ${(tok.prob * 100).toFixed(1)}%`}
                    >
                      {tok.text.trim() || "␣"}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-obs-ink2">
                  <span>Token 数：{sent.tokens.length}</span>
                  <span>高熵 Token：{sent.highEntropyCount}</span>
                  <span>平均熵：{sent.avgEntropy.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
