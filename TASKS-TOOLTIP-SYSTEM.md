# Task #23: 渐进式术语解释系统

> **优先级**：🔥 高（核心用户体验）
> **类型**：交互增强
> **完成标准**：普通用户能看懂所有专业术语

---

## 🎯 核心目标

**让每个专业术语都有人话解释，鼠标悬停即可看到。**

### 用户体验目标
- 普通人：悬停看解释，1 秒看懂
- 专业人：直接看术语，不需要解释
- 学习者：每次悬停都能学到新知识

---

## 📋 需要解释的术语清单

### 第一批：设置面板（高优先级）

| 术语 | 当前显示 | 需要解释 |
|------|---------|---------|
| Token | "最大生成 tokens" | "词或字的片段，AI 每次生成一个" |
| 温度 | "温度（0 = 确定性输出）" | "控制 AI 的创造性：0=保守，1.5=大胆" |
| Top-P | "Top-P" | "控制候选词范围：0.9=只考虑概率最高的 90%" |
| Repetition Penalty | "重复惩罚" | "防止 AI 重复说同样的话" |

### 第二批：Observe 模式（中优先级）

| 术语 | 当前显示 | 需要解释 |
|------|---------|---------|
| 采样 | "采样舱" | "AI 从候选词里选一个的过程" |
| 概率 | "概率分布" | "AI 认为每个词的可能性有多大（0-100%）" |
| 熵 (Entropy) | "entropy: 1.45" | "AI 的纠结程度：越高越犹豫" |
| Top-K | "top-8 候选" | "概率最高的前 8 个词" |
| 阈面 | "概率阈面" | "决策的那一刻，选中一个词" |

### 第三批：高级术语（低优先级）

| 术语 | 当前显示 | 需要解释 |
|------|---------|---------|
| Trace | "Token-Level Trace" | "AI 生成每个词的完整记录" |
| Logits | "采样前 logits" | "AI 内部的原始打分（未归一化）" |
| Softmax | "softmax 归一化" | "把原始分数转换为概率（总和=100%）" |
| 反事实 | "反事实重算" | "如果参数不同，AI 会选什么词" |

---

## 🎨 设计规范

### Tooltip 样式

**视觉要求**：
```
┌─────────────────────────────┐
│ Token  (?)                   │  ← 术语 + 图标
│ ─────────────────────────   │
│ 词或字的片段，AI 每次生成一个 │  ← 一句人话
│                             │
│ 例如："你好" = 1 个 token    │  ← 具体例子
│ "Hello world" = 2 个 tokens │
│                             │
│ 点击了解更多 →               │  ← 可选深入
└─────────────────────────────┘
```

**颜色规范**：
- 背景：`bg-surface`（#161d2b）
- 边框：`border-obs-line`（#2a3544）
- 文字：`text-ink`（主要）+ `text-ink-2`（说明）
- 图标：`text-measure-300`（观测蓝 60%）

**尺寸规范**：
- 最大宽度：320px（移动端 280px）
- 内边距：12px
- 字号：13px（标题）+ 12px（正文）
- 行高：1.5

### 图标规范

**使用 `?` 圆形图标**：
```tsx
<span className="inline-flex items-center gap-1">
  Token
  <Tooltip content="词或字的片段...">
    <span className="inline-flex h-4 w-4 items-center justify-center 
                     rounded-full bg-measure-500/20 text-measure-300 
                     text-[11px] cursor-help hover:bg-measure-500/30 
                     transition-colors">
      ?
    </span>
  </Tooltip>
</span>
```

**交互规则**：
- 鼠标悬停：300ms 延迟后显示（避免误触）
- 鼠标移开：立即隐藏
- 移动端：点击显示/隐藏
- 键盘：Tab 聚焦 + Enter 显示

---

## 🛠️ 技术实现

### 1. 创建 Tooltip 组件

**文件**：`src/components/Tooltip.tsx`

```typescript
interface TooltipProps {
  /** 术语名称 */
  term: string;
  /** 一句人话解释 */
  explanation: string;
  /** 具体例子（可选）*/
  example?: string;
  /** 深入链接（可选）*/
  learnMoreUrl?: string;
  /** 子元素（通常是术语文本）*/
  children: React.ReactNode;
}

export function Tooltip({ term, explanation, example, learnMoreUrl, children }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <span className="relative inline-flex items-center gap-1">
      {children}
      <button
        onMouseEnter={() => setTimeout(() => setIsOpen(true), 300)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-4 w-4 items-center justify-center 
                   rounded-full bg-measure-500/20 text-measure-300 
                   text-[11px] cursor-help hover:bg-measure-500/30 
                   transition-colors"
        aria-label={`解释：${term}`}
      >
        ?
      </button>
      
      {isOpen && (
        <div className="absolute left-0 top-6 z-50 w-80 rounded-lg 
                        border border-obs-line bg-surface p-3 shadow-float
                        animate-[pop-in_180ms_cubic-bezier(0.16,1,0.3,1)]">
          <p className="text-[13px] font-medium text-ink mb-1">{term}</p>
          <p className="text-[12px] leading-relaxed text-ink-2">{explanation}</p>
          {example && (
            <p className="mt-2 text-[11px] text-ink-3 border-l-2 border-obs-line pl-2">
              {example}
            </p>
          )}
          {learnMoreUrl && (
            <a 
              href={learnMoreUrl} 
              className="mt-2 inline-block text-[11px] text-measure-300 hover:underline"
            >
              点击了解更多 →
            </a>
          )}
        </div>
      )}
    </span>
  );
}
```

