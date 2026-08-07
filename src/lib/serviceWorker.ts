/**
 * Service Worker 注册和生命周期管理
 */

export interface ServiceWorkerStatus {
  supported: boolean;
  registered: boolean;
  active: boolean;
  waiting: boolean;
  updateAvailable: boolean;
}

let registration: ServiceWorkerRegistration | null = null;
let statusCallback: ((status: ServiceWorkerStatus) => void) | null = null;

function serviceWorkerUrl(): string {
  // 用当前 Vite 入口 hash 作为 SW URL。每次发布都会得到一个新 URL，浏览器
  // 不会因缓存的旧 sw.js 而延后更新，旧 controller 会在激活后刷新页面。
  const entry = document.querySelector<HTMLScriptElement>(
    'script[type="module"][src]',
  );
  const buildId = entry?.src ? new URL(entry.src).pathname : "unknown";
  return `/sw.js?build=${encodeURIComponent(buildId)}`;
}

/**
 * 注册 Service Worker
 */
export async function registerServiceWorker(): Promise<boolean> {
  // 检查浏览器支持
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Service Worker not supported');
    notifyStatus({ supported: false, registered: false, active: false, waiting: false, updateAvailable: false });
    return false;
  }

  try {
    registration = await navigator.serviceWorker.register(serviceWorkerUrl(), {
      scope: '/',
    });

    console.log('[SW] Service Worker registered:', registration.scope);

    // 监听更新
    registration.addEventListener('updatefound', handleUpdateFound);

    // 监听控制器变化
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // 检查初始状态
    checkStatus();

    return true;
  } catch (error) {
    console.error('[SW] Service Worker registration failed:', error);
    notifyStatus({ supported: true, registered: false, active: false, waiting: false, updateAvailable: false });
    return false;
  }
}

/**
 * 注销 Service Worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!registration) {
    console.warn('[SW] No registration to unregister');
    return false;
  }

  try {
    const success = await registration.unregister();
    console.log('[SW] Service Worker unregistered:', success);

    if (success) {
      registration = null;
      notifyStatus({ supported: true, registered: false, active: false, waiting: false, updateAvailable: false });
    }

    return success;
  } catch (error) {
    console.error('[SW] Service Worker unregister failed:', error);
    return false;
  }
}

/**
 * 更新 Service Worker（激活等待中的新版本）
 */
export function updateServiceWorker(): void {
  if (!registration || !registration.waiting) {
    console.warn('[SW] No waiting worker to update');
    return;
  }

  console.log('[SW] Activating waiting worker...');

  // 发送 SKIP_WAITING 消息
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
}

/**
 * 检查 Service Worker 更新
 */
export async function checkForUpdates(): Promise<boolean> {
  if (!registration) {
    console.warn('[SW] No registration to check for updates');
    return false;
  }

  try {
    await registration.update();
    console.log('[SW] Update check complete');
    return true;
  } catch (error) {
    console.error('[SW] Update check failed:', error);
    return false;
  }
}

/**
 * 清除所有缓存
 */
export async function clearAllCaches(): Promise<boolean> {
  if (!registration || !registration.active) {
    console.warn('[SW] No active worker to clear caches');
    return false;
  }

  try {
    const messageChannel = new MessageChannel();

    const promise = new Promise<boolean>((resolve) => {
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success);
      };

      // 超时处理
      setTimeout(() => resolve(false), 5000);
    });

    registration.active.postMessage(
      { type: 'CLEAR_CACHE' },
      [messageChannel.port2]
    );

    const success = await promise;
    console.log('[SW] Clear cache result:', success);
    return success;
  } catch (error) {
    console.error('[SW] Clear cache failed:', error);
    return false;
  }
}

/**
 * 获取缓存大小
 */
export async function getCacheSize(): Promise<number> {
  if (!registration || !registration.active) {
    console.warn('[SW] No active worker to get cache size');
    return 0;
  }

  try {
    const messageChannel = new MessageChannel();

    const promise = new Promise<number>((resolve) => {
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.size || 0);
      };

      // 超时处理
      setTimeout(() => resolve(0), 5000);
    });

    registration.active.postMessage(
      { type: 'GET_CACHE_SIZE' },
      [messageChannel.port2]
    );

    const size = await promise;
    console.log('[SW] Cache size:', (size / (1024 * 1024)).toFixed(2), 'MB');
    return size;
  } catch (error) {
    console.error('[SW] Get cache size failed:', error);
    return 0;
  }
}

/**
 * 设置状态回调
 */
export function onStatusChange(callback: (status: ServiceWorkerStatus) => void): void {
  statusCallback = callback;
  checkStatus(); // 立即通知当前状态
}

/**
 * 检查当前状态
 */
function checkStatus(): void {
  if (!registration) {
    notifyStatus({ supported: true, registered: false, active: false, waiting: false, updateAvailable: false });
    return;
  }

  const status: ServiceWorkerStatus = {
    supported: true,
    registered: true,
    active: !!registration.active,
    waiting: !!registration.waiting,
    updateAvailable: !!registration.waiting,
  };

  notifyStatus(status);
}

/**
 * 通知状态变化
 */
function notifyStatus(status: ServiceWorkerStatus): void {
  if (statusCallback) {
    statusCallback(status);
  }
}

/**
 * 处理更新发现
 */
function handleUpdateFound(): void {
  if (!registration) return;

  const newWorker = registration.installing;
  if (!newWorker) return;

  console.log('[SW] Update found, installing new worker...');

  newWorker.addEventListener('statechange', () => {
    console.log('[SW] Worker state changed:', newWorker.state);

    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
      console.log('[SW] New version available, waiting to activate');
      checkStatus();
    }
  });
}

/**
 * 处理控制器变化（新 SW 激活）
 */
function handleControllerChange(): void {
  console.log('[SW] Controller changed, reloading page...');

  // 新 Service Worker 已激活，刷新页面以使用新版本
  window.location.reload();
}

/**
 * 格式化缓存大小
 */
export function formatCacheSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
}
