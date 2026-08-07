import React from "react";
import type { HallucinationAnalysis } from "../lib/hallucinationDetection";
import { analyzeHallucination } from "../lib/hallucinationDetection";
import type { GenerationTrace } from "../lib/trace";

interface HallucinationReportProps {
  trace: GenerationTrace;
  additionalTraces?: GenerationTrace[];
  onJumpToToken?: (tokenIndex: number) => void;
}

export function HallucinationReport({
  trace,
  additionalTraces,
  onJumpToToken
}: HallucinationReportProps) {
  const analysis = React.useMemo(
    () => analyzeHallucination(trace, additionalTraces),
    [trace, additionalTraces]
  );

  return (
    <div className="space-y-6">
      {/* 总体评分卡片 */}
      <div className="rounded-xl border border-obs-line bg-obs-2 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-obs-ink">置信度评分</h2>
            <p className="text-sm text-obs-ink2 mt-1">基于多维度幻觉检测</p>
          </div>
          <div className="text-center">
            <div
              className={`text-6xl font-bold ${
                analysis.confidenceScore >= 90
                  ? "text-safe-500"
                  : analysis.confidenceScore >= 70
                    ? "text-measure-500"
                    : analysis.confidenceScore >= 50
                      ? "text-caution-500"
                      : "text-alert-500"
              }`}
            >
              {analysis.confidenceScore.toFixed(0)}
            </div>
            <p className="text-xs text-obs-ink2 mt-1">满分 100</p>
          </div>
        </div>

        {/* 评分解读 */}
        <div className="mt-4 rounded-md border border-obs-line bg-obs p-3">
          <p className="text-sm text-obs-ink">{analysis.summary}</p>
        </div>

        {/* 评分维度细分 */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-md border border-obs-line bg-obs p-3">
            <p className="text-xs text-obs-ink2">平均熵值</p>
            <p className="text-2xl font-semibold text-obs-ink mt-1">
              {analysis.avgEntropy.toFixed(2)}
            </p>
            <p className="text-xs text-obs-ink2 mt-1">
              {analysis.avgEntropy < 2.0
                ? "低不确定性"
                : analysis.avgEntropy < 3.5
                  ? "正常范围"
                  : "高不确定性"}
            </p>
          </div>

          {analysis.consistencyResult && (
            <div className="rounded-md border border-obs-line bg-obs p-3">
              <p className="text-xs text-obs-ink2">自洽性</p>
              <p className="text-2xl font-semibold text-obs-ink mt-1">
                {(analysis.consistencyResult.consistencyRate * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-obs-ink2 mt-1">
                {analysis.consistencyResult.runs} 次运行
              </p>
            </div>
          )}

          <div className="rounded-md border border-obs-line bg-obs p-3">
            <p className="text-xs text-obs-ink2">风险点总数</p>
            <p className="text-2xl font-semibold text-obs-ink mt-1">
              {analysis.entropyAnomalies.length +
                analysis.timeSeriesAnomalies.length +
                analysis.factualRiskMarkers.length}
            </p>
            <p className="text-xs text-obs-ink2 mt-1">
              {analysis.entropyAnomalies.filter(a => a.severity === "high").length +
                analysis.timeSeriesAnomalies.filter(a => a.severity === "high").length +
                analysis.factualRiskMarkers.filter(m => m.severity === "high").length}{" "}
              个高风险
            </p>
          </div>
        </div>
      </div>

      {/* 检测到的异常列表 */}
      <div className="rounded-xl border border-obs-line bg-obs-2 p-6">
        <h3 className="text-lg font-semibold text-obs-ink mb-4">检测结果</h3>

        {/* 熵值异常 */}
        {analysis.entropyAnomalies.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-obs-ink mb-3">
              🌡️ 熵值异常（{analysis.entropyAnomalies.length}）
            </h4>
            <div className="space-y-2">
              {analysis.entropyAnomalies.slice(0, 5).map((anomaly, i) => (
                <AnomalyCard
                  key={`entropy-${i}`}
                  severity={anomaly.severity}
                  explanation={anomaly.explanation}
                  tokenIndex={anomaly.tokenIndex}
                  onJump={onJumpToToken}
                />
              ))}
              {analysis.entropyAnomalies.length > 5 && (
                <p className="text-xs text-obs-ink2 italic">
                  ...还有 {analysis.entropyAnomalies.length - 5} 个熵值异常
                </p>
              )}
            </div>
          </div>
        )}

        {/* 时间序列异常 */}
        {analysis.timeSeriesAnomalies.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-obs-ink mb-3">
              📉 时间序列异常（{analysis.timeSeriesAnomalies.length}）
            </h4>
            <div className="space-y-2">
              {analysis.timeSeriesAnomalies.slice(0, 5).map((anomaly, i) => (
                <AnomalyCard
                  key={`ts-${i}`}
                  severity={anomaly.severity}
                  explanation={anomaly.explanation}
                  tokenIndex={anomaly.position}
                  onJump={onJumpToToken}
                />
              ))}
              {analysis.timeSeriesAnomalies.length > 5 && (
                <p className="text-xs text-obs-ink2 italic">
                  ...还有 {analysis.timeSeriesAnomalies.length - 5} 个时间序列异常
                </p>
              )}
            </div>
          </div>
        )}

        {/* 事实性风险标记 */}
        {analysis.factualRiskMarkers.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-obs-ink mb-3">
              ⚠️ 事实性风险标记（{analysis.factualRiskMarkers.length}）
            </h4>
            <div className="space-y-2">
              {analysis.factualRiskMarkers.map((marker, i) => (
                <FactualRiskCard
                  key={`factual-${i}`}
                  marker={marker}
                  onJump={onJumpToToken}
                />
              ))}
            </div>
          </div>
        )}

        {/* 无异常状态 */}
        {analysis.entropyAnomalies.length === 0 &&
          analysis.timeSeriesAnomalies.length === 0 &&
          analysis.factualRiskMarkers.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">✓</div>
              <p className="text-sm text-obs-ink2">未检测到明显异常</p>
            </div>
          )}
      </div>

      {/* 自洽性分析（如果有多次运行）*/}
      {analysis.consistencyResult && (
        <div className="rounded-xl border border-obs-line bg-obs-2 p-6">
          <h3 className="text-lg font-semibold text-obs-ink mb-4">
            🔄 自洽性分析
          </h3>
          <div className="rounded-md border border-obs-line bg-obs p-4">
            <p className="text-sm text-obs-ink">{analysis.consistencyResult.explanation}</p>
            {analysis.consistencyResult.avgDivergencePoint < trace.steps.length && (
              <button
                className="text-xs text-measure-500 hover:underline mt-2"
                onClick={() => onJumpToToken?.(analysis.consistencyResult!.avgDivergencePoint)}
              >
                定位到首次分叉点（第 {analysis.consistencyResult.avgDivergencePoint + 1} 个 token）→
              </button>
            )}
          </div>
        </div>
      )}

      {/* 方法论说明 */}
      <div className="rounded-xl border border-obs-line bg-obs-2 p-6">
        <h3 className="text-lg font-semibold text-obs-ink mb-4">
          📚 检测方法论
        </h3>
        <div className="space-y-3 text-sm text-obs-ink2">
          <p>
            本报告基于学术研究和工业最佳实践，从以下维度检测 AI 生成内容的可信度：
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong>熵值异常</strong>：检测生成分布的不确定性（Shannon Entropy 理论）
            </li>
            <li>
              <strong>时间序列异常</strong>：检测概率突降、低概率区域、高波动率（HALT 论文）
            </li>
            <li>
              <strong>事实性风险</strong>：标记易被编造的具体数字、日期、引用（OpenAI 最佳实践）
            </li>
            {analysis.consistencyResult && (
              <li>
                <strong>自洽性</strong>：对比多次运行的一致性（Self-Consistency, Wang et al. 2022）
              </li>
            )}
          </ul>
          <p className="text-xs italic mt-3">
            详细方法论请参阅：
            <a
              href="https://github.com/wangshibo/webgpu-llm-chat/blob/main/docs/HALLUCINATION_DETECTION_RESEARCH.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-measure-500 hover:underline ml-1"
            >
              HALLUCINATION_DETECTION_RESEARCH.md
            </a>
          </p>
        </div>
      </div>

      {/* 导出按钮 */}
      <div className="flex gap-3">
        <button
          className="btn-primary"
          onClick={() => exportAsJSON(analysis)}
        >
          导出 JSON
        </button>
        <button
          className="btn-secondary"
          onClick={() => exportAsMarkdown(analysis, trace)}
        >
          导出 Markdown
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// 子组件
// ============================================================================

interface AnomalyCardProps {
  severity: "low" | "medium" | "high";
  explanation: string;
  tokenIndex: number;
  onJump?: (tokenIndex: number) => void;
}

function AnomalyCard({ severity, explanation, tokenIndex, onJump }: AnomalyCardProps) {
  return (
    <div
      className={`rounded-md border p-3 ${
        severity === "high"
          ? "border-alert-500/30 bg-alert-500/10"
          : severity === "medium"
            ? "border-caution-500/30 bg-caution-500/10"
            : "border-obs-line bg-obs"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            severity === "high"
              ? "bg-alert-500 text-white"
              : severity === "medium"
                ? "bg-caution-500 text-white"
                : "bg-obs-line text-obs-ink2"
          }`}
        >
          !
        </span>
        <div className="flex-1">
          <p className="text-sm text-obs-ink">{explanation}</p>
          {onJump && (
            <button
              className="text-xs text-measure-500 hover:underline mt-2"
              onClick={() => onJump(tokenIndex)}
            >
              定位到第 {tokenIndex + 1} 个 token →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface FactualRiskCardProps {
  marker: HallucinationAnalysis["factualRiskMarkers"][number];
  onJump?: (tokenIndex: number) => void;
}

function FactualRiskCard({ marker, onJump }: FactualRiskCardProps) {
  const typeLabel = {
    confident_number: "📊 可疑数字",
    date: "📅 日期",
    citation: "📖 引用",
    proper_noun: "🏷️ 专有名词"
  }[marker.type];

  return (
    <div
      className={`rounded-md border p-3 ${
        marker.severity === "high"
          ? "border-alert-500/30 bg-alert-500/10"
          : marker.severity === "medium"
            ? "border-caution-500/30 bg-caution-500/10"
            : "border-obs-line bg-obs"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            marker.severity === "high"
              ? "bg-alert-500 text-white"
              : marker.severity === "medium"
                ? "bg-caution-500 text-white"
                : "bg-obs-line text-obs-ink2"
          }`}
        >
          !
        </span>
        <div className="flex-1">
          <p className="text-xs font-semibold text-obs-ink mb-1">{typeLabel}</p>
          <p className="text-sm text-obs-ink">
            检测到：<code className="px-1.5 py-0.5 rounded bg-obs-line text-obs-ink">{marker.text}</code>
            {marker.type === "confident_number" && (
              <span className="text-xs text-obs-ink2 ml-2">
                （熵值 {marker.entropy.toFixed(2)}）
              </span>
            )}
          </p>
          <p className="text-xs text-obs-ink2 mt-2 italic">💡 {marker.hint}</p>
          {onJump && (
            <button
              className="text-xs text-measure-500 hover:underline mt-2"
              onClick={() => onJump(marker.tokenIndex)}
            >
              定位到第 {marker.tokenIndex + 1} 个 token →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 导出功能
// ============================================================================

function exportAsJSON(analysis: HallucinationAnalysis) {
  const blob = new Blob([JSON.stringify(analysis, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hallucination-report-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAsMarkdown(analysis: HallucinationAnalysis, _trace: GenerationTrace) {
  const md = `# AI 幻觉检测报告

**模型**: ${analysis.modelId}
**生成时间**: ${new Date().toISOString()}
**Token 总数**: ${analysis.totalTokens}

---

## 置信度评分

**${analysis.confidenceScore.toFixed(0)} / 100**

${analysis.summary}

### 评分维度

- **平均熵值**: ${analysis.avgEntropy.toFixed(2)}
${analysis.consistencyResult ? `- **自洽性**: ${(analysis.consistencyResult.consistencyRate * 100).toFixed(0)}% (${analysis.consistencyResult.runs} 次运行)` : ""}
- **风险点总数**: ${analysis.entropyAnomalies.length + analysis.timeSeriesAnomalies.length + analysis.factualRiskMarkers.length}

---

## 检测结果

### 熵值异常（${analysis.entropyAnomalies.length}）

${analysis.entropyAnomalies.map((a, i) => `${i + 1}. [Token ${a.tokenIndex + 1}] ${a.explanation}`).join("\n")}

### 时间序列异常（${analysis.timeSeriesAnomalies.length}）

${analysis.timeSeriesAnomalies.map((a, i) => `${i + 1}. [Token ${a.position + 1}] ${a.explanation}`).join("\n")}

### 事实性风险标记（${analysis.factualRiskMarkers.length}）

${analysis.factualRiskMarkers.map((m, i) => `${i + 1}. [Token ${m.tokenIndex + 1}] **${m.text}** - ${m.hint}`).join("\n")}

${analysis.consistencyResult ? `---

## 自洽性分析

${analysis.consistencyResult.explanation}
` : ""}

---

## 方法论

本报告基于以下学术研究和工业最佳实践：

- **熵值异常**: Shannon Entropy 理论
- **时间序列异常**: HALT 论文（ArXiv 2602.02888）
- **事实性风险**: OpenAI 最佳实践
${analysis.consistencyResult ? "- **自洽性**: Wang et al. (2022) Self-Consistency" : ""}

详细方法论：[HALLUCINATION_DETECTION_RESEARCH.md](https://github.com/wangshibo/webgpu-llm-chat/blob/main/docs/HALLUCINATION_DETECTION_RESEARCH.md)

---

生成自 WebGPU LLM Observe - AI 置信度审计工具
`;

  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hallucination-report-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
