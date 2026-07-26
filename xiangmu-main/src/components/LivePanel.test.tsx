import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import LivePanel from "./LivePanel";
import type { TokenStep } from "../lib/trace";

const step: TokenStep = {
  id: 7,
  text: "蓝色",
  prob: 0.42,
  topk: [
    { id: 7, text: "蓝色", prob: 0.42 },
    { id: 3, text: "红色", prob: 0.31 },
    { id: 9, text: "绿色", prob: 0.12 },
  ],
  entropy: 1.35,
  dt: 50,
};

describe("LivePanel 采样检查器", () => {
  it("生成中以 Sampling Inspector 为主视觉：选中 token、候选分布与覆盖指标可核验", () => {
    render(<LivePanel steps={[step, step]} running />);
    expect(screen.getByText("Sampling Inspector")).toBeTruthy();
    // 选中 token 的可核验读数
    expect(screen.getByText(/token_id 7 · rank 1/)).toBeTruthy();
    expect(screen.getByText(/P = 0\.4200/)).toBeTruthy();
    // 候选分布表
    expect(screen.getByText("红色")).toBeTruthy();
    expect(screen.getByText("绿色")).toBeTruthy();
    // 截断覆盖指标（视觉稿定调：候选质量 / 分布熵读数卡 + 尾部质量说明行）
    expect(screen.getByText("候选质量")).toBeTruthy();
    expect(screen.getByText("分布熵")).toBeTruthy();
    expect(screen.getByText(/尾部未记录质量/)).toBeTruthy();
    // 生成中不出现独立指标卡片，熵等读数由检查器本身承担
    expect(screen.queryByText("Throughput")).toBeNull();
  });

  it("生成结束后曲线与候选榜回归", () => {
    render(<LivePanel steps={[step, step]} running={false} />);
    expect(screen.queryByText("Sampling Inspector")).toBeNull();
    expect(screen.getByText("Throughput")).toBeTruthy();
  });

  it("分段耗时已归位到主舱时间轴：右栏不再出现 Pipeline 观测条（同一读数只留一个位置）", () => {
    render(<LivePanel steps={[step, step]} running={false} />);
    expect(screen.queryByText(/Pipeline/)).toBeNull();
  });

  it("选中正文 token 时右栏 Inspector 联动到该步", () => {
    render(<LivePanel steps={[step, step]} running={false} selected={0} />);
    expect(screen.getByText(/Inspector · 第 1 步/)).toBeTruthy();
    expect(screen.getByText("红色")).toBeTruthy();
  });
});
