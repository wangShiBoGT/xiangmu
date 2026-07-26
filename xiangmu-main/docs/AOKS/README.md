# AOKS · AI Observatory Knowledge System

> AOKS 不是文档仓库，而是让人和 AI 在**最小必要上下文**下仍能作出一致产品判断的路由系统。

## 它解决什么

1. 不让 AI 每次读取数万 token 后才开始工作。
2. 不让“任务完成”演变成“产品越来越像工程仪表盘”。
3. 不删除项目生命周期：宪法、规划、验收和推演都保留，只改变它们被加载的时机与权威角色。

## 使用顺序

```text
AGENTS.md
  → docs/00-START-HERE.md
  → Kernel（合规速查表 + AODL 01/02 + 必要时任务看板）
  → CONTEXT-ROUTER：按任务取最小链
  → 必要时回卷到权威事实源
  → 设计决策卡 / 实现 / 验证 / 更新任务看板
```

## AOKS 文件职责

| 文件 | 只回答的问题 |
|---|---|
| `CONTEXT-ROUTER.md` | 这项任务还需要读什么？ |
| `SOURCE-OF-TRUTH.md` | 意见冲突时谁说了算？ |
| `DOCUMENT-LIFECYCLE.md` | 这个文件该被保留、更新还是归档？ |
| `PRODUCT-DELIVERY-WORKFLOW.md` | 从需求到交付，如何既有审美又不失真？ |
| `DESIGN-REVIEW.md` | 提交前怎样从不同角色攻击方案？ |
| `MIGRATION-MAP.md` | 现有文档在知识系统里扮演什么角色？ |

## 关键约束

- AOKS 只做路由、索引、流程和角色声明；不复写四卷/AODL 的规范内容。
- 一个文件只有一个职责，控制在约 500 行以内。
- “历史”不等于“废弃”：验收记录与推演仍可用于复盘，只是不参与日常路由。

详见 `SOURCE-OF-TRUTH.md` 与 `DOCUMENT-LIFECYCLE.md`。
