import { useState } from "react";
import { IconClose, IconArrowUp } from "./icons";
import type { GenerationTrace } from "../lib/trace";

interface LeaderboardSubmitDialogProps {
  onClose: () => void;
  onSubmit: (data: SubmitData) => Promise<void>;
}

export interface SubmitData {
  nickname: string;
  deviceName: string;
  deviceTier: 1 | 2 | 3;
  gpuName: string;
  modelId: string;
  speed: number;
  traceData: GenerationTrace;
}

export default function LeaderboardSubmitDialog({
  onClose,
  onSubmit,
}: LeaderboardSubmitDialogProps) {
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatedData, setValidatedData] = useState<SubmitData | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setValidatedData(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // 验证 trace 文件格式
      if (!data.format || !data.format.startsWith("aitrace/")) {
        throw new Error("无效的 trace 文件格式");
      }

      const trace = data.trace as GenerationTrace;
      if (!trace || !trace.steps || trace.steps.length === 0) {
        throw new Error("Trace 文件不包含有效的步骤数据");
      }

      // 计算速度
      const totalMs = trace.steps.reduce((sum, s) => sum + (s.dt || 0), 0);
      const speed = trace.steps.length / (totalMs / 1000);

      // 提取设备信息
      const deviceName = data.device || "未知设备";
      const gpuName = "未知 GPU"; // 需要从 trace 中提取
      const modelId = data.modelId || "未知模型";

      // 推断设备档位（简单逻辑，可以后续优化）
      let deviceTier: 1 | 2 | 3 = 2;
      if (speed < 10) deviceTier = 1;
      else if (speed > 30) deviceTier = 3;

      setValidatedData({
        nickname: "",
        deviceName,
        deviceTier,
        gpuName,
        modelId,
        speed,
        traceData: trace,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "解析 trace 文件失败"
      );
    }
  };

  const handleSubmit = async () => {
    if (!nickname.trim()) {
      setError("请输入昵称");
      return;
    }

    if (!validatedData) {
      setError("请先上传有效的 trace 文件");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        ...validatedData,
        nickname: nickname.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-lg rounded-lg border border-obs-line bg-obs-1 p-6">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-obs-ink2 transition-colors hover:text-obs-ink"
          aria-label="关闭"
        >
          <IconClose className="h-5 w-5" />
        </button>

        {/* 标题 */}
        <h2 className="text-xl font-semibold text-obs-ink">
          🚀 提交性能成绩
        </h2>
        <p className="mt-2 text-sm text-obs-ink2">
          分享你的推理性能，与全球开发者一起优化浏览器 AI
        </p>

        {/* 表单 */}
        <div className="mt-6 space-y-4">
          {/* 昵称输入 */}
          <div>
            <label className="block text-sm font-medium text-obs-ink">
              昵称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入你的昵称"
              className="mt-1 w-full rounded-md border border-obs-line bg-obs px-3 py-2 text-obs-ink placeholder:text-obs-ink2/50 focus:border-brand focus:outline-none"
              maxLength={50}
            />
          </div>

          {/* Trace 文件上传 */}
          <div>
            <label className="block text-sm font-medium text-obs-ink">
              Trace 文件 <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".aitrace"
              onChange={handleFileChange}
              className="mt-1 w-full text-sm text-obs-ink2 file:mr-4 file:rounded-md file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand/90"
            />
            <p className="mt-1 text-xs text-obs-ink2">
              💡 从 Observe 模式导出真实的 trace 文件（.aitrace）
            </p>
          </div>

          {/* 验证结果预览 */}
          {validatedData && (
            <div className="rounded-md border border-obs-line bg-obs p-3">
              <p className="text-sm font-medium text-obs-ink">✅ 验证通过</p>
              <div className="mt-2 space-y-1 text-xs text-obs-ink2">
                <p>设备：{validatedData.deviceName}</p>
                <p>模型：{validatedData.modelId}</p>
                <p>速度：{validatedData.speed.toFixed(1)} tokens/s</p>
                <p>档位：{["集显组", "中端独显组", "高端显卡组"][validatedData.deviceTier - 1]}</p>
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {error}
            </div>
          )}
        </div>

        {/* 提交按钮 */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-full border border-obs-line px-5 py-2 text-sm font-medium text-obs-ink transition-colors hover:bg-obs"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !validatedData || !nickname.trim()}
            className="flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconArrowUp className="h-4 w-4" />
            {loading ? "提交中..." : "提交成绩"}
          </button>
        </div>
      </div>
    </div>
  );
}
