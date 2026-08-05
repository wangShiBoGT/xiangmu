/**
 * AI Observatory 统一图标系统
 *
 * 视觉语言：精密仪器 + 测量读数
 * - 光学元件：透镜、光圈、刻度环
 * - 测量元素：波形、脉冲、频谱条
 * - 科学感：功能性线条，非装饰性
 *
 * 技术规范：
 * - 24×24 viewBox，1.5px 描边，round cap+join
 * - currentColor 统一取色
 *
 * 动画规则：
 * - 实时测量（在线状态、生成速度）→ 动
 * - 固定功能（标签、计量器）→ 静
 */

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

interface IconSpeedProps extends IconProps {
  tokensPerSecond?: number;
}

interface IconTokensProps extends IconProps {
  current?: number;
  total?: number;
}

interface IconStatusProps extends IconProps {
  status?: 'online' | 'busy' | 'error';
}

function Base({
  className,
  style,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      style={style}
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

/** 思考标签 - 神经网络激活（节点顺序脉动） */
export function IconThinkingTag({ className }: IconProps) {
  return (
    <Base className={className}>
      {/* 神经网络三层结构 */}
      <circle cx="12" cy="12" r="8" opacity="0.3" />
      <circle cx="12" cy="12" r="5.5" opacity="0.5" />

      {/* 激活节点 - 非对称分布 - 顺序脉动 */}
      <circle cx="8.5" cy="10" r="1.3" fill="currentColor" stroke="none">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="12" cy="7.5" r="1.3" fill="currentColor" stroke="none">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="3s" begin="0.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="15.5" cy="10.5" r="1.3" fill="currentColor" stroke="none">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="3s" begin="1s" repeatCount="indefinite" />
      </circle>
      <circle cx="10" cy="14.5" r="1.3" fill="currentColor" stroke="none">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="3s" begin="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="14" cy="15" r="1.3" fill="currentColor" stroke="none">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="3s" begin="2s" repeatCount="indefinite" />
      </circle>

      {/* 连接路径 */}
      <path d="M8.5 10 L12 7.5 M12 7.5 L15.5 10.5 M10 14.5 L12 7.5 M14 15 L15.5 10.5"
            opacity="0.35"
            strokeWidth="1" />
    </Base>
  );
}

/** 反思标签 - 扫描探测（扫描线旋转） */
export function IconReflectionTag({ className }: IconProps) {
  return (
    <Base className={className}>
      {/* 探测范围 */}
      <circle cx="10" cy="10" r="6.5" />
      <circle cx="10" cy="10" r="3.5" opacity="0.4" />

      {/* 探测手柄 */}
      <path d="M14.5 14.5 L19.5 19.5" strokeWidth="2" />

      {/* 扫描波 - 旋转扫描 */}
      <path d="M10 10 L10 3.5" opacity="0.6" strokeWidth="1.5">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 10 10"
          to="360 10 10"
          dur="4s"
          repeatCount="indefinite"
        />
      </path>
      <circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none" opacity="0.6" />
    </Base>
  );
}

/** 规划标签 - 流程节点网络（虚线流动） */
export function IconPlanningTag({ className }: IconProps) {
  return (
    <Base className={className}>
      {/* 四个处理节点 */}
      <rect x="4.5" y="3.5" width="5" height="5" rx="1" />
      <rect x="14.5" y="3.5" width="5" height="5" rx="1" />
      <rect x="4.5" y="15.5" width="5" height="5" rx="1" />
      <rect x="14.5" y="15.5" width="5" height="5" rx="1" />

      {/* 流动路径 - 虚线动画 */}
      <path d="M9.5 6 H14.5 M7 8.5 V15.5 M17 8.5 V15.5 M9.5 18 H14.5"
            opacity="0.5"
            strokeDasharray="2 2">
        <animate attributeName="stroke-dashoffset" from="0" to="-4" dur="2s" repeatCount="indefinite" />
      </path>
    </Base>
  );
}

/** 搜索标签 - 雷达扫描波（扫描线旋转） */
export function IconSearchTag({ className }: IconProps) {
  return (
    <Base className={className}>
      {/* 三层扫描环 */}
      <circle cx="11" cy="11" r="8" opacity="0.25" />
      <circle cx="11" cy="11" r="5.5" opacity="0.4" />
      <circle cx="11" cy="11" r="3" opacity="0.6" />

      {/* 扫描臂 - 旋转 */}
      <path d="M11 11 L11 3" opacity="0.7" strokeWidth="1.5">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 11 11"
          to="360 11 11"
          dur="3s"
          repeatCount="indefinite"
        />
      </path>

      {/* 搜索手柄 */}
      <path d="M15.5 15.5 L20 20" strokeWidth="2" />
    </Base>
  );
}

/** 代码标签 - 执行流（脉冲线） */
export function IconCodeTag({ className }: IconProps) {
  return (
    <Base className={className}>
      {/* 代码括号 */}
      <path d="M8.5 6 L4 12 L8.5 18" strokeWidth="1.8" />
      <path d="M15.5 6 L20 12 L15.5 18" strokeWidth="1.8" />

      {/* 执行脉冲 - 中央竖线 */}
      <path d="M12 4 L12 20" opacity="0.35" strokeWidth="1.5">
        <animate attributeName="opacity" values="0.2;0.7;0.2" dur="2s" repeatCount="indefinite" />
      </path>
    </Base>
  );
}

/** 总结标签 - 文档层叠（内容行呼吸） */
export function IconSummaryTag({ className }: IconProps) {
  return (
    <Base className={className}>
      {/* 文档轮廓 */}
      <rect x="5.5" y="3.5" width="13" height="17" rx="1.5" />

      {/* 内容层级 - 渐弱表示信息压缩 - 呼吸显现 */}
      <path d="M8.5 7.5 H15.5" opacity="0.7">
        <animate attributeName="opacity" values="0.5;0.8;0.5" dur="3s" repeatCount="indefinite" />
      </path>
      <path d="M8.5 10.5 H14" opacity="0.55">
        <animate attributeName="opacity" values="0.35;0.65;0.35" dur="3s" begin="0.5s" repeatCount="indefinite" />
      </path>
      <path d="M8.5 13.5 H15.5" opacity="0.7">
        <animate attributeName="opacity" values="0.5;0.8;0.5" dur="3s" begin="1s" repeatCount="indefinite" />
      </path>
      <path d="M8.5 16.5 H12.5" opacity="0.4">
        <animate attributeName="opacity" values="0.25;0.5;0.25" dur="3s" begin="1.5s" repeatCount="indefinite" />
      </path>
    </Base>
  );
}

/** 系统状态 - 在线指示器（三层呼吸，颜色随状态） */
export function IconStatusOnline({ className, style, status = 'online' }: IconStatusProps) {
  // 状态映射：颜色 + 动画速度
  const stateMap = {
    online: { color: '#10A0FF', duration: '2.5s' },
    busy: { color: '#ffa726', duration: '1.2s' },
    error: { color: '#ef5350', duration: '0s' }, // 停止动画
  };

  const { color, duration } = stateMap[status];

  return (
    <svg
      className={className}
      style={{ ...style, color }}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      {/* 外层扩散波 */}
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" opacity="0.2">
        {duration !== '0s' && (
          <>
            <animate attributeName="r" values="8.5;9.5;8.5" dur={duration} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.2;0.08;0.2" dur={duration} repeatCount="indefinite" />
          </>
        )}
      </circle>

      {/* 中层波动 */}
      <circle cx="12" cy="12" r="5.5" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
        {duration !== '0s' && (
          <animate attributeName="r" values="5.5;6.2;5.5" dur={duration} repeatCount="indefinite" />
        )}
      </circle>

      {/* 核心点 */}
      <circle cx="12" cy="12" r="3" fill="currentColor">
        {duration !== '0s' && (
          <animate attributeName="opacity" values="0.75;1;0.75" dur={duration} repeatCount="indefinite" />
        )}
      </circle>
    </svg>
  );
}

/** 生成速度 - 能量脉冲（速度映射颜色和频率） */
export function IconSpeed({ className, style, tokensPerSecond = 0 }: IconSpeedProps) {
  // 速度分级：慢速 < 5 < 中速 < 10 < 快速
  const getSpeedState = (tps: number) => {
    if (tps < 5) return { color: '#ffa726', duration: '2.5s' }; // 琥珀慢脉
    if (tps < 10) return { color: '#10A0FF', duration: '1.8s' }; // 青绿正常
    return { color: '#00e676', duration: '1.2s' }; // 翠绿快脉
  };

  const { color, duration } = getSpeedState(tokensPerSecond);

  return (
    <svg
      className={className}
      style={{ ...style, color }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* 闪电主体 - 非对称锯齿 */}
      <path d="M13 2 L3 14 H11 L10 22 L20 10 H12 L13 2Z">
        <animate attributeName="opacity" values="0.5;1;0.5" dur={duration} repeatCount="indefinite" />
      </path>

      {/* 能量核心 */}
      <path d="M11 14 L12 10" strokeWidth="2.5" opacity="0.8">
        <animate attributeName="opacity" values="0.6;1;0.6" dur={duration} repeatCount="indefinite" />
      </path>
    </svg>
  );
}

/** Token 用量 - 频谱柱（用量映射颜色和动画） */
export function IconTokens({ className, style, current = 0, total = 1 }: IconTokensProps) {
  // 用量百分比
  const percentage = (current / total) * 100;

  // 用量分级：低 < 30% < 中 < 70% < 高
  const getUsageState = (pct: number) => {
    if (pct < 30) return { color: '#10A0FF', animate: false }; // 青绿静态
    if (pct < 70) return { color: '#ffa726', animate: true, duration: '2s' }; // 琥珀轻微呼吸
    return { color: '#ef5350', animate: true, duration: '1.2s' }; // 警示红明显跳动
  };

  const { color, animate, duration } = getUsageState(percentage);

  return (
    <svg
      className={className}
      style={{ ...style, color }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* 三柱频谱 - 高度递增 */}
      <rect x="4" y="13" width="3.5" height="7" rx="0.8" fill="currentColor" opacity="0.7">
        {animate && <animate attributeName="opacity" values="0.6;0.85;0.6" dur={duration} repeatCount="indefinite" />}
      </rect>
      <rect x="10" y="9" width="3.5" height="11" rx="0.8" fill="currentColor" opacity="0.8">
        {animate && <animate attributeName="opacity" values="0.7;0.95;0.7" dur={duration} repeatCount="indefinite" />}
      </rect>
      <rect x="16" y="5" width="3.5" height="15" rx="0.8" fill="currentColor" opacity="0.9">
        {animate && <animate attributeName="opacity" values="0.8;1;0.8" dur={duration} repeatCount="indefinite" />}
      </rect>

      {/* 基线刻度 */}
      <path d="M3 20.5 H21" opacity="0.3" strokeWidth="1" />
    </svg>
  );
}

/** CPU / 处理器 - 芯片图标 */
export function IconProcessor({ className }: IconProps) {
  return (
    <Base className={className}>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" />
      <path d="M9 4 V7 M15 4 V7 M9 17 V20 M15 17 V20" />
      <path d="M4 9 H7 M17 9 H20 M4 15 H7 M17 15 H20" />
    </Base>
  );
}

/** 内存 / RAM */
export function IconMemory({ className }: IconProps) {
  return (
    <Base className={className}>
      <rect x="4" y="6" width="16" height="12" rx="1.5" />
      <path d="M4 10 H20 M4 14 H20" />
      <path d="M8 6 V18 M12 6 V18 M16 6 V18" opacity="0.4" />
    </Base>
  );
}

/** GPU / 显卡 */
export function IconGPU({ className }: IconProps) {
  return (
    <Base className={className}>
      <rect x="3" y="8" width="18" height="10" rx="1.5" />
      <rect x="6" y="11" width="3" height="4" rx="0.5" />
      <rect x="10.5" y="11" width="3" height="4" rx="0.5" />
      <rect x="15" y="11" width="3" height="4" rx="0.5" />
      <path d="M6 8 V6 M12 8 V6 M18 8 V6" />
    </Base>
  );
}

/** 温度 / 热量 */
export function IconTemperature({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M14 4 V12 A3 3 0 1 1 10 12 V4 A2 2 0 1 1 14 4Z" />
      <path d="M12 12 V16" />
      <circle cx="12" cy="17" r="2" fill="currentColor" stroke="none" />
    </Base>
  );
}

/** 延迟 / 时钟 */
export function IconLatency({ className }: IconProps) {
  return (
    <Base className={className}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7 V12 L15 15" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </Base>
  );
}

/** 成功 / 完成 - 带圆圈的对勾 */
export function IconSuccess({ className }: IconProps) {
  return (
    <Base className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12 L11 15 L16 9" />
    </Base>
  );
}

/** 警告 - 三角形 */
export function IconWarning({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M10.3 4 L2.1 18 A2 2 0 0 0 3.8 21 H20.2 A2 2 0 0 0 21.9 18 L13.7 4 A2 2 0 0 0 10.3 4Z" />
      <path d="M12 9 V13" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" />
    </Base>
  );
}

/** 错误 / 失败 - X 圆圈 */
export function IconError({ className }: IconProps) {
  return (
    <Base className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9 L9 15 M9 9 L15 15" />
    </Base>
  );
}

/** 信息 / 提示 - i 圆圈 */
export function IconInfo({ className }: IconProps) {
  return (
    <Base className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16 V12" />
      <circle cx="12" cy="8" r="0.5" fill="currentColor" stroke="none" />
    </Base>
  );
}

/** 模型选择 - 立方体 */
export function IconModel({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M12 2 L20 7 L20 17 L12 22 L4 17 L4 7 L12 2Z" />
      <path d="M12 2 V12 M12 12 L20 7 M12 12 L4 7" opacity="0.4" />
    </Base>
  );
}

/** 参数 / 配置 - 滑块 */
export function IconParams({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M4 7 H20 M4 12 H20 M4 17 H20" />
      <circle cx="8" cy="7" r="2" fill="currentColor" stroke="none" />
      <circle cx="14" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="10" cy="17" r="2" fill="currentColor" stroke="none" />
    </Base>
  );
}

/** 比较 / 对比 - 分屏 */
export function IconCompare({ className }: IconProps) {
  return (
    <Base className={className}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M12 4 V20" />
      <path d="M7 9 L7 15 M17 9 L17 15" opacity="0.4" />
    </Base>
  );
}

/** 历史 / 时间线 */
export function IconHistory({ className }: IconProps) {
  return (
    <Base className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6 V12 L16 14" />
      <path d="M4 12 A8 8 0 0 1 12 4" opacity="0.4" />
    </Base>
  );
}

/** 导出 / 分享 */
export function IconExport({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M8 7 V5 A2 2 0 0 1 10 3 H19 A2 2 0 0 1 21 5 V19 A2 2 0 0 1 19 21 H10 A2 2 0 0 1 8 19 V17" />
      <path d="M12 12 H3 M3 12 L6 9 M3 12 L6 15" />
    </Base>
  );
}

/** 文档库 / 知识库 */
export function IconLibrary({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M4 4 V20 M8 4 V20 M8 4 H20 V20 H8" />
      <path d="M12 9 H16 M12 13 H16 M12 17 H16" opacity="0.4" />
    </Base>
  );
}

/** 过滤 / 筛选 */
export function IconFilter({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M4 4 H20 L14 12 V19 L10 21 V12 L4 4Z" />
    </Base>
  );
}

/** 排序 */
export function IconSort({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M3 6 H15 M3 12 H12 M3 18 H18" />
      <path d="M18 8 L21 5 L18 2 M18 16 L21 19 L18 22" opacity="0.6" />
    </Base>
  );
}

/** 标签 / Tag */
export function IconTag({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M12 2 L22 12 L12 22 L2 12 L12 2Z" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </Base>
  );
}

/** 品牌标记 - 观测仪器光学系统（简约版） */
export function IconBrand({ className, style, variant = 'green' }: IconProps & { variant?: 'green' | 'teal' | 'purple' | 'spectrum' }) {
  const variants = {
    // A. 明亮翠绿（OpenAI风格）- 简约大气
    green: {
      primary: '#00e676',
      secondary: '#00c965',
      glow: 'drop-shadow(0 0 12px rgba(0, 230, 118, 0.5))'
    },
    // B. 青绿渐变（科学能量流）
    teal: {
      primary: '#00e5ff',
      secondary: '#10A0FF',
      glow: 'drop-shadow(0 0 12px rgba(0, 229, 255, 0.5))'
    },
    // C. 青蓝渐变（科技感）
    purple: {
      primary: '#10A0FF',
      secondary: '#00e676',
      glow: 'drop-shadow(0 0 12px rgba(16, 160, 255, 0.5))'
    },
    // D. 多色光谱（Gemini风格）
    spectrum: {
      primary: '#00e5ff',
      secondary: '#10A0FF',
      glow: 'drop-shadow(0 0 12px rgba(0, 229, 255, 0.5))'
    }
  };

  const colors = variants[variant];

  return (
    <svg
      className={className}
      style={{ ...style, filter: colors.glow }}
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <defs>
        <radialGradient id={`brand-grad-${variant}`} cx="50%" cy="50%">
          <stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
          <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.6" />
        </radialGradient>
      </defs>

      {/* 外层光圈 - 单圈 */}
      <circle cx="12" cy="12" r="9" stroke={colors.primary} strokeWidth="1.5" opacity="0.35" />

      {/* 十字瞄准线（简化） */}
      <path d="M12 2.5 V5.5" stroke={colors.primary} strokeWidth="2" opacity="0.5" />
      <path d="M12 18.5 V21.5" stroke={colors.primary} strokeWidth="2" opacity="0.5" />
      <path d="M2.5 12 H5.5" stroke={colors.primary} strokeWidth="2" opacity="0.5" />
      <path d="M18.5 12 H21.5" stroke={colors.primary} strokeWidth="2" opacity="0.5" />

      {/* 中心核心 - 纯色实心 */}
      <circle cx="12" cy="12" r="4" fill={`url(#brand-grad-${variant})`}>
        <animate attributeName="opacity" values="0.9;1;0.9" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* 内层小圆点 - 提升精密感 */}
      <circle cx="12" cy="12" r="1.5" fill={colors.primary} opacity="0.9">
        <animate attributeName="r" values="1.5;2;1.5" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/** 链接 / URL */
export function IconLink({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M10 13 A5 5 0 0 0 14 13 M14 11 A5 5 0 0 0 10 11" />
      <path d="M7 7 L9 9 M15 15 L17 17" />
      <circle cx="7" cy="7" r="2" />
      <circle cx="17" cy="17" r="2" />
    </Base>
  );
}
