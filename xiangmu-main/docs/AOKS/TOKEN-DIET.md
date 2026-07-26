# TOKEN-DIET · 省 token 作业规范（借鉴 Headroom，零依赖工程化）

> 只答一个问题：**AI 协作怎么用最少 token 拿到同等甚至更好的效果。**
> 机制借鉴 Headroom（压缩层可逆、内容路由、前缀稳定），全部用本仓库自有手段实现，原文一字不改，效果无损。

## 三层机制（对应 Headroom 概念）

| 本仓库手段 | 借鉴的机制 | 规则 |
|---|---|---|
| `docs/AOKS/DOC-INDEX.md`（自动生成） | CCR 压缩层 | 找内容先查索引拿到「文件+行号」，**再只读该行号附近片段**；索引即压缩视图，原文即可逆层 |
| Context Router + 任务分类 | ContentRouter | 按任务类型只加载对应文件链，禁止「可能有用就读」 |
| Kernel 三件套固定不动 | CacheAligner | 合规速查表/两份 DNA 保持稳定少改，会话间前缀一致，认知不漂移 |

## 读取纪律（每次任务）

1. 查 `DOC-INDEX.md` → 定位目标文件与标题行号。
2. 按行取段：本地 `read offset/limit`；桥接 `GET /api/file?path=...&offset=N&limit=M`。**整篇加载是违例**，除非文件 ≤60 行。
3. 找代码/文字用搜索拿「行号+命中行」（本地 grep -n；桥接 `/api/search?q=...&matchLines=1`），不下载全文来翻。
4. 大 JSON/日志/命令输出：先 `head/tail/grep` 提取，再决定要不要看更多；不把原始长输出直接塞进上下文。

## 写入纪律

- **NRP 即压缩**：一句原则只存一处，引用只写 `See <住址>`；禁止为省事复述（复述=永久性 token 泄漏）。
- 交付汇报一次说清（做了什么/证据/边界），不发中间碎片消息。
- 桥接写回带 `handoff.summary` 一句话；会话续接靠任务看板，不靠回翻对话。

## 维护

- 文档有增删改标题后：`node scripts/build-doc-index.mjs` 重新生成 DOC-INDEX 并随交付写回。
- 本仓库文档单文件 ≤500 行（铁律），无需另写摘要文件——手写摘要会成为第二事实源，违反 NRP。
- 本机编码 Agent（Codex/Cursor 等）另可上 Headroom 真压缩：See `docs/headroom-省token接入.md`。
