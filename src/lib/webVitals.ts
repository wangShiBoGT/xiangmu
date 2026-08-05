/**
 * Core Web Vitals 性能监控
 *
 * 测量关键性能指标：
 * - LCP (Largest Contentful Paint): 最大内容绘制时间
 * - FID (First Input Delay): 首次输入延迟
 * - CLS (Cumulative Layout Shift): 累积布局偏移
 * - FCP (First Contentful Paint): 首次内容绘制
 * - TTFB (Time to First Byte): 首字节时间
 *
 * 数据仅保存在本地，不上传任何服务器
 */

export interface WebVitalMetric {
  name: 'LCP' | 'FID' | 'CLS' | 'FCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

export interface PerformanceSnapshot {
  timestamp: number;
  url: string;
  metrics: WebVitalMetric[];
  deviceInfo: {
    userAgent: string;
    viewport: { width: number; height: number };
    deviceMemory?: number; // GB
    hardwareConcurrency?: number; // CPU 核心数
    connection?: {
      effectiveType: string; // '4g', '3g', etc.
      downlink?: number; // Mbps
      rtt?: number; // ms
    };
  };
}

const STORAGE_KEY = 'webgpu-llm-chat.web-vitals.v1';
const MAX_SNAPSHOTS = 50; // 最多保留 50 条记录

/** 评级阈值（参考 web.dev/vitals） */
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
} as const;

function getRating(name: WebVitalMetric['name'], value: number): WebVitalMetric['rating'] {
  const threshold = THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

function getDeviceInfo() {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: {
      effectiveType: string;
      downlink?: number;
      rtt?: number;
    };
  };

  return {
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
    connection: nav.connection ? {
      effectiveType: nav.connection.effectiveType,
      downlink: nav.connection.downlink,
      rtt: nav.connection.rtt,
    } : undefined,
  };
}

function saveSnapshot(snapshot: PerformanceSnapshot) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const snapshots: PerformanceSnapshot[] = stored ? JSON.parse(stored) : [];
    snapshots.push(snapshot);

    // 超出限制时删除最旧的记录
    if (snapshots.length > MAX_SNAPSHOTS) {
      snapshots.splice(0, snapshots.length - MAX_SNAPSHOTS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
  } catch (e) {
    console.warn('[WebVitals] 保存失败:', e);
  }
}

const metricsBuffer: WebVitalMetric[] = [];
let saveTimer: number | null = null;

function bufferMetric(metric: WebVitalMetric) {
  metricsBuffer.push(metric);

  // 延迟保存，收集所有指标后一次性写入
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    if (metricsBuffer.length === 0) return;

    const snapshot: PerformanceSnapshot = {
      timestamp: Date.now(),
      url: location.pathname,
      metrics: [...metricsBuffer],
      deviceInfo: getDeviceInfo(),
    };

    saveSnapshot(snapshot);
    metricsBuffer.length = 0;
  }, 3000); // 3 秒内的所有指标合并为一个快照
}

/**
 * 初始化 Core Web Vitals 监控
 * 使用 PerformanceObserver API 测量真实用户体验指标
 */
export function initWebVitals() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  // LCP - Largest Contentful Paint
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
        renderTime?: number;
        loadTime?: number;
      };
      const value = lastEntry.renderTime || lastEntry.loadTime || 0;

      bufferMetric({
        name: 'LCP',
        value,
        rating: getRating('LCP', value),
        delta: value,
        id: crypto.randomUUID(),
        navigationType: (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type || 'navigate',
      });
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {
    // LCP 不支持时静默失败
  }

  // FID - First Input Delay
  try {
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const fidEntry = entry as PerformanceEntry & { processingStart: number };
        const value = fidEntry.processingStart - entry.startTime;

        bufferMetric({
          name: 'FID',
          value,
          rating: getRating('FID', value),
          delta: value,
          id: crypto.randomUUID(),
          navigationType: (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type || 'navigate',
        });
      });
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch (e) {
    // FID 不支持时静默失败
  }

  // CLS - Cumulative Layout Shift
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const clsEntry = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        if (!clsEntry.hadRecentInput) {
          clsValue += clsEntry.value;
        }
      });

      bufferMetric({
        name: 'CLS',
        value: clsValue,
        rating: getRating('CLS', clsValue),
        delta: clsValue,
        id: crypto.randomUUID(),
        navigationType: (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type || 'navigate',
      });
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch (e) {
    // CLS 不支持时静默失败
  }

  // FCP - First Contentful Paint
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          const value = entry.startTime;

          bufferMetric({
            name: 'FCP',
            value,
            rating: getRating('FCP', value),
            delta: value,
            id: crypto.randomUUID(),
            navigationType: (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type || 'navigate',
          });
        }
      });
    });
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch (e) {
    // FCP 不支持时静默失败
  }

  // TTFB - Time to First Byte
  try {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const navEntry = navEntries[0] as PerformanceNavigationTiming;
      const value = navEntry.responseStart - navEntry.requestStart;

      bufferMetric({
        name: 'TTFB',
        value,
        rating: getRating('TTFB', value),
        delta: value,
        id: crypto.randomUUID(),
        navigationType: navEntry.type || 'navigate',
      });
    }
  } catch (e) {
    // TTFB 不支持时静默失败
  }

  // INP - Interaction to Next Paint (Chrome 96+)
  try {
    const inpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const inpEntry = entry as PerformanceEntry & { duration: number };
        const value = inpEntry.duration;

        bufferMetric({
          name: 'INP',
          value,
          rating: getRating('INP', value),
          delta: value,
          id: crypto.randomUUID(),
          navigationType: (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type || 'navigate',
        });
      });
    });
    // INP 使用 event 类型，但 durationThreshold 不是标准属性，移除以避免 TypeScript 错误
    inpObserver.observe({ type: 'event', buffered: true } as PerformanceObserverInit);
  } catch (e) {
    // INP 不支持时静默失败（较新的 API）
  }
}

/** 获取所有历史快照 */
export function getWebVitalsSnapshots(): PerformanceSnapshot[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.warn('[WebVitals] 读取失败:', e);
    return [];
  }
}

/** 清除所有历史快照 */
export function clearWebVitalsSnapshots() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('[WebVitals] 清除失败:', e);
  }
}

/** 导出快照为 JSON */
export function exportWebVitalsJSON(): string {
  const snapshots = getWebVitalsSnapshots();
  return JSON.stringify({ version: 1, snapshots }, null, 2);
}

/** 计算指标统计 */
export function computeWebVitalsStats(snapshots: PerformanceSnapshot[]) {
  const metricsByName: Record<string, number[]> = {};

  snapshots.forEach((snapshot) => {
    snapshot.metrics.forEach((metric) => {
      if (!metricsByName[metric.name]) {
        metricsByName[metric.name] = [];
      }
      metricsByName[metric.name].push(metric.value);
    });
  });

  const stats: Record<string, { avg: number; p50: number; p75: number; p90: number; count: number }> = {};

  Object.entries(metricsByName).forEach(([name, values]) => {
    if (values.length === 0) return;

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    stats[name] = {
      avg: sum / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p75: sorted[Math.floor(sorted.length * 0.75)],
      p90: sorted[Math.floor(sorted.length * 0.90)],
      count: values.length,
    };
  });

  return stats;
}
