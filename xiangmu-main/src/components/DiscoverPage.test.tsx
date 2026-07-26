import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DiscoverPage from "./DiscoverPage";

describe("DiscoverPage · 官方成绩引用层（D1）", () => {
  it("已核实模型显示引用表：数值、口径、来源链接与核实日期", () => {
    render(
      <DiscoverPage
        worker={null}
        modelId="onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX"
        device="webgpu"
        busy={false}
      />,
    );
    expect(screen.getByText("引用 · 非本机实测")).toBeTruthy();
    expect(screen.getByText("MATH-500")).toBeTruthy();
    expect(screen.getByText("83.9")).toBeTruthy();
    expect(screen.getByText("GPQA Diamond")).toBeTruthy();
    expect(screen.getByText("33.8")).toBeTruthy();
    const link = screen.getByRole("link", {
      name: "DeepSeek-R1 官方模型卡（评测表）",
    });
    expect(link.getAttribute("href")).toBe(
      "https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B",
    );
    expect(screen.getByText(/逐条核实/)).toBeTruthy();
  });

  it("未录入模型显示诚实空态，不出现任何引用数字", () => {
    render(
      <DiscoverPage
        worker={null}
        modelId="onnx-community/Qwen3-0.6B-ONNX"
        device="webgpu"
        busy={false}
      />,
    );
    expect(screen.getByText(/尚未录入/)).toBeTruthy();
    expect(screen.queryByText("83.9")).toBeNull();
  });
});
