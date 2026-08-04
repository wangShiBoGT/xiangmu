# 视觉重设计计划 - Devin 风格 + 快速迭代

> **目标**：参考 Devin 结构化设计 + Claude 优雅排版，核心页面精雕，快速迭代上线  
> **风格定位**：专业工程感 + 现代简洁 + 细节舒适

---

## 🎨 视觉风格定义

### 参考产品分析

**Devin（结构化工程感）**：
- ✅ 清晰的卡片层次
- ✅ 状态图标 + 时间线
- ✅ 命令式标题（"Running tests"、"Analyzing code"）
- ✅ 可折叠/展开的内容区
- ✅ 实时状态更新（loading → success → error）

**Claude（优雅排版）**：
- ✅ 舒适的行高（1.75）
- ✅ 清晰的字体层次（16px 正文 / 13px 辅助）
- ✅ 足够的留白（padding 不吝啬）
- ✅ 柔和的分隔线（不用粗黑线）

**Linear（现代动效）**：
- ✅ 快速响应（motion-fast: 120ms）
- ✅ 自然过渡（cubic-bezier 曲线）
- ✅ 细腻反馈（hover 状态）

### 我们的视觉基因

```
品牌色调：
- 主色：蓝紫渐变（科技感） #4F7CE4 → #6F95EC
- 辅助：琥珀（警告） #CF9C4A
- 危险：红色（错误） #C94B4B
- 成功：翠绿（完成） #10B981
- 中性：石墨灰（专业） #1A1C22 → #ECECEF

质感：
- 卡片：轻微阴影 + 圆角 10px
- 玻璃态：backdrop-blur-md + 半透明背景（仅特殊区域）
- 分隔线：1px + 10% 不透明度
- 按钮：实心背景 + hover 加深

动效：
- 入场：淡入 + 轻微上移（200ms）
- 交互：快速反馈（120ms）
- 加载：优雅的骨架屏/脉冲
- 数据：数字跳动、进度条流畅
```

---

## 📐 设计系统升级

### 颜色系统 v2.0

```css
/* 保留原有 measure/caution/alert，增加品牌色 */
--color-brand-500: #4F7CE4;     /* 主品牌色 */
--color-brand-600: #3D63C4;     /* 深色变体 */
--color-brand-400: #6F95EC;     /* 浅色变体 */
--color-brand-50: #EEF2FE;      /* 极浅背景 */

--color-success-500: #10B981;   /* 成功绿 */
--color-success-100: #D1FAE5;   

/* 增强中性色层次 */
--color-obs-3: #242630;         /* 更深一层 */
--color-obs-ink-highlight: #FAFAFA;  /* 高亮文字 */

/* 状态色 */
--color-status-running: var(--color-brand-500);
--color-status-success: var(--color-success-500);
--color-status-warning: var(--color-caution-500);
--color-status-error: var(--color-alert-500);
```

### 阴影系统

```css
/* 卡片阴影 - 3 档 */
--shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
--shadow-md: 0 2px 8px rgb(0 0 0 / 0.08), 0 1px 2px rgb(0 0 0 / 0.06);
--shadow-lg: 0 4px 16px rgb(0 0 0 / 0.12), 0 2px 4px rgb(0 0 0 / 0.08);

/* 发光效果 - 仅用于状态指示 */
--glow-brand: 0 0 0 1px var(--color-brand-500), 0 0 12px rgb(79 124 228 / 0.3);
--glow-success: 0 0 0 1px var(--color-success-500), 0 0 12px rgb(16 185 129 / 0.3);
--glow-error: 0 0 0 1px var(--color-alert-500), 0 0 12px rgb(201 75 75 / 0.3);
```

### 动效系统

```css
/* 速度 */
--motion-instant: 80ms;   /* 即时反馈 */
--motion-fast: 120ms;     /* 快速交互 */
--motion-base: 200ms;     /* 标准过渡 */
--motion-slow: 360ms;     /* 复杂动画 */

/* 曲线 */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);      /* 弹性出场 */
--ease-in-out-circ: cubic-bezier(0.85, 0, 0.15, 1);  /* 圆滑双向 */
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55); /* 轻微弹跳 */
```

---

## 🎯 核心页面重设计（按优先级）

### Phase 1: 对话页 - 核心体验（2天）

#### 1.1 消息气泡升级

**用户消息**：
```tsx
<div className="flex justify-end mb-4">
  <div className="max-w-[70%] rounded-2xl bg-brand-500 px-4 py-3 text-[15px] text-white shadow-md">
    {message.content}
  </div>
</div>
```

