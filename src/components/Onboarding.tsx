import type { DeviceReport } from "../lib/device";
import { getModel, formatSize, type ModelInfo } from "../lib/models";

interface Props {
  report: DeviceReport | null;
  currentId: string;
  recommended: ModelInfo | null;
  /** 首次访问的新用户展示完整导读，老用户新开对话只显精简欢迎 */
  firstVisit: boolean;
  onAsk: (question: string) => void;
}

const SAMPLE_QUESTIONS = [
  "用大白话解释一下什么是 WebGPU",
  "帮我写一段自我介绍，面试前端岗位用",
  "1 到 100 之间所有质数的和是多少？",
];

export default function Onboarding({
  report,
  currentId,
  recommended,
  firstVisit,
  onAsk,
}: Props) {
  const current = getModel(currentId);
  return (
    <div className="mt-16 select-none" data-testid="onboarding">
      <p className="mb-4 text-center text-[11px] font-medium uppercase tracking-[0.22em] text-ink-3">
        Create · 创造
      </p>
      <p className="text-center text-[24px] font-semibold tracking-[-0.01em] text-ink">
        模型已就绪，问点什么吧
      </p>
      <p className="mt-3 text-center text-[14px] text-ink-3 leading-[1.8]">
        多模型切换 · 推理段输出 · 文档/图片问答 · 联网搜索
      </p>

      {firstVisit && report && (
        <div className="mx-auto mt-10 max-w-md rounded-md border border-line bg-surface p-5 text-[13px] leading-relaxed text-ink-2">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-3">
            Device Report · 本机体检
          </p>
          <ul className="space-y-1">
            <li>
              显卡加速：
              {report.webgpu
                ? `支持 WebGPU（${report.gpuInfo ?? "GPU"}），推理跑在显卡上`
                : "不支持 WebGPU，使用 CPU 模式（速度较慢）"}
            </li>
            <li>
              内存 {report.memoryGB !== null ? `${report.memoryGB}GB+` : "未知"} ·{" "}
              {report.cores} 核心 · 综合档位 {report.tier}/3
            </li>
            {recommended && (
              <li className="font-medium text-ink">
                推荐模型：{recommended.name}（{formatSize(recommended.sizeWebgpu)}）
                —— {recommended.description}
              </li>
            )}
          </ul>
          {current && (
            <p className="mt-3 border-t border-line pt-3 text-ink-3">
              当前使用 {current.name}：{current.description}。
              可在右上角随时切换模型（Qwen、GLM、DeepSeek、Gemma、Llama、Phi
              等，内置模型免公网下载，在线模型选择后自动下载并缓存；模型切换后需重新读入与初始化，耗时视设备而定）；点击输入框旁的加号上传
              PDF/Word/Excel 或图片（图片由轻量视觉模型解读）；点亮地球图标后提问会先联网搜索最新信息补充模型知识再回答。
            </p>
          )}
        </div>
      )}

      <div className="mx-auto mt-8 flex max-w-md flex-wrap justify-center gap-2">
        {SAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            className="rounded-md border border-line bg-surface px-4 py-2 text-[13px] text-ink-2 hover:border-ink-3 hover:text-ink transition-colors"
            onClick={() => onAsk(q)}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
