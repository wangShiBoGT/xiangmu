import { IconZap, IconAperture, IconGlobe } from "./icons";

interface OnboardingPrompt {
  icon: typeof IconZap;
  title: string;
  desc: string;
  prompt: string;
  highlight: string;
}

interface Props {
  onSelect: (prompt: string) => void;
}

export default function OnboardingPrompts({ onSelect }: Props) {
  const prompts: OnboardingPrompt[] = [
    {
      icon: IconZap,
      title: "看 AI 如何思考",
      desc: "同一个问题，两次答案为什么不同？",
      prompt: "用简单的例子解释量子纠缠的原理",
      highlight: "观察思考链的分岔点",
    },
    {
      icon: IconAperture,
      title: "探索采样过程",
      desc: "候选答案只差几个百分点，AI 如何选择？",
      prompt: "写一首关于春天的七言绝句",
      highlight: "点击任何一句话查看背后的决策",
    },
    {
      icon: IconGlobe,
      title: "理解参数影响",
      desc: "温度、Top-P 如何改变 AI 的回答风格？",
      prompt: "列出学习编程的 5 个关键步骤",
      highlight: "调整参数后重新生成对比",
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-3 p-6 bg-[#0A0D12] rounded-2xl border border-white/5">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-white/90">
          从一个观察开始
        </h3>
        <p className="text-xs text-white/40">
          点击任何问题，AI 会在你的设备上运行，过程完全可观测
        </p>
      </div>
      <div className="space-y-2">
        {prompts.map((p) => (
          <button
            key={p.title}
            onClick={() => onSelect(p.prompt)}
            className="w-full text-left p-4 rounded-xl bg-[#0F131C] hover:bg-[#161D2B]
                       border border-white/5 hover:border-cyan-500/20 transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors">
                <p.icon className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex-1 space-y-1.5">
                <p className="text-sm font-medium text-white group-hover:text-cyan-50">
                  {p.title}
                </p>
                <p className="text-xs leading-relaxed text-white/50 group-hover:text-white/60">
                  {p.desc}
                </p>
                <p className="text-xs text-cyan-400/60 group-hover:text-cyan-400 flex items-center gap-1.5">
                  <span className="inline-block w-1 h-1 rounded-full bg-cyan-400/60" />
                  {p.highlight}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-white/30 text-center pt-2">
        或者在下方输入框直接提问
      </p>
    </div>
  );
}
