import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import WorkflowStrip from "./WorkflowStrip";
import type { TokenStep } from "../lib/trace";

const step = (text: string, dt: number): TokenStep => ({
  id: 1,
  text,
  prob: 0.5,
  topk: [{ id: 1, text, prob: 0.5 }],
  entropy: 1,
  dt,
});

describe("WorkflowStrip 流水线时间轴", () => {
  it("完成态渲染段宽∝耗时的时间轴：丝印、全程读数与逐段耗时", () => {
    render(
      <WorkflowStrip
        phase="done"
        steps={[step("你", 100), step("好", 100)]}
        pipeline={{ tokenizeMs: 33, prefillMs: 1200, decodeMs: 25700 }}
      />,
    );
    expect(screen.getByText("Pipeline · 运行实测")).toBeTruthy();
    expect(screen.getByText(/全程 26\.9 s/)).toBeTruthy();
    expect(screen.getByText("33 ms")).toBeTruthy();
    expect(screen.getByText("25.7 s")).toBeTruthy();
    // 阶段名在轴下刻度行，无 ✓/○/箭头
    expect(screen.getByText("输入分词")).toBeTruthy();
    expect(screen.queryByText("✓")).toBeNull();
    expect(screen.queryByText("→")).toBeNull();
  });

  it("无耗时数据时退化为单行文字阶段列表（诚实缺席，不画假轴）", () => {
    render(<WorkflowStrip phase="running" steps={[]} />);
    expect(screen.queryByText("Pipeline · 运行实测")).toBeNull();
    expect(screen.getByText("输入分词")).toBeTruthy();
  });
});
