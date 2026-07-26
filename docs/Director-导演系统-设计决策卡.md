# 设计决策卡 · 导演系统（Director）+ Token 即入口 + 证据流场

> 交付日期：2026-07-25 ｜ 状态：已实现
> 规范住址：P25（Every Pixel Has Evidence）见 `E5-VolumeI-产品宪法.md` 第二章；本卡只记实现决策。

## 一句话

生成过程像电影一样有节奏：普通步直接打印，真正的犹豫点才上大场面——
每个动画等级都由 trace 真实字段判定，一次回答只爆 3–5 次。

## 五闸

- **AODL 六层栈**：动画分级 = 观察阶梯的强度分配（平静可读 → 犹豫点吸引注意 → 下钻证据）。
- **Product Constitution**：P25 的第一个落地实现；P6（动效解释 AI）、P13（「犹豫点」仅作索引，场面说明行给出 top-2 差与候选数）。
- **Evidence First**：判级输入只有 `steps[].entropy`（entropyLevel 档位）与 `topk` top-2 差距（与 closeSteps 犹豫点同口径 gap<5%）；无随机、无美化。
- **认知阶梯**：直播时「哪里发生了选择」被场面自动指出（下一阶钩子：点词原地展开候选 → 出生档案 → 分岔）。
- **五段式**：Question（它哪里在犹豫）→ Evidence（Birth Scene 展示该步真实候选与概率）→ Interaction（点词裂变）→ Conclusion（用户自见）→ Replay（既有回放不变）。

## 决策与理由

1. **`lib/director.ts` 排片纯函数**：plain（<0.3 档）/ flow（0.3–0.7）/ birth（≥0.7 或 top-2 差<5%）/ storm（连续≥3 步 birth 候选整段升级）。
   预算约束：两次大场面最小间隔 12 步，超频降级 flow——「一直爆就是没有爆」。前缀结果稳定，生成中可增量重算。
2. **Birth Scene（`components/BirthScene.tsx`）**：命中大场面时标本台上演一次 600ms 凝聚/飘散——
   胜者凝聚成形，落选者按真实概率决定大小、时长与透明度后飘散；说明行标注步号、top-2 差、候选数。一次性播放，无循环。
3. **Token 即入口（产品原则：Don't open panels, transform the thing itself）**：
   点击 token 原地裂变成候选堆（文本流内推挤展开 ≤300ms，不弹 Modal、不跳出上下文）；
   「出生档案 ▸」成为下一层（既有 BirthCard 与分岔能力不删）。
4. **证据流场（`components/EvidenceField.tsx`）**：正文背后三条极淡流线，波幅逐段 = `steps[].entropy` 档位——
   确定段平顺、犹豫段湍流。无 steps 不渲染（诚实缺席）；reduced-motion 静止呈现同一曲线。
   注意力驱动版（背景流向真实 attention）依赖注意力导出，主模型暂无该数据——按 P9 诚实缺席，不用噪声假装。
5. **动效红线对照**：所有场面一次性播放（无循环、无 spring）；≤600ms；生成结束后正文完全静止（列表不做入场动画）；
   reduced-motion 全部降级为直接呈现。

## 失效条件（P24）

- 若未来 runtime 提供逐步注意力，流场应升级为 attention 驱动（本卡第 4 条自动过期）。
- entropyLevel 归一化基准 ln(50) 若随模型词表结构调整，判级阈值需重校。

## 验证

`npx tsc -b` / `npm run lint` / `npx vitest run`（director 8 例 + TokenText 裂变用例）/ `npm run build` 全绿。
