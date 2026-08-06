# 开发任务看板

> 最后更新：2026-08-06
> 状态说明：✅ 已完成 | 🚧 进行中 | 📋 待开始 | 🔍 需调研
> 
> **已完成任务存档**：Task #1-17 已归档至 [`docs/COMPLETED_TASKS.md`](./docs/COMPLETED_TASKS.md)
> **战略定位**：科研机构 AI 审计工具 - 让 AI 输出带置信度的第一个工具
> **演进路径**：科研起步 → 开放标准 → 云端桥接 → 工作流集成

---

## 18 个月技术路线图

### 阶段 1：深耕科研场景（3-6 个月，Q1-Q2 2027）

**核心价值**：成为"第一个让 AI 输出带置信度的工具"

**成功标志**：
- 5-10 个科研用户在论文里引用本工具
- 用户主动在 GitHub Discussion 提问 API 支持

**砍掉的功能**（暂不投入开发资源）：
- ❌ 3D 可视化、动画、炫酷效果
- ❌ Agent/RAG/Embedding 子页面的新功能迭代
- ❌ 排行榜社区运营

---

### 阶段 2：API 桥接 + 开放标准（6-9 个月，Q2-Q3 2027）

**核心价值**：从"只能跑浏览器小模型"扩展到"能审计所有主流 API"

**成功标志**：
- 至少 1 个第三方工具采用 `.aitrace` 格式
- 用户开始用本工具审计 GPT-4 / Claude 输出
- 有人在 Twitter 发："终于有工具能看 GPT 哪句话在瞎说了"

---

### 阶段 3：工作流集成（9-18 个月，Q3 2027 - Q2 2028）

**核心价值**：从"独立工具"变成"研究者工作流的一环"

**成功标志**：
- 浏览器插件在 Chrome Web Store 有 1000+ 用户
- 被一篇论文在 Methods 章节引用
- 有大厂 PM 私下联系

---

## 当前开发计划（阶段 1 详细任务）

### Sprint 1：核心审计功能（Week 1-2）

#### Task 1.1：高熵 Token 自动标红 + 一句话摘要
**优先级**：🔥 极高 | **预计工期**：2 天 | **负责页面**：ObservePage.tsx

**功能描述**：
- 在 `TokenText` 组件中，自动识别熵值 > 3.0 的 token，用琥珀色底色标记
- 页面顶部显示一句话摘要："⚠ 本次回答 N 处模型不确定，建议核查"

**UI 规范**：
```typescript
// 高熵 token 样式（TokenText.tsx）
className={`
  ${step.entropy > 3.0 
    ? 'bg-caution-500/20 border-b-2 border-caution-500' 
    : ''
  }
  ${step.entropy > 4.0 
    ? 'bg-alert-500/20 border-b-2 border-alert-500' 
    : ''
  }
`}

// 摘要卡片（ObservePage.tsx 顶部）
<div className="rounded-xl border border-caution-500/30 bg-caution-500/10 px-4 py-3">
  <p className="text-sm text-obs-ink">
    <IconAlert className="inline h-4 w-4 text-caution-500 mr-1" />
    本次回答 {highEntropyCount} 处模型不确定（熵值 &gt; 3.0），建议人工核查
  </p>
</div>
```

**状态定义**：
- 默认：摘要卡片固定显示
- 加载中：显示"正在分析..."
- 空态：无高熵时显示"✓ 本次回答置信度正常"（绿色）

**数据来源**：`GenerationTrace.steps[].entropy` 真实值

**技术实现**：
1. TokenText 添加 `highlightUncertain` prop
2. ObservePage 计算 `highEntropyCount`
3. useMemo 缓存避免重复计算

---

#### Task 1.2：句子级置信度视图
**优先级**：🔥 极高 | **预计工期**：3 天 | **负责页面**：新增 SentenceConfidenceView.tsx

**功能描述**：
- 按句子（`.` `!` `?` `。` 等）拆分 token 流
- 每句显示平均熵值（0-5）+ 颜色条
- 点击展开查看内部 token

