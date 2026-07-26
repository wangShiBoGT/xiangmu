import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EvidencedClaim from "./EvidencedClaim";

describe("EvidencedClaim", () => {
  it("默认收起，点击陈述原位展开证据与来源", () => {
    render(
      <EvidencedClaim claim="共 3 个犹豫点" source="steps[].topk[0..1].prob">
        <div>证据行</div>
      </EvidencedClaim>,
    );
    expect(screen.queryByText("证据行")).toBeNull();
    fireEvent.click(screen.getByText("共 3 个犹豫点"));
    expect(screen.getByText("证据行")).toBeInTheDocument();
    expect(screen.getByText(/steps\[\]\.topk/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("共 3 个犹豫点"));
    expect(screen.queryByText("证据行")).toBeNull();
  });

  it("提供 onInspect 时展开后出现跳转入口", () => {
    const onInspect = vi.fn();
    render(
      <EvidencedClaim
        claim="陈述"
        source="steps[5].entropy"
        onInspect={onInspect}
      >
        <div>明细</div>
      </EvidencedClaim>,
    );
    fireEvent.click(screen.getByText("陈述"));
    fireEvent.click(screen.getByText("在完整 trace 中查看 →"));
    expect(onInspect).toHaveBeenCalledOnce();
  });

  it("无 onInspect 时不渲染跳转入口", () => {
    render(
      <EvidencedClaim claim="陈述" source="steps[1].prob">
        <div>明细</div>
      </EvidencedClaim>,
    );
    fireEvent.click(screen.getByText("陈述"));
    expect(screen.queryByText("在完整 trace 中查看 →")).toBeNull();
  });
});
