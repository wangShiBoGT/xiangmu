/**
 * 模型标签系统：不同模型输出不同类型的标签（思考、反思、规划等）
 * 参考 Devin 的标签样式系统，为每种标签类型定义独立的视觉样式
 */

export type TagType =
  | "thinking"    // 思考推理：<think>, <thinking>
  | "reflection"  // 反思校验：<reflection>
  | "planning"    // 计划制定：<plan>, <planning>
  | "search"      // 搜索查询：<search>
  | "code"        // 代码执行：<code>, <execute>
  | "summary";    // 总结归纳：<summary>

export interface TagPattern {
  /** 开始标签正则 */
  open: RegExp;
  /** 结束标签正则 */
  close: RegExp;
  /** 标签类型 */
  type: TagType;
  /** 显示名称（中文） */
  label: string;
  /** 图标（emoji 或字符） */
  icon: string;
}

/** 模型标签配置 */
export interface ModelTagConfig {
  /** 模型ID或供应商标识 */
  modelPattern: string;
  /** 支持的标签类型 */
  tags: TagPattern[];
}

/** 标签样式配置 */
export interface TagStyle {
  /** 边框颜色 */
  borderColor: string;
  /** 背景颜色 */
  backgroundColor: string;
  /** 标题颜色 */
  headerColor: string;
  /** 内容颜色 */
  contentColor: string;
  /** 图标颜色 */
  iconColor: string;
}

/** 预定义标签样式（Devin 风格暗色系统） */
export const TAG_STYLES: Record<TagType, TagStyle> = {
  thinking: {
    borderColor: "rgba(99, 102, 241, 0.3)",      // 品牌蓝
    backgroundColor: "rgba(30, 41, 59, 0.4)",
    headerColor: "rgb(148, 163, 184)",
    contentColor: "rgb(203, 213, 225)",
    iconColor: "rgb(129, 140, 248)",
  },
  reflection: {
    borderColor: "rgba(168, 85, 247, 0.3)",      // 紫色
    backgroundColor: "rgba(46, 16, 101, 0.3)",
    headerColor: "rgb(167, 139, 250)",
    contentColor: "rgb(216, 180, 254)",
    iconColor: "rgb(192, 132, 252)",
  },
  planning: {
    borderColor: "rgba(14, 165, 233, 0.3)",      // 天蓝
    backgroundColor: "rgba(12, 74, 110, 0.3)",
    headerColor: "rgb(125, 211, 252)",
    contentColor: "rgb(186, 230, 253)",
    iconColor: "rgb(56, 189, 248)",
  },
  search: {
    borderColor: "rgba(34, 197, 94, 0.3)",       // 绿色
    backgroundColor: "rgba(20, 83, 45, 0.3)",
    headerColor: "rgb(134, 239, 172)",
    contentColor: "rgb(187, 247, 208)",
    iconColor: "rgb(74, 222, 128)",
  },
  code: {
    borderColor: "rgba(234, 179, 8, 0.3)",       // 黄色
    backgroundColor: "rgba(113, 63, 18, 0.3)",
    headerColor: "rgb(250, 204, 21)",
    contentColor: "rgb(254, 240, 138)",
    iconColor: "rgb(253, 224, 71)",
  },
  summary: {
    borderColor: "rgba(148, 163, 184, 0.3)",     // 中性灰
    backgroundColor: "rgba(51, 65, 85, 0.3)",
    headerColor: "rgb(148, 163, 184)",
    contentColor: "rgb(203, 213, 225)",
    iconColor: "rgb(148, 163, 184)",
  },
};

/** 模型标签配置表 */
export const MODEL_TAG_CONFIGS: ModelTagConfig[] = [
  // DeepSeek R1 系列
  {
    modelPattern: "DeepSeek-R1",
    tags: [
      {
        open: /^<think(ing)?>$/,
        close: /^<\/think(ing)?>$/,
        type: "thinking",
        label: "推理过程",
        icon: "💭",
      },
    ],
  },

  // Qwen 系列
  {
    modelPattern: "Qwen",
    tags: [
      {
        open: /^<think(ing)?>$/,
        close: /^<\/think(ing)?>$/,
        type: "thinking",
        label: "思考过程",
        icon: "🤔",
      },
      {
        open: /^<reflection>$/,
        close: /^<\/reflection>$/,
        type: "reflection",
        label: "反思校验",
        icon: "🔍",
      },
    ],
  },

  // Claude 系列（如果支持）
  {
    modelPattern: "Claude",
    tags: [
      {
        open: /^<thinking>$/,
        close: /^<\/thinking>$/,
        type: "thinking",
        label: "推理链",
        icon: "⚡",
      },
    ],
  },

  // 通用 fallback：支持常见标签
  {
    modelPattern: "*",
    tags: [
      {
        open: /^<think(ing)?>$/,
        close: /^<\/think(ing)?>$/,
        type: "thinking",
        label: "思考",
        icon: "💡",
      },
      {
        open: /^<reflection>$/,
        close: /^<\/reflection>$/,
        type: "reflection",
        label: "反思",
        icon: "🔍",
      },
      {
        open: /^<plan(ning)?>$/,
        close: /^<\/plan(ning)?>$/,
        type: "planning",
        label: "规划",
        icon: "📋",
      },
      {
        open: /^<search>$/,
        close: /^<\/search>$/,
        type: "search",
        label: "搜索",
        icon: "🔎",
      },
      {
        open: /^<code>$/,
        close: /^<\/code>$/,
        type: "code",
        label: "执行",
        icon: "⚙️",
      },
      {
        open: /^<summary>$/,
        close: /^<\/summary>$/,
        type: "summary",
        label: "总结",
        icon: "📝",
      },
    ],
  },
];

/** 根据模型ID获取标签配置 */
export function getTagConfigForModel(modelId: string): TagPattern[] {
  // 优先匹配精确模式
  for (const config of MODEL_TAG_CONFIGS) {
    if (config.modelPattern !== "*" && modelId.includes(config.modelPattern)) {
      return config.tags;
    }
  }

  // 使用通用配置
  const fallback = MODEL_TAG_CONFIGS.find(c => c.modelPattern === "*");
  return fallback?.tags ?? [];
}

/** 检测文本中的标签 */
export function detectTag(text: string, patterns: TagPattern[]): TagPattern | null {
  const trimmed = text.trim();
  for (const pattern of patterns) {
    if (pattern.open.test(trimmed)) {
      return pattern;
    }
  }
  return null;
}

/** 检测闭合标签 */
export function detectCloseTag(text: string, pattern: TagPattern): boolean {
  return pattern.close.test(text.trim());
}
