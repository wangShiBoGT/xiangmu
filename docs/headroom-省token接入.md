# Headroom 省 token 接入指南（本机 AI 开发工作流）

> 只答一个问题：**怎么用 Headroom 降低本项目 AI 协作的 token 花费。**
> 定位：Headroom（https://github.com/headroomlabs-ai/headroom ，Apache 2.0）是 Agent 上下文压缩层，压缩 AI 读到的工具输出/日志/文件/历史（JSON 60–95%、代码 15–20%），可逆（CCR 随时取回原文），全部本地运行、数据不出机。
> **不进产品本体**：webgpu-llm-chat 是纯前端零后端，Headroom 需要本地 Python 代理，两者定调冲突；本指南只作用于开发侧。

## 能省到哪里（诚实边界）

| 场景 | 能否省 | 说明 |
|---|---|---|
| 本机 Codex / Cursor / Claude Code 会话 | ✅ 主战场 | wrap 后所有读入内容自动压缩，输出端也会削减套话 |
| 云端 Devin 会话 | ❌ 直接省不了 | Devin 跑在云端 VM，不经过你本机代理；Devin 侧靠 AOKS 最小加载纪律省 |
| 桥接传输的文件内容 | ✅ 间接 | 被 wrap 的本机 Agent 读桥接/日志输出时一并压缩 |

## 一、安装（Windows 注意）

Headroom 暂无 Windows 预编译 wheel（官方 issue #636），`pip install` 会从源码编译 Rust 扩展，**需要 MSVC 工具链**。三选一：

```powershell
# 方案 A（推荐，零编译）：Docker 跑代理
docker run -p 8787:8787 ghcr.io/chopratejas/headroom:latest

# 方案 B：装了 Visual Studio Build Tools（含 C++）再 pip
pip install "headroom-ai[all]"     # 需 Python 3.10+，推荐 3.13

# 方案 C：WSL 内安装（Linux 有预编译 wheel，最省事）
uv tool install --python 3.13 "headroom-ai[all]"
```

装好后自检：`headroom doctor`（方案 A 无 CLI，跳过 doctor，直接用代理端口）。

## 二、接入方式（按省事程度排序）

### 1. wrap 编码 Agent（一条命令，需 B/C 方案的 CLI）

```bash
headroom wrap codex      # 或 claude / cursor / copilot / aider ...
headroom unwrap codex    # 随时撤销
```

wrap 会自动起本地代理并把该 Agent 的请求全部走压缩管线。以后每次开编码会话都用 wrap 启动。

### 2. MCP server（Codex/Claude Code 等 MCP 客户端）

```toml
# Codex 的 config.toml
[mcp_servers.headroom]
command = "headroom"
args = ["mcp", "serve"]
```

提供 `headroom_compress` / `headroom_retrieve` / `headroom_stats` 三个工具；或直接 `headroom mcp install` 自动配置。

### 3. 代理模式（任何 OpenAI/Anthropic 兼容客户端，含 Docker 方案）

```bash
headroom proxy --port 8787    # Docker 方案端口即 8787
# 客户端 baseUrl 指向 http://127.0.0.1:8787 即可，零代码改动
```

## 三、进阶（跑顺后再开）

- `headroom learn`：离线分析失败会话，把纠正写入 `CLAUDE.local.md`（默认，gitignored）。**不要让它直接写本仓库 AGENTS.md**——AGENTS.md 是人工治理的事实源，learn 产物先人工审阅再择要合入。
- `headroom learn --verbosity --apply`：学习你偏好的回答简洁度，削减输出 token。
- `headroom dashboard` / `headroom output-savings`：实时看省了多少（输出端节省是带置信区间的诚实估计）。
- 遥测默认关闭，数据全部留在本机。

## 四、验证接入成功

1. `headroom doctor` 全绿（或代理端口能通）；
2. 用 wrap 后的 Agent 读一个大 JSON/日志，`headroom stats` 里看到压缩记录；
3. `headroom dashboard` 显示节省曲线。
