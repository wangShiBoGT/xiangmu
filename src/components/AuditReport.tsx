import React from "react";
import type { UsabilityAudit } from "../lib/usabilityAudit";
import { auditUsability } from "../lib/usabilityAudit";
import type { GenerationTrace } from "../lib/trace";
import type { ParsedDocument } from "../lib/documents";
import { addSourceTracingToClusters } from "../lib/sourceTracing";

interface AuditReportProps {
  trace: GenerationTrace;
  additionalTraces?: GenerationTrace[];
  documents?: ParsedDocument[];
  onJumpToToken?: (tokenIndex: number) => void;
}

export function AuditReport({
  trace,
  additionalTraces,
  documents,
  onJumpToToken
}: AuditReportProps) {
  const [audit, setAudit] = React.useState<UsabilityAudit | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [sourceTracingProgress, setSourceTracingProgress] = React.useState<string>("");

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSourceTracingProgress("");

    auditUsability(trace, additionalTraces).then(async result => {
      if (cancelled) return;

      // 如果有文档且有语义一致性结果，添加来源追溯
      if (documents && documents.length > 0 && result.semanticConsistency?.clusters) {
        setSourceTracingProgress("正在追溯来源...");

        try {
          const clustersWithSource = await addSourceTracingToClusters(
            result.semanticConsistency.clusters,
            documents,
            { similarityThreshold: 0.7 },
            (current, total) => {
              setSourceTracingProgress(`正在追溯来源... ${current}/${total}`);
            }
          );

          // 更新审计结果
          result.semanticConsistency = {
            ...result.semanticConsistency,
            clusters: clustersWithSource
          };
        } catch (error) {
          console.error("Source tracing failed:", error);
        }
      }

      if (!cancelled) {
        setAudit(result);
        setLoading(false);
        setSourceTracingProgress("");
      }
    }).catch(error => {
      console.error("Audit failed:", error);
      if (!cancelled) {
        setLoading(false);
        setSourceTracingProgress("");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [trace, additionalTraces, documents]);

  if (loading || !audit) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-obs-ink2">
          {sourceTracingProgress || "正在分析..."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 检测结果摘要卡片 - 独立展示各维度，不汇总等级 */}
      <div className="rounded-xl border border-obs-line bg-obs-2 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-obs-ink">可用性审计</h2>
            <p className="text-sm text-obs-ink2 mt-1">标记不确定性和风险点，辅助人工审计</p>
          </div>
        </div>

        {/* 重要说明：低熵不等于正确 */}
        <div className="mt-4 rounded-md border border-caution-500/30 bg-caution-500/10 p-3">
          <p className="text-xs text-obs-ink font-semibold mb-1">⚠️ 重要说明</p>
          <p className="text-xs text-obs-ink2">
            • 低熵不保证正确（模型可能"过度自信"地错）<br/>
            • 高熵不一定错误（可能是合理的创意发散）<br/>
            • 多次运行一致也可能一致地错（常见误解）<br/>
            • 关键决策场景请务必人工核实所有标记的风险点
          </p>
        </div>

        {/* 评估维度细分 - 独立展示，不做综合判断 */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-md border border-obs-line bg-obs p-3">
            <p className="text-xs text-obs-ink2">平均熵值</p>
            <p className="text-2xl font-semibold text-obs-ink mt-1">
              {audit.avgEntropy.toFixed(2)}
            </p>
            <p className="text-xs text-obs-ink2 mt-1">
              生成分布的不确定性
            </p>
          </div>

          {(audit.semanticConsistency || audit.consistencyResult) && (
            <div className="rounded-md border border-obs-line bg-obs p-3">
              <p className="text-xs text-obs-ink2">
                {audit.semanticConsistency ? "语义一致性" : "Token 一致性"}
              </p>
              <p className="text-2xl font-semibold text-obs-ink mt-1">
                {((audit.semanticConsistency?.consistencyRate ?? audit.consistencyResult?.consistencyRate ?? 0) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-obs-ink2 mt-1">
                {audit.semanticConsistency
                  ? `${audit.semanticConsistency.runs} 次运行语义对比`
                  : `${audit.consistencyResult?.runs} 次运行对比`}
              </p>
            </div>
          )}

          <div className="rounded-md border border-obs-line bg-obs p-3">
            <p className="text-xs text-obs-ink2">风险点总数</p>
            <p className="text-2xl font-semibold text-obs-ink mt-1">
              {audit.riskCount}
            </p>
            <p className="text-xs text-obs-ink2 mt-1">
              {audit.entropyAnomalies.filter(a => a.severity === "high").length +
                audit.timeSeriesAnomalies.filter(a => a.severity === "high").length +
                audit.factualRiskMarkers.filter(m => m.severity === "high").length}{" "}
              个高风险标记
            </p>
          </div>
        </div>
      </div>

      {/* 检测到的风险列表 */}
      <div className="rounded-xl border border-obs-line bg-obs-2 p-6">
        <h3 className="text-lg font-semibold text-obs-ink mb-4">检测结果</h3>

        {/* 熵值异常 */}
        {audit.entropyAnomalies.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-obs-ink mb-3">
              🌡️ 熵值异常（{audit.entropyAnomalies.length}）
            </h4>
            <div className="space-y-2">
              {audit.entropyAnomalies.slice(0, 5).map((anomaly, i) => (
                <AnomalyCard
                  key={`entropy-${i}`}
                  severity={anomaly.severity}
                  explanation={anomaly.explanation}
                  tokenIndex={anomaly.tokenIndex}
                  onJump={onJumpToToken}
                />
              ))}
              {audit.entropyAnomalies.length > 5 && (
                <p className="text-xs text-obs-ink2 italic">
                  ...还有 {audit.entropyAnomalies.length - 5} 个熵值异常
                </p>
              )}
            </div>
          </div>
        )}

        {/* 时间序列异常 */}
        {audit.timeSeriesAnomalies.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-obs-ink mb-3">
              📉 时间序列异常（{audit.timeSeriesAnomalies.length}）
            </h4>
            <div className="space-y-2">
              {audit.timeSeriesAnomalies.slice(0, 5).map((anomaly, i) => (
                <AnomalyCard
                  key={`ts-${i}`}
                  severity={anomaly.severity}
                  explanation={anomaly.explanation}
                  tokenIndex={anomaly.position}
                  onJump={onJumpToToken}
                />
              ))}
              {audit.timeSeriesAnomalies.length > 5 && (
                <p className="text-xs text-obs-ink2 italic">
                  ...还有 {audit.timeSeriesAnomalies.length - 5} 个时间序列异常
                </p>
              )}
            </div>
          </div>
        )}

        {/* 事实性风险标记 */}
        {audit.factualRiskMarkers.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-obs-ink mb-3">
              ⚠️ 事实性风险标记（{audit.factualRiskMarkers.length}）
            </h4>
            <div className="space-y-2">
              {audit.factualRiskMarkers.map((marker, i) => (
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
        {audit.entropyAnomalies.length === 0 &&
          audit.timeSeriesAnomalies.length === 0 &&
          audit.factualRiskMarkers.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">✓</div>
              <p className="text-sm text-obs-ink2">未检测到明显风险点</p>
            </div>
          )}
      </div>

      {/* 一致性分析（如果有多次运行）*/}
      {(audit.semanticConsistency || audit.consistencyResult) && (
        <div className="rounded-xl border border-obs-line bg-obs-2 p-6">
          <h3 className="text-lg font-semibold text-obs-ink mb-4">
            🔄 {audit.semanticConsistency ? "语义一致性分析" : "Token 级一致性分析"}
          </h3>

          {audit.semanticConsistency && (
            <>
              <div className="rounded-md border border-obs-line bg-obs p-4 mb-4">
                <p className="text-sm text-obs-ink">{audit.semanticConsistency.explanation}</p>
              </div>

              {/* 显示簇信息 */}
              {audit.semanticConsistency.clusters.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-obs-ink2 font-semibold">主张聚类详情</p>
                  {audit.semanticConsistency.clusters.slice(0, 5).map((cluster, i) => (
                    <div key={i} className="rounded-md border border-obs-line bg-obs p-3">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-xs text-obs-ink2">
                          簇 #{i + 1} · {cluster.members.length} 条主张 · 出现在 {cluster.runIds.size}/{audit.semanticConsistency!.runs} 次运行
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          cluster.runIds.size >= audit.semanticConsistency!.runs * 0.7
                            ? "bg-obs-line text-obs-ink"
                            : "bg-caution-500/20 text-caution-500"
                        }`}>
                          {(cluster.consistencyRate * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-sm text-obs-ink">
                        {cluster.representative.text.length > 100
                          ? cluster.representative.text.slice(0, 100) + "..."
                          : cluster.representative.text}
                      </p>

                      {/* 显示来源信息 */}
                      {cluster.representative.source && (
                        <div className="mt-2 pt-2 border-t border-obs-line">
                          <p className="text-xs text-obs-ink2 mb-1">
                            📄 来源：{cluster.representative.source.docName} 第 {cluster.representative.source.pageNumber} 页
                            （相似度 {(cluster.representative.source.similarity * 100).toFixed(0)}%）
                          </p>
                          <p className="text-xs text-obs-ink2 italic">
                            "{cluster.representative.source.excerpt.length > 100
                              ? cluster.representative.source.excerpt.slice(0, 100) + "..."
                              : cluster.representative.source.excerpt}"
                          </p>
                        </div>
                      )}

                      {!cluster.representative.source && documents && documents.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-obs-line">
                          <p className="text-xs text-caution-500">
                            ⚠️ 未找到明确来源（相似度 &lt; 70%）
                          </p>
                        </div>
                      )}

                      {cluster.members.length > 1 && (
                        <details className="mt-2">
                          <summary className="text-xs text-measure-500 cursor-pointer">
                            查看 {cluster.members.length - 1} 个相似主张
                          </summary>
                          <div className="mt-2 space-y-2 pl-4 border-l-2 border-obs-line">
                            {cluster.members.slice(1).map((member, j) => (
                              <div key={j} className="text-xs">
                                <p className="text-obs-ink2">
                                  运行 {member.claim.runId + 1} · 相似度 {(member.similarity * 100).toFixed(0)}%
                                </p>
                                <p className="text-obs-ink mt-1">
                                  {member.claim.text.length > 80
                                    ? member.claim.text.slice(0, 80) + "..."
                                    : member.claim.text}
                                </p>
                                {/* 显示该主张的来源 */}
                                {member.claim.source && (
                                  <p className="text-obs-ink2 mt-1">
                                    📄 {member.claim.source.docName} 第 {member.claim.source.pageNumber} 页
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                  {audit.semanticConsistency.clusters.length > 5 && (
                    <p className="text-xs text-obs-ink2 italic">
                      ...还有 {audit.semanticConsistency.clusters.length - 5} 个主张簇
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {!audit.semanticConsistency && audit.consistencyResult && (
            <>
              <div className="rounded-md border border-obs-line bg-obs p-4">
                <p className="text-sm text-obs-ink">{audit.consistencyResult.explanation}</p>
                {audit.consistencyResult.avgDivergencePoint < trace.steps.length && (
                  <button
                    className="text-xs text-measure-500 hover:underline mt-2"
                    onClick={() => onJumpToToken?.(audit.consistencyResult!.avgDivergencePoint)}
                  >
                    定位到首次分叉点（第 {audit.consistencyResult.avgDivergencePoint + 1} 个 token）→
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* 方法论说明 */}
      <div className="rounded-xl border border-obs-line bg-obs-2 p-6">
        <h3 className="text-lg font-semibold text-obs-ink mb-4">
          📚 检测方法论
        </h3>
        <div className="space-y-3 text-sm text-obs-ink2">
          <p>
            本工具是<strong>不确定性和风险点标记系统</strong>，不是幻觉检测器。我们不判断内容真假，只标记需要人工核实的部分。
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong>熵值异常</strong>：标记生成分布的不确定性（高熵 ≠ 幻觉）
            </li>
            <li>
              <strong>时间序列异常</strong>：标记概率突降、低概率区域、高波动率
            </li>
            <li>
              <strong>事实性风险</strong>：标记易被编造的具体数字、日期、引用（需人工核实）
            </li>
            {audit.semanticConsistency && (
              <li>
                <strong>语义一致性</strong>：提取原子主张 → 语义嵌入 → 聚类分析（相似度 &gt;85% 视为一致）
              </li>
            )}
            {!audit.semanticConsistency && audit.consistencyResult && (
              <li>
                <strong>Token 一致性</strong>：多次运行 token 级对比（一致 ≠ 正确，但不一致说明不确定）
              </li>
            )}
          </ul>
          <div className="mt-4 p-3 rounded-md bg-caution-500/10 border border-caution-500/30">
            <p className="text-xs text-obs-ink font-semibold mb-1">⚠️ 重要说明</p>
            <p className="text-xs text-obs-ink2">
              • 低熵不保证正确（模型可能"过度自信"地错）<br/>
              • 高熵不一定错误（可能是合理的创意发散）<br/>
              • 多次运行一致也可能一致地错（常见误解）<br/>
              • 关键决策场景请务必人工核实所有标记的风险点
            </p>
          </div>
          <p className="text-xs italic mt-3">
            详细方法论：
            <a
              href="https://github.com/wangshibo/webgpu-llm-chat/blob/main/docs/PRODUCT_REDESIGN_V2.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-measure-500 hover:underline ml-1"
            >
              PRODUCT_REDESIGN_V2.md
            </a>
          </p>
        </div>
      </div>

      {/* 导出按钮 */}
      <div className="flex gap-3">
        <button
          className="btn-primary"
          onClick={() => exportAsJSON(audit)}
        >
          导出 JSON
        </button>
        <button
          className="btn-secondary"
          onClick={() => exportAsMarkdown(audit, trace)}
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
  marker: UsabilityAudit["factualRiskMarkers"][number];
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

function exportAsJSON(audit: UsabilityAudit) {
  const blob = new Blob([JSON.stringify(audit, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `usability-audit-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAsMarkdown(audit: UsabilityAudit, _trace: GenerationTrace) {
  const md = `# AI 可用性审计报告

**模型**: ${audit.modelId}
**生成时间**: ${new Date().toISOString()}
**Token 总数**: ${audit.totalTokens}

---

## 检测结果摘要

### 评估维度

- **平均熵值**: ${audit.avgEntropy.toFixed(2)} - 生成分布的不确定性
${audit.consistencyResult ? `- **自洽性**: ${(audit.consistencyResult.consistencyRate * 100).toFixed(0)}% (${audit.consistencyResult.runs} 次运行对比)` : ""}
- **风险点总数**: ${audit.riskCount}

---

## 检测结果

### 熵值异常（${audit.entropyAnomalies.length}）

${audit.entropyAnomalies.map((a, i) => `${i + 1}. [Token ${a.tokenIndex + 1}] ${a.explanation}`).join("\n")}

### 时间序列异常（${audit.timeSeriesAnomalies.length}）

${audit.timeSeriesAnomalies.map((a, i) => `${i + 1}. [Token ${a.position + 1}] ${a.explanation}`).join("\n")}

### 事实性风险标记（${audit.factualRiskMarkers.length}）

${audit.factualRiskMarkers.map((m, i) => `${i + 1}. [Token ${m.tokenIndex + 1}] **${m.text}** - ${m.hint}`).join("\n")}

${audit.consistencyResult ? `---

## 自洽性分析

${audit.consistencyResult.explanation}
` : ""}

---

## 重要说明

本工具是**不确定性和风险点标记系统**，不是幻觉检测器：

- ⚠️ 低熵不保证正确（模型可能"过度自信"地错）
- ⚠️ 高熵不一定错误（可能是合理的创意发散）
- ⚠️ 多次运行一致也可能一致地错（常见误解）
- ⚠️ 关键决策场景请务必人工核实所有标记的风险点

---

生成自 WebGPU LLM Observe - AI 可用性审计工具
`;

  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `usability-audit-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
