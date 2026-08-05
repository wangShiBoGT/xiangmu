/**
 * ONNX Runtime 性能分析工具
 * 用于分析模型推理性能、逐层耗时、显存占用
 */

export interface PerformanceProfile {
  /** 总推理时间（毫秒） */
  totalTime: number;
  /** Prefill 阶段时间 */
  prefillTime?: number;
  /** Decode 阶段平均时间 */
  decodeTimeAvg?: number;
  /** 逐层耗时 */
  layerTimes?: Array<{ name: string; time: number }>;
  /** 内存占用（字节） */
  memoryUsage?: number;
  /** 设备信息 */
  device: string;
  /** 时间戳 */
  timestamp: number;
}

export interface PerformanceReport {
  /** 模型标识 */
  modelId: string;
  /** 设备类型 */
  device: 'webgpu' | 'wasm';
  /** 测试配置 */
  config: {
    batchSize: number;
    sequenceLength: number;
    quantization: string;
  };
  /** 性能指标 */
  metrics: {
    /** 平均推理时间（毫秒） */
    avgInferenceTime: number;
    /** 吞吐量（tokens/秒） */
    throughput: number;
    /** 首 token 延迟（毫秒） */
    timeToFirstToken?: number;
    /** 内存峰值（MB） */
    peakMemoryMB: number;
  };
  /** 详细性能数据 */
  profiles: PerformanceProfile[];
  /** 测试时间 */
  timestamp: number;
}

/**
 * 性能分析器
 */
export class PerformanceAnalyzer {
  private profiles: PerformanceProfile[] = [];
  private startTime: number = 0;
  private device: string = 'unknown';

  constructor(device: string) {
    this.device = device;
  }

  /**
   * 开始性能分析
   */
  start(): void {
    this.startTime = performance.now();
  }

  /**
   * 结束性能分析并记录
   */
  end(): PerformanceProfile {
    const totalTime = performance.now() - this.startTime;

    const profile: PerformanceProfile = {
      totalTime,
      device: this.device,
      timestamp: Date.now(),
    };

    this.profiles.push(profile);
    return profile;
  }

  /**
   * 记录自定义性能数据
   */
  recordProfile(profile: Partial<PerformanceProfile>): void {
    const fullProfile: PerformanceProfile = {
      totalTime: profile.totalTime ?? 0,
      device: this.device,
      timestamp: Date.now(),
      ...profile,
    };

    this.profiles.push(fullProfile);
  }

  /**
   * 获取所有性能数据
   */
  getProfiles(): PerformanceProfile[] {
    return [...this.profiles];
  }

  /**
   * 计算统计信息
   */
  getStats(): {
    count: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
  } {
    if (this.profiles.length === 0) {
      return { count: 0, avgTime: 0, minTime: 0, maxTime: 0 };
    }

    const times = this.profiles.map((p) => p.totalTime);
    const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return {
      count: this.profiles.length,
      avgTime,
      minTime,
      maxTime,
    };
  }

  /**
   * 清空性能数据
   */
  clear(): void {
    this.profiles = [];
  }

  /**
   * 生成性能报告
   */
  generateReport(
    modelId: string,
    config: {
      batchSize: number;
      sequenceLength: number;
      quantization: string;
    }
  ): PerformanceReport {
    const stats = this.getStats();

    // 计算吞吐量（假设每次推理生成 1 token）
    const throughput = stats.avgTime > 0 ? 1000 / stats.avgTime : 0;

    // 估算内存使用（简化版）
    const peakMemoryMB = this.estimateMemoryUsage(modelId, config.quantization);

    return {
      modelId,
      device: this.device as 'webgpu' | 'wasm',
      config,
      metrics: {
        avgInferenceTime: stats.avgTime,
        throughput,
        peakMemoryMB,
      },
      profiles: this.getProfiles(),
      timestamp: Date.now(),
    };
  }

  /**
   * 估算内存使用（简化版）
   */
  private estimateMemoryUsage(modelId: string, quantization: string): number {
    // 根据模型 ID 和量化方式估算内存使用
    // 这是一个简化的估算，实际使用应该从 runtime 获取
    const modelSizes: Record<string, number> = {
      'Phi-3.5-mini': 3800,
      'Qwen2.5-1.5B': 1500,
      'SmolLM2-1.7B': 1700,
    };

    const baseSize = modelSizes[modelId] || 1500;

    // 量化因子
    const quantFactor = quantization.includes('q4') ? 0.25 : 0.5;

    return baseSize * quantFactor;
  }
}

/**
 * 导出性能报告为 JSON
 */
export function exportPerformanceReport(report: PerformanceReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * 导出性能报告为 CSV
 */
export function exportPerformanceCSV(report: PerformanceReport): string {
  const lines = [
    'Timestamp,Total Time (ms),Prefill Time (ms),Decode Time (ms),Memory (MB)',
  ];

  for (const profile of report.profiles) {
    lines.push(
      [
        new Date(profile.timestamp).toISOString(),
        profile.totalTime.toFixed(2),
        profile.prefillTime?.toFixed(2) || '',
        profile.decodeTimeAvg?.toFixed(2) || '',
        profile.memoryUsage ? (profile.memoryUsage / 1024 / 1024).toFixed(2) : '',
      ].join(',')
    );
  }

  return lines.join('\n');
}
