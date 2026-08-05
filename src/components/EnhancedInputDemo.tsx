import { useState } from "react";
import EnhancedInput from "./EnhancedInput";
import {
  IconThinkingTag,
  IconReflectionTag,
  IconPlanningTag,
  IconSearchTag,
  IconCodeTag,
  IconSummaryTag,
  IconBrand,
  IconStatusOnline,
  IconSpeed,
  IconTokens,
} from "./SystemIcons";

/** Teal Mono 配色系统 - 基于顶级 AI 产品研究 */
export default function EnhancedInputDemo() {
  const [value1, setValue1] = useState("");
  const [value2, setValue2] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e8e8e8] overflow-y-auto">
      {/* 顶部导航 */}
      <nav className="border-b border-[#2a2a2a] bg-[#0f0f0f]">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-[#f5f5f5] mb-8">
                品牌图标 - 4个配色方案
              </h1>
            </div>
          </div>

          {/* 四个品牌图标变体 */}
          <div className="grid grid-cols-4 gap-6 mt-6 pb-4">
            {/* A. 明亮翠绿 */}
            <div className="flex flex-col items-center gap-3 rounded-lg bg-[#121212] p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#00e676]/10">
                <IconBrand className="h-12 w-12" variant="green" />
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-[#f5f5f5]">A. 明亮翠绿</div>
                <div className="text-xs text-[#808080] mt-1">OpenAI 风格</div>
                <div className="text-xs text-[#666666] mt-1">充满活力、前沿科技</div>
              </div>
            </div>

            {/* B. 青绿渐变 */}
            <div className="flex flex-col items-center gap-3 rounded-lg bg-[#121212] p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#00e5ff]/10">
                <IconBrand className="h-12 w-12" variant="teal" />
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-[#f5f5f5]">B. 青绿渐变</div>
                <div className="text-xs text-[#808080] mt-1">科学能量流</div>
                <div className="text-xs text-[#666666] mt-1">观测扫描、动态感</div>
              </div>
            </div>

            {/* C. 青蓝渐变 */}
            <div className="flex flex-col items-center gap-3 rounded-lg bg-[#121212] p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#10A0FF]/10">
                <IconBrand className="h-12 w-12" variant="purple" />
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-[#f5f5f5]">C. 青蓝渐变</div>
                <div className="text-xs text-[#808080] mt-1">科技感</div>
                <div className="text-xs text-[#666666] mt-1">专业工具</div>
              </div>
            </div>

            {/* D. 多色光谱 */}
            <div className="flex flex-col items-center gap-3 rounded-lg bg-[#121212] p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-[#00e676]/10 via-[#00e5ff]/10 to-[#10A0FF]/10">
                <IconBrand className="h-12 w-12" variant="spectrum" />
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-[#f5f5f5]">D. 多色光谱</div>
                <div className="text-xs text-[#808080] mt-1">测量仪器</div>
                <div className="text-xs text-[#666666] mt-1">科学、精密</div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* 原有的配色系统标题 */}
        <section className="mb-16 rounded-xl border border-[#2a2a2a] bg-[#121212] p-8">
          <h2 className="mb-4 text-xl font-semibold text-[#f5f5f5]">🔬 顶级 AI 产品研究发现</h2>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div className="rounded-lg bg-[#1a1a1a] p-4">
              <p className="mb-2 font-medium text-[#10A0FF]">温暖中性背景</p>
              <p className="text-[#b0b0b0]">Claude #faf9f5、Perplexity #fdfbfa、Cursor #f6f6f2 - 传达人性化而非冷冰冰机器</p>
            </div>
            <div className="rounded-lg bg-[#1a1a1a] p-4">
              <p className="mb-2 font-medium text-[#10A0FF]">单一强调色</p>
              <p className="text-[#b0b0b0]">Perplexity 仅用青绿 #016a71、Claude 仅用珊瑚橙 - 减少认知负荷</p>
            </div>
            <div className="rounded-lg bg-[#1a1a1a] p-4">
              <p className="mb-2 font-medium text-[#10A0FF]">深灰非纯黑</p>
              <p className="text-[#b0b0b0]">行业标准 #121212 - 纯黑 #000000 导致眼疲劳和文字振动</p>
            </div>
          </div>
        </section>

        {/* 配色系统 */}
        <section className="mb-16">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-1 w-12 rounded-full bg-[#10A0FF]" />
            <h2 className="text-2xl font-semibold text-[#f5f5f5]">完整配色系统</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* 背景层级 */}
            <div className="rounded-xl border border-[#2a2a2a] bg-[#121212] p-6">
              <h3 className="mb-4 text-sm font-medium text-[#b0b0b0]">背景层级（4层深度）</h3>
              <div className="space-y-3">
                {[
                  { color: "#0a0a0a", name: "Deep", desc: "最深背景" },
                  { color: "#121212", name: "Base", desc: "基础（行业标准）" },
                  { color: "#1a1a1a", name: "Elevated", desc: "抬升层" },
                  { color: "#242424", name: "Surface", desc: "卡片表面" },
                ].map((item) => (
                  <div key={item.color} className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 shrink-0 rounded-lg border border-[#2a2a2a]"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#e8e8e8]">{item.name}</div>
                      <div className="text-xs text-[#666666]">{item.desc}</div>
                    </div>
                    <code className="text-xs text-[#808080]">{item.color}</code>
                  </div>
                ))}
              </div>
            </div>

            {/* 交互色 */}
            <div className="rounded-xl border border-[#2a2a2a] bg-[#121212] p-6">
              <h3 className="mb-4 text-sm font-medium text-[#b0b0b0]">交互色（心理学映射）</h3>
              <div className="space-y-3">
                {[
                  { color: "#10A0FF", name: "Primary", desc: "前进、执行", usage: "主按钮、链接" },
                  { color: "#00e676", name: "Success", desc: "完成、确认", usage: "成功提示" },
                  { color: "#ffa726", name: "Warning", desc: "审查、注意", usage: "警告状态" },
                  { color: "#ef5350", name: "Error", desc: "警觉、阻止", usage: "错误、删除" },
                ].map((item) => (
                  <div key={item.color} className="space-y-1">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 shrink-0 rounded-lg shadow-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[#e8e8e8]">{item.name}</div>
                        <div className="text-xs text-[#808080]">{item.usage}</div>
                      </div>
                    </div>
                    <p className="ml-[52px] text-xs text-[#666666]">心理：{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 文本层级 */}
            <div className="rounded-xl border border-[#2a2a2a] bg-[#121212] p-6">
              <h3 className="mb-4 text-sm font-medium text-[#b0b0b0]">文本层级（WCAG AA）</h3>
              <div className="space-y-3">
                {[
                  { color: "#f5f5f5", name: "Primary", opacity: "98%", contrast: "13.8:1" },
                  { color: "#e8e8e8", name: "Secondary", opacity: "91%", contrast: "11.4:1" },
                  { color: "#b0b0b0", name: "Tertiary", opacity: "69%", contrast: "7.2:1" },
                  { color: "#808080", name: "Disabled", opacity: "50%", contrast: "4.6:1" },
                ].map((item) => (
                  <div key={item.color} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#2a2a2a]">
                      <span className="font-mono text-base" style={{ color: item.color }}>Aa</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#e8e8e8]">{item.name}</span>
                        <span className="text-xs text-[#666666]">{item.opacity}</span>
                      </div>
                      <div className="text-xs text-[#808080]">对比度 {item.contrast}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 组件示例 */}
        <section className="mb-16">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-1 w-12 rounded-full bg-[#10A0FF]" />
            <h2 className="text-2xl font-semibold text-[#f5f5f5]">组件应用</h2>
          </div>

          <div className="grid gap-6">
            {/* 输入框 */}
            <div className="rounded-xl border border-[#2a2a2a] bg-[#121212] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-[#b0b0b0]">输入框 - 基础状态</h3>
                <div className="flex items-center gap-2 text-xs text-[#808080]">
                  <span className="rounded bg-[#1a1a1a] px-2 py-1">Focus: #10A0FF</span>
                  <span className="rounded bg-[#1a1a1a] px-2 py-1">Ring: 20% 透明</span>
                </div>
              </div>
              <EnhancedInput
                value={value1}
                onChange={setValue1}
                onSend={() => alert("发送: " + value1)}
                placeholder="点击聚焦查看青绿边框效果..."
                autoFocus
              />
            </div>

            {/* 生成状态 */}
            <div className="rounded-xl border border-[#2a2a2a] bg-[#121212] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-[#b0b0b0]">输入框 - 生成状态</h3>
                <div className="flex items-center gap-2 text-xs text-[#808080]">
                  <span className="rounded bg-[#1a1a1a] px-2 py-1">脉动指示器</span>
                  <span className="rounded bg-[#1a1a1a] px-2 py-1">实时反馈</span>
                </div>
              </div>
              <EnhancedInput
                value={value2}
                onChange={setValue2}
                onSend={handleGenerate}
                isGenerating={isGenerating}
                tokensPerSecond={8.6}
                placeholder="测试生成状态..."
              />
            </div>

            {/* 按钮组 */}
            <div className="rounded-xl border border-[#2a2a2a] bg-[#121212] p-6">
              <h3 className="mb-4 text-sm font-medium text-[#b0b0b0]">按钮状态</h3>
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-xs text-[#808080]">实心按钮 - 主要操作</p>
                  <div className="flex flex-wrap gap-3">
                    <button className="rounded-lg bg-[#10A0FF] px-5 py-2.5 text-sm font-medium text-[#ffffff] transition-all hover:bg-[#0d8ae6] active:scale-95">
                      Primary Action
                    </button>
                    <button className="rounded-lg bg-[#00e676] px-5 py-2.5 text-sm font-medium text-[#0a0a0a] transition-all hover:bg-[#00d97f] active:scale-95">
                      Success
                    </button>
                    <button className="rounded-lg bg-[#ffa726] px-5 py-2.5 text-sm font-medium text-[#0a0a0a] transition-all hover:bg-[#fb8c00] active:scale-95">
                      Warning
                    </button>
                    <button className="rounded-lg bg-[#ef5350] px-5 py-2.5 text-sm font-medium text-[#ffffff] transition-all hover:bg-[#e53935] active:scale-95">
                      Danger
                    </button>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs text-[#808080]">描边按钮 - 次要操作</p>
                  <div className="flex flex-wrap gap-3">
                    <button className="rounded-lg border border-[#10A0FF] px-5 py-2.5 text-sm font-medium text-[#10A0FF] transition-colors hover:bg-[#10A0FF]/10">
                      Outlined Primary
                    </button>
                    <button className="rounded-lg border border-[#3a3a3a] bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-[#e8e8e8] transition-colors hover:border-[#4a4a4a] hover:bg-[#242424]">
                      Secondary
                    </button>
                    <button className="rounded-lg px-5 py-2.5 text-sm font-medium text-[#b0b0b0] transition-colors hover:bg-[#1a1a1a] hover:text-[#f5f5f5]">
                      Ghost
                    </button>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs text-[#808080]">禁用状态 - 50% 透明</p>
                  <div className="flex flex-wrap gap-3">
                    <button disabled className="rounded-lg bg-[#10A0FF] px-5 py-2.5 text-sm font-medium text-[#0a0a0a] opacity-50 cursor-not-allowed">
                      Disabled
                    </button>
                    <button disabled className="rounded-lg border border-[#3a3a3a] bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-[#808080] opacity-50 cursor-not-allowed">
                      Disabled
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 标签系统 */}
            <div className="rounded-xl border border-[#2a2a2a] bg-[#121212] p-6">
              <h3 className="mb-4 text-sm font-medium text-[#b0b0b0]">标签系统 - 心理学颜色映射</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { type: "thinking", color: "#10A0FF", Icon: IconThinkingTag, label: "Thinking", desc: "系统工作中" },
                  { type: "reflection", color: "#ffa726", Icon: IconReflectionTag, label: "Reflection", desc: "审查检查" },
                  { type: "planning", color: "#00e676", Icon: IconPlanningTag, label: "Planning", desc: "规划步骤" },
                  { type: "search", color: "#10A0FF", Icon: IconSearchTag, label: "Search", desc: "信息检索" },
                  { type: "code", color: "#ffa726", Icon: IconCodeTag, label: "Code", desc: "代码执行" },
                  { type: "summary", color: "#00e676", Icon: IconSummaryTag, label: "Summary", desc: "结果总结" },
                ].map((tag) => (
                  <div
                    key={tag.type}
                    className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4 transition-all hover:border-[#3a3a3a]"
                    style={{
                      borderLeftWidth: "3px",
                      borderLeftColor: tag.color,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${tag.color}14`, color: tag.color }}
                      >
                        <tag.Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#f5f5f5]">{tag.label}</span>
                          <div
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                        </div>
                        <p className="text-xs text-[#b0b0b0]">{tag.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 卡片组件 */}
            <div className="rounded-xl border border-[#2a2a2a] bg-[#121212] p-6">
              <h3 className="mb-4 text-sm font-medium text-[#b0b0b0]">卡片 - 悬停交互</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { title: "系统状态", value: "运行良好", status: 'online' as const, Icon: IconStatusOnline },
                  { title: "生成速度", value: "8.6 tok/s", tokensPerSecond: 8.6, Icon: IconSpeed },
                  { title: "Token 用量", value: "247 / 2000", current: 247, total: 2000, Icon: IconTokens },
                ].map((card, idx) => (
                  <div
                    key={idx}
                    className="group rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-6 transition-all hover:border-[#3a3a3a] hover:bg-[#242424]"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-[#808080]">
                        {card.title}
                      </p>
                      {'status' in card && (
                        <card.Icon className="h-5 w-5" status={card.status} />
                      )}
                      {'tokensPerSecond' in card && (
                        <card.Icon className="h-5 w-5" tokensPerSecond={card.tokensPerSecond} />
                      )}
                      {'current' in card && (
                        <card.Icon className="h-5 w-5" current={card.current} total={card.total} />
                      )}
                    </div>
                    <p className="text-3xl font-semibold tabular-nums text-[#e8e8e8]">
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 设计原则 */}
        <footer className="rounded-xl border border-[#2a2a2a] bg-[#121212] p-8">
          <h3 className="mb-4 text-lg font-semibold text-[#f5f5f5]">🎯 设计原则总结</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <ul className="space-y-2 text-sm text-[#b0b0b0]">
              <li className="flex items-start gap-2">
                <span className="text-[#10A0FF]">✓</span>
                <span>4 层背景深度，#121212 为行业标准基础</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#10A0FF]">✓</span>
                <span>青绿 #10A0FF 单一主色，减少认知负荷</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#10A0FF]">✓</span>
                <span>文本 4 级对比度全部超过 WCAG AA 标准</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#10A0FF]">✓</span>
                <span>完全移除蓝紫色，符合品牌需求</span>
              </li>
            </ul>
            <ul className="space-y-2 text-sm text-[#b0b0b0]">
              <li className="flex items-start gap-2">
                <span className="text-[#10A0FF]">✓</span>
                <span>受 Perplexity (#016a71) 和 Claude (#cc785c) 启发</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#10A0FF]">✓</span>
                <span>功能色映射心理学原理（橙=审查，红=警觉）</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#10A0FF]">✓</span>
                <span>悬停 +10% 亮度，禁用 50% 透明</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#10A0FF]">✓</span>
                <span>所有交互元素带 0.2s 过渡动画</span>
              </li>
            </ul>
          </div>
        </footer>
      </div>
    </div>
  );
}