**AI 消息 - Devin 风格卡片**：
```tsx
<div className="mb-6">
  {/* 思考卡片 - 可折叠 */}
  {thinking && (
    <div className="mb-3 overflow-hidden rounded-xl border border-obs-line bg-obs-2 shadow-md">
      {/* 头部：状态 + 标题 + 时长 */}
      <button 
        onClick={toggleExpand}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-obs-line/30"
      >
        {/* 状态图标 - 动态 */}
        {isRunning ? (
          <IconThinking className="h-5 w-5 animate-pulse text-brand-400" />
        ) : (
          <IconCheck className="h-5 w-5 text-success-500" />
        )}
        
        {/* 标题 */}
        <div className="flex-1">
          <div className="text-[14px] font-semibold text-obs-ink">
            {isRunning ? "正在思考..." : "思考过程"}
          </div>
          {duration && (
            <div className="text-[12px] text-obs-ink3">
              用时 {duration} 秒
            </div>
          )}
        </div>
        
        {/* 展开图标 */}
        <IconChevronDown 
          className={`h-4 w-4 text-obs-ink3 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>
      
      {/* 内容区 - 可折叠 */}
      {isExpanded && (
        <div className="border-t border-obs-line/50 px-4 py-3 animate-in slide-in-from-top-2 duration-200">
          <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-obs-ink2">
            {thinking}
          </div>
        </div>
      )}
    </div>
  )}
  
  {/* 回答内容 */}
  <div className="prose prose-invert max-w-none text-[15px] leading-[1.75]">
    {/* Markdown 渲染 */}
  </div>
</div>
```

**视觉改进点**：
- ✅ Devin 风格的卡片结构
- ✅ 清晰的状态图标（运行中/完成）
- ✅ 流畅的折叠动画
- ✅ 舒适的字体和行高
- ✅ 足够的内边距

#### 1.2 输入框升级

```tsx
<div className="sticky bottom-0 border-t border-obs-line bg-obs/95 backdrop-blur-md p-4">
  <div className="mx-auto max-w-3xl">
    <div className="relative">
      {/* 输入框 */}
      <textarea
        className="w-full resize-none rounded-xl border border-obs-line bg-obs-2 px-4 py-3 pr-12 text-[15px] text-obs-ink placeholder:text-obs-ink3 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
        placeholder="输入消息...（Shift + Enter 换行）"
        rows={1}
      />
      
      {/* 发送按钮 */}
      <button
        className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white shadow-md transition-all hover:bg-brand-600 hover:shadow-lg active:scale-95 disabled:opacity-50"
        disabled={!input.trim()}
      >
        <IconSend className="h-4 w-4" />
      </button>
    </div>
    
    {/* 生成中提示 */}
    {isGenerating && (
      <div className="mt-2 flex items-center gap-2 text-[13px] text-obs-ink3">
        <div className="h-2 w-2 rounded-full bg-brand-400 animate-pulse" />
        正在生成回答...（{tokensPerSecond.toFixed(1)} tokens/s）
      </div>
    )}
  </div>
