import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RuntimeJourney from "./RuntimeJourney";

const pipeline = { tokenizeMs: 11, prefillMs: 651.4, decodeMs: 66837.7 };

describe("RuntimeJourney", () => {
  it("三段启动路全部来自真实 pipeline 测量：tokenize/prefill/decode 与 token 数", () => {
    render(
      <RuntimeJourney
        stage={1}
        pipeline={pipeline}
        promptTokens={21}
        stepCount={229}
        onSkip={() => {}}
      />,
    );
    expect(screen.getByText("输入已切分")).toBeInTheDocument();
    expect(screen.getByText(/被拆为 21 个输入 token/)).toBeInTheDocument();
    expect(screen.getByText(/^tokenize 11 ms$/)).toBeInTheDocument();
    expect(screen.getByText(/^prefill 651 ms$/)).toBeInTheDocument();
    expect(screen.getByText(/^decode 66\.8 s · 229 步$/)).toBeInTheDocument();
    expect(screen.getByText("生成完成")).toBeInTheDocument();
    expect(screen.getAllByText("本机记录")).toHaveLength(3);
  });

  it("promptTokens 未记录时不显示 token 数（诚实缺席，不估）", () => {
    render(
      <RuntimeJourney
        stage={0}
        pipeline={pipeline}
        promptTokens={null}
        stepCount={229}
        onSkip={() => {}}
      />,
    );
    expect(screen.queryByText(/\d 个输入 token/)).not.toBeInTheDocument();
    expect(screen.getByText(/^tokenize 11 ms$/)).toBeInTheDocument();
  });

  it("跳过铺垫可点", () => {
    const onSkip = vi.fn();
    render(
      <RuntimeJourney
        stage={0}
        pipeline={pipeline}
        promptTokens={21}
        stepCount={229}
        onSkip={onSkip}
      />,
    );
    fireEvent.click(screen.getByText(/跳过铺垫/));
    expect(onSkip).toHaveBeenCalledOnce();
  });
});