### 2. 创建术语库

**文件**：`src/lib/glossary.ts`

```typescript
export interface GlossaryEntry {
  term: string;
  explanation: string;
  example?: string;
  learnMoreUrl?: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  token: {
    term: "Token（词元）",
    explanation: "AI 理解文本的基本单位，可以是一个词、一个字或标点符号。AI 每次生成一个 token。",
    example: "例如：\"你好\" = 1 个 token\n\"Hello world\" = 2 个 tokens（Hello + world）",
  },
  
  temperature: {
    term: "温度（Temperature）",
    explanation: "控制 AI 回答的随机性。值越小越保守（总选最可能的词），值越大越有创造性（可能选不常见的词）。",
    example: "0 = 完全确定（每次回答一样）\n0.7 = 平衡（默认）\n1.5 = 很有创造性（可能出现意外答案）",
  },
  
  topP: {
    term: "Top-P（核采样）",
    explanation: "控制 AI 考虑多少候选词。值越小范围越窄，回答越稳定；值越大范围越广，回答越多样。",
    example: "0.9 = 只考虑累计概率达到 90% 的词\n1.0 = 考虑所有词",
  },
  
  entropy: {
    term: "熵（Entropy）",
    explanation: "衡量 AI 的\"纠结程度\"。熵越高，说明候选词概率越接近，AI 越难选择；熵越低，有一个词明显最优。",
    example: "0.5 = 很确定（一个词概率很高）\n2.0 = 很纠结（几个词概率相近）",
  },
  
  sampling: {
    term: "采样（Sampling）",
    explanation: "AI 从多个候选词中选出一个的过程。就像抽奖，概率高的词更容易被选中，但不是 100%。",
    example: "候选词：\"好\"(60%) \"棒\"(30%) \"妙\"(10%)\n采样结果：大概率选\"好\"，但也可能选\"棒\"或\"妙\"",
  },
  
  probability: {
    term: "概率（Probability）",
    explanation: "AI 认为某个词应该出现在这里的可能性，用 0-100% 表示。概率越高，AI 越\"相信\"这个词合适。",
    example: "\"天气\" 的下一个词：\n\"很\"(70%) \"非常\"(20%) \"特别\"(10%)",
  },
  
  topK: {
    term: "Top-K（前 K 个候选）",
    explanation: "概率最高的前几个词。通常只看 Top-8 或 Top-5，因为概率低的词基本不会被选中。",
    example: "Top-5 = 概率最高的前 5 个词",
  },
  
  trace: {
    term: "Trace（追踪记录）",
    explanation: "AI 生成每个词的完整过程记录，包括考虑了哪些词、为什么选了这个、花了多少时间。",
  },
  
  logits: {
    term: "Logits（原始打分）",
    explanation: "AI 内部给每个词的原始分数（未归一化）。需要通过 softmax 转换为概率才能理解。",
    example: "原始打分：[2.3, 1.5, 0.8] → 概率：[58%, 28%, 14%]",
  },
};
```

### 3. 包装器组件（简化使用）

**文件**：`src/components/Term.tsx`

```typescript
import { GLOSSARY } from "../lib/glossary";
import { Tooltip } from "./Tooltip";

interface TermProps {
  /** 术语 key（从 GLOSSARY 查找）*/
  id: keyof typeof GLOSSARY;
  /** 显示的文本（默认使用术语名称）*/
  children?: React.ReactNode;
}

export function Term({ id, children }: TermProps) {
  const entry = GLOSSARY[id];
  if (!entry) {
    console.warn(`术语 "${id}" 未在 GLOSSARY 中定义`);
    return <>{children}</>;
  }
  
  return (
    <Tooltip
      term={entry.term}
      explanation={entry.explanation}
      example={entry.example}
      learnMoreUrl={entry.learnMoreUrl}
    >
      {children || entry.term.split("（")[0]}
    </Tooltip>
  );
}
```

---

## 📝 使用示例

### 1. 设置面板改造

**改造前**：
```tsx
<span>最大生成 tokens</span>
```

