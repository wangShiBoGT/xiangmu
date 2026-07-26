# AI Observatory V1 技术调研与可行性验证

> 每项关键技术先验证「能做出来、做出来是好的强的」，再动手。
> 本文所有性能数字来自 2026-07-23 在云端验证机上的真实实测（Playwright 驱动真实 Chrome），非估算。

## 一、渲染选型：Three.js

### 1. 版本与供应链

- 选 `three@0.185.1`（2026-07-01 发布，>7 天，供应链安全窗口满足）
- 唯一新增运行时依赖；锁定精确版本，不用浮动区间

### 2. 包体实测

最小可用导入集（Scene/Camera/WebGLRenderer/InstancedMesh/Points/Line 等 15 个符号）经 Vite 构建实测：

```
tree-shake 后：511 KB raw / 126 KB gzip
```

结论：可接受；建议按路由懒加载（Ocean 页才加载），首屏 Landing 不受影响。

### 3. 粒子规模与帧率实测

测试场景（模拟 Ocean 满载）：320 步 × top-8 = 2560 个 InstancedMesh 球体（单 draw call）+ 主流 Line + 20000 个 Points 尾迹粒子 + 每帧更新 1/4 实例矩阵 + 相机运动。

| 环境 | 配置 | 实测 FPS |
|---|---|---|
| 云端验证机（SwiftShader 软件光栅，无 GPU，最坏情况） | 满载 | ~3.3 |
| 同上 | lite（128 步、3k 粒子、dpr=1、960×600） | ~9.2 |
| 硬件 GPU（用户目标设备） | 满载 | 待本机验证；InstancedMesh 单 draw call 2560 实例远低于业界常规上限（10 万+），预期 60fps 无压力 |

**关键结论与硬性要求：**
1. 软件光栅（SwiftShader/llvmpipe）下 3D 不可用——**必须做能力检测**：`WEBGL_debug_renderer_info` 的 UNMASKED_RENDERER 含 `SwiftShader`/`llvmpipe`/`Software` 时，自动降级到 2D Canvas Ocean（现有 Canvas 技术栈可复用 Landing 矩阵的绘制经验）或静态视图。与现有 device.ts tier 探测机制并入同一套能力报告。
2. 满载参数（320×8+2万粒子）是上限预算；默认按 200 token 生成即 1600 实例，更宽裕。
3. 需在用户本机（真实 GPU + WebGPU 推理同时跑）做一次最终验证——云端无硬件 GPU，此项无法远程代测，属诚实未验证项。

### 4. 渲染与推理共存

架构事实：推理已在 Web Worker（worker.ts），渲染在主线程 WebGL；WebGPU（推理）与 WebGL（渲染）是独立 API/命令队列，无上下文争用。

实测（最坏情况——软件渲染时 CPU 互抢）：挂一个 95% 占空比的满载 Worker 后，渲染 FPS 9.2 → 7.7（约 -15%）。硬件 GPU 上渲染不占 CPU，影响更小。

风险与缓解：
- VRAM 压力（大模型 + 3D 纹理）：Ocean 几何体极小（球体 10×10 段），材质用 MeshBasicMaterial 无纹理，VRAM 占用 <10MB，风险低
- 消息洪泛导致主线程卡顿：现有 worker 消息已按 token 批量发送，Ocean 增量喂入即可，不需改协议

## 二、数据映射规范（trace → 3D）

数据源为现有 `src/lib/trace.ts`，**不新增任何采集字段**：

```
TokenStep { id, text, prob, topk[8]{id,prob}, entropy(nats), dt(ms) }
GenerationTrace { modelId, params{temperature,topP,seed}, promptIds, steps, device, pipeline? }
BranchNode { forkStep, forcedId, forcedText, trace, children }  // 分岔树，上限 8 节点
```

映射规则（每维度可解释）：

