# AOKS · 知识地图（现有文档的角色与加载策略）

> 本次重构采用**保守逻辑重构**：不移动、不删除原有生命周期文档；通过角色、入口与路由解决“谁该在何时被读”。
> 角色定义：Canonical = 规范住址；Digest = 日常压缩入口；Plan = 已批准但未实施的方案；State = 实时执行状态；Archive = 历史证据；Pointer = 导航或专项参考。

## Kernel / Constitution

| 文件 | 角色 | 加载时机 |
|---|---|---|
| `docs/合规速查表.md` | Digest | 每次任务 |
| `docs/E5-VolumeI-产品宪法.md` | Canonical | 速查表不足、词表/原则/产品语法判断 |
| `docs/AODL/01-Cognitive-DNA.md` | Canonical | 每次任务 |
| `docs/AODL/02-Visual-DNA.md` | Canonical | 每次任务 |
| `docs/AODL/00-AODL-索引与认知栈.md` | Pointer | 设计层级或 AODL 自身维护 |
| `docs/E5-VolumeII-设计图谱.md` | Canonical | 视觉任务 |
| `docs/E5-VolumeIII-交互圣经.md` | Canonical | 交互、动效、组件任务 |
| `docs/E5-VolumeIV-科学评测框架.md` | Canonical | Benchmark/采样口径 |
| `docs/DS0-token对照表.md` | Canonical | 视觉、动效、token 实现 |

## 产品与模块

| 文件 | 角色 | 加载时机 |
|---|---|---|
| `docs/直通E5完整规划.md` | Canonical | 对应模块锚点任务 |
| `docs/E5-双轨开发计划.md` | Canonical | 新模块、五闸、体验稿 |
| `Design/Future/**` | Plan | 对应未来模块的纸面设计或实现前 |
| `docs/observatory-roadmap-下一阶段.md` | Plan | 路线取舍或排期 |
| `docs/observatory-v1-技术调研.md` | Pointer | 技术可行性判断 |
| `docs/首屏文案稿.md` | Pointer | 首屏文案任务 |
| `docs/产品原则.md` | Pointer | P1–P4 的可执行检查 |

## 实时状态与历史

| 文件 | 角色 | 加载时机 |
|---|---|---|
| `docs/任务看板.md` | State | 接续、排期、完成任务时 |
| `docs/Phase-A-CoreLoop-gap分析.md` | Plan | Core Loop 专项决策 |
| `docs/总体规划-锚点.md` | Archive/Pointer | 追溯早期锚点时 |
| `docs/前四批次开发计划.md` | Archive | 复盘已完成批次时 |
| `docs/observatory-v1-产品收敛.md` | Archive | 追溯 V1 决策时 |
| `docs/前四层产品逻辑推演.md` | Archive | 创始人推演或复盘时 |
| `docs/定稿评审记录.md`、`docs/宪法校验记录.md`、`docs/批次*-验收记录.md` | Archive | 复盘具体决定/验收时 |

所有 AOKS 文件均为 Pointer/Process：它们不提升自身为产品规范，只把人带到正确事实源。
