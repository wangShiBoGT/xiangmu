/**
 * 精致动画图标库
 * 特性：呼吸动画、发光效果、流体过渡
 */

interface IconProps {
  className?: string;
  size?: number;
}

// Thinking - 思考图标（脑部神经网络）
export function ThinkingIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="thinkingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10A0FF" stopOpacity="0.8">
            <animate attributeName="stop-opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#00e676" stopOpacity="0.6">
            <animate attributeName="stop-opacity" values="0.6;0.9;0.6" dur="2s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
        <filter id="thinkingGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* 主脑形状 */}
      <path
        d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z"
        stroke="url(#thinkingGradient)"
        strokeWidth="1.5"
        fill="none"
        filter="url(#thinkingGlow)"
      >
        <animate attributeName="stroke-width" values="1.5;2;1.5" dur="2s" repeatCount="indefinite" />
      </path>

      {/* 神经节点 */}
      <circle cx="8" cy="10" r="1.5" fill="url(#thinkingGradient)">
        <animate attributeName="r" values="1.5;2;1.5" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="12" cy="8" r="1.5" fill="url(#thinkingGradient)">
        <animate attributeName="r" values="1.5;2;1.5" dur="1.5s" begin="0.3s" repeatCount="indefinite" />
      </circle>
      <circle cx="16" cy="10" r="1.5" fill="url(#thinkingGradient)">
        <animate attributeName="r" values="1.5;2;1.5" dur="1.5s" begin="0.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="10" cy="14" r="1.5" fill="url(#thinkingGradient)">
        <animate attributeName="r" values="1.5;2;1.5" dur="1.5s" begin="0.9s" repeatCount="indefinite" />
      </circle>
      <circle cx="14" cy="14" r="1.5" fill="url(#thinkingGradient)">
        <animate attributeName="r" values="1.5;2;1.5" dur="1.5s" begin="1.2s" repeatCount="indefinite" />
      </circle>

      {/* 连接线 */}
      <path
        d="M8 10 L12 8 L16 10 M10 14 L12 8 M14 14 L16 10"
        stroke="url(#thinkingGradient)"
        strokeWidth="1"
        strokeOpacity="0.5"
        strokeLinecap="round"
      >
        <animate attributeName="stroke-opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

// Reflection - 反思图标（镜面反射）
export function ReflectionIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="reflectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffa726">
            <animate attributeName="offset" values="0%;20%;0%" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="50%" stopColor="#ffb74d" />
          <stop offset="100%" stopColor="#ffa726">
            <animate attributeName="offset" values="80%;100%;80%" dur="3s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
        <filter id="reflectionGlow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* 搜索镜 */}
      <circle
        cx="10"
        cy="10"
        r="6"
        stroke="url(#reflectionGradient)"
        strokeWidth="2"
        fill="none"
        filter="url(#reflectionGlow)"
      />

      {/* 把手 */}
      <path
        d="M15 15 L20 20"
        stroke="url(#reflectionGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        filter="url(#reflectionGlow)"
      />

      {/* 扫描线 */}
      <line
        x1="7"
        y1="7"
        x2="13"
        y2="13"
        stroke="#ffa726"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      >
        <animate attributeName="x1" values="7;10;7" dur="2s" repeatCount="indefinite" />
        <animate attributeName="y1" values="7;10;7" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
      </line>
    </svg>
  );
}

// Planning - 规划图标（流程图）
export function PlanningIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="planningGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00e676" />
          <stop offset="100%" stopColor="#00d97f" />
        </linearGradient>
        <filter id="planningGlow">
          <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* 节点 */}
      <rect x="4" y="3" width="5" height="5" rx="1" fill="url(#planningGradient)" filter="url(#planningGlow)">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
      </rect>
      <rect x="15" y="3" width="5" height="5" rx="1" fill="url(#planningGradient)" filter="url(#planningGlow)">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" begin="0.5s" repeatCount="indefinite" />
      </rect>
      <rect x="4" y="16" width="5" height="5" rx="1" fill="url(#planningGradient)" filter="url(#planningGlow)">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" begin="1s" repeatCount="indefinite" />
      </rect>
      <rect x="15" y="16" width="5" height="5" rx="1" fill="url(#planningGradient)" filter="url(#planningGlow)">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" begin="1.5s" repeatCount="indefinite" />
      </rect>

      {/* 连接线 - 带流动效果 */}
      <path
        d="M9 5.5 H15 M6.5 8 V16 M17.5 8 V16 M9 18.5 H15"
        stroke="url(#planningGradient)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="2 2"
      >
        <animate attributeName="stroke-dashoffset" values="0;-4" dur="1s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

