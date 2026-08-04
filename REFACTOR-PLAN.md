# 去"AI 味儿"重构计划

> **目标**: 将项目从"AI 炫酷展示"改造为"专业调试工具"  
> **依据**: AI_DESIGN_CONSTITUTION.md 第 5 条 - "禁 Glass、禁 Glow、禁 Cyberpunk、禁渐变背景"

---

## P0 - 必须立即修复

### 1. 删除装饰性动画 ✅ 进行中
**违规内容**:
- `scene-flow/scene-birth/scene-storm` - 装饰性"场景"系统
- `birth-scene-scatter/converge` - 过度戏剧化的粒子效果
- `chamber-drop` - 装饰性下落动画
- `team-flow-dot` - 装饰性光点流动

**保留动画** (功能性):
- `spin` - 加载指示器
- `token-in` - 基础淡入
- `drawer-in/mask-in/pop-in` - UI 组件进出
- `thinking-*` - 思考状态呼吸（已实现，保留）

**执行**: 删除 CSS 中的装饰性 @keyframes，移除对应的 class 引用

---

### 2. 去除发光效果 ✅ 进行中
**违规内容**:
- `rgb(139 143 248 / 0.55)` - 蓝紫色发光，出现 15+ 处
- AINexus 中的 `shadow-[0_0_20px_rgba(...)]` glow 效果
- Token hover 的发光 outline

**替换方案**:
- 使用设计系统的 `--color-measure-*` 系列
- Outline 改为实线边框
- 删除所有 glow shadow

---

### 3. 去除渐变背景 ✅ 进行中
**违规内容**:
- AINexus: `bg-gradient-to-br from-white/5 to-transparent`
- AINexus: `bg-gradient-to-r from-blue-500 to-blue-400`
- MetricCard: `bg-gradient-to-br from-emerald-500/10`

**替换方案**:
- 使用纯色背景 `bg-obs-2` 或 `bg-obs-line/10`
- 进度条用纯色 `bg-measure-500`

---

### 4. 学术化命名改造 ⏳ 待执行
**需要改名的组件**:
- `BirthCard.tsx` → `TokenDetailPanel.tsx`
- `BirthScene.tsx` → `SamplingVisualization.tsx`
- `HesitationSlice.tsx` → `CandidateComparison.tsx`
- `OceanView.tsx` → `Timeline3D.tsx`
- `SamplingChamber.tsx` → `TokenSelector.tsx`

**CSS 类名**:
- `.birth-scene-*` → `.sampling-*`
- `.chamber-*` → `.selector-*`
- `.token-scene-*` → `.token-*`

---

### 5. UI 文案专业化 ⏳ 待执行
**需要修改的文案**:
- "AI Nexus" → "性能监控" 或 "运行状态"
- "Browser AI Microscope" → "WebGPU LLM 调试工具"
- "暗室观察" → "调试面板"
- 诗意化的提示文字改为直白的功能描述

---

## P1 - 重要但非阻塞

### 6. 简化主题系统
- 删除双主题切换（paper/obs）
- 统一为单一专业深色主题
- 移除主题切换代码

### 7. 统一颜色使用
- 审计所有硬编码颜色
- 替换为设计 token
- 只使用中性 + measure/caution/alert 三色

### 8. 移动端适配
- 增大触摸目标到 44x44px
- 添加移动端断点
- 响应式布局

---

## 执行顺序

1. ✅ 删除装饰性动画（CSS）
2. ✅ 去除发光效果（CSS + AINexus.tsx）
3. ✅ 去除渐变背景（AINexus.tsx）
4. ⏳ 改组件名和类名
5. ⏳ 改 UI 文案
6. ⏳ 提交 Phase 1 修复
7. ⏳ 继续 P1 任务

---

## 验证标准

修复完成后必须满足：
- ✅ 无 glow shadow
- ✅ 无渐变背景
- ✅ 无装饰性动画（只保留功能性）
- ✅ 无学术/诗意命名
- ✅ UI 像专业调试工具，不像 AI demo
