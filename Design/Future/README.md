# Design / Future · 未来模块体验稿

> 只放 **Markdown / Mermaid / 流程图 / 体验稿**，不放 TS / Vue / CSS。
> 这里是 E5 双轨开发计划的**轨道二**（见 `docs/E5-双轨开发计划.md`）：
> 未来功能先设计到纸面、暂不写代码，等 Phase C 过五闸后再实现。
>
> 像 Apple 的功能——设计早两年，代码晚两年。目的：真正开发时零返工，
> 每个模块早已属于同一个世界观、同一种设计语言、同一套认知体系。

## 目录

| 模块 | 事实源锚点 | 状态 |
|---|---|---|
| `E1-规则包目录/` | 直通E5规划 §E1 | **已实现**（内置目录 + 校准守门测试，见 `src/lib/rulePackCatalog.ts`）|
| `E2-分享链接/` | 直通E5规划 §E2 | **已实现**（demo hash 切片 + 全局 .aitrace 拖放，见 `src/lib/demoLink.ts`）|
| `E3-多模型对比/` | 直通E5规划 §E3 | 待 Phase B 填充 |
| `E4-Agent观察/` | 直通E5规划 §E4 | **E4a 已实现**（agent 事件 schema + 时间线回放；支持多模型串联：事件级 `model` 徽标 + `model_handoff` 交接边界，导入真实 pipeline trace 即可完整回放；决策层 reason/confidence/evidence + Model Responsibility 责任条已实装；分层协议见 `E4-Agent观察/Observation-Trace-v1.md`）；E4b spike 部分完成：本地工具与 ReAct 解析器已实装并单测（`src/lib/agentSpike.ts`），但「小模型能否稳定产出可解析工具调用 JSON」需真机端到端验证，验证前不接入生成主流程、Agent 数据只来自外部 .aitrace——不造假数据，如实搁置 |
| `E5-采样显微镜/` | 直通E5规划 §E5a | **已实现**（深度采集默认关 + 温度反事实纯函数，见 `src/lib/microscope.ts`）；E5b 注意力级：运行时不暴露 attention，不做也不假装 |
| `D6-成绩单页/` | 直通E5规划 §D6 | **已实现**（三层永远分开，见 `src/components/BenchmarkPage.tsx`）|

## 怎么写

每个模块新建一个文件夹，照 `_模板-体验稿.md` 填写。写完先过 AODL 六层栈自检，
尤其 Layer 1 认知阶梯：**这个模块在用户认知里接哪一阶、埋哪个下一阶的钩子。**

在进入 Phase C 前，另按 `docs/AOKS/PRODUCT-DELIVERY-WORKFLOW.md` 填一张设计决策卡，并用
`docs/AOKS/DESIGN-REVIEW.md` 做多角色反驳。体验稿解决“未来模块是否值得存在”，决策卡解决“这次实现是否仍然真实、可理解且不落入模板化 AI 视觉”。

事实源优先级：四卷宪法 > AODL（`docs/AODL/`）> 本目录体验稿。冲突以上游为准。
