/**
 * 客户端错误追踪
 *
 * 捕获全局错误、Promise rejection、资源加载失败等异常
 * 记录详细上下文信息，帮助诊断问题
 *
 * 隐私保护：
 * - 所有数据仅保存在本地 localStorage
 * - 不包含用户身份信息
 * - 不自动上传到任何服务器
 * - 需用户明确授权后才启用（默认禁用）
 */

export interface ErrorRecord {
  id: string;
  timestamp: number;
  type: 'error' | 'unhandledrejection' | 'resource' | 'webgpu';
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  url: string;
  userAgent: string;
  context?: {
    modelId?: string;
    generating?: boolean;
    workerReady?: boolean;
    memoryGB?: number;
    cores?: number;
    webgpu?: boolean;
    [key: string]: unknown;
  };
}

const STORAGE_KEY = 'webgpu-llm-chat.errors.v1';
const ENABLED_KEY = 'webgpu-llm-chat.error-tracking-enabled';
const MAX_ERRORS = 100; // 最多保留 100 条错误记录

let isEnabled = false;
let contextProvider: (() => Record<string, unknown>) | null = null;

/** 检查错误追踪是否已启用 */
export function isErrorTrackingEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) === 'true';
  } catch {
    return false;
  }
}

/** 启用错误追踪（需用户明确授权） */
export function enableErrorTracking() {
  try {
    localStorage.setItem(ENABLED_KEY, 'true');
    isEnabled = true;
    console.info('[ErrorTracking] 错误追踪已启用');
  } catch (e) {
    console.warn('[ErrorTracking] 无法启用错误追踪:', e);
  }
}

/** 禁用错误追踪 */
export function disableErrorTracking() {
  try {
    localStorage.removeItem(ENABLED_KEY);
    isEnabled = false;
    console.info('[ErrorTracking] 错误追踪已禁用');
  } catch (e) {
    console.warn('[ErrorTracking] 无法禁用错误追踪:', e);
  }
}

/** 设置上下文提供函数（用于附加应用状态信息） */
export function setErrorContextProvider(provider: () => Record<string, unknown>) {
  contextProvider = provider;
}

function saveError(record: ErrorRecord) {
  if (!isEnabled) return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const errors: ErrorRecord[] = stored ? JSON.parse(stored) : [];
    errors.push(record);

    // 超出限制时删除最旧的记录
    if (errors.length > MAX_ERRORS) {
      errors.splice(0, errors.length - MAX_ERRORS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(errors));
  } catch (e) {
    console.warn('[ErrorTracking] 保存失败:', e);
  }
}

function recordError(
  type: ErrorRecord['type'],
  message: string,
  options: Partial<ErrorRecord> = {},
) {
  const record: ErrorRecord = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    type,
    message,
    url: location.href,
    userAgent: navigator.userAgent,
    context: contextProvider ? contextProvider() : undefined,
    ...options,
  };

  saveError(record);

  // 在开发模式下输出到控制台
  if (import.meta.env.DEV) {
    console.error('[ErrorTracking]', record);
  }
}

/** 初始化错误追踪（仅在用户授权后调用） */
export function initErrorTracking() {
  isEnabled = isErrorTrackingEnabled();
  if (!isEnabled) {
    console.info('[ErrorTracking] 错误追踪未启用，跳过初始化');
    return;
  }

  // 捕获全局错误
  window.addEventListener('error', (event) => {
    // 过滤资源加载错误（单独处理）
    if (event.target !== window) {
      const target = event.target as HTMLElement;
      recordError('resource', `资源加载失败: ${target.tagName}`, {
        filename: (target as HTMLImageElement | HTMLScriptElement).src || (target as HTMLLinkElement).href,
      });
      return;
    }

    recordError('error', event.message, {
      stack: event.error?.stack,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // 捕获 Promise rejection
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error
      ? reason.message
      : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;

    recordError('unhandledrejection', message, { stack });
  });

  console.info('[ErrorTracking] 错误追踪已初始化');
}

/** 手动记录 WebGPU 相关错误 */
export function recordWebGPUError(message: string, details?: Record<string, unknown>) {
  recordError('webgpu', message, {
    context: {
      ...(contextProvider ? contextProvider() : {}),
      ...details,
    },
  });
}

/** 获取所有错误记录 */
export function getErrorRecords(): ErrorRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.warn('[ErrorTracking] 读取失败:', e);
    return [];
  }
}

/** 清除所有错误记录 */
export function clearErrorRecords() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('[ErrorTracking] 清除失败:', e);
  }
}

/** 导出错误记录为 JSON */
export function exportErrorsJSON(): string {
  const errors = getErrorRecords();
  return JSON.stringify({ version: 1, errors }, null, 2);
}

/** 按错误类型统计 */
export function computeErrorStats(errors: ErrorRecord[]) {
  const byType: Record<string, number> = {};
  const byMessage: Record<string, number> = {};
  const recent24h = errors.filter(
    (e) => Date.now() - e.timestamp < 24 * 60 * 60 * 1000,
  );

  errors.forEach((error) => {
    byType[error.type] = (byType[error.type] || 0) + 1;
    byMessage[error.message] = (byMessage[error.message] || 0) + 1;
  });

  // 找出最常见的错误（Top 5）
  const topErrors = Object.entries(byMessage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([message, count]) => ({ message, count }));

  return {
    total: errors.length,
    recent24h: recent24h.length,
    byType,
    topErrors,
  };
}
