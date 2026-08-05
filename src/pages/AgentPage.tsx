import { useState } from 'react';
import AgentFlowVisualization from '../components/AgentFlowVisualization';
import { modelSegments, type AgentEvent } from '../lib/agentTrace';
import type { TokenStep } from '../lib/trace';

export default function AgentPage() {
  const [currentStep, setCurrentStep] = useState(0);

  // 示例数据：模拟一个简单的 Agent 协作流程
  const demoSteps: TokenStep[] = Array.from({ length: 20 }, (_, i) => ({
    id: i + 100,
    text: `token_${i}`,
    prob: 0.8,
    topk: [],
    entropy: 1.5,
    dt: 50,
  }));

  const demoEvents: AgentEvent[] = [
    {
      type: 'tool_call',
      atStep: 2,
      tool: 'search',
      input: '{"query": "WebGPU 性能优化"}',
      reason: '需要查找最新的优化技巧',
      confidence: 0.9,
    },
    {
      type: 'tool_result',
      atStep: 3,
      tool: 'search',
      output: '找到 5 条相关结果...',
      ok: true,
      durationMs: 120,
    },
    {
      type: 'decision_point',
      atStep: 5,
      note: '评估搜索结果的相关性',
      evidence: '结果 1 和 3 最相关，包含具体代码示例',
      confidence: 0.85,
    },
    {
      type: 'tool_call',
      atStep: 7,
      tool: 'code_analysis',
      input: '{"file": "shader.wgsl"}',
      reason: '分析着色器代码的性能瓶颈',
      confidence: 0.95,
    },
    {
      type: 'tool_result',
      atStep: 8,
      tool: 'code_analysis',
      output: '发现 3 处可优化点：1) 减少寄存器压力 2) 合并内存访问 3) 使用 workgroup 共享内存',
      ok: true,
      durationMs: 85,
    },
    {
      type: 'model_handoff',
      atStep: 10,
      from: 'planner',
      to: 'coder',
      note: '从规划模型切换到代码生成模型',
      reason: '需要输出具体的优化代码',
      confidence: 0.88,
    },
    {
      type: 'decision_point',
      atStep: 12,
      note: '选择优化策略',
      evidence: '优先优化寄存器压力（性能提升最大）',
      confidence: 0.92,
    },
    {
      type: 'tool_call',
      atStep: 15,
      tool: 'validator',
      input: '{"code": "optimized_shader.wgsl"}',
      reason: '验证优化后的着色器语法正确性',
      confidence: 0.87,
    },
    {
      type: 'tool_result',
      atStep: 16,
      tool: 'validator',
      output: '语法检查通过，无错误',
      ok: true,
      durationMs: 45,
    },
  ];

  const segments = modelSegments(demoEvents, demoSteps.length);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line bg-surface-1 px-6 py-4">
        <h1 className="text-[18px] font-semibold text-ink">Agent 协作可视化</h1>
        <p className="mt-1 text-[12px] text-ink-2">
          多 Agent 协作流程、工具调用、决策点 3D 可视化
        </p>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧控制面板 */}
        <aside className="w-80 overflow-y-auto border-r border-line bg-surface p-5 space-y-5">
          <section className="space-y-3">
            <h2 className="text-[13px] font-medium text-ink">演示说明</h2>
            <div className="rounded-md border border-obs-line bg-obs-2 p-3 text-[12px] text-obs-ink2">
              <p className="mb-2">
                这是一个 Agent 协作流程的演示场景，展示了：
              </p>
              <ul className="list-inside list-disc space-y-1 text-[11px]">
                <li>工具调用（搜索、代码分析、验证器）</li>
                <li>决策点（评估、选择策略）</li>
                <li>模型交接（规划器 → 编码器）</li>
                <li>事件锚定在 token 时间线上</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-[13px] font-medium text-ink">时间轴控制</h2>

            <div className="text-[12px] text-ink-2">
              <span className="text-ink-3">当前步骤:</span>{' '}
              <span className="font-mono text-ink">{currentStep}</span> / {demoSteps.length - 1}
            </div>

            <input
              type="range"
              min={0}
              max={demoSteps.length - 1}
              value={currentStep}
              onChange={(e) => setCurrentStep(Number(e.target.value))}
              className="w-full accent-accent"
            />

            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-md border border-line bg-obs-2 px-3 py-2 text-[12px] text-ink-2 transition-colors hover:border-accent hover:text-ink disabled:opacity-50"
                onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                disabled={currentStep === 0}
              >
                ← 上一步
              </button>
              <button
                type="button"
                className="flex-1 rounded-md border border-line bg-obs-2 px-3 py-2 text-[12px] text-ink-2 transition-colors hover:border-accent hover:text-ink disabled:opacity-50"
                onClick={() => setCurrentStep((s) => Math.min(demoSteps.length - 1, s + 1))}
                disabled={currentStep === demoSteps.length - 1}
              >
                下一步 →
              </button>
            </div>

            <button
              type="button"
              className="w-full rounded-md bg-measure-500 px-4 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
              onClick={() => setCurrentStep(0)}
            >
              重置到起点
            </button>
          </section>

          <section className="space-y-3">
            <h2 className="text-[13px] font-medium text-ink">事件统计</h2>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between text-ink-2">
                <span>工具调用</span>
                <span className="font-medium text-ink">
                  {demoEvents.filter((e) => e.type === 'tool_call').length}
                </span>
              </div>
              <div className="flex justify-between text-ink-2">
                <span>工具结果</span>
                <span className="font-medium text-ink">
                  {demoEvents.filter((e) => e.type === 'tool_result').length}
                </span>
              </div>
              <div className="flex justify-between text-ink-2">
                <span>决策点</span>
                <span className="font-medium text-ink">
                  {demoEvents.filter((e) => e.type === 'decision_point').length}
                </span>
              </div>
              <div className="flex justify-between text-ink-2">
                <span>模型交接</span>
                <span className="font-medium text-ink">
                  {demoEvents.filter((e) => e.type === 'model_handoff').length}
                </span>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-[13px] font-medium text-ink">未来功能</h2>
            <div className="rounded-md border border-obs-line bg-obs-2 p-3 text-[11px] text-obs-ink2">
              <ul className="list-inside list-disc space-y-1">
                <li>导入真实的 .aitrace 文件（agent 字段）</li>
                <li>AVP 流程演示（Advisor-Validator-Planner）</li>
                <li>多 Agent 并行执行可视化</li>
                <li>性能热图（耗时分布）</li>
                <li>导出为视频或 GIF</li>
              </ul>
            </div>
          </section>
        </aside>

        {/* 右侧 3D 可视化区域 */}
        <main className="flex-1 bg-obs-1">
          <AgentFlowVisualization
            events={demoEvents}
            steps={demoSteps}
            segments={segments}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
          />
        </main>
      </div>
    </div>
  );
}
