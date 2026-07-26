# DeepSeek-R1 浏览器本地推理（WebGPU）

纯前端在浏览器里跑大模型：React 19 + Vite + TypeScript + TailwindCSS v4 + @huggingface/transformers（transformers.js）。
零 Python、零后端、零 API Key，模型内置在本服务，推理全部在访问者自己的机器上完成，数据不出设备。

## 快速开始

需要 Node ≥ 20（本机可用 nvm 切换：`nvm use 24.14.1`）。

```bash
npm install
npm run dev        # HTTPS 开发服务（自签证书）
```

用 **Chrome / Edge 113+** 打开 https://localhost:5173 ，首次访问自签证书提示时点「高级 → 继续前往」。
打开页面后模型自动加载，无需任何操作。

### 局域网共享（让同事用他自己的显卡跑）

```bash
npm run dev -- --host
```

同一 WiFi 下的同事访问 `https://<你的局域网IP>:5173`（如 https://192.168.0.107:5173）。
注意：

- 必须用 **https://**（WebGPU 只在安全上下文开放，http+局域网 IP 会显示"不支持 WebGPU"）；
- 首次同样要点「高级 → 继续前往」；
- 打不开时检查 Windows 防火墙是否放行了 Node；
- **算力属于访问者**：谁的浏览器打开页面，就用谁的 GPU/CPU 推理，你的电脑只负责发送网页和模型文件。

## 模型（已内置，无需外网）

模型文件放在 `public/models/`，运行时纯本地加载（`src/worker.ts` 中 `env.allowRemoteModels=false`）：

| 场景 | 模型 | 量化 | 大小 |
|---|---|---|---|
| WebGPU（有显卡） | onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX | q4f16 | ~1.4GB |
| WASM/CPU 兜底（无 WebGPU） | onnx-community/Qwen3-0.6B-ONNX | q4 | ~0.9GB |

首次打开时浏览器从本服务读取权重并缓存到 Cache Storage，之后再打开秒开；清浏览器缓存才需要重新加载。

> 为什么 CPU 模式换小模型：onnxruntime-web 的 32 位 WASM 堆内存上限约 4GB，1.5B q4（1.83GB）在创建会话时会 `bad_alloc` 加载失败；0.6B 同样带思考链，CPU 可正常运行（约 1 token/s，仅作兜底）。

## 功能

- 打开页面自动加载模型，进度条 + GPU/CPU 模式徽标
- 流式输出、tokens/秒统计、停止生成（CPU 模式下停止无法即时生效，属 WASM 线程限制）
- 深度思考过程（`<think>` 思考链）折叠面板，可在设置中开关
- Markdown 渲染（代码块/表格/引用），DOMPurify 防 XSS
- 多会话：新对话 / 切换 / 删除，历史存 localStorage，刷新不丢，标题取自首条消息
- 复制回答、重新生成
- 生成参数设置：最大 tokens / 温度（默认 0.7，官方推荐；调 0 会复读）/ Top-P，自动持久化

## 测试与质量

```bash
npm test           # vitest：28 项单元 + 组件 + App 全链路（模拟 Worker）测试
npm run lint       # oxlint
npm run build      # 生产构建
npm run loadtest   # autocannon 压测（需先 npm run build && npx vite preview）
```

压测参考：静态服务 200 并发 10s，17 万+ 请求 0 错误，p99 15ms。
注意静态并发 ≠ 推理并发：每个访问者的浏览器独立加载模型、独立用自己的硬件推理，互不影响。

## 常见问题

**算力从哪来？** 访问者自己电脑的显卡。WebGPU（`navigator.gpu`）让 JS 直接调用本机 GPU 做矩阵运算；
无 WebGPU 时降级 WASM 用 CPU。推理全程在本地，不经过任何服务器。

**效果能和真正的大模型比吗？** 是"真的大模型"，但只是 1.5B 蒸馏版：日常问答、摘要、简单推理没问题，
知识面和复杂推理不如云端满血版（671B）。

**为什么内置了还要"加载"？** 内置指模型文件在本服务里（不走外网），但浏览器跑模型仍需把权重读进
显存/内存，这一步无法省略；首次读一遍后走浏览器缓存，再打开几乎秒过。

## 开发规则（AI / 人类贡献者必读 · 本项目对话沉淀）

> 详细住址：`AGENTS.md`（开工流程）、`docs/任务看板.md`（实时任务状态）、`docs/合规速查表.md`（红线全文）。本节是速查总纲，冲突以四卷宪法裁决。

### 1. 开工前（每次任务，无例外）