**UI 规范**：
```typescript
// 句子卡片
<div className="space-y-2">
  {sentences.map((sent, i) => (
    <div 
      key={i}
      className="rounded-md border border-obs-line bg-obs-2 p-3 hover:bg-obs-3 cursor-pointer"
      onClick={() => toggleExpand(i)}
    >
      <div className="flex items-center gap-3">
        <span className="flex-1 text-sm text-obs-ink">{sent.text}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-obs-ink2 tabular-nums">
            熵 {sent.avgEntropy.toFixed(1)}
          </span>
          <div className="h-2 w-24 rounded-full bg-obs overflow-hidden">
            <div 
              className={getEntropyColor(sent.avgEntropy)}
              style={{ width: `${(sent.avgEntropy / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>
      
      {expanded[i] && (
        <div className="mt-3 pt-3 border-t border-obs-line">
          <div className="flex flex-wrap gap-1">
            {sent.tokens.map((tok, j) => (
              <span 
                key={j}
                className={tok.entropy > 3.0 ? 'bg-caution-500/20' : ''}
              >
                {tok.text}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  ))}
</div>
```

**颜色规则**：
- `< 2.0`: 绿色（高置信）
- `2.0-3.5`: 蓝色（正常）
- `3.5-4.5`: 琥珀（谨慎）
- `> 4.5`: 红色（警示）

**数据来源**：从 `TokenStep[]` 真实拆分

---

#### Task 1.3：置信度报告导出（JSON/CSV）
**优先级**：高 | **预计工期**：1 天 | **负责页面**：SentenceConfidenceView.tsx

**功能描述**：
- 导出按钮：JSON（完整数据）+ CSV（Excel 友好）
- JSON 格式：sentences + highEntropyTokens + summary
- CSV 格式：`句子,平均熵,Token数,高熵Token数,文本`

**导出格式**：
```typescript
interface ConfidenceReport {
  generatedAt: string;
  modelId: string;
  totalTokens: number;
  highEntropyCount: number;
  sentences: {
    index: number;
    text: string;
    avgEntropy: number;
    tokenCount: number;
    highEntropyTokens: number;
  }[];
  summary: {
    avgEntropy: number;
    maxEntropy: number;
    p50Entropy: number;
    p90Entropy: number;
  };
}
```

---

### Sprint 2：同一问题多次对比（Week 3）

#### Task 1.4：同一问题多次对比（完善 CompareView）
**优先级**：中 | **预计工期**：2 天 | **负责页面**：CompareView.tsx

**功能描述**：
- 从实验档案选 2 条相同 prompt 的记录
- 并排对比：文本差异高亮 + 熵值曲线
- 标注首次分岔点

**UI 规范**：
```typescript
<div className="grid grid-cols-2 gap-6 h-full">
  {/* 左侧：实验 A */}
  <div className="rounded-xl border border-obs-line bg-obs-2 p-4">
    <h3 className="text-sm font-medium text-obs-ink mb-3">实验 A</h3>
    {/* Token 流，差异处琥珀色底 */}
  </div>
  
  {/* 右侧：实验 B */}
  <div className="rounded-xl border border-obs-line bg-obs-2 p-4">
    <h3 className="text-sm font-medium text-obs-ink mb-3">实验 B</h3>
  </div>
</div>

{/* 底部：熵值对比曲线 */}
<div className="mt-6 rounded-xl border border-obs-line bg-obs-2 p-4">
  <h3 className="text-sm font-medium text-obs-ink mb-3">熵值对比</h3>
  <canvas ref={chartRef} width={800} height={200} />
</div>
```

**数据来源**：复用 `experiments.ts` 的 `firstDivergence()`

---

### Sprint 3：开放标准推进（Week 4）

#### Task 2.1：.aitrace 开放标准规范文档
**优先级**：🔥 极高 | **预计工期**：2 天 | **输出物**：docs/AITRACE_SPEC.md

**文档结构**：
1. 概述（什么是 .aitrace）
2. JSON Schema（完整字段定义）
3. TokenStep 结构
4. 扩展规范（extensions 命名空间）
5. 最小示例 + 真实示例
6. 如何接入（TypeScript/Python）

**输出物**：
- `docs/AITRACE_SPEC.md`（中文版）
- `docs/AITRACE_SPEC_EN.md`（英文版）

---

### Sprint 4：API 桥接架构设计（Week 5-6）

#### Task 2.2：Cloudflare Workers API 桥接架构设计
**优先级**：高 | **预计工期**：3 天 | **输出物**：docs/API_BRIDGE_DESIGN.md

**设计内容**：
- 后端架构：CF Workers + KV（缓存）+ D1（配额）
- API 端点：`/api/proxy`（代理 OpenAI/Anthropic）、`/api/logprobs`（规范化）
- 安全设计：零知识、用户 API key 加密
- 成本估算：CF 免费额度支撑用户量

**架构草图**：
```
用户浏览器 (API key 加密)
  ↓ HTTPS
CF Worker（边缘计算）
  ↓ 解密 API key（内存中）
  ↓ 代理请求
OpenAI/Anthropic API
  ↓ 返回 logprobs
CF Worker（规范化为 .aitrace）
  ↓ 缓存到 KV（7天 TTL）
用户浏览器
```

**技术栈**：
- 存储：
  - API key：用户浏览器 AES 加密，传到后端只用于单次请求
  - Trace 缓存：CF KV（便宜，冷数据）或 Durable Objects（强一致性）
  - 用户配额：CF D1（SQLite，轻量 SQL）
- 安全：
  - 不在后端存明文 API key
  - 每次请求用 HMAC 签名，防重放攻击
  - 限流：每 IP 每分钟最多 10 次请求（CF 自带）
- 成本估算：
  - CF Workers 免费额度：10万次请求/天
  - KV 免费额度：10万次读、1000 次写/天
  - 到 100 个日活用户之前，成本为 0

**后端功能清单**：
1. API 代理 — 用户输入自己的 API key（前端加密存 localStorage），后端代理请求、返回 logprobs
2. logprobs 规范化 — OpenAI、Anthropic、Gemini 返回格式不同，后端统一转成 `.aitrace` 格式
3. 零知识设计 — 后端不存 API key、不存对话内容，只缓存 logprobs 用于回放
4. 费用限额 — 用户设置"本次最多花 $X"，超出自动停止

---

### Sprint 5：Bug 修复（Week 7）

#### Task 3.1：思考块样式延迟 Bug 修复
**优先级**：中 | **预计工期**：1 天 | **修复文件**：src/lib/trace.ts

**问题描述**：思考内容流式生成中显示为普通文本，只有 `</think>` 出现后才变卡片

**修复方案**：
```typescript
// splitPhases() 修改
if (open < 0 && /^<think(ing)?>$/.test(t)) {
  open = i;
  tags.push({
    type: "thinking",
    start: open,
    end: texts.length,  // 暂定末尾
    closed: false,       // 标记未闭合
  });
}

// 检测到 </think> 更新 TagSegment
if (/^<\/think(ing)?>$/.test(t)) {
  const unclosedTag = tags.find(tag => !tag.closed);
  if (unclosedTag) {
    unclosedTag.end = close + 1;
    unclosedTag.closed = true;
  }
}
```

---

### Sprint 6：首屏文案优化（Week 8）

#### Task 4.1：LandingHero 文案改版
**优先级**：高 | **预计工期**：1 天 | **负责文件**：src/components/LandingHero.tsx

**文案改动**：
```typescript
// 主标题改为：
"AI 说的哪句话是在瞎猜？"
"每个词都有置信度，这是第一个让你看见的工具"

// 副标题加一句：
"支持浏览器本地模型（Qwen / Llama）和 API 模型（即将支持 GPT-4 / Claude）"
```

**设计原则**：
- 用疑问句勾住用户："哪句话在瞎猜" 比 "可视化置信度" 更直接
- 说清楚现在能干什么，也给未来留钩子
- 避免技术黑话（logprobs、熵值），用普通人能懂的词

**UI 规范**：
```typescript
<div className="mx-auto max-w-4xl text-center">
  <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.15] text-obs-ink">
    AI 说的哪句话是在瞎猜？
  </h1>
  <p className="mt-4 text-[clamp(1.1rem,2.5vw,1.4rem)] leading-[1.5] text-obs-ink">
    每个词都有置信度，这是第一个让你看见的工具
  </p>
  <p className="mt-3 text-[13px] leading-[1.7] text-obs-ink2">
    支持浏览器本地模型（Qwen / Llama）和 API 模型（即将支持 GPT-4 / Claude）
  </p>
</div>
```

---

## 阶段 2 任务（Q2-Q3 2027，待细化）

### API 桥接实现

#### Task 5.1：Cloudflare Workers 后端开发
**范围**：
- API 代理端点（`/api/proxy`）
- logprobs 规范化端点（`/api/logprobs`）
- KV 缓存逻辑
- D1 配额管理

#### Task 5.2：前端 API 集成
**范围**：
- API key 加密存储（localStorage + AES）
- 请求签名（HMAC）
- 费用限额 UI
- 错误处理与重试

#### Task 5.3：多 API 适配层
**范围**：
- OpenAI API logprobs 转换
- Anthropic API logprobs 转换
- Google Gemini API logprobs 转换
- 统一转为 `.aitrace` 格式

### 开放标准推广

#### Task 6.1：TypeScript / Python 读写库
**输出物**：
- `aitrace-js` npm 包
- `aitrace-py` PyPI 包
- 使用文档

#### Task 6.2：第三方工具对接
**目标**：
- 联系 LangChain 贡献者，提 PR 支持 `.aitrace` 导出
- 联系 LlamaIndex 贡献者，提 PR 支持 `.aitrace` 导出
- 在 HN / Reddit r/LocalLLaMA 发布 "Introducing .aitrace" 帖子

---

## 阶段 3 任务（Q3 2027 - Q2 2028，待细化）

### 浏览器插件

#### Task 7.1：Chrome 扩展开发
**功能**：
- 在任何网页上用 ChatGPT / Claude 时，自动抓 logprobs
- 标红低置信度内容
- 一键保存为 `.aitrace`

#### Task 7.2：Firefox 扩展适配

### 工作流集成

#### Task 8.1：Notion 插件
**功能**：
- AI 生成的内容直接带置信度高亮同步到笔记

#### Task 8.2：Jupyter Notebook 插件
**功能**：
- 科研人员在 notebook 里调 API 时，自动记录 trace

#### Task 8.3：Zotero / Mendeley 集成
**功能**：
- 文献管理工具里，AI 生成的摘要带可信度标注

---

## 现有功能评审（需决策是否完善/砍掉）

| 功能 | 实现状态 | 评审意见 |
|------|---------|----------|
| **EmbeddingPage** | ✅ 完整 | 🔒 冻结（已可用，阶段 1 不改动） |
| **RAGPage** | ✅ 完整 | 🔒 冻结（已可用，阶段 1 不改动） |
| **PerformancePage** | ✅ 完整 | 🔒 冻结（已可用，阶段 1 不改动） |
| **AgentPage** | ✅ 完整 | 🔒 冻结（演示性质，阶段 1 不改动） |
| **JourneyPage** | ✅ 完整 | ✅ 保留（教育价值高，帮助理解 token） |
| **FindingsPage** | ✅ 完整 | ✅ 保留（自动发现分析，审计相关） |
| **LeaderboardPage** | ✅ 完整 | 🔒 冻结（排行榜暂不运营社区） |

**决策依据**：
- 阶段 1 焦点：科研机构 AI 审计工具
- 这些功能都已完整实现，无需重写
- 冻结 ≠ 砍掉，而是"现在不碰，等核心审计功能站稳再优化"
- 研究者要的是数字，不是 3D 动画和炫酷效果

---

## 设计审查清单（每个 Task 开工前必查）

- [ ] 颜色只用 `measure/caution/alert/brand`，禁用 indigo/violet
- [ ] 间距用 `gap-4` `px-6` 等 token，不写 `margin-left: 23px`
- [ ] 圆角用 `rounded-xl/full/md`，不写 `border-radius: 17px`
- [ ] 字号用 `text-xl/sm/xs`，不写固定 `font-size: 14px`
- [ ] 布局优先 Grid，不无脑 Flexbox
- [ ] 交互组件定义全部 7 种状态（默认/hover/展开/加载中/失败/空态/禁用）
- [ ] 数据来源明确标注，不伪造数据
- [ ] 读 `GLOSSARY.md` 确认术语用词一致

---

## 开发时间线

```
Week 1-2 (Sprint 1): 核心审计功能
  Mon-Tue:  Task 1.1 高熵标红 + 摘要
  Wed-Fri:  Task 1.2 句子级置信度视图
  Mon:      Task 1.3 置信度报告导出

Week 3 (Sprint 2): 同一问题多次对比
  Tue-Wed:  Task 1.4 CompareView 完善
  Thu-Fri:  集成测试 + Bug 修复

Week 4 (Sprint 3): 开放标准推进
  Mon-Tue:  Task 2.1 .aitrace 规范文档
  Wed:      Task 6.1 TypeScript/Python 读写库（启动）

Week 5-6 (Sprint 4): API 桥接架构设计
  Mon-Wed:  Task 2.2 CF Workers 架构设计文档
  Thu-Fri:  技术验证 POC（API 代理 + logprobs 规范化）

Week 7 (Sprint 5): Bug 修复
  Mon:      Task 3.1 思考块样式延迟修复
  Tue-Fri:  集成测试 + 用户文档更新

Week 8 (Sprint 6): 首屏优化
  Mon:      Task 4.1 LandingHero 文案改版
  Tue-Fri:  用户测试准备 + GitHub Discussion 引导

--- 阶段 1 里程碑：科研场景验证 (3-6 个月) ---

Q2 2027: API 桥接实现（Task 5.1-5.3）
Q2-Q3 2027: 开放标准推广（Task 6.2）
Q3 2027 - Q2 2028: 工作流集成（Task 7.1-8.3）
```

---

## 不走的路（战略边界）

| 方向 | 决策 | 原因 |
|------|------|------|
| **帮你写论文** | ❌ 不做 | 坚持只做观测，不做生成 |
| **模型训练** | ❌ 不做 | 只观测别人的模型，不自己造模型 |
| **社区内容运营** | ❌ 不做 | 不做 Discord 社群运营，保持工具属性 |
| **3D 可视化** | ❌ 不做 | 研究者要数字，不是表演 |
| **Agent/RAG 新功能** | ⏸️ 冻结 | 等主流程站稳再说 |

---

**快速索引**：
- 已完成任务存档：[docs/COMPLETED_TASKS.md](./docs/COMPLETED_TASKS.md)
- 已完成任务快速索引：[docs/COMPLETED_TASKS_INDEX.md](./docs/COMPLETED_TASKS_INDEX.md)
- 设计规范：[docs/合规速查表.md](./docs/合规速查表.md)
- 快速上手：[docs/00-START-HERE.md](./docs/00-START-HERE.md)

---

## 第一个月详细任务清单（Week 1-4）

### Week 1：核心审计功能启动 + 技术债清理
**目标**：让用户在 5 秒内看懂"哪里不可信"

| 任务 | 工期 | 优先级 | 输出物 |
|------|------|--------|--------|
| Task 1.1：高熵 token 自动标红 + 摘要 | 2 天 | 🔥 P0 | ObservePage 顶部摘要卡片 + TokenText 高亮 |
| Task 3.1：思考块样式延迟 Bug 修复 | 1 天 | 🔥 P0 | splitPhases() 逻辑修复 |
| Task 4.1：首屏文案改版 | 1 天 | 🔥 P0 | LandingHero 新文案 |

**验收标准**：
- ✅ 用户打开 ObservePage 立即看到"⚠ 本次回答 N 处模型不确定"
- ✅ 熵值 > 3.0 的 token 自动琥珀色底色标记
- ✅ 思考块流式生成中立即显示卡片样式
- ✅ 首屏主标题改为"AI 说的哪句话是在瞎猜？"

**不做**：
- ❌ 句子级置信度（Week 2 再做）
- ❌ 导出功能（Week 2 再做）
- ❌ 后端相关（6 个月后）

---

### Week 2：句子级置信度视图 + 报告导出
**目标**：研究者要段落级结论，不是 token 级细节

| 任务 | 工期 | 优先级 | 输出物 |
|------|------|--------|--------|
| Task 1.2：句子级置信度视图 | 3 天 | 🔥 P0 | SentenceConfidenceView.tsx 组件 |
| Task 1.3：置信度报告导出 | 1 天 | 高 | JSON/CSV 导出功能 |

**验收标准**：
- ✅ 按句子拆分 token 流（识别 `.` `!` `?` `。` 等）
- ✅ 每句显示平均熵值 + 颜色条（< 2.0 绿色，> 4.5 红色）
- ✅ 点击句子展开内部 token
- ✅ 导出 JSON 包含 sentences + summary + highEntropyTokens
- ✅ 导出 CSV 可直接在 Excel 打开

**技术实现**：
```typescript
// lib/sentenceAnalysis.ts
interface Sentence {
  index: number;
  text: string;
  tokens: TokenStep[];
  avgEntropy: number;
  highEntropyCount: number;
}

function splitSentences(steps: TokenStep[]): Sentence[] {
  // 按标点符号拆分
  // 计算每句的平均熵
}
```

---

### Week 3：同一问题多次对比
**目标**：直接回答"为什么 AI 每次回答不一样"

| 任务 | 工期 | 优先级 | 输出物 |
|------|------|--------|--------|
| Task 1.4：CompareView 完善 | 2 天 | 中 | 并排对比 + 分岔点检测 |
| 集成测试 + Bug 修复 | 2 天 | 高 | 测试覆盖率报告 |

**验收标准**：
- ✅ 从实验档案选 2 条相同 prompt 的记录
- ✅ 并排对比文本差异（差异处琥珀色底）
- ✅ 底部熵值曲线对比
- ✅ 标注首次分岔点（firstDivergence）

**UI 规范**：
```typescript
<div className="grid grid-cols-2 gap-6">
  {/* 左右两栏：实验 A vs 实验 B */}
  <div>Token 流，差异处琥珀色底</div>
  <div>Token 流，差异处琥珀色底</div>
</div>

{/* 底部：熵值对比曲线 */}
<canvas ref={chartRef} width={800} height={200} />
```

---

### Week 4：开放标准推进（文档阶段）
**目标**：让其他工具能导出 .aitrace 格式

| 任务 | 工期 | 优先级 | 输出物 |
|------|------|--------|--------|
| Task 2.1：.aitrace 规范文档 | 2 天 | 🔥 P0 | docs/AITRACE_SPEC.md（中英文） |
| Task 6.1：TypeScript 读写库（启动） | 2 天 | 中 | aitrace-js npm 包骨架 |

**验收标准**：
- ✅ AITRACE_SPEC.md 包含完整 JSON Schema
- ✅ 提供最小示例（3-token trace）
- ✅ 提供真实示例（完整对话 trace）
- ✅ 定义 extensions 命名空间规范
- ✅ 写清楚"如何接入"（给其他工具作者看）

**文档结构**：
```markdown
# .aitrace Open Standard

## 概述
什么是 .aitrace — 1 段话说清楚

## JSON Schema
完整字段定义（基于 GenerationTrace 接口）

## TokenStep 结构
```json
{
  "id": 0,
  "text": "Hello",
  "prob": 0.95,
  "entropy": 0.23,
  "dt": 45,
  "topk": [...]
}
```

## 扩展字段规范
extensions 命名空间约定

## 示例
最小示例 + 真实示例

## 如何接入
TypeScript / Python 示例代码
```

---

## 第一个月里程碑

**Week 1 结束时**：
- ✅ 用户能在 5 秒内看懂"哪里不可信"
- ✅ 技术债清理（思考块 Bug）
- ✅ 首屏文案吸引对的用户

**Week 2 结束时**：
- ✅ 研究者能看到段落级置信度
- ✅ 能导出报告到 Excel/Python

**Week 3 结束时**：
- ✅ 能对比同一问题的多次回答
- ✅ 能看到首次分岔点

**Week 4 结束时**：
- ✅ .aitrace 规范文档完成
- ✅ 其他工具作者能看懂如何接入

---

## 立即启动（Week 1 Day 1）

### 今天要做的（按顺序）
1. ✅ Task 3.1：思考块 Bug 修复（1 小时）
2. ✅ Task 4.1：首屏文案改版（1 小时）
3. ✅ Task 1.1：高熵标红（启动，完成 TokenText 组件修改）

### 为什么这个顺序？
- **思考块 Bug**：最快修完，扫清技术债
- **首屏文案**：最简单，快速胜利
- **高熵标红**：核心功能，需要 2 天完成
