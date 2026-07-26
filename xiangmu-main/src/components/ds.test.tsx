import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Kbd, PrimaryAction } from "./ds";
import { primaryActionCount } from "../lib/dsDiscipline";

describe("DS3 · PrimaryAction 交互纪律", () => {
  it("渲染为实心 accent 按钮并跟踪挂载计数", () => {
    const { container, unmount } = render(
      <PrimaryAction>开始记录</PrimaryAction>,
    );
    const btn = container.querySelector("button");
    expect(btn?.className).toContain("bg-indigo-500");
    expect(primaryActionCount()).toBe(1);
    unmount();
    expect(primaryActionCount()).toBe(0);
  });

  it("同屏多个 PrimaryAction 不阻断渲染（仅 dev 警告）", () => {
    const { container, unmount } = render(
      <div>
        <PrimaryAction>A</PrimaryAction>
        <PrimaryAction>B</PrimaryAction>
      </div>,
    );
    expect(container.querySelectorAll("button").length).toBe(2);
    expect(primaryActionCount()).toBe(2);
    unmount();
  });

  it("Kbd 用语义化 <kbd> 呈现键盘提示", () => {
    const { container } = render(<Kbd>Enter</Kbd>);
    expect(container.querySelector("kbd")?.textContent).toBe("Enter");
  });
});