| 视觉量 | 数据来源 | 说明 |
|---|---|---|
| X | step index | 时间步 |
| Y | 候选在 top-8 内的排位 + 概率微扰 | 主流居中，暗流上下展开 |
| Z | step.entropy | 犹豫越大离主平面越远 |
| 实例缩放 | candidate.prob | 流宽=概率 |
| 颜色 | entropy 冷暖 + RuleMatch 标记色 | 规则命中复用 M5 引擎输出 |
| 粒子衰散 | 未选候选按 prob 指数衰减透明度 | 暗流消散 |
| 第二条洋流 | BranchNode 子分支 trace | 干预/分岔的两条时间线 |

交互：Raycaster 拾取 InstancedMesh instanceId → `steps[floor(id/8)]` → 打开现有 token 出生档案组件（ObservePage 已有）。

## 三、.aitrace v2 格式草案

基于现有 `browser-ai-replay/v1`（experiments.ts importReplay 已支持）向后兼容演进：

```jsonc
{
  "format": "aitrace/v2",            // v1 文件仍可导入（保留旧分支）
  "schema": 2,
  "source": { "app": "browser-ai-observatory", "version": "…" },
  "model": { "id": "onnx-community/…", "dtype": "q4f16", "fingerprint": "sha256:…(可选)" },
  "env": { "device": "webgpu|wasm", "ua": "…", "gpu": "…(可选)" },
  "prompt": "…", "promptIds": [...],
  "params": { "temperature": 0.7, "topP": 0.9, "seed": 42 },
  "steps": [ /* TokenStep[]，与现有一致 */ ],
  "pipeline": { "tokenizeMs": 0, "prefillMs": 0, "decodeMs": 0 },
  "branches": { /* BranchNode 树（v1 只有单链，v2 补齐分岔） */ },
  "annotationsRuleset": [ /* M5 规则集，已有 */ ]
}
```

原则：所有字段真实可测才收录；fingerprint/gpu 拿不到就省略而不是编。体积评估：200 token × top-8 ≈ 60–120KB JSON，gzip 后 <30KB，适合分享。

## 四、Machine Score 评分方法草案

基座：DiscoverPage 现有真实探测（WebGPU/fp16/内存/核心数 tier）+ 真实 benchmark（固定 prompt 生成 48 token 实测 tok/s）+ shareCard.ts 1200×630 导出管线。

```
AI Machine Score = 100 × Σ w_i · s_i
  s_speed   = log 归一化 tok/s（对固定参考模型，如 Qwen3 0.6B q4f16）
  s_scale   = 本机可稳定加载的最大内置模型档位（实际加载成功为准）
  s_backend = webgpu=1 / wasm=0.4（实测后端，不按 UA 猜）
  s_steady  = 生成期 tok/s 变异系数（稳定性，已有 dt 序列可算）
```

- 一切输入实测可复现：跑分卡上印测试条件（模型、token 数、后端、浏览器）
- 全球排名需后端，V1 只出「本机分数 + 测试条件 + 分享卡」，卡上明示「单机跑分，无榜单」
- 防误导：不同模型/参数的分数不可比，UI 强制展示测试配置

## 五、风险清单

| 风险 | 等级 | 缓解 |
|---|---|---|
| 软件光栅设备 3D 不可用 | 高（已实测） | 能力检测 + 2D 降级（必做，不是可选项） |
| 用户本机 GPU 上「推理+渲染」同跑未实测 | 中 | V1 第一周在用户本机跑 spike 页验证；云端无 GPU 无法代测 |
| Three.js 学习/维护成本 | 低 | 只用 InstancedMesh/Points/Line/Raycaster 小子集；不引 postprocessing |
| 包体 +126KB gzip | 低 | 路由级懒加载 |
| .aitrace 兼容断裂 | 低 | v1 导入分支永久保留，v2 只增不改 |
| 视觉滑向「赛博朋克驾驶舱」 | 中 | 设计走查以「90% 黑白灰+10% 数据色」「每个 3D 维度可解释」为验收项 |

## 六、验证材料

- spike 工程：云端 `~/spike/index.html`（Three.js instanced Ocean 模拟，含 lite 降级参数）
- 实测截图：spike-ocean.png（满载场景渲染正确性已确认）
- 包体构建：`vite build` 产物 511KB/126KB gzip
- 本文档数字对应的原始命令与输出保存在会话记录中，可复查
