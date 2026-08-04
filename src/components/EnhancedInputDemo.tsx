/**
 * EnhancedInput 演示页面
 * 测试和展示增强型输入框的所有功能
 */

import { useState } from "react";
import EnhancedInput from "./EnhancedInput";

export default function EnhancedInputDemo() {
  const [value1, setValue1] = useState("");
  const [value2, setValue2] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  const handleSend1 = () => {
    if (value1.trim()) {
      setMessages([...messages, value1]);
      setValue1("");
    }
  };

  const handleSend2 = () => {
    if (value2.trim()) {
      setIsGenerating(true);
      setTimeout(() => {
        setMessages([...messages, value2]);
        setValue2("");
        setIsGenerating(false);
      }, 2000);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-obs">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="mb-2 text-[24px] font-bold text-obs-ink">
            EnhancedInput 演示
          </h1>
          <p className="mb-6 text-[14px] text-obs-ink3">
            Devin 风格的增强型输入框组件
          </p>

          {/* 消息列表 */}
          {messages.length > 0 && (
            <div className="mb-6 space-y-3 rounded-xl border border-obs-line bg-obs-2 p-4">
              <h2 className="text-[14px] font-semibold text-obs-ink">
                发送的消息
              </h2>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-brand-500/10 px-3 py-2 text-[14px] text-obs-ink"
                >
                  {msg}
                </div>
              ))}
            </div>
          )}

          {/* 功能说明 */}
          <div className="mb-6 rounded-xl border border-obs-line bg-obs-2 p-4">
            <h2 className="mb-3 text-[16px] font-semibold text-obs-ink">
              功能特性
            </h2>
            <ul className="space-y-2 text-[13px] text-obs-ink2">
              <li className="flex gap-2">
                <span className="text-brand-400">•</span>
                <span>
                  <strong>磨砂玻璃底栏</strong>：backdrop-blur 效果，优雅悬浮
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-400">•</span>
                <span>
                  <strong>自动调整高度</strong>：1-8 行自适应，输入内容多时自动扩展
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-400">•</span>
                <span>
                  <strong>发送按钮动画</strong>：hover 阴影加深、active 缩放反馈
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-400">•</span>
                <span>
                  <strong>快捷键提示</strong>：Enter 发送、Shift + Enter 换行
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-400">•</span>
                <span>
                  <strong>生成状态反馈</strong>：显示 tokens/s、脉动指示器
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-400">•</span>
                <span>
                  <strong>Focus 状态</strong>：品牌色边框 + 发光 ring
                </span>
              </li>
            </ul>
          </div>

          {/* 演示 1：基础输入框 */}
          <div className="mb-6 rounded-xl border border-obs-line bg-obs-2 p-4">
            <h2 className="mb-3 text-[16px] font-semibold text-obs-ink">
              演示 1：基础输入框
            </h2>
            <p className="mb-3 text-[13px] text-obs-ink3">
              标准输入框，支持快捷键和自动调整高度
            </p>
            <div className="relative">
              <EnhancedInput
                value={value1}
                onChange={setValue1}
                onSend={handleSend1}
                placeholder="试试输入多行文本，看高度如何自动调整..."
                autoFocus={true}
              />
            </div>
          </div>

          {/* 演示 2：生成状态 */}
          <div className="mb-6 rounded-xl border border-obs-line bg-obs-2 p-4">
            <h2 className="mb-3 text-[16px] font-semibold text-obs-ink">
              演示 2：生成状态
            </h2>
            <p className="mb-3 text-[13px] text-obs-ink3">
              显示生成速度、禁用输入、脉动指示器
            </p>
            <div className="relative">
              <EnhancedInput
                value={value2}
                onChange={setValue2}
                onSend={handleSend2}
                placeholder="发送后将模拟 2 秒生成过程..."
                isGenerating={isGenerating}
                tokensPerSecond={23.5}
                disabled={isGenerating}
              />
            </div>
          </div>

          {/* 设计细节 */}
          <div className="rounded-xl border border-obs-line bg-obs-3 p-4">
            <h2 className="mb-3 text-[16px] font-semibold text-obs-ink">
              设计细节
            </h2>
            <div className="space-y-3 text-[13px] text-obs-ink2">
              <div>
                <div className="mb-1 font-semibold text-obs-ink">
                  1. 磨砂玻璃底栏
                </div>
                <div className="text-obs-ink3">
                  bg-obs/95 + backdrop-blur-md：95% 不透明度 + 中等模糊，优雅悬浮感
                </div>
              </div>

              <div>
                <div className="mb-1 font-semibold text-obs-ink">
                  2. 发送按钮状态
                </div>
                <div className="space-y-1 text-obs-ink3">
                  <div>• 可用：品牌蓝 + hover 阴影加深 + active 缩放</div>
                  <div>• 禁用：灰色 + 50% 不透明度 + cursor-not-allowed</div>
                </div>
              </div>

              <div>
                <div className="mb-1 font-semibold text-obs-ink">
                  3. Focus 状态
                </div>
                <div className="text-obs-ink3">
                  品牌色边框 + ring-2 + 20% 不透明度的发光效果
                </div>
              </div>

              <div>
                <div className="mb-1 font-semibold text-obs-ink">
                  4. 自适应高度
                </div>
                <div className="text-obs-ink3">
                  最小 1 行，最大 8 行，根据内容自动计算 scrollHeight
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部空白占位（防止内容被输入框遮挡） */}
      <div className="h-32" />
    </div>
  );
}
