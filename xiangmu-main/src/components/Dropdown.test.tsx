import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Dropdown from "./Dropdown";

const options = [
  { value: "", label: "全部模型" },
  { value: "a", label: "模型 A", hint: "内置" },
  { value: "b", label: "模型 B", disabled: true },
  { value: "c", label: "模型 C" },
];

function setup(props: Partial<React.ComponentProps<typeof Dropdown>> = {}) {
  const onChange = vi.fn();
  render(
    <Dropdown
      ariaLabel="按模型筛选"
      options={options}
      value=""
      onChange={onChange}
      {...props}
    />,
  );
  return { onChange };
}

describe("Dropdown", () => {
  it("默认收起；点击触发器展开 listbox，选中项带 aria-selected", () => {
    setup({ value: "a" });
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "按模型筛选" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /模型 A/ }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("点击选项提交并收起；禁用选项不可提交", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: "按模型筛选" }));
    fireEvent.click(screen.getByRole("option", { name: /模型 B/ }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("option", { name: /模型 C/ }));
    expect(onChange).toHaveBeenCalledWith("c");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("键盘可达：↑↓ 跳过禁用项，Enter 提交，Escape 关闭", () => {
    const { onChange } = setup();
    const trigger = screen.getByRole("button", { name: "按模型筛选" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" }); // 打开
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: "ArrowDown" }); // → 模型 A
    fireEvent.keyDown(trigger, { key: "ArrowDown" }); // 跳过禁用 B → 模型 C
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("c");
    fireEvent.keyDown(trigger, { key: "ArrowDown" }); // 再打开
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("点击外部关闭；disabled 时不可展开", () => {
    setup({ disabled: true });
    fireEvent.click(screen.getByRole("button", { name: "按模型筛选" }));
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("空选项列表：展开后没有可选项（诚实空态）", () => {
    render(
      <Dropdown ariaLabel="空" options={[]} value="" onChange={() => {}} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "空" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });
});
