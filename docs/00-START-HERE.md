# 🚀 快速上手指南

> 5 分钟从零到运行：本地大模型对话、Trace 可视化、多模态交互

## 目录

1. [环境要求](#环境要求)
2. [快速启动](#快速启动)
3. [核心功能](#核心功能)
4. [常见问题](#常见问题)
5. [深入学习](#深入学习)

---

## 环境要求

### 硬件
- **GPU**：支持 WebGPU 的显卡（推荐）
  - NVIDIA GTX 1060 / AMD RX 580 或更高
  - 显存 ≥ 4GB
- **CPU**：4 核心或以上（WASM CPU 模式备用）
- **内存**：≥ 8GB（运行 1.5B 模型需约 3-4GB）
- **存储**：≥ 10GB 可用空间（模型缓存）

### 软件
- **浏览器**：Chrome 113+ / Edge 113+（支持 WebGPU）
- **Node.js**：≥ 18.0.0（开发环境）
- **npm**：≥ 9.0.0

### 检查 WebGPU 支持
在浏览器控制台运行：
```javascript
navigator.gpu ? '✅ WebGPU 可用' : '❌ WebGPU 不支持'
```

不支持 WebGPU？
- 更新浏览器到最新版本
- 更新显卡驱动
- 在 `chrome://flags` 中启用 WebGPU

---

## 快速启动

### 1️⃣ 克隆项目
```bash
git clone https://github.com/yourusername/webgpu-llm-chat.git
cd webgpu-llm-chat
```

### 2️⃣ 安装依赖
```bash
npm install
```

首次安装大约需要 1-2 分钟（依赖包约 150MB）。

### 3️⃣ 启动开发服务器
```bash
npm run dev
```

看到以下输出表示成功：
```
VITE v7.3.6  ready in 420 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 4️⃣ 打开浏览器
访问 http://localhost:5173，看到首页标题 **WebGPU LLM Chat**。

点击 **"开始对话"** 进入工作区。

### 5️⃣ 首次加载模型
- 默认选择 **Phi-3.5-mini-instruct**（1.5B 参数）
- 首次运行会从 HuggingFace 下载模型（约 1GB，需 2-5 分钟）
- 下载完成后模型缓存在浏览器中，后续秒开

**加载进度**：工具栏会显示下载百分比和速度。

### 6️⃣ 开始对话
输入 "你好，请介绍一下自己"，点击发送 ↑。

**首次推理**需要编译 GPU 着色器（约 5-10 秒），之后生成速度：
- WebGPU 模式：10-30 tokens/s（取决于 GPU）
- WASM 模式：2-5 tokens/s（纯 CPU）

---

## 核心功能

### 💬 对话模式（Create）
**位置**：主页 → 开始对话

**功能**：
- 多轮对话，自动保存会话历史
- 切换不同模型（Phi/Qwen/Gemma/Llama）
- 调整生成参数（温度、Top-P、最大长度）
- 文档上传（PDF/Word/Excel/Txt）
- 图像理解（JPG/PNG/WebP）
- 联网搜索（实时信息）

**快捷键**：
- `Enter`：发送消息
- `Shift + Enter`：换行
- `Ctrl/Cmd + K`：新建会话
- `Ctrl/Cmd + /`：打开设置

### 🔬 观测模式（Observe）
**位置**：侧边栏 → Observe

**功能**：
- 可视化 Token 采样过程（3D 柱状图）
- 查看每步候选词和概率分布
- 计算精确熵值（分布不确定性）
- 时间轴回溯（上一步/下一步）
- 导出 .aitrace 文件（完整 trace 数据）
- 对比不同参数的生成结果

**使用场景**：
- 理解模型如何选择下一个词
- 调试生成参数（温度太高？Top-P 太小？）
- 教学演示（AI 决策过程可视化）

**演示数据**：点击 "加载演示" 查看预录 trace。

### 📊 统计分析
**位置**：侧边栏 → 本地统计

**功能**：
- 会话数、总 Token 数、平均生成速度
- 按模型聚合性能指标
- 按参数（温度+Top-P）聚合效果
- 熵分布和温度使用频率可视化
- 导出 CSV/JSON 报告

**数据来源**：localStorage（本地会话）+ IndexedDB（Observe 存档）

### 🏆 Benchmark
**位置**：侧边栏 → Benchmark

**功能**：
- 官方模型评测成绩（AIME/MATH/GPQA 等）
- 浏览器内实测性能对比（Token/s、加载时间）
- 设备兼容性报告（WebGPU 可用性）

### 🧪 实验工具
**位置**：侧边栏 → Journey

**功能**：
- 对比视图（Compare View）：并排查看两次生成的差异
- 海洋视图（Ocean View）：大规模 trace 数据 3D 可视化
- 仪表盘（Instrument Cluster）：实时性能监控

---

## 常见问题

### Q1: 模型下载失败怎么办？
**现象**：进度条卡在某个百分比不动。

**解决方案**：
1. 检查网络连接（国内访问 HuggingFace 可能较慢）
2. 刷新页面重试（断点续传）
3. 切换到更小的模型（Qwen3-0.6B 仅 600MB）
4. 使用代理加速 HuggingFace 访问

### Q2: WebGPU 不可用，能用吗？
**现象**：横幅提示 "WebGPU 不可用"。

**答案**：可以！自动降级到 WASM CPU 模式。

**性能对比**：
- WebGPU：10-30 tokens/s
- WASM：2-5 tokens/s（约 5 倍慢）

**改善方法**：
- 更新浏览器和显卡驱动
- 使用支持 WebGPU 的浏览器（Chrome/Edge 113+）

### Q3: 生成速度很慢怎么办？
**可能原因**：
1. **首次运行**：着色器编译需要 5-10 秒（一次性）
2. **WASM 模式**：CPU 推理比 GPU 慢 5 倍
3. **低端 GPU**：集成显卡性能有限
4. **大模型**：7B 参数模型需要更强 GPU

**优化建议**：
- 使用 WebGPU 模式（检查兼容性横幅）
- 选择更小模型（Phi-3.5-mini 1.5B）
- 降低最大长度（512 → 256 tokens）
- 关闭其他占用 GPU 的标签页

### Q4: 如何清除模型缓存？
**场景**：模型损坏或想释放存储空间。

**步骤**：
1. 打开浏览器开发者工具（F12）
2. Application → Cache Storage
3. 删除 `transformers-cache`
4. 刷新页面重新下载

**缓存位置**：
- Chrome: `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Cache`
- 大小：每个模型 0.5-2GB

### Q5: 多模态功能怎么用？
**文档理解**：
1. 点击输入框左侧 📎 按钮
2. 选择 PDF/Word/Excel/Txt 文件（≤6000 字符）
3. 输入问题："这份报告的核心结论是什么？"
4. 发送消息

**图像理解**：
1. 点击 📎 上传 JPG/PNG/WebP 图片（最多 2 张）
2. 输入问题："图中有什么？"
3. 首次使用会下载 SmolVLM-256M 视觉模型（约 200MB）

**联网搜索**：
1. 点击输入框右侧 🌐 按钮开启
2. 提问："2026年最新的 AI 新闻"
3. 模型会先搜索，再基于结果回答

### Q6: Observe 模式看不懂？
**核心概念**：
- **Token**：词或字符片段（如 "Hello" 是一个 token）
- **概率分布**：模型为每个候选词打分（softmax 归一化后的概率）
- **Top-K**：只保留概率最高的 K 个候选（默认 K=8）
- **熵（Entropy）**：分布的不确定性，熵越高表示选择越纠结

**3D 可视化**：
- X 轴：候选词
- Y 轴：概率（0-1）
- 绿色柱子：被选中的 token
- 蓝色柱子：未选中的候选

**实用技巧**：
- 点击候选词查看完整分布（展开所有 top-k）
- 拖动时间轴查看每一步的决策过程
- 对比不同温度：0.1（保守）vs 1.0（创造性）

---

## 深入学习

### 📖 推荐阅读顺序
1. **本文档**（你在这里）：5 分钟快速上手
2. [docs/任务看板.md](./任务看板.md)：了解项目开发进度和已完成功能
3. [docs/合规速查表.md](./合规速查表.md)：UI 设计红线和规范
4. [AGENTS.md](../AGENTS.md)：AI 辅助开发工作流（如果存在）
5. [README.md](../README.md)：项目架构和技术栈详解

### 🛠️ 开发者资源

**核心技术栈**：
- React 19 + TypeScript 6
- Vite 7.3.6（构建工具）
- Tailwind CSS 4（样式）
- transformers.js 4.2.0（WebGPU 推理）
- Three.js 0.185（3D 可视化）

**关键目录**：
```
src/
├── lib/
│   ├── worker.ts          # 推理 worker（模型加载和生成）
│   ├── trace.ts           # Trace 数据结构和记录
│   ├── device.ts          # 设备探测和兼容性
│   ├── models.ts          # 模型注册表
│   └── experiments.ts     # IndexedDB 存储
├── components/
│   ├── SamplingChamber.tsx  # 3D 采样可视化
│   ├── ChatMessage.tsx      # 消息气泡
│   └── EnhancedInput.tsx    # 增强输入框
└── App.tsx                # 主应用入口
```

**开发命令**：
```bash
npm run dev          # 启动开发服务器
npm run build        # 生产构建
npm run preview      # 预览生产构建
npm run test         # 运行单元测试
npm run test:e2e     # 运行 E2E 测试
npm run lint         # 代码检查
```

**调试技巧**：
1. **查看推理日志**：打开控制台，Worker 输出在单独 tab
2. **监控性能**：开发模式下 `window.__profiler__` 暴露性能 API
3. **检查 Trace**：Observe 模式 localStorage 存储完整 trace
4. **GPU 内存**：`chrome://gpu` 查看显存占用

### 🤝 贡献指南

**准备工作**：
1. Fork 项目到你的 GitHub
2. 克隆 fork 后的仓库
3. 创建新分支：`git checkout -b feature/your-feature`
4. 阅读 [docs/合规速查表.md](./合规速查表.md)（UI 改动必读）

**开发流程**：
1. 修改代码并本地测试
2. 运行测试确保通过：`npm run test && npm run test:e2e`
3. Commit 信息格式：`feat: 添加 XXX 功能` / `fix: 修复 XXX 问题`
4. Push 到你的 fork
5. 提交 Pull Request

**Commit 规范**：
- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档更新
- `style:` 代码格式（不影响功能）
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建/工具配置

**测试要求**：
- 新功能需添加单元测试（vitest）
- UI 改动需添加视觉回归测试（Playwright）
- 确保所有测试通过：`npm run test && npm run test:e2e`

### 🐛 报告问题

**Issue 模板**：
```markdown
**问题描述**
简洁描述遇到的问题。

**复现步骤**
1. 打开应用
2. 点击...
3. 看到错误...

**预期行为**
应该发生什么。

**实际行为**
实际发生了什么。

**环境信息**
- 浏览器：Chrome 120
- 操作系统：Windows 11
- GPU：NVIDIA RTX 3060
- WebGPU 可用：是 / 否

**截图**
（如果适用）

**控制台日志**
（F12 → Console 中的错误信息）
```

### 📞 获取帮助

- **GitHub Issues**：https://github.com/yourusername/webgpu-llm-chat/issues
- **Discussions**：https://github.com/yourusername/webgpu-llm-chat/discussions
- **Email**：your-email@example.com

---

## 🎯 下一步

完成快速上手后，推荐：

1. **试玩所有功能**：对话、Observe、统计、Benchmark
2. **上传文档/图片**：体验多模态能力
3. **调整参数**：对比不同温度/Top-P 的效果
4. **查看 Trace**：理解模型决策过程
5. **阅读任务看板**：了解已完成和待开发功能

**Have fun! 🚀**

---

**最后更新**：2026-08-05  
**维护者**：开发团队  
**许可证**：MIT
