/**
 * 设备兼容性横幅：WebGPU 降级提示和优化建议
 */

import { useState, useEffect } from "react";
import { probeDevice, getWebGPUFallbackAdvice, type DeviceReport } from "../lib/device";
import { IconClose } from "./icons";

export default function DeviceCompatibilityBanner() {
  const [report, setReport] = useState<DeviceReport | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    // 从 localStorage 读取用户是否已关闭过提示
    return localStorage.getItem("device-banner-dismissed") === "true";
  });

  useEffect(() => {
    probeDevice().then(setReport);
  }, []);

  if (!report || dismissed || report.webgpu) {
    // WebGPU 可用或用户已关闭提示，不显示
    return null;
  }

  const advice = getWebGPUFallbackAdvice(report);
  if (!advice) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("device-banner-dismissed", "true");
  };

  return (
    <div
      className="relative mx-auto mb-4 max-w-3xl rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-[14px] text-amber-200"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-400/20">
          <span className="text-[12px]">⚠</span>
        </div>
        <div className="flex-1">
          <p className="font-medium">WebGPU 不可用 - 已降级到 CPU 模式</p>
          <p className="mt-1 text-[13px] leading-relaxed text-amber-200/80">{advice}</p>
          {report.webgpuFailReason && (
            <p className="mt-1 text-[12px] text-amber-200/60">
              技术原因：{report.webgpuFailReason}
            </p>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 rounded p-1 text-amber-200/60 transition-colors hover:bg-amber-400/20 hover:text-amber-200"
          aria-label="关闭提示"
        >
          <IconClose className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
