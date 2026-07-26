import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChatMessage from "./ChatMessage";

const noop = () => {};

describe("ChatMessage", () => {
  it("用户消息右对齐纯文本渲染", () => {
    render(
      <ChatMessage
        message={{ role: "user", content: "你好 **不渲染md**" }}
        showThinking
        isLast
        isRunning={false}
        onRegenerate={noop}
      />,
    );
    expect(screen.getByTestId("msg-user")).toHaveTextContent("你好 **不渲染md**");
  });

  it("助手消息渲染 Markdown 答案", () => {
    render(
      <ChatMessage
        message={{ role: "assistant", content: "**加粗答案**" }}
        showThinking
        isLast
        isRunning={false}
        onRegenerate={noop}
      />,
    );
    expect(screen.getByTestId("answer").querySelector("strong")).toHaveTextContent(
      "加粗答案",
    );
  });

  it("思考段可折叠展开", () => {
    render(
      <ChatMessage
        message={{ role: "assistant", content: "<think>推理中</think>答案" }}
        showThinking
        isLast
        isRunning={false}
        onRegenerate={noop}
      />,
    );
    // 生成结束后默认收起，点击胶囊展开/再收起
    expect(screen.queryByTestId("thinking")).toBeNull();
    fireEvent.click(screen.getByText(/推理段（<think> 输出）/));
    expect(screen.getByTestId("thinking")).toHaveTextContent("推理中");
    fireEvent.click(screen.getByText(/推理段（<think> 输出）/));
    expect(screen.queryByTestId("thinking")).toBeNull();
  });

  it("showThinking=false 时隐藏思考段", () => {
    render(
      <ChatMessage
        message={{ role: "assistant", content: "<think>推理中</think>答案" }}
        showThinking={false}
        isLast
        isRunning={false}
        onRegenerate={noop}
      />,
    );
    expect(screen.queryByTestId("thinking")).toBeNull();
    expect(screen.getByTestId("answer")).toHaveTextContent("答案");
  });

  it("生成中不显示操作按钮，结束后显示重新生成", () => {
    const onRegenerate = vi.fn();
    const { rerender } = render(
      <ChatMessage
        message={{ role: "assistant", content: "部分输出" }}
        showThinking
        isLast
        isRunning
        onRegenerate={onRegenerate}
      />,
    );
    expect(screen.queryByText("重新生成")).toBeNull();
    rerender(
      <ChatMessage
        message={{ role: "assistant", content: "完整输出" }}
        showThinking
        isLast
        isRunning={false}
        onRegenerate={onRegenerate}
      />,
    );
    fireEvent.click(screen.getByText("重新生成"));
    expect(onRegenerate).toHaveBeenCalledOnce();
  });
});
