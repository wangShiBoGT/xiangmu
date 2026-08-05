/**
 * 开发模式性能 Profiler
 *
 * 提供轻量级的性能分析工具，帮助识别渲染瓶颈：
 * - React 组件渲染耗时追踪
 * - 长任务（Long Tasks）检测
 * - 内存使用监控
 * - 自定义性能标记点
 *
 * 仅在开发模式下启用，生产环境自动禁用
 */

export interface ComponentRenderMetric {
  id: string;
  componentName: string;
  phase: 'mount' | 'update';
  actualDuration: number; // 本次渲染耗时（ms）
  baseDuration: number; // 理想渲染耗时（ms）
  startTime: number;
  commitTime: number;
}

export interface LongTaskMetric {
  id: string;
  name: string;
  duration: number; // ms
  startTime: number;
  attribution?: string; // 任务来源
}

export interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number; // 字节
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface PerformanceMark {
  name: string;
  startTime: number;
  duration?: number; // 如果有对应的 measure
}

const MAX_METRICS = 200; // 最多保留 200 条性能记录
const LONG_TASK_THRESHOLD = 50; // 超过 50ms 视为长任务

let isEnabled = false;
let componentMetrics: ComponentRenderMetric[] = [];
let longTaskMetrics: LongTaskMetric[] = [];
let memorySnapshots: MemorySnapshot[] = [];
let performanceMarks: Map<string, PerformanceMark> = new Map();

/** 检查是否在开发模式 */
function isDevMode(): boolean {
  return import.meta.env.DEV;
}

/** 启用 Profiler（仅开发模式） */
export function enableProfiler() {
  if (!isDevMode()) {
    console.warn('[Profiler] 仅在开发模式下可用');
    return false;
  }
  isEnabled = true;
  console.info('[Profiler] 性能分析已启用');
  return true;
}

/** 禁用 Profiler */
export function disableProfiler() {
  isEnabled = false;
  console.info('[Profiler] 性能分析已禁用');
}

/** 检查 Profiler 是否已启用 */
export function isProfilerEnabled(): boolean {
  return isEnabled && isDevMode();
}

/** 记录 React 组件渲染性能 */
export function recordComponentRender(
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number,
) {
  if (!isEnabled) return;

  const metric: ComponentRenderMetric = {
    id,
    componentName: id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
  };

  componentMetrics.push(metric);

  // 警告慢渲染
  if (actualDuration > 16) {
    console.warn(
      `[Profiler] 慢渲染: ${id} ${phase} took ${actualDuration.toFixed(2)}ms (target: 16ms)`,
    );
  }

  // 限制数组大小
  if (componentMetrics.length > MAX_METRICS) {
    componentMetrics = componentMetrics.slice(-MAX_METRICS);
  }
}

/** 初始化长任务监控 */
function initLongTaskObserver() {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.duration > LONG_TASK_THRESHOLD) {
          const metric: LongTaskMetric = {
            id: crypto.randomUUID(),
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
            attribution: (entry as any).attribution?.[0]?.name,
          };

          longTaskMetrics.push(metric);

          console.warn(
            `[Profiler] 长任务检测: ${entry.name} took ${entry.duration.toFixed(2)}ms`,
            entry,
          );

          if (longTaskMetrics.length > MAX_METRICS) {
            longTaskMetrics = longTaskMetrics.slice(-MAX_METRICS);
          }
        }
      });
    });

    // 监听所有任务类型
    observer.observe({ entryTypes: ['longtask', 'measure'] });
  } catch (e) {
    console.warn('[Profiler] 长任务监控不可用:', e);
  }
}

/** 拍摄内存快照 */
export function takeMemorySnapshot() {
  if (!isEnabled) return null;

  const perf = performance as Performance & {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  };

  if (!perf.memory) {
    console.warn('[Profiler] performance.memory 不可用（需 Chrome）');
    return null;
  }

  const snapshot: MemorySnapshot = {
    timestamp: Date.now(),
    usedJSHeapSize: perf.memory.usedJSHeapSize,
    totalJSHeapSize: perf.memory.totalJSHeapSize,
    jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
  };

  memorySnapshots.push(snapshot);

  // 限制数组大小
  if (memorySnapshots.length > MAX_METRICS) {
    memorySnapshots = memorySnapshots.slice(-MAX_METRICS);
  }

  return snapshot;
}

/** 自定义性能标记点 */
export function mark(name: string) {
  if (!isEnabled) return;

  try {
    performance.mark(name);
    performanceMarks.set(name, {
      name,
      startTime: performance.now(),
    });
  } catch (e) {
    console.warn('[Profiler] performance.mark 失败:', e);
  }
}

/** 测量两个标记点之间的耗时 */
export function measure(name: string, startMark: string, endMark?: string) {
  if (!isEnabled) return null;

  try {
    const measureName = `${name} (${startMark} → ${endMark || 'now'})`;
    performance.measure(measureName, startMark, endMark);

    const entries = performance.getEntriesByName(measureName, 'measure');
    if (entries.length > 0) {
      const entry = entries[0];
      const startMarkData = performanceMarks.get(startMark);
      if (startMarkData) {
        startMarkData.duration = entry.duration;
      }

      console.info(
        `[Profiler] ${measureName}: ${entry.duration.toFixed(2)}ms`,
      );

      return entry.duration;
    }
  } catch (e) {
    console.warn('[Profiler] performance.measure 失败:', e);
  }

  return null;
}

