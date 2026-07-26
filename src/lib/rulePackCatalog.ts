/** 规则包目录（锚点 E1）：随构建内置的官方规则包，无后端、无假社区。
 *  纪律：阈值必须在录制示例 trace 上校准——命中率 >0 且 ≤30/100 token，
 *  否则退回校准（见 rulePackCatalog.test.ts 的守门测试）。
 *  分享途径只有两条：导出 .rulepack.json 文件，或向仓库 community-packs 目录提交。 */

import type { Rule } from "./rules";

export interface CatalogPack {
  id: string;
  name: string;
  version: string;
  /** 这包规则帮你看什么（认知问题，不是功能描述） */
  description: string;
  /** 校准记录：在哪份真实数据上校准、命中率多少 */
  calibration: string;
  rules: Rule[];
}

export const RULE_PACK_CATALOG: CatalogPack[] = [
  {
    id: "official/hesitation-observer",
    name: "犹豫观察",
    version: "1",
    description: "AI 什么时候在犹豫？标出候选分布分散的步和从长尾捞出来的词。",
    calibration: "录制示例 trace（229 steps）：48 hits ≈ 21/100 token",
    rules: [
      {
        id: "hesitation/spread",
        scope: "step",
        when: [{ field: "entropy", op: ">", value: 2.35 }],
        annotate: {
          label: "分布分散",
          severity: "warn",
          explain: "该步候选分布的熵为 {entropy}，模型在多个候选间明显犹豫",
        },
        enabled: true,
      },
      {
        id: "hesitation/tail-pick",
        scope: "step",
        when: [{ field: "prob", op: "<", value: 0.05 }],
        annotate: {
          label: "长尾选中",
          severity: "warn",
          explain: "被选中 token 的真实概率仅 {prob}，来自分布长尾",
        },
        enabled: true,
      },
    ],
  },
  {
    id: "official/latency-lab",
    name: "延迟实验",
    version: "1",
    description: "哪些步慢得反常？按相对中位数 + 绝对耗时双条件标出异常慢步。",
    calibration: "录制示例 trace（229 steps）：38 hits ≈ 17/100 token",
    rules: [
      {
        id: "latency/outlier",
        scope: "step",
        when: [
          { field: "dtMedianRatio", op: ">", value: 2.5 },
          { field: "dt", op: ">", value: 400 },
        ],
        annotate: {
          label: "慢步",
          severity: "info",
          explain: "该步耗时 {dt}ms，是本次生成中位数的 {dtMedianRatio} 倍",
        },
        enabled: true,
      },
    ],
  },
  {
    id: "official/degeneration-watch",
    name: "复读哨兵",
    version: "1",
    description: "输出开始绕圈了吗？检测独立重复出现的 3-gram 复读征兆。",
    calibration: "录制示例 trace（229 steps）：6 hits ≈ 2.6/100 token",
    rules: [
      {
        id: "degen/ngram-loop",
        scope: "trace",
        when: [],
        ngram: { n: 3, times: 3 },
        annotate: {
          label: "疑似复读",
          severity: "warn",
          explain: "3-gram 在文中独立重复 ≥3 次，疑似进入复读循环",
        },
        enabled: true,
      },
    ],
  },
  {
    id: "official/deep-tail",
    name: "深长尾",
    version: "1",
    description: "采样什么时候真正冒险？只标概率 <2% 的极深长尾选中。",
    calibration: "录制示例 trace（229 steps）：13 hits ≈ 5.7/100 token",
    rules: [
      {
        id: "deep-tail/pick",
        scope: "step",
        when: [{ field: "prob", op: "<", value: 0.02 }],
        annotate: {
          label: "极深长尾",
          severity: "warn",
          explain: "被选中 token 的真实概率仅 {prob}（<2%），是一次真正的冒险采样",
        },
        enabled: true,
      },
    ],
  },
];