// Search - 搜索图标（雷达扫描）
export function SearchIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="searchGradient">
          <stop offset="0%" stopColor="#10A0FF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0d8ae6" stopOpacity="0.4" />
        </radialGradient>
        <filter id="searchGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* 外圈 */}
      <circle
        cx="11"
        cy="11"
        r="8"
        stroke="#10A0FF"
        strokeWidth="1.5"
        fill="none"
        opacity="0.3"
      />

      {/* 中圈 */}
      <circle
        cx="11"
        cy="11"
        r="6"
        stroke="#10A0FF"
        strokeWidth="1.5"
        fill="none"
        opacity="0.5"
      >
        <animate attributeName="r" values="6;7;6" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* 内圈 */}
      <circle
        cx="11"
        cy="11"
        r="4"
        fill="url(#searchGradient)"
        filter="url(#searchGlow)"
      >
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* 雷达扫描线 */}
      <line
        x1="11"
        y1="11"
        x2="11"
        y2="3"
        stroke="#10A0FF"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 11 11"
          to="360 11 11"
          dur="2s"
          repeatCount="indefinite"
        />
      </line>

      {/* 搜索把手 */}
      <path
        d="M17 17 L21 21"
        stroke="#10A0FF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Code - 代码执行图标（齿轮旋转）
export function CodeIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="codeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffa726" />
          <stop offset="100%" stopColor="#fb8c00" />
        </linearGradient>
        <filter id="codeGlow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#codeGlow)">
        {/* 齿轮 */}
        <path
          d="M12 2L13.5 6.5L18 8L13.5 9.5L12 14L10.5 9.5L6 8L10.5 6.5L12 2Z"
          fill="url(#codeGradient)"
          opacity="0.8"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 12 12"
            to="360 12 12"
            dur="4s"
            repeatCount="indefinite"
          />
        </path>

        <circle cx="12" cy="12" r="3" fill="url(#codeGradient)">
          <animate attributeName="r" values="3;3.5;3" dur="1s" repeatCount="indefinite" />
        </circle>

        {/* 代码符号 */}
        <path
          d="M8 16 L6 18 L8 20"
          stroke="url(#codeGradient)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 16 L18 18 L16 20"
          stroke="url(#codeGradient)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

// Summary - 总结图标（文档折叠）
export function SummaryIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="summaryGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a0a0a0" />
          <stop offset="100%" stopColor="#808080" />
        </linearGradient>
      </defs>

      {/* 文档 */}
      <rect
        x="5"
        y="3"
        width="14"
        height="18"
        rx="2"
        stroke="url(#summaryGradient)"
        strokeWidth="1.5"
        fill="none"
      />

      {/* 文本行 - 带呼吸效果 */}
      <line x1="8" y1="7" x2="16" y2="7" stroke="url(#summaryGradient)" strokeWidth="1.5" strokeLinecap="round">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
      </line>
      <line x1="8" y1="10" x2="14" y2="10" stroke="url(#summaryGradient)" strokeWidth="1.5" strokeLinecap="round">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" begin="0.3s" repeatCount="indefinite" />
      </line>
      <line x1="8" y1="13" x2="16" y2="13" stroke="url(#summaryGradient)" strokeWidth="1.5" strokeLinecap="round">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" begin="0.6s" repeatCount="indefinite" />
      </line>
      <line x1="8" y1="16" x2="12" y2="16" stroke="url(#summaryGradient)" strokeWidth="1.5" strokeLinecap="round">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" begin="0.9s" repeatCount="indefinite" />
      </line>
    </svg>
  );
}

// Brand Logo - 品牌图标（能量核心）
export function BrandIcon({ className = "", size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="brandGradient">
          <stop offset="0%" stopColor="#00e676" stopOpacity="1" />
          <stop offset="100%" stopColor="#00c965" stopOpacity="0.6" />
        </radialGradient>
        <filter id="brandGlow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* 能量环 */}
      <circle
        cx="16"
        cy="16"
        r="12"
        stroke="#00e676"
        strokeWidth="1"
        fill="none"
        opacity="0.3"
      >
        <animate attributeName="r" values="12;13;12" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* 核心 */}
      <circle
        cx="16"
        cy="16"
        r="6"
        fill="url(#brandGradient)"
        filter="url(#brandGlow)"
      >
        <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* 闪电符号 */}
      <path
        d="M16 8 L14 16 L18 16 L16 24"
        stroke="#0a0a0a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
