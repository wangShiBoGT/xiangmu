import ActivityCard from "./ActivityCard";

/**
 * AI 活动卡片演示
 * 展示各种活动类型的效果
 */
export default function ActivityDemo() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <h2 className="text-xl font-semibold text-obs-ink mb-6">AI 活动卡片演示</h2>

      {/* 思考中 */}
      <ActivityCard
        type="thinking"
        title="Thought"
        isRunning={true}
        defaultExpanded={true}
      >
        <div className="space-y-3">
          <p>用户要求检查电脑环境。这是一个简单的请求，我需要检查系统环境信息。</p>
          <p>由于用户使用的是 Windows 系统（根据 user_information 中的信息），我应该运行一些基本的命令来检查环境。</p>
          <p className="font-medium">我应该检查：</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Node.js 版本</li>
            <li>npm 版本</li>
            <li>操作系统信息</li>
            <li>可能还有其他相关的开发工具</li>
          </ol>
        </div>
      </ActivityCard>

      {/* 命令执行 */}
      <ActivityCard
        type="command"
        title="Command"
        metadata="node in .../jiashicang"
        duration={1}
      >
        <div className="rounded-md bg-obs-paper p-3 font-mono text-[12px]">
          <div className="flex items-start gap-2">
            <span className="text-emerald-400">●</span>
            <span className="text-obs-ink3">PS E:\案例图科技\jiashicang&gt;</span>
            <span className="text-obs-ink">node --version</span>
          </div>
          <div className="mt-1 text-obs-ink">v16.20.2</div>
          <div className="mt-2 flex items-start gap-2 opacity-50">
            <span className="text-obs-ink3">○</span>
            <span className="text-obs-ink3">PS E:\案例图科技\jiashicang&gt;</span>
          </div>
        </div>
      </ActivityCard>

      {/* 另一个命令 */}
      <ActivityCard
        type="command"
        title="Command"
        metadata="npm in .../jiashicang"
        duration={1}
      >
        <div className="rounded-md bg-obs-paper p-3 font-mono text-[12px]">
          <div className="flex items-start gap-2">
            <span className="text-emerald-400">●</span>
            <span className="text-obs-ink3">PS E:\案例图科技\jiashicang&gt;</span>
            <span className="text-obs-ink">npm --version</span>
          </div>
          <div className="mt-1 text-obs-ink">8.19.4</div>
        </div>
      </ActivityCard>

      {/* 文件读取 */}
      <ActivityCard
        type="file-read"
        title="Read"
        metadata="package.json"
        duration={0}
      >
        <div className="rounded-md bg-obs-paper p-3 font-mono text-[12px] text-obs-ink2">
          <div className="text-measure-400">&#123;</div>
          <div className="pl-4">
            <span className="text-blue-300">"name"</span>
            <span className="text-obs-ink3">: </span>
            <span className="text-green-300">"webgpu-llm-chat"</span>
            <span className="text-obs-ink3">,</span>
          </div>
          <div className="pl-4">
            <span className="text-blue-300">"version"</span>
            <span className="text-obs-ink3">: </span>
            <span className="text-green-300">"0.0.0"</span>
          </div>
          <div className="text-measure-400">&#125;</div>
        </div>
      </ActivityCard>

      {/* 思考完成 */}
      <ActivityCard
        type="thinking"
        title="Thought"
        duration={2}
      >
        <div className="space-y-2">
          <p>我来检查您的电脑环境配置。</p>
          <p className="font-medium">您的电脑环境信息：</p>
          <div className="space-y-1">
            <p className="font-semibold">操作系统</p>
            <ul className="list-disc pl-5">
              <li>Windows 11 专业版（版本 2009，10.0.28000.1）</li>
            </ul>
            <p className="font-semibold mt-3">开发工具</p>
            <ul className="list-disc pl-5">
              <li>Node.js: v16.20.2</li>
              <li>npm: 8.19.4</li>
              <li>Git: 2.53.0.windows.2</li>
            </ul>
          </div>
        </div>
      </ActivityCard>

      {/* 结果摘要 */}
      <ActivityCard
        type="result"
        title="环境检查完成"
      >
        <div className="space-y-2">
          <p>✓ 所有核心开发工具已安装</p>
          <p>⚠️ 建议升级 Node.js 到 v18+ 以获得更好的性能</p>
        </div>
      </ActivityCard>
    </div>
  );
}