- 先读 `AGENTS.md`（先判定任务类型）→ `docs/00-START-HERE.md`（单页入口）→ Kernel 摘要（合规速查表 / Cognitive-DNA / Visual-DNA）→ `docs/任务看板.md`（现在做到哪、下一步做什么）→ 按 `docs/AOKS/CONTEXT-ROUTER.md` 只加载当前任务那一行的文件链。
- **永不全量加载文档**；读文档先查 `docs/AOKS/DOC-INDEX.md` 按行号取段（省 token 规范见 `docs/AOKS/TOKEN-DIET.md`）；历史讨论/验收记录不回翻，任务状态以看板为准。
- 权威层级与冲突裁决见 `docs/AOKS/SOURCE-OF-TRUTH.md`；文档角色/生命周期见 `docs/AOKS/DOCUMENT-LIFECYCLE.md`。
- 视觉/交互/新模块改动，写代码前按 `docs/AOKS/PRODUCT-DELIVERY-WORKFLOW.md` 填一张设计决策卡，并过 `docs/AOKS/DESIGN-REVIEW.md` 四视角审查。

### 2. 环境准备

- Node ≥ 20（本机 `nvm use 24.14.1`；云端开发验证用 22.23.1），`npm install` 后 `npm run dev`（HTTPS 自签证书）。
- 模型权重在 `public/models/`，纯本地加载不走外网（`env.allowRemoteModels=false`）。
- 云端机通常无 GPU：涉及 WebGPU 的修复（如量化精度）只能做根因分析 + 官方指定，最终效果必须用户本机实测确认，如实说明这一限制。

### 3. 写代码的要求

- **单文件 ≤500 行、只答一个问题**，超了就拆；一句原则只存一处（NRP），别处只写 See。
- **复用现有组件/接口，不造新交互模式**：时间线、下钻、Inspector、fork 等一律走既有部件。
- **不伪造数据**：任何动画/数字必须对应真实 trace/真实调用；没有数据就不动、不展示假 UI；演示文字全部来自真实 trace。
- **Evidence First 三层永远分开**：官方引用 / 本机测量 / 行为基准；官方成绩逐条核验过才收录，宁缺毋假。
- 新功能过五闸（AODL 六层栈 / 四卷宪法 / Evidence First / Cognitive DNA / Product Grammar 五段式），见 `docs/E5-双轨开发计划.md §3`。

### 4. 产品与设计红线（对话定调）

- **3D 表达数据，2D 表达意义**：视觉焦点永远跟着当前 token；柱子要长字（语义层 + 玻璃 Label），不许出现用户看不懂的裸柱子。
- **Token 退居第二层，Decision 才是第一层**：普通用户先看懂"AI 在做什么决定"，工程师/研究员逐层下钻（渐进式认知）。
- **留思考空间**：Replay 用章节停点（真实关键步主动停下等用户继续），不许一口气自动播完。
- 不做城市/星球/HUD/"AI 苏醒"拟人动画；砍掉纯装饰粒子；让真实运行本身成为特效。

### 5. 测试与验证（交付前必须全绿）

```bash
npx tsc -b        # 0 错误
npm run lint      # 0 警告
npx vitest run    # 全部通过
npm run build     # 构建成功
```

UI 改动还需浏览器实测（截图证据），修 bug 先复现根因再改。

### 6. 交付与写回（本机桥接协作）

- 验证全绿后经桥接写回本机工程：按**原相对路径原文件名**落盘、逐文件 **SHA-256 校验**、bundle 带 `handoff.summary` 一句话说明本次改动。
- 一次性调试/写回脚本只留云端，**不写进用户工程**；写回只放交付物。
- **每完成一项任务当场更新 `docs/任务看板.md` 并随代码写回**，不留过期状态。
- 汇报纪律：全部做完再统一汇报，不做浪费 token 的中间动作；代码优化与自审是必要环节。

## 目录结构

```
public/models/               # 内置模型权重（不进 git）
scripts/loadtest.mjs         # 静态服务压测
src/
  App.tsx                    # 主状态机：自动加载 → 对话；会话/参数/Worker 消息处理
  worker.ts                  # Web Worker：设备检测、本地模型加载、流式推理、中断
  lib/chatStore.ts           # 会话与参数的 localStorage 持久化
  lib/thinking.ts            # <think> 思考链解析（支持流式中间态）
  lib/markdown.ts            # marked + DOMPurify
  components/ChatMessage.tsx # 消息气泡 + 思考面板 + 复制/重新生成
  components/Sidebar.tsx     # 会话列表
  components/SettingsPanel.tsx # 生成参数设置
  components/Progress.tsx    # 下载进度条
  *.test.ts(x)               # vitest 测试
```
