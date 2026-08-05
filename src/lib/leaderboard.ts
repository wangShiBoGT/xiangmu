/**
 * 性能排行榜数据管理
 * 阶段 1: GitHub Discussions 作为零成本后端
 */

import type { GenerationTrace } from "./trace";

export interface LeaderboardEntry {
  id: string;
  nickname: string;
  avatar_url?: string;
  device_name: string;
  device_tier: 1 | 2 | 3; // 1=集显, 2=中端, 3=高端
  gpu_name: string;
  model_id: string;
  speed: number; // tokens/s
  trace_url: string;
  verified: boolean;
  created_at: string;
  discussion_number?: number; // GitHub Discussion 编号
}

export interface SubmitLeaderboardData {
  nickname: string;
  deviceName: string;
  deviceTier: 1 | 2 | 3;
  gpuName: string;
  modelId: string;
  speed: number;
  traceData: GenerationTrace;
}

const GITHUB_REPO = "your-org/webgpu-llm-chat"; // TODO: 替换为实际仓库
// GitHub Discussions 分类 ID（待集成时使用）
// const GITHUB_CATEGORY_ID = ""; // TODO: 获取 Discussions 分类 ID

/**
 * 从 GitHub Discussions 加载排行榜数据
 * 使用 GraphQL API 查询特定分类下的 Discussions
 */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  // TODO: 实现 GitHub GraphQL API 调用
  // 查询条件: category = "Leaderboard", 按 reactions.THUMBS_UP 排序

  // 暂时返回空数组（阶段 1 未实现前端不会报错）
  return [];
}

/**
 * 提交性能成绩到 GitHub Discussions
 * 创建一个新的 Discussion，标题包含速度，内容包含 trace 数据
 */
export async function submitToLeaderboard(
  data: SubmitLeaderboardData
): Promise<{ success: boolean; discussionUrl?: string; error?: string }> {
  try {
    // 验证 trace 数据完整性
    if (!data.traceData.steps || data.traceData.steps.length === 0) {
      throw new Error("Trace 数据不完整：缺少步骤数据");
    }

    // 计算真实速度（防止篡改）
    const totalMs = data.traceData.steps.reduce((sum, s) => sum + (s.dt || 0), 0);
    const calculatedSpeed = data.traceData.steps.length / (totalMs / 1000);

    // 速度差异超过 5% 视为无效
    if (Math.abs(calculatedSpeed - data.speed) / data.speed > 0.05) {
      throw new Error(`速度验证失败：提交 ${data.speed.toFixed(1)} tokens/s，实际 ${calculatedSpeed.toFixed(1)} tokens/s`);
    }

    // 构建 Discussion 标题和内容
    const title = `[Benchmark] ${data.nickname} - ${data.deviceName} - ${data.speed.toFixed(1)} tokens/s`;
    const body = buildDiscussionBody(data);

    // TODO: 实际调用 GitHub API 创建 Discussion
    // 需要用户授权 OAuth token 或使用 GitHub App
    // 当前返回模拟成功（待集成）

    console.log("准备提交到 GitHub Discussions:");
    console.log("Title:", title);
    console.log("Body preview:", body.substring(0, 200) + "...");

    // 模拟 API 延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 返回成功（实际实现后返回真实 URL）
    return {
      success: true,
      discussionUrl: `https://github.com/${GITHUB_REPO}/discussions/999`, // 占位 URL
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 构建 GitHub Discussion 的 Markdown 正文
 * 包含完整的设备信息和 trace 数据用于验证
 */
function buildDiscussionBody(data: SubmitLeaderboardData): string {
  const traceJson = JSON.stringify(
    {
      format: "aitrace/v2",
      modelId: data.modelId,
      device: data.deviceName,
      trace: data.traceData,
    },
    null,
    2
  );

  return `## 🚀 性能提交

### 贡献者信息
- **昵称**: ${data.nickname}
- **提交时间**: ${new Date().toISOString()}

### 设备信息
- **设备名称**: ${data.deviceName}
- **GPU**: ${data.gpuName}
- **设备档位**: ${["集显组", "中端独显组", "高端显卡组"][data.deviceTier - 1]}

### 性能指标
- **模型**: \`${data.modelId}\`
- **推理速度**: **${data.speed.toFixed(1)} tokens/s**
- **总 tokens**: ${data.traceData.steps.length}
- **总耗时**: ${(data.traceData.steps.reduce((sum, s) => sum + (s.dt || 0), 0) / 1000).toFixed(2)}s

### 验证数据
<details>
<summary>完整 Trace 数据（点击展开）</summary>

\`\`\`json
${traceJson}
\`\`\`

</details>

---

> 此提交由 [Browser AI Microscope](https://github.com/${GITHUB_REPO}) 自动生成
> 数据真实性：✅ 已通过 trace 完整性验证
`;
}

/**
 * 解析 Discussion 内容提取排行榜条目
 * 从 Markdown 中解析设备信息和性能指标
 */
export function parseDiscussionToEntry(
  discussion: {
    number: number;
    title: string;
    body: string;
    createdAt: string;
    author: { login: string; avatarUrl: string };
  }
): LeaderboardEntry | null {
  try {
    // 从标题解析: [Benchmark] nickname - device - speed tokens/s
    const titleMatch = /\[Benchmark\]\s+(.+?)\s+-\s+(.+?)\s+-\s+([\d.]+)\s+tokens\/s/.exec(discussion.title);
    if (!titleMatch) return null;

    const [, nickname, deviceName, speedStr] = titleMatch;
    const speed = parseFloat(speedStr);

    // 从正文提取其他字段
    const gpuMatch = /\*\*GPU\*\*:\s+(.+)/.exec(discussion.body);
    const tierMatch = /\*\*设备档位\*\*:\s+(集显组|中端独显组|高端显卡组)/.exec(discussion.body);
    const modelMatch = /\*\*模型\*\*:\s+`(.+)`/.exec(discussion.body);

    const gpuName = gpuMatch?.[1] || "未知 GPU";
    const tierStr = tierMatch?.[1] || "中端独显组";
    const deviceTier = tierStr === "集显组" ? 1 : tierStr === "高端显卡组" ? 3 : 2;
    const modelId = modelMatch?.[1] || "unknown";

    return {
      id: `gh-${discussion.number}`,
      nickname,
      avatar_url: discussion.author.avatarUrl,
      device_name: deviceName,
      device_tier: deviceTier as 1 | 2 | 3,
      gpu_name: gpuName,
      model_id: modelId,
      speed,
      trace_url: `https://github.com/${GITHUB_REPO}/discussions/${discussion.number}`,
      verified: true, // GitHub 账号验证
      created_at: discussion.createdAt,
      discussion_number: discussion.number,
    };
  } catch (error) {
    console.error("解析 Discussion 失败:", error);
    return null;
  }
}
