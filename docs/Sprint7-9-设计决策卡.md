# 设计决策卡 · Sprint 7–9「思路地图 + 没走的路 + 注意力聚光灯调研」

> 铁律不变：所有数字来自真实 trace；无数据诚实缺席；复用既有 Replay/fork，不整页重造。

## Sprint 7 · 思路地图（ThoughtMap）

- **问题**：回放完 229 步后，用户没有「这次它是怎么想过来的」的总览。
- **分段依据**（`lib/thoughtMap.ts`，有测试）——只用两类真实信号：
  1. `<think>`/`</think>` 思考段边界：在 steps[].text 中实测定位（示例 trace `</think>` 在第 208 步）；**没有该边界的 trace 整个组件缺席**。
  2. 思考段内熵拐点：滑窗 7 步平滑熵对段均值的穿越点，段长下限 12 步，最多拆 3 站。
- **站名白名单**（每个名字锚定一个测量事实，不做拟人臆测）：`审题`（思考段第一站）、`反复权衡（熵最高段）`（仅赋给实测均熵最高的段）、`推理展开`（其余思考段）、`收束作答`（`</think>` 之后的正文段）。
- **UI**：横向站点卡（宽度∝步数）+ 底部 token 色条（紫=思考、绿=正文，宽度与步数严格成比例）+ 一句实算 headline；点站 = `stepDemoTo(start)`/`jumpToToken(start)` 回放该段，复用现有 Replay 不新造播放器。
- **挂载**：演示 Replay done 态 + 真实运行 done 态。

## Sprint 8 · 没走的路（RoadsNotTaken）

- **静态层**：取 `closeSteps`（既有犹豫口径）差距最小的前 3 步，展示上文 + 实选 token（绿）+ 真实落选 top-2（紫色虚线幽灵样式 + 概率/差距 chip）。**不虚构落选路径的后续文字**，卡上明说「后续未被记录，这里不虚构」。
- **动态层「试跑那个宇宙」**：复用既有 `fork(displayIdx, candId, candText)` 真实续跑（同一模型、强制改选后重新采样）。按钮**仅在 canFork（模型在场、分支数未超限）时出现**；演示 trace 无模型 → 按钮诚实缺席。按钮文案自带「模拟续跑 · 非本次记录」标注。
- **挂载**：与思路地图同区（done 态收束区）。

## Sprint 9 · 注意力聚光灯 · 可行性调研结论（本期只调研，不做 UI）

- **runtime**：@huggingface/transformers 4.2.0。
- **API 层**：`generate()` 支持 `return_dict_in_generate + output_attentions`，内部 `getAttentions(outputs)` 会收集名含 `attentions` 的输出张量（`src/models/modeling_utils.js:966-974`）。
- **模型层（瓶颈）**：能否拿到注意力取决于 ONNX 导出是否包含 attention 输出。官方 onnx-community 的因果 LM 导出（Qwen3/DeepSeek-R1 蒸馏等）通常只输出 logits + KV cache，**不含 attention 张量**（库内仅 Whisper 系导出用于词级时间戳）。即使重导出，全量 attention 为 层×头×seq² 规模，浏览器内存与 trace 体积都不可行。
- **结论**：产品侧暂不做注意力 UI（诚实缺席）。若未来落地，路径为：① 自行重导出带 attention 输出的 ONNX（仅保留最后一层、按 top-N 截断）；② `.aitrace` 增加 `extensions.attention: { layer, topN, perStep: [{ step, sources: [{ pos, weight }] }] }`（截断 top-N，控制体积）；③ UI 连线粗细 = 真实权重 + 右侧权重读数卡。在 ① 完成前，任何注意力可视化都是伪造，不做。

## 验证

`npx tsc -b` / `npm run lint` / `npx vitest run` / `npm run build` 全绿；新增 thoughtMap 单测覆盖缺席、分段连续性、熵峰标注、headline 实算。
