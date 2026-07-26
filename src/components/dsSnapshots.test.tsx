/**
 * DS5 快照防线：守护已验收界面的 DOM 结构与 token 用法不被后续批次悄悄改动。
 * 快照变更必须在 PR/验收记录中说明原因（宪法第六章：修改留痕）。
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HesitationSlice from "./HesitationSlice";
import { DEMO_STATS } from "../lib/demoStats.generated";
import EvidencedClaim from "./EvidencedClaim";
import Sidebar from "./Sidebar";
import DiscoverPage from "./DiscoverPage";
import ChatMessage from "./ChatMessage";
import {
  IconClose,
  IconPlus,
  IconChevronDown,
  IconChevronLeft,
  IconPlay,
  IconPause,
} from "./icons";

describe("DS5 · DOM 快照防线", () => {
  it("图标库：规格恒定（24 viewBox / 1.5 stroke / currentColor）", () => {
    const { container } = render(
      <div>
        <IconClose className="h-4 w-4" />
        <IconPlus className="h-4 w-4" />
        <IconChevronDown className="h-3 w-3" />
        <IconChevronLeft className="h-3.5 w-3.5" />
        <IconPlay className="h-3.5 w-3.5" />
        <IconPause className="h-3.5 w-3.5" />
      </div>,
    );
    expect(container).toMatchSnapshot();
  });

  it("犹豫点切片：真实概率结构（含其余候选灰条）", () => {
    const { container } = render(
      <HesitationSlice step={DEMO_STATS.tightest} stats={DEMO_STATS} />,
    );
    expect(container).toMatchSnapshot();
  });

  it("可展开陈述：虚线下划线 + 必填来源", () => {
    const { container } = render(
      <EvidencedClaim
        claim="这一步前两名候选概率仅差 0.00%"
        source="demo.aitrace.json · steps[67].topk"
      >
        <p>evidence body</p>
      </EvidencedClaim>,
    );
    expect(container).toMatchSnapshot();
  });

  it("侧栏：空态与新建入口", () => {
    const { container } = render(
      <Sidebar
        sessions={[]}
        activeId={null}
        disabled={false}
        onNew={() => {}}
        onSelect={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(container).toMatchSnapshot();
  });

  it("官方引用卡：琥珀引用层与来源标注结构", () => {
    const { container } = render(
      <DiscoverPage
        worker={null}
        modelId="onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX"
        device="webgpu"
        busy={false}
      />,
    );
    expect(
      container.querySelector("main, div"),
    ).toBeTruthy();
    expect(container).toMatchSnapshot();
  });

  it("助手消息：推理段胶囊 + 复制/重新生成图标（V-1 文案 + DS1 图标）", () => {
    const { container } = render(
      <ChatMessage
        message={{ role: "assistant", content: "<think>推理中</think>这是答案" }}
        showThinking
        isLast
        isRunning={false}
        onRegenerate={() => {}}
      />,
    );
    expect(container).toMatchSnapshot();
  });
});
