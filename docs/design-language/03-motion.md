# ACDL 03 · Motion（动效规范）

> 动效唯一职责：让用户多理解一件事。删掉不损失信息的动效，删掉。

## 1. 每个动效的三件套（评审必填）

1. 语法归属：Birth / Branch / Collapse / Flow（02-visual-grammar）；
2. 驱动字段：哪个真实 trace 字段决定幅度/时长/透明度/数量；
3. 认知收益：用户看完多懂了什么（五问第 5 问）。

## 2. 节奏（导演制，沿用 director.ts 口径）

- 平静为常态：高置信步直接 Birth，无强调；
- 强调有预算：大场面（BirthScene/Collapse 爆发）只由真实犹豫点触发（top-2 差 <5% 或 entropyLevel≥0.7），最小间隔 12 步，超频自动降级——一直爆就是没有爆；
- 单次强调 ≤600ms；FLIP 原地形变 ≤300ms；
- reduced-motion：全部动效静止，信息不丢。

## 3. 确定性

所有动效参数由 trace 字段确定性计算，同一 trace 回放动效完全一致；禁随机数、禁装饰性 easing 抖动。

## 4. 3D = Feel，2D = Understand（铁律）

- 真正的信息发生在 2D 主舞台（Pattern 条、Story 卡、正文）；
- 3D（Ocean/背景粒子）只承担情绪：主舞台已让用户看懂后，背景坍缩才是 WOW；
- 任何信息如果只存在于 3D 中 = 违规；3D 不可用（软件渲染）时零信息损失；
- 千万不要反过来。

## 5. 性能

GPU（Three.js/WebGL）优先，Canvas 2D 回退，粒子数按设备自适应下降；软件渲染（SwiftShader）诚实降级停用 3D 并说明。
