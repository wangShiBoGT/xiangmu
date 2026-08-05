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
    <div className="border-t border-line bg-surface p-4">
      {/* 进度条 */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-[11px] text-ink-2">
          <span className="font-mono">
            步骤 {state.currentStep + 1} / {state.totalSteps}
          </span>
          <span className="font-mono">
            {progress.toFixed(1)}%
          </span>
        </div>

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

      {/* 播放控制 */}
      <div className="flex items-center gap-3">
        {/* 跳到开始 */}
        <button
          type="button"
          className="rounded-md border border-line bg-obs-2 p-2 text-ink-2 transition-colors hover:border-accent hover:text-ink"
          onClick={() => controller.seekToStart()}
          title="跳到开始"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>

        {/* 后退 */}
        <button
          type="button"
          className="rounded-md border border-line bg-obs-2 p-2 text-ink-2 transition-colors hover:border-accent hover:text-ink"
          onClick={() => controller.stepBackward()}
          title="后退一步"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* 播放/暂停 */}
        <button
          type="button"
          className="rounded-md bg-accent px-6 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          onClick={() => controller.togglePlay()}
        >
          {state.playing ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
              暂停
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              播放
            </span>
          )}
        </button>

        {/* 前进 */}
        <button
          type="button"
          className="rounded-md border border-line bg-obs-2 p-2 text-ink-2 transition-colors hover:border-accent hover:text-ink"
          onClick={() => controller.stepForward()}
          title="前进一步"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* 跳到结束 */}
        <button
          type="button"
          className="rounded-md border border-line bg-obs-2 p-2 text-ink-2 transition-colors hover:border-accent hover:text-ink"
          onClick={() => controller.seekToEnd()}
          title="跳到结束"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>

        {/* 分隔线 */}
        <div className="h-6 w-px bg-line" />

        {/* 速度选择 */}
        <select
          className="rounded-[6px] border border-line bg-obs-2 px-3 py-2 text-[12px] text-ink transition-colors focus:border-accent focus:outline-none hover:border-line/80"
          value={state.speed}
          onChange={(e) => controller.setSpeed(Number(e.target.value))}
        >
          {PLAYBACK_SPEEDS.map((speed) => (
            <option key={speed.value} value={speed.value}>
              {speed.label}
            </option>
          ))}
        </select>

        {/* 循环播放 */}
        <button
          type="button"
          className={`rounded-md border p-2 text-[12px] transition-colors ${
            state.loop
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-line bg-obs-2 text-ink-2 hover:border-accent hover:text-ink'
          }`}
          onClick={() => controller.toggleLoop()}
          title="循环播放"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        {/* 书签管理 */}
        <button
          type="button"
          className="ml-auto rounded-md border border-line bg-obs-2 px-3 py-2 text-[12px] text-ink-2 transition-colors hover:border-accent hover:text-ink"
          onClick={() => setShowBookmarks(!showBookmarks)}
        >
          📑 书签 ({state.bookmarks.length})
        </button>
      </div>

      {/* 书签面板 */}
      {showBookmarks && (
        <div className="mt-4 rounded-md border border-line bg-obs-1 p-4">
          <h3 className="mb-3 text-[13px] font-medium text-ink">书签管理</h3>

          {/* 添加书签表单 */}
          <div className="mb-4 space-y-2">
            <input
              type="text"
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-[12px] text-ink placeholder-ink-3 focus:border-accent focus:outline-none"
              placeholder="书签标签..."
              value={bookmarkLabel}
              onChange={(e) => setBookmarkLabel(e.target.value)}
            />
            <input
              type="text"
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-[12px] text-ink placeholder-ink-3 focus:border-accent focus:outline-none"
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
            <p className="text-[12px] text-ink-2">暂无书签</p>
          ) : (
            <div className="space-y-2">
              {state.bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="flex items-start gap-3 rounded-md border border-obs-line bg-obs-2 p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-ink-3">
                        #{bookmark.step}
                      </span>
                      <span className="text-[12px] font-medium text-ink">
                        {bookmark.label}
                      </span>
                    </div>
                    {bookmark.note && (
                      <p className="mt-1 text-[11px] text-ink-2">{bookmark.note}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="rounded-md border border-line bg-obs-1 px-3 py-1 text-[11px] text-ink-2 transition-colors hover:border-accent hover:text-ink"
                    onClick={() => controller.jumpToBookmark(bookmark.id)}
                  >
                    跳转
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-line bg-obs-1 px-2 py-1 text-[11px] text-ink-3 transition-colors hover:border-red-400/40 hover:text-red-400"
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
          <h4 className="mb-2 text-[12px] font-medium text-ink">
            检测到 {state.forkPoints.length} 个决策点
          </h4>
          <div className="space-y-1">
            {state.forkPoints.slice(0, 5).map((fork, i) => (
              <button
                key={i}
                type="button"
                className="w-full rounded-md border border-obs-line bg-obs-2 px-3 py-2 text-left text-[11px] text-ink-2 transition-colors hover:border-[#ffa726]/40 hover:text-ink"
                onClick={() => controller.seekTo(fork.step)}
              >
                <span className="font-mono text-ink-3">#{fork.step}</span>
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