</div>
```

**视觉改进点**：
- ✅ 现代化圆角（12px）
- ✅ 磨砂玻璃底栏
- ✅ Focus 状态有光晕
- ✅ 发送按钮有反馈动画
- ✅ 实时性能提示

---

### Phase 2: Token 详情面板 - 差异化功能（1.5天）

**点击任意 token 弹出侧边抽屉**：

```tsx
<div className="fixed inset-y-0 right-0 w-[420px] transform border-l border-obs-line bg-obs shadow-2xl transition-transform duration-300 ease-out-expo">
  {/* 头部 */}
  <div className="flex items-center justify-between border-b border-obs-line px-6 py-4">
    <div>
      <h3 className="text-[16px] font-semibold text-obs-ink">Token 详情</h3>
      <p className="text-[13px] text-obs-ink3">第 {position} 个 token</p>
    </div>
    <button 
      onClick={onClose}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-obs-ink3 hover:bg-obs-line/30 transition-colors"
    >
      <IconClose className="h-5 w-5" />
    </button>
  </div>
  
  {/* 主 Token 展示 */}
  <div className="border-b border-obs-line bg-gradient-to-b from-brand-500/10 to-transparent px-6 py-8">
    <div className="text-center">
      <div className="inline-flex items-center justify-center rounded-2xl bg-obs-2 px-8 py-4 text-[32px] font-medium text-obs-ink shadow-lg">
        "{token}"
      </div>
      <div className="mt-3 text-[13px] text-obs-ink3">
        生成用时 {latency}ms
      </div>
    </div>
  </div>
  
  {/* 候选 Tokens */}
  <div className="px-6 py-4">
    <h4 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-obs-ink3">
      候选 Token (Top 10)
    </h4>
    <div className="space-y-2">
      {candidates.map((cand, i) => (
        <div 
          key={i}
          className="flex items-center gap-3 rounded-lg bg-obs-2 px-3 py-2.5 transition-colors hover:bg-obs-line/30"
        >
          {/* 排名徽章 */}
          <div className={`flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold ${
            i === 0 ? "bg-brand-500 text-white" : "bg-obs-line text-obs-ink3"
          }`}>
            {i + 1}
          </div>
          
          {/* Token 文本 */}
          <div className="flex-1 font-mono text-[14px] text-obs-ink">
            "{cand.token}"
          </div>
          
          {/* 概率条 */}
          <div className="flex items-center gap-2">
            <div className="h-2 w-20 overflow-hidden rounded-full bg-obs-line">
              <div 
                className={`h-full rounded-full transition-all ${
                  i === 0 ? "bg-brand-500" : "bg-obs-ink3"
                }`}
                style={{ width: `${cand.probability * 100}%` }}
              />
            </div>
            <span className="w-12 text-right font-mono text-[12px] text-obs-ink3">
              {(cand.probability * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
  
  {/* 技术指标 */}
  <div className="border-t border-obs-line px-6 py-4">
    <h4 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-obs-ink3">
      技术指标
    </h4>
    <div className="grid grid-cols-2 gap-3">
      <MetricCard label="Entropy" value={entropy.toFixed(3)} />
      <MetricCard label="Logit" value={logit.toFixed(2)} />
      <MetricCard label="Temperature" value={temperature.toFixed(1)} />
      <MetricCard label="Top-P" value={topP.toFixed(2)} />
    </div>
  </div>
</div>
```

**视觉改进点**：
- ✅ 侧边抽屉动画流畅
- ✅ 主 Token 大字展示（视觉焦点）
- ✅ 候选列表有排名徽章
- ✅ 概率用进度条可视化
- ✅ 分区清晰（头部/主体/候选/指标）

---

### Phase 3: 性能面板升级（1天）

**右上角浮动面板 - 可最小化**：

```tsx
<div className={`fixed right-6 top-20 z-50 w-[380px] transform overflow-hidden rounded-xl border border-obs-line bg-obs/95 shadow-2xl backdrop-blur-md transition-all duration-300 ${
  isMinimized ? "h-[60px]" : "h-auto"
}`}>
  {/* 头部 - 始终可见 */}
  <button
    onClick={toggleMinimize}
    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-obs-line/20"
  >
    {/* 状态指示器 */}
    <div className={`h-3 w-3 rounded-full ${
      status === "running" 
        ? "bg-brand-400 shadow-[0_0_8px_rgba(79,124,228,0.6)] animate-pulse" 
        : "bg-success-500"
    }`} />
    
    <div className="flex-1">
      <h3 className="text-[14px] font-semibold text-obs-ink">运行状态</h3>
      <p className="text-[12px] text-obs-ink3">
        {status === "running" ? `${tokensPerSecond.toFixed(1)} tok/s` : "就绪"}
      </p>
    </div>
    
    <IconChevronDown 
      className={`h-4 w-4 text-obs-ink3 transition-transform ${
        isMinimized ? "" : "rotate-180"
      }`}
    />
  </button>
  
  {/* 详情 - 可折叠 */}
  {!isMinimized && (
    <div className="animate-in slide-in-from-top-2 duration-200">
      {/* 核心指标 */}
      <div className="border-t border-obs-line/50 px-4 py-3">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={<IconZap />}
            label="生成速度"
            value={tokensPerSecond.toFixed(1)}
            unit="tok/s"
            highlight={tokensPerSecond > 20}
          />
          <MetricCard
            icon={<IconClock />}
            label="平均延迟"
            value={avgLatency.toFixed(0)}
            unit="ms"
          />
        </div>
      </div>
      
      {/* 系统信息 */}
      <div className="border-t border-obs-line/50 px-4 py-3">
        <h4 className="mb-2 text-[12px] font-semibold text-obs-ink3">系统</h4>
        <div className="space-y-1.5 text-[13px]">
          <InfoRow label="设备" value={device === "webgpu" ? "WebGPU" : "WASM"} />
          <InfoRow label="GPU" value={gpuName || "N/A"} />
          <InfoRow label="内存" value={`${memory} GB`} />
        </div>
      </div>
      
      {/* 模型信息 */}
      <div className="border-t border-obs-line/50 px-4 py-3">
        <h4 className="mb-2 text-[12px] font-semibold text-obs-ink3">模型</h4>
        <div className="space-y-1.5 text-[13px]">
          <InfoRow label="名称" value={modelName} />
          <InfoRow label="大小" value={modelSize} />
          <InfoRow label="量化" value={quantization} />
        </div>
      </div>
    </div>
  )}
</div>
```

**视觉改进点**：
- ✅ 磨砂玻璃效果（backdrop-blur）
- ✅ 状态指示器有动画
- ✅ 可最小化节省空间
- ✅ 指标卡片清晰
- ✅ 分区明确

---

## 🎨 通用组件库

### Button 组件

```tsx
// Primary Button
<button className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-[14px] font-medium text-white shadow-md transition-all hover:bg-brand-600 hover:shadow-lg active:scale-95 disabled:opacity-50">
  <IconPlus className="h-4 w-4" />
  新建对话
</button>

// Secondary Button
<button className="inline-flex items-center gap-2 rounded-lg border border-obs-line bg-obs-2 px-4 py-2 text-[14px] font-medium text-obs-ink transition-all hover:bg-obs-line/30">
  取消
</button>

// Ghost Button
<button className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[14px] text-obs-ink3 transition-colors hover:bg-obs-line/30 hover:text-obs-ink">
  <IconCopy className="h-4 w-4" />
  复制
</button>
```

### Card 组件

```tsx
<div className="overflow-hidden rounded-xl border border-obs-line bg-obs-2 shadow-md">
  {/* Card Header */}
  <div className="border-b border-obs-line px-4 py-3">
    <h3 className="text-[14px] font-semibold text-obs-ink">标题</h3>
  </div>
  
  {/* Card Body */}
  <div className="px-4 py-3">
    内容
  </div>
</div>
```

### Badge 组件

```tsx
// Status Badge
<span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 px-2.5 py-1 text-[12px] font-medium text-brand-400">
  <div className="h-1.5 w-1.5 rounded-full bg-brand-400" />
  运行中
</span>

// Count Badge
<span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-alert-500 px-1.5 text-[11px] font-semibold text-white">
  3
</span>
```

---

## 📅 开发计划（3.5 天）

### Day 1: 基础升级（设计系统）
**上午 4h**：
- [ ] 升级 index.css：新颜色、阴影、动效
- [ ] 创建通用组件：Button、Card、Badge
- [ ] 测试响应式和主题切换

**下午 4h**：
- [ ] 升级消息气泡样式
- [ ] 重构 ChatMessage 组件
- [ ] 测试对话页基础体验

### Day 2: 核心功能（思考卡片 + Token 详情）
**上午 4h**：
- [ ] 重构 ActivityCard（Devin 风格）
- [ ] 添加折叠动画
- [ ] 集成到对话流

**下午 4h**：
- [ ] 创建 TokenDetailDrawer 组件
- [ ] 实现侧边抽屉动画
- [ ] 候选 Token 列表 + 概率可视化

### Day 3: 性能面板 + 细节
**上午 4h**：
- [ ] 重构 AINexus 组件（可最小化）
- [ ] 状态动画和指示器
- [ ] 分区布局优化

**下午 4h**：
- [ ] 输入框升级（磨砂玻璃底栏）
- [ ] 添加全局 loading 状态
- [ ] 细节打磨（hover、focus、transition）

### Day 4 上午: 测试 + 修复（0.5天）
- [ ] 浏览器实测截图
- [ ] 修复视觉 bug
- [ ] 性能优化
- [ ] 提交代码

---

## ✅ 验证标准

### 视觉质量
- [ ] 打开页面第一眼觉得"专业"
- [ ] 颜色层次清晰不刺眼
- [ ] 动画流畅不卡顿
- [ ] 细节经得起放大看

### 功能完整
- [ ] 对话流畅
- [ ] 思考卡片可折叠
- [ ] Token 详情可查看
- [ ] 性能面板可最小化

### 技术指标
- [ ] TypeScript 0 错误
- [ ] Build 成功
- [ ] 测试通过
- [ ] 性能无退化

---

## 🚀 开始开发

我现在立刻开始：

1. **先升级设计系统**（index.css）
2. **然后重构消息气泡**
3. **逐步完成核心组件**

每完成一个模块就提交一次，保证进度可见。

准备好了吗？我开始了！
