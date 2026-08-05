/**
 * Replay 增强控制面板
 *
 * 提供：
 * - 播放/暂停/步进控制
 * - 速度调节
 * - 进度条和时间轴
 * - 书签管理
 * - Fork 点导航
 */

import { useEffect, useState } from 'react';
import {
  ReplayController,
  PLAYBACK_SPEEDS,
  type ReplayState,
} from '../lib/replayControls';

interface Props {
  controller: ReplayController;
  onStepChange?: (step: number) => void;
}

export default function ReplayControlPanel({ controller, onStepChange }: Props) {
  const [state, setState] = useState<ReplayState>(controller.getState());
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarkLabel, setBookmarkLabel] = useState('');
  const [bookmarkNote, setBookmarkNote] = useState('');

  // 订阅控制器状态变化
  useEffect(() => {
    const unsubscribe = controller.subscribe((newState) => {
      setState(newState);
      onStepChange?.(newState.currentStep);
    });

    return unsubscribe;
  }, [controller, onStepChange]);

  const progress = state.totalSteps > 0
    ? (state.currentStep / (state.totalSteps - 1)) * 100
    : 0;

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const step = Number(e.target.value);
    controller.seekTo(step);
  };

  const handleAddBookmark = () => {
    if (!bookmarkLabel.trim()) return;

    controller.addBookmark(bookmarkLabel, bookmarkNote || undefined);
    setBookmarkLabel('');
    setBookmarkNote('');
  };

  return (
    <div className="rounded-xl border border-obs-line/30 bg-gradient-to-b from-obs-1/95 to-[#05070C]/95 px-5 py-3 backdrop-blur-sm shadow-2xl">
      {/* 进度信息 */}
      <div className="mb-2 flex items-center justify-center gap-4 text-[11px] text-obs-ink2/80">
        <span className="font-mono">
          步骤 {state.currentStep + 1} / {state.totalSteps}
        </span>
        <span className="font-mono">
          {progress.toFixed(1)}%
        </span>
      </div>

      {/* 进度条 */}
      <div className="mb-3">
        <div className="relative">
          <input
            type="range"
            min={0}
            max={state.totalSteps - 1}
            value={state.currentStep}
            onChange={handleProgressChange}
            className="w-full accent-accent"
          />

          {/* Fork 点标记 */}
          {state.forkPoints.map((fork, i) => {
            const left = (fork.step / (state.totalSteps - 1)) * 100;
            return (
              <div
                key={i}
                className="absolute top-0 h-4 w-1 -translate-x-1/2 cursor-pointer bg-[#ffa726]"
                style={{ left: `${left}%` }}
                title={fork.description}
                onClick={() => controller.seekTo(fork.step)}
              />
            );
          })}

          {/* 书签标记 */}
          {state.bookmarks.map((bookmark) => {
            const left = (bookmark.step / (state.totalSteps - 1)) * 100;
            return (
              <div
                key={bookmark.id}
                className="absolute top-0 h-4 w-1 -translate-x-1/2 cursor-pointer bg-accent"
                style={{ left: `${left}%` }}
                title={bookmark.label}
                onClick={() => controller.jumpToBookmark(bookmark.id)}
              />
            );
          })}
        </div>
      </div>

      {/* 控制按钮组 - 居中布局 */}
      <div className="flex items-center justify-center gap-1.5">
        {/* 跳到开始 */}
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-obs-line/40 bg-obs-2/50 text-obs-ink2/70 transition-all hover:border-accent/40 hover:bg-obs-2 hover:text-obs-ink"
          onClick={() => controller.seekToStart()}
          title="跳到开始"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11 6L6 12l5 6V6zm7 0l-5 6 5 6V6z" />
          </svg>
        </button>

        {/* 后退 */}
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-obs-line/40 bg-obs-2/50 text-obs-ink2/70 transition-all hover:border-accent/40 hover:bg-obs-2 hover:text-obs-ink"
          onClick={() => controller.stepBackward()}
          title="后退一步"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>

        {/* 播放/暂停 */}
        <button
          type="button"
          className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-accent px-4 text-[13px] font-medium text-white transition-all hover:bg-accent/90"
          onClick={() => controller.togglePlay()}
        >
          {state.playing ? (
            <>
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
              暂停
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              播放
            </>
          )}
        </button>

        {/* 前进 */}
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-obs-line/40 bg-obs-2/50 text-obs-ink2/70 transition-all hover:border-accent/40 hover:bg-obs-2 hover:text-obs-ink"
          onClick={() => controller.stepForward()}
          title="前进一步"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
          </svg>
        </button>

        {/* 跳到结束 */}
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-obs-line/40 bg-obs-2/50 text-obs-ink2/70 transition-all hover:border-accent/40 hover:bg-obs-2 hover:text-obs-ink"
          onClick={() => controller.seekToEnd()}
          title="跳到结束"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6l5 6-5 6V6zm7 0l5 6-5 6V6z" />
          </svg>
        </button>

        {/* 分隔线 */}
        <div className="h-5 w-px bg-obs-line/30 mx-1.5" />

        {/* 速度选择 - 紧凑按钮样式 */}
        <div className="relative">
          <select
            className="h-8 appearance-none rounded-md border border-obs-line/40 bg-obs-2/50 pl-2.5 pr-7 text-[12px] font-medium text-obs-ink transition-all hover:border-obs-line/80 focus:border-accent focus:outline-none cursor-pointer"
            value={state.speed}
            onChange={(e) => controller.setSpeed(Number(e.target.value))}
          >
            {PLAYBACK_SPEEDS.map((speed) => (
              <option key={speed.value} value={speed.value}>
                {speed.label}
              </option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-obs-ink2/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* 循环播放 */}
        <button
          type="button"
          className={`flex h-8 w-8 items-center justify-center rounded-md border transition-all ${
            state.loop
              ? 'border-accent/40 bg-accent/20 text-accent'
              : 'border-obs-line/40 bg-obs-2/50 text-obs-ink2/70 hover:border-accent/40 hover:bg-obs-2 hover:text-obs-ink'
          }`}
          onClick={() => controller.toggleLoop()}
          title="循环播放"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        {/* 书签管理 */}
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-obs-line/40 bg-obs-2/50 text-obs-ink2/70 transition-all hover:border-accent/40 hover:bg-obs-2 hover:text-obs-ink"
          onClick={() => setShowBookmarks(!showBookmarks)}
          title="书签"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>

      {/* 书签面板 */}
      {showBookmarks && (
        <div className="mt-4 rounded-md border border-obs-line bg-obs-1 p-4">
          <h3 className="mb-3 text-[13px] font-medium text-obs-ink">书签管理</h3>

          {/* 添加书签表单 */}
          <div className="mb-4 space-y-2">
            <input
              type="text"
              className="w-full rounded-md border border-obs-line bg-obs-2 px-3 py-2 text-[12px] text-obs-ink placeholder-obs-ink2/60 focus:border-accent focus:outline-none"
              placeholder="书签标签..."
              value={bookmarkLabel}
              onChange={(e) => setBookmarkLabel(e.target.value)}
            />
            <input
              type="text"
              className="w-full rounded-md border border-obs-line bg-obs-2 px-3 py-2 text-[12px] text-obs-ink placeholder-obs-ink2/60 focus:border-accent focus:outline-none"
              placeholder="备注（可选）..."
              value={bookmarkNote}
              onChange={(e) => setBookmarkNote(e.target.value)}
            />
            <button
              type="button"
              className="w-full rounded-md border border-accent bg-accent/10 px-4 py-2 text-[13px] font-medium text-accent transition-colors hover:bg-accent/20"
              onClick={handleAddBookmark}
              disabled={!bookmarkLabel.trim()}
            >
              在当前位置添加书签
            </button>
          </div>

          {/* 书签列表 */}
          {state.bookmarks.length === 0 ? (
            <p className="text-[12px] text-obs-ink2">暂无书签</p>
          ) : (
            <div className="space-y-2">
              {state.bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="flex items-start gap-3 rounded-md border border-obs-line bg-obs-2 p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-obs-ink2/60">
                        #{bookmark.step}
                      </span>
                      <span className="text-[12px] font-medium text-obs-ink">
                        {bookmark.label}
                      </span>
                    </div>
                    {bookmark.note && (
                      <p className="mt-1 text-[11px] text-obs-ink2">{bookmark.note}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="rounded-md border border-obs-line bg-obs-1 px-3 py-1 text-[11px] text-obs-ink2 transition-colors hover:border-accent hover:text-obs-ink"
                    onClick={() => controller.jumpToBookmark(bookmark.id)}
                  >
                    跳转
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-obs-line bg-obs-1 px-2 py-1 text-[11px] text-obs-ink2/60 transition-colors hover:border-red-400/40 hover:text-red-400"
                    onClick={() => controller.removeBookmark(bookmark.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fork 点列表 */}
      {state.forkPoints.length > 0 && (
        <div className="mt-4 rounded-md border border-obs-line bg-obs-1 p-3">
          <h4 className="mb-2 text-[12px] font-medium text-obs-ink">
            检测到 {state.forkPoints.length} 个决策点
          </h4>
          <div className="space-y-1">
            {state.forkPoints.slice(0, 5).map((fork, i) => (
              <button
                key={i}
                type="button"
                className="w-full rounded-md border border-obs-line bg-obs-2 px-3 py-2 text-left text-[11px] text-obs-ink2 transition-colors hover:border-[#ffa726]/40 hover:text-obs-ink"
                onClick={() => controller.seekTo(fork.step)}
              >
                <span className="font-mono text-obs-ink2/60">#{fork.step}</span>
                {fork.description && (
                  <span className="ml-2">{fork.description}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