/** 获取所有组件渲染指标 */
export function getComponentMetrics(): ComponentRenderMetric[] {
  return [...componentMetrics];
}

/** 获取所有长任务指标 */
export function getLongTaskMetrics(): LongTaskMetric[] {
  return [...longTaskMetrics];
}

/** 获取所有内存快照 */
export function getMemorySnapshots(): MemorySnapshot[] {
  return [...memorySnapshots];
}

/** 获取所有性能标记 */
export function getPerformanceMarks(): PerformanceMark[] {
  return Array.from(performanceMarks.values());
}

/** 清除所有性能数据 */
export function clearProfilerData() {
  componentMetrics = [];
  longTaskMetrics = [];
  memorySnapshots = [];
  performanceMarks.clear();
  performance.clearMarks();
  performance.clearMeasures();
  console.info('[Profiler] 已清除所有性能数据');
}

/** 生成性能报告 */
export interface ProfilerReport {
  componentMetrics: {
    total: number;
    slowRenders: ComponentRenderMetric[]; // actualDuration > 16ms
    byComponent: Record<string, { count: number; avgDuration: number; maxDuration: number }>;
  };
  longTasks: {
    total: number;
    tasks: LongTaskMetric[];
    avgDuration: number;
  };
  memory: {
    snapshots: number;
    current: MemorySnapshot | null;
    peak: number; // 峰值内存使用（字节）
  };
  marks: PerformanceMark[];
}

export function generateReport(): ProfilerReport {
  // 组件渲染分析
  const slowRenders = componentMetrics.filter(m => m.actualDuration > 16);
  const byComponent: Record<string, { count: number; avgDuration: number; maxDuration: number }> = {};

  componentMetrics.forEach(metric => {
    if (!byComponent[metric.componentName]) {
      byComponent[metric.componentName] = { count: 0, avgDuration: 0, maxDuration: 0 };
    }
    const stats = byComponent[metric.componentName];
    stats.count++;
    stats.avgDuration = (stats.avgDuration * (stats.count - 1) + metric.actualDuration) / stats.count;
    stats.maxDuration = Math.max(stats.maxDuration, metric.actualDuration);
  });

  // 长任务分析
  const avgLongTaskDuration = longTaskMetrics.length > 0
    ? longTaskMetrics.reduce((sum, m) => sum + m.duration, 0) / longTaskMetrics.length
    : 0;

  // 内存分析
  const peakMemory = memorySnapshots.length > 0
    ? Math.max(...memorySnapshots.map(s => s.usedJSHeapSize))
    : 0;

  return {
    componentMetrics: {
      total: componentMetrics.length,
      slowRenders,
      byComponent,
    },
    longTasks: {
      total: longTaskMetrics.length,
      tasks: longTaskMetrics,
      avgDuration: avgLongTaskDuration,
    },
    memory: {
      snapshots: memorySnapshots.length,
      current: memorySnapshots[memorySnapshots.length - 1] || null,
      peak: peakMemory,
    },
    marks: getPerformanceMarks(),
  };
}

/** 导出性能数据为 JSON */
export function exportProfilerJSON(): string {
  const report = generateReport();
  return JSON.stringify({
    version: 1,
    timestamp: Date.now(),
    report,
    rawData: {
      componentMetrics,
      longTaskMetrics,
      memorySnapshots,
      performanceMarks: Array.from(performanceMarks.entries()),
    },
  }, null, 2);
}

/** 打印性能报告到控制台 */
export function printReport() {
  const report = generateReport();

  console.group('[Profiler] 性能报告');

  console.group('📊 组件渲染');
  console.log(`总渲染次数: ${report.componentMetrics.total}`);
  console.log(`慢渲染次数: ${report.componentMetrics.slowRenders.length} (>16ms)`);
  console.table(report.componentMetrics.byComponent);
  console.groupEnd();

  console.group('⏱️ 长任务');
  console.log(`总长任务: ${report.longTasks.total}`);
  console.log(`平均耗时: ${report.longTasks.avgDuration.toFixed(2)}ms`);
  if (report.longTasks.tasks.length > 0) {
    console.table(report.longTasks.tasks);
  }
  console.groupEnd();

  console.group('💾 内存');
  console.log(`快照数量: ${report.memory.snapshots}`);
  console.log(`峰值内存: ${(report.memory.peak / 1024 / 1024).toFixed(2)} MB`);
  if (report.memory.current) {
    console.log(`当前内存: ${(report.memory.current.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
  }
  console.groupEnd();

  console.group('🚩 性能标记');
  console.table(report.marks);
  console.groupEnd();

  console.groupEnd();
}

/** 初始化 Profiler */
export function initProfiler() {
  if (!isDevMode()) {
    return;
  }

  // 默认不启用，需要手动调用 enableProfiler()
  console.info('[Profiler] 性能分析工具已加载，使用 enableProfiler() 启用');
  console.info('[Profiler] 可用命令: printReport(), exportProfilerJSON(), clearProfilerData()');

  // 初始化长任务监控（始终监听，但只在启用时记录）
  initLongTaskObserver();

  // 暴露到 window 方便开发时调用
  if (typeof window !== 'undefined') {
    (window as any).__profiler__ = {
      enable: enableProfiler,
      disable: disableProfiler,
      report: printReport,
      export: exportProfilerJSON,
      clear: clearProfilerData,
      mark,
      measure,
      snapshot: takeMemorySnapshot,
    };
    console.info('[Profiler] 已暴露到 window.__profiler__');
  }
}