**改造后**：
```tsx
<span>
  最大生成 <Term id="token">tokens</Term>
</span>
```

**效果**：
- 显示："最大生成 tokens (?)"
- 悬停：显示"Token（词元）"解释

### 2. Observe 模式改造

**改造前**：
```tsx
<span>entropy: {step.entropy.toFixed(2)}</span>
```

**改造后**：
```tsx
<span>
  <Term id="entropy">熵</Term>: {step.entropy.toFixed(2)}
</span>
```

### 3. 批量术语（一个句子有多个）

```tsx
<p>
  AI 通过 <Term id="sampling">采样</Term> 从 <Term id="topK">Top-8</Term> 候选词中
  根据 <Term id="probability">概率</Term> 选出一个，
  <Term id="entropy">熵</Term> 越高说明越纠结。
</p>
```

---

## 🎨 渐进式设计

### Level 1：基础解释（一句人话）

**目标用户**：完全不懂 AI 的人

```
Token → "词或字的片段，AI 每次生成一个"
温度 → "控制 AI 的创造性：0=保守，1.5=大胆"
```

### Level 2：具体例子（看得见的）

**目标用户**：想深入理解的人

```
Token + 例子 → "\"你好\" = 1 个 token"
温度 + 例子 → "0.7 = 平衡（默认）"
```

### Level 3：深入链接（可选）

**目标用户**：想成为专家的人

```
Token + 链接 → "点击了解更多 → /docs/token"
```

---

## 📊 优先级排序

### P0 - 第一周完成（阻塞普通用户）

1. ✅ 创建 Tooltip 组件
2. ✅ 创建术语库（10 个核心术语）
3. ✅ 改造设置面板（Token / 温度 / Top-P）
4. ✅ 改造 SamplingChamber（采样 / 概率 / 熵）

**验收标准**：
- 一个不懂 AI 的人能看懂设置面板
- 能自己调整参数并理解效果

### P1 - 第二周完成（增强学习体验）

5. ✅ 添加例子到所有术语
6. ✅ 改造 ActivityLog（Trace / Decision）
7. ✅ 改造 ObservePage（Top-K / Entropy）
8. ✅ 添加移动端适配

**验收标准**：
- 用户每次悬停都能学到新知识
- 移动端点击也能看解释

### P2 - 第三周完成（完善生态）

9. ✅ 添加深入链接（/docs/glossary）
10. ✅ 创建术语索引页（所有术语列表）
11. ✅ 添加搜索功能（搜索术语）
12. ✅ 添加"今日术语"（每次打开学一个新术语）

---

## 🧪 测试标准

### 用户测试

**找 3 个不懂 AI 的人测试**：

```
任务 1：调整温度让 AI 更保守
  ✅ 能找到温度滑块
  ✅ 能看懂温度是什么
  ✅ 知道往哪个方向调

任务 2：看懂 Observe 模式
  ✅ 能理解"采样"是什么
  ✅ 能看懂概率条
  ✅ 能解释"熵"的含义

任务 3：自学一个新术语
  ✅ 能主动悬停看解释
  ✅ 能记住术语含义
  ✅ 能用自己的话复述
```

### 技术测试

```bash
# 单元测试
npm run test -- Tooltip.test.tsx

# E2E 测试
npm run test:e2e -- tooltip.spec.ts

# 可访问性测试
npm run test:a11y
```

---

## 📈 成功指标

### 短期（1 个月）

- [ ] 用户悬停率 >30%（至少看过 3 个术语解释）
- [ ] 设置面板使用率 +50%（敢调参数了）
- [ ] 用户反馈："我学会了 Token/温度/采样"

### 长期（3 个月）

- [ ] 新用户留存率 +20%（看懂了，愿意继续用）
- [ ] 用户自发分享："这个工具能学 AI 知识"
- [ ] 教育机构使用（培训课程集成）

---

## 🚀 后续扩展

### 术语关系图

```
点击 "Token" → 显示关联术语：
  ├─ Tokenizer（分词器）
  ├─ Vocabulary（词表）
  └─ Embedding（词向量）
```

### 互动教学

```
点击 "温度" → 启动互动演示：
  "试试把温度从 0.1 调到 1.5，看 AI 回答有什么变化"
```

### 术语挑战

```
"今天学会 3 个术语，解锁成就徽章"
```

---

## ✅ 完成标准

**功能完成**：
- ✅ 所有专业术语都有 Tooltip
- ✅ 一句人话 + 具体例子
- ✅ 移动端适配

**用户验证**：
- ✅ 3 个不懂 AI 的人能完成测试任务
- ✅ 用户反馈"看懂了"

**质量保障**：
- ✅ 单元测试覆盖 >80%
- ✅ E2E 测试全绿
- ✅ 无障碍测试通过

---

**最后更新**：2026-08-05  
**负责人**：开发团队  
**预计工时**：3 周
