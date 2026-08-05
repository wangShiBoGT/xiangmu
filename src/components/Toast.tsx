/**
 * Toast 通知组件
 * 用于替代 alert() 的现代化通知系统
 */

import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  message: ToastMessage;
  onClose: (id: string) => void;
}

function Toast({ message, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = message.duration ?? 3000;
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(message.id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [message.id, message.duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(message.id), 300);
  };

  const typeStyles = {
    success: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
    error: 'border-red-400/40 bg-red-400/10 text-red-200',
    info: 'border-accent/40 bg-accent/10 text-accent',
    warning: 'border-[#ffa726]/40 bg-[#ffa726]/10 text-[#ffa726]',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ⓘ',
    warning: '⚠',
  };

  return (
    <div
      className={`pointer-events-auto mb-3 flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all ${
        typeStyles[message.type]
      } ${
        isExiting
          ? 'translate-x-full opacity-0'
          : 'translate-x-0 opacity-100'
      }`}
      style={{ minWidth: '320px', maxWidth: '480px' }}
    >
      <span className="text-[16px] font-bold">{icons[message.type]}</span>
      <div className="flex-1">
        <p className="text-[13px] font-medium">{message.title}</p>
        {message.message && (
          <p className="mt-1 text-[12px] opacity-80">{message.message}</p>
        )}
      </div>
      <button
        type="button"
        className="text-[14px] opacity-60 transition-opacity hover:opacity-100"
        onClick={handleClose}
      >
        ✕
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="pointer-events-none fixed right-6 top-6 z-[9999] flex flex-col items-end">
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast} onClose={onClose} />
      ))}
    </div>
  );
}

// 全局 Toast 管理器
class ToastManager {
  private listeners: Set<(toasts: ToastMessage[]) => void> = new Set();
  private toasts: ToastMessage[] = [];

  subscribe(listener: (toasts: ToastMessage[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }

  show(type: ToastType, title: string, message?: string, duration?: number) {
    const toast: ToastMessage = {
      id: `toast_${Date.now()}_${Math.random()}`,
      type,
      title,
      message,
      duration,
    };
    this.toasts.push(toast);
    this.notify();
  }

  success(title: string, message?: string, duration?: number) {
    this.show('success', title, message, duration);
  }

  error(title: string, message?: string, duration?: number) {
    this.show('error', title, message, duration);
  }

  info(title: string, message?: string, duration?: number) {
    this.show('info', title, message, duration);
  }

  warning(title: string, message?: string, duration?: number) {
    this.show('warning', title, message, duration);
  }

  close(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }
}

export const toast = new ToastManager();
