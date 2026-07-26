import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TokenText, { type DisplayStep } from "./TokenText";
import BirthCard from "./BirthCard";

const steps: DisplayStep[] = [
  {
    id: 10,
    text: "天空",
    prob: 0.6,
    topk: [
      { id: 10, text: "天空", prob: 0.6 },
      { id: 11, text: "大海", prob: 0.2 },
    ],
    entropy: 0.9,
    dt: 30,
  },
  {
    id: 12,
    text: "很蓝",
    prob: 0.4,
    topk: [
      { id: 13, text: "很美", prob: 0.5 },
      { id: 12, text: "很蓝", prob: 0.4 },
    ],
    entropy: 1.2,
    dt: 28,
  },
];

describe("TokenText", () => {
  it("逐 token 渲染，点击原地裂变成候选堆（不弹 Modal），出生档案是下一层", () => {
    const onSelect = vi.fn();
    render(
      <TokenText steps={steps} selected={null} running={false} onSelect={onSelect} />,
    );
    expect(screen.getByTestId("token-0")).toHaveTextContent("天空");
    fireEvent.click(screen.getByTestId("token-1"));
    // 一级：原地展开该步真实候选与概率
    const fission = screen.getByTestId("fission-1");
    expect(fission).toHaveTextContent("很美");
    expect(fission).toHaveTextContent("50.0%");
    expect(onSelect).not.toHaveBeenCalled();
    // 二级：出生档案入口
    fireEvent.click(screen.getByTestId("fission-open-1"));
    expect(onSelect).toHaveBeenCalledWith(1);
    // 再点同一 token 收起
    fireEvent.click(screen.getByTestId("token-1"));
    expect(screen.queryByTestId("fission-1")).toBeNull();
  });

  it("生成中禁用点击", () => {
    const onSelect = vi.fn();
    render(
      <TokenText steps={steps} selected={null} running={true} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByTestId("token-0"));
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("BirthCard", () => {
  it("展示候选概率与解释，改选需二次确认", () => {
    const onFork = vi.fn();
    render(
      <BirthCard
        step={steps[1]}
        index={1}
        temperature={0.9}
        canFork={true}
        onFork={onFork}
        onClose={() => {}}
      />,
    );
    expect(screen.getByTestId("birth-card")).toHaveTextContent("很蓝");
    expect(screen.getByTestId("birth-card")).toHaveTextContent("40.0%");
    // 点击落选候选「很美」→ 出现确认 → 确认后触发分岔
    fireEvent.click(screen.getByText("很美"));
    expect(onFork).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("fork-confirm"));
    expect(onFork).toHaveBeenCalledWith(13, "很美");
  });

  it("分岔树满时禁止改选", () => {
    const onFork = vi.fn();
    render(
      <BirthCard
        step={steps[1]}
        index={1}
        temperature={0.9}
        canFork={false}
        onFork={onFork}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("很美"));
    expect(screen.queryByTestId("fork-confirm")).toBeNull();
  });
});
