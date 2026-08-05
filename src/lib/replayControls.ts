/**
 * Replay 模式增强控制器
 *
 * 功能：
 * - 变速播放（0.25x - 4x）
 * - 关键帧书签和跳转
 * - Fork point 分支对比
 * - 播放状态管理
 */

export interface PlaybackSpeed {
  value: number;
  label: string;
}

export const PLAYBACK_SPEEDS: PlaybackSpeed[] = [
  { value: 0.25, label: '0.25x' },
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1.0, label: '1x' },
  { value: 1.5, label: '1.5x' },
  { value: 2.0, label: '2x' },
  { value: 3.0, label: '3x' },
  { value: 4.0, label: '4x' },
];

export interface Bookmark {
  id: string;
  step: number;
  label: string;
  note?: string;
  timestamp: number;
}

export interface ForkPoint {
  step: number;
  /** 分支 A 的后续步骤数 */
  branchALength: number;
  /** 分支 B 的后续步骤数 */
  branchBLength: number;
  /** 分支点描述 */
  description?: string;
}

/**
 * Replay 控制器状态
 */
export interface ReplayState {
  /** 当前步骤索引 */
  currentStep: number;
  /** 总步数 */
  totalSteps: number;
  /** 播放状态 */
  playing: boolean;
  /** 播放速度 */
  speed: number;
  /** 书签列表 */
  bookmarks: Bookmark[];
  /** Fork 点列表 */
  forkPoints: ForkPoint[];
  /** 循环播放 */
  loop: boolean;
}

/**
 * Replay 控制器
 */
export class ReplayController {
  private state: ReplayState;
  private listeners: Set<(state: ReplayState) => void> = new Set();
  private intervalId: number | null = null;
  private baseInterval = 100; // 基础间隔 100ms

  constructor(totalSteps: number) {
    this.state = {
      currentStep: 0,
      totalSteps,
      playing: false,
      speed: 1.0,
      bookmarks: [],
      forkPoints: [],
      loop: false,
    };
  }

  /**
   * 订阅状态变化
   */
  subscribe(listener: (state: ReplayState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知所有监听器
   */
  private notify(): void {
    this.listeners.forEach((listener) => listener({ ...this.state }));
  }

  /**
   * 获取当前状态
   */
  getState(): ReplayState {
    return { ...this.state };
  }

  /**
   * 播放
   */
  play(): void {
    if (this.state.playing) return;

    this.state.playing = true;
    this.notify();

    const interval = this.baseInterval / this.state.speed;
    this.intervalId = window.setInterval(() => {
      this.stepForward();
    }, interval);
  }

  /**
   * 暂停
   */
  pause(): void {
    if (!this.state.playing) return;

    this.state.playing = false;
    this.notify();

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 切换播放/暂停
   */
  togglePlay(): void {
    if (this.state.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * 设置播放速度
   */
  setSpeed(speed: number): void {
    const wasPlaying = this.state.playing;
    if (wasPlaying) {
      this.pause();
    }

    this.state.speed = speed;
    this.notify();

    if (wasPlaying) {
      this.play();
    }
  }

  /**
   * 跳转到指定步骤
   */
  seekTo(step: number): void {
    if (step < 0 || step >= this.state.totalSteps) return;

    this.state.currentStep = step;
    this.notify();
  }

  /**
   * 前进一步
   */
  stepForward(): void {
    if (this.state.currentStep >= this.state.totalSteps - 1) {
      if (this.state.loop) {
        this.state.currentStep = 0;
      } else {
        this.pause();
      }
    } else {
      this.state.currentStep++;
    }
    this.notify();
  }

  /**
   * 后退一步
   */
  stepBackward(): void {
    if (this.state.currentStep > 0) {
      this.state.currentStep--;
      this.notify();
    }
  }

  /**
   * 跳转到开始
   */
  seekToStart(): void {
    this.state.currentStep = 0;
    this.notify();
  }

  /**
   * 跳转到结束
   */
  seekToEnd(): void {
    this.state.currentStep = this.state.totalSteps - 1;
    this.notify();
  }

  /**
   * 添加书签
   */
  addBookmark(label: string, note?: string): void {
    const bookmark: Bookmark = {
      id: `bookmark_${Date.now()}`,
      step: this.state.currentStep,
      label,
      note,
      timestamp: Date.now(),
    };

    this.state.bookmarks.push(bookmark);
    this.notify();
  }

  /**
   * 删除书签
   */
  removeBookmark(id: string): void {
    this.state.bookmarks = this.state.bookmarks.filter((b) => b.id !== id);
    this.notify();
  }

  /**
   * 跳转到书签
   */
  jumpToBookmark(id: string): void {
    const bookmark = this.state.bookmarks.find((b) => b.id === id);
    if (bookmark) {
      this.seekTo(bookmark.step);
    }
  }

  /**
   * 添加 Fork 点
   */
  addForkPoint(
    step: number,
    branchALength: number,
    branchBLength: number,
    description?: string
  ): void {
    const forkPoint: ForkPoint = {
      step,
      branchALength,
      branchBLength,
      description,
    };

    this.state.forkPoints.push(forkPoint);
    this.notify();
  }

  /**
   * 切换循环模式
   */
  toggleLoop(): void {
    this.state.loop = !this.state.loop;
    this.notify();
  }

  /**
   * 清理
   */
  dispose(): void {
    this.pause();
    this.listeners.clear();
  }
}

/**
 * 从 trace 中自动检测 Fork 点
 * （基于决策点的 top-k 候选词差异）
 */
export function detectForkPoints(
  steps: Array<{ topk?: Array<{ text: string; prob: number }> }>,
  threshold = 0.3
): ForkPoint[] {
  const forkPoints: ForkPoint[] = [];

  for (let i = 0; i < steps.length; i++) {
    const topk = steps[i].topk;
    if (!topk || topk.length < 2) continue;

    const firstProb = topk[0].prob;
    const secondProb = topk[1].prob;
    const gap = firstProb - secondProb;

    // 如果两个候选词概率接近（犹豫点），标记为 fork point
    if (gap < threshold) {
      forkPoints.push({
        step: i,
        branchALength: 10, // 假设分支长度
        branchBLength: 10,
        description: `犹豫: "${topk[0].text}" vs "${topk[1].text}" (gap: ${(gap * 100).toFixed(1)}%)`,
      });
    }
  }

  return forkPoints;
}

/**
 * 生成自动书签（基于语义分段）
 */
export function generateAutoBookmarks(
  steps: Array<{ text: string }>,
  sentenceEnds: number[]
): Bookmark[] {
  const bookmarks: Bookmark[] = [];

  // 在每个句子结束处创建书签
  sentenceEnds.forEach((stepIndex, i) => {
    if (stepIndex >= steps.length) return;

    // 提取句子内容作为标签
    const startIndex = i === 0 ? 0 : sentenceEnds[i - 1] + 1;
    const sentence = steps
      .slice(startIndex, stepIndex + 1)
      .map((s) => s.text)
      .join('');

    // 截断长句
    const label = sentence.length > 30 ? sentence.slice(0, 30) + '...' : sentence;

    bookmarks.push({
      id: `auto_${stepIndex}`,
      step: stepIndex,
      label,
      timestamp: Date.now(),
    });
  });

  return bookmarks;
}
