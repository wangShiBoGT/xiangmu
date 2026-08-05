/**
 * Service Worker 更新通知组件
 * 当有新版本可用时提示用户更新
 */

import { useState, useEffect } from 'react';
import { updateServiceWorker, type ServiceWorkerStatus } from '../lib/serviceWorker';

interface ServiceWorkerUpdateProps {
  status: ServiceWorkerStatus;
}

export default function ServiceWorkerUpdate({ status }: ServiceWorkerUpdateProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // 只在有更新可用时显示
    setShow(status.updateAvailable && status.waiting);
  }, [status.updateAvailable, status.waiting]);

  if (!show) {
    return null;
  }

  const handleUpdate = () => {
    updateServiceWorker();
    // 更新后会自动刷新页面
  };

  const handleDismiss = () => {
    setShow(false);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-line bg-surface px-6 py-3 shadow-card"
    >
      <div className="flex items-center gap-4">
        <p className="text-[13px] text-ink">
          新版本可用
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUpdate}
            className="rounded-full bg-brand px-4 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-brand-hover"
            aria-label="立即更新"
          >
            立即更新
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-full px-4 py-1.5 text-[12px] text-ink-muted transition-colors hover:text-ink"
            aria-label="稍后提醒"
          >
            稍后
          </button>
        </div>
      </div>
    </div>
  );
}
