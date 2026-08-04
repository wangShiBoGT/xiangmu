/**
 * 图标库（DS1 单库制，交互圣经第五章）。
 * 规格：24 viewBox / 1.5px stroke / round cap+join / currentColor。
 * 语义唯一：一个动作全站一个图标；新增图标先查本文件再自绘。
 * 尺寸由调用方以 className 控制（h-3 w-3 / h-4 w-4 / h-5 w-5 对应行内/按钮/导航）。
 */

interface IconProps {
  className?: string;
}

function Base({
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** 关闭 / 取消 */
export function IconClose({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M18 6L6 18M6 6l12 12" />
    </Base>
  );
}

/** 新建 / 添加 */
export function IconPlus({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  );
}

/** 展开（向下） */
export function IconChevronDown({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="m6 9 6 6 6-6" />
    </Base>
  );
}

/** 返回（向左） */
export function IconChevronLeft({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M15 6l-6 6 6 6" />
    </Base>
  );
}

/** 暂停（实心，与播放同对） */
export function IconPause({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

/** 播放（实心：状态型图标，Filled=进行语义的唯一豁免见映射表） */
export function IconPlay({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}

/** 停止 / 中断生成（实心方块，与 Play/Pause 同为状态型） */
export function IconStop({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
    </svg>
  );
}

/** 发送（向上箭头） */
export function IconArrowUp({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M12 19V6M6 12l6-6 6 6" />
    </Base>
  );
}

/** 文件 / 附件 */
export function IconFile({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </Base>
  );
}

/** 图片 */
export function IconImage({ className }: IconProps) {
  return (
    <Base className={className}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="9" cy="9" r="1.8" />
      <path d="M21 15.5l-4.5-4.5L6 21.5" />
    </Base>
  );
}

/** 地球 / 设备联网（WebGPU 环境） */
export function IconGlobe({ className }: IconProps) {
  return (
    <Base className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.6 9h16.8M3.6 15h16.8" />
      <ellipse cx="12" cy="12" rx="4.2" ry="9" />
    </Base>
  );
}

/** 完成 / 已核实（对勾） */
export function IconCheck({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M20 6L9 17l-5-5" />
    </Base>
  );
}

/** 复制 */
export function IconCopy({ className }: IconProps) {
  return (
    <Base className={className}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </Base>
  );
}

/** 重跑 / 重新生成 */
export function IconRefresh({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </Base>
  );
}

/** 下载 / 导出 */
export function IconDownload({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
    </Base>
  );
}

/** 编辑（铅笔） */
export function IconEdit({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M17 3l4 4L8 20H4v-4L17 3z" />
    </Base>
  );
}

/** 删除（垃圾桶） */
export function IconTrash({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </Base>
  );
}

/** 收藏（星）：Outline=未收藏，Filled=已收藏（选中态唯一填充规则） */
export function IconStar({
  className,
  filled = false,
}: IconProps & { filled?: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9L12 3z" />
    </svg>
  );
}

/** 步骤 / 事件列表 */
export function IconList({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 6h16M7 12h13M10 18h10" />
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** 推理段（<think> 输出）：中性转录字形，不用拟人「脑」图标（P7/P13） */
export function IconReasoning({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M5 6h14M5 11h10M5 16h7" />
    </Base>
  );
}

/** 计时 / 延迟（时钟） */
export function IconClock({ className }: IconProps) {
  return (
    <Base className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </Base>
  );
}

/** 概率海 / 生成流（波纹） */
export function IconWaves({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12c2.5-3 5-3 7.5 0s5 3 7.5 0 3-2.5 5-1" />
      <path d="M2 17c2.5-3 5-3 7.5 0s5 3 7.5 0" />
      <circle cx="7" cy="6.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="13" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** 观测台标识（光圈 / 快门）：全站品牌标记，非功能图标 */
export function IconAperture({ className }: IconProps) {
  return (
    <Base className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21" />
    </Base>
  );
}

/** 首屏特性卡：观察（眼） */
export function IconEye({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M12 5c-5 0-8.5 4.5-9.5 7 1 2.5 4.5 7 9.5 7s8.5-4.5 9.5-7c-1-2.5-4.5-7-9.5-7Zm0 10.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" />
    </Base>
  );
}

/** 首屏特性卡：实验（量瓶） */
export function IconFlask({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M9 3h6M10 3v5.5L4.5 18a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 8.5V3" />
    </Base>
  );
}

/** 首屏特性卡：档案（存档） */
export function IconArchive({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M4 5h16v4H4zM4 12h16v7H4zM8 5v14" />
    </Base>
  );
}

/** 加载中 / 进行中（旋转圆圈） */
export function IconLoader({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M12 3v3M12 18v3M21 12h-3M6 12H3M18.364 5.636l-2.121 2.121M7.757 16.243l-2.121 2.121M18.364 18.364l-2.121-2.121M7.757 7.757L5.636 5.636" />
    </Base>
  );
}

/** 警告 / 注意（三角形感叹号） */
export function IconAlertTriangle({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M12 9v4M12 17h.01M10.29 3.86L2.08 18a2 2 0 0 0 1.71 3h16.42a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </Base>
  );
}

/** 闪电 / 速度 / 能量 */
export function IconZap({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
    </Base>
  );
}

/** CPU / 处理器 / 芯片 */
export function IconCpu({ className }: IconProps) {
  return (
    <Base className={className}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M18 9h3M3 15h3M18 15h3" />
    </Base>
  );
}

/** 活动 / 性能图表 / 监控 */
export function IconActivity({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M3 12h4l3-9 4 18 3-9h4" />
    </Base>
  );
}

/** 金钱 / 美元 / 成本 */
export function IconDollar({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </Base>
  );
}

/** 消息 / 对话 / 聊天 */
export function IconMessageSquare({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Base>
  );
}

/** 思考 / 推理（呼吸动画版）：用于 AI 思考状态 */
export function IconThinking({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* 外圈 - 呼吸扩散 */}
      <circle cx="12" cy="12" r="9" className="animate-thinking-outer" />
      {/* 中圈 - 反向呼吸 */}
      <circle cx="12" cy="12" r="5.5" className="animate-thinking-middle" />
      {/* 内核心 - 脉动 */}
      <circle cx="12" cy="12" r="2" className="animate-thinking-inner" fill="currentColor" stroke="none" />
      {/* 思维连接线 */}
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" className="animate-thinking-rays" />
    </svg>
  );
}
