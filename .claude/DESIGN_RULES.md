# 设计规则 · Design Rules

本文档记录项目中经过实战验证的设计原则，防止重复犯错。

## 视觉层级与对比度

### 规则 1：浮层和弹窗必须不透明且分层

**原则：** 任何有独立展示内容的 UI 元素（下拉选择、弹窗、抽屉、tooltip、popover），背景色**绝对不能透明**，且必须根据用途选择合适的层级。

**原因：** 
- 透明背景导致浮层内容与页面底部内容重叠，用户无法区分哪个是当前操作对象
- 文字叠加在一起完全看不清
- 用户会困惑"我到底在看哪一层"
- 所有浮层用同一个颜色太平庸，缺乏质感

**浮层分级系统：**

1. **大型交互弹窗** - 用户必须操作的关键界面
   - 背景：`bg-bg-secondary` (#1a1a1a)
   - 边框：`border-2 border-border`
   - 圆角：`rounded-lg` (8px)
   - 阴影：`shadow-float` (强阴影)
   - 例子：模态对话框、演示控制面板

2. **小型信息浮层** - 仅展示信息
   - 背景：`bg-bg-float` (#3d3d3d)
   - 边框：`border-2 border-border`
   - 圆角：`rounded-md` (6px)
   - 阴影：`shadow-tooltip`
   - 例子：tooltip、下拉菜单

3. **控制条和工具栏** - 悬浮小工具
   - 背景：`bg-bg-secondary/95` + `backdrop-blur-sm`
   - 边框：`border-2 border-border/80`
   - 圆角：`rounded-lg`
   - 阴影：`shadow-lg`
   - 例子：播放控制条

**错误示例：**
```tsx
// ❌ 错误：透明度太高，和页面内容重叠
<div className="bg-bg-secondary/60">...</div>

// ❌ 错误：所有浮层都用同一个颜色，没有层级感
<Modal className="bg-bg-float">...</Modal>
<Tooltip className="bg-bg-float">...</Tooltip>
```

**正确示例：**
```tsx
// ✅ 大弹窗用 secondary + 强阴影
<Modal className="bg-bg-secondary border-2 rounded-lg shadow-float">...</Modal>

// ✅ 小 tooltip 用 float + 轻阴影
<Tooltip className="bg-bg-float border-2 rounded-md shadow-tooltip">...</Tooltip>

// ✅ 控制条用半透明 + 毛玻璃
<Controls className="bg-bg-secondary/95 backdrop-blur-sm border-2 border-border/80 rounded-lg shadow-lg">...</Controls>
```

**适用范围：**
- Dropdown 下拉菜单
- Modal 弹窗
- Drawer 抽屉
- Tooltip 工具提示
- Popover 气泡卡片
- Context Menu 右键菜单
- Select 选择器面板
- 任何 `position: absolute` 或 `position: fixed` 的内容层

### 规则 2：四层颜色系统必须保持 10% 明度差

**当前色阶：**
```css
--color-bg-primary: #0a0a0a;    /* 页面底 */
--color-bg-secondary: #1a1a1a;  /* 卡片 - 比底亮 10% */
--color-bg-tertiary: #2a2a2a;   /* 控件 - 比卡片亮 10% */
--color-bg-hover: #333333;       /* hover - 比控件亮 10% */
--color-bg-float: #3d3d3d;      /* 浮层 - 最亮，必须明显可见 */
```

**边框必须可见：**
- 所有卡片和浮层：`border-2 border-border` (2px 粗边框)
- 边框颜色：`--color-border: #3a3a3a` (足够对比度)

## 历史问题记录

### 2026-08-04：浮层分级系统重新设计

**问题：** 第一次修复后所有浮层都用 `bg-bg-float` (#3d3d3d)，导致：
- 大型交互弹窗太亮太灰，视觉生硬
- 所有浮层一个颜色，缺乏层次感和质感
- 控制条遮挡了右侧内容

**修复：**
1. **大型交互弹窗** 改回 `bg-bg-secondary` + `rounded-lg` + `shadow-float`
2. **小型信息浮层** 保持 `bg-bg-float` + `rounded-md` + `shadow-tooltip`
3. **控制条工具栏** 用 `bg-bg-secondary/95` + `backdrop-blur-sm` (半透明毛玻璃)
4. 更新阴影系统：`shadow-float` (大弹窗强阴影) / `shadow-tooltip` (小浮层轻阴影)

**教训：** 
- 浮层不能"一刀切"全部同一颜色，要根据用途分级
- 大弹窗不能太亮，要有质感
- 控制条可以用半透明 + 毛玻璃，但必须加 `backdrop-blur`
- 圆角也要分级：大弹窗 `rounded-lg`，小浮层 `rounded-md`

---

## 更新日志

- 2026-08-04：创建文档，记录浮层不透明规则
