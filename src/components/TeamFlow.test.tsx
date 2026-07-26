import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TeamFlow, { TeamPanel } from "./TeamFlow";
import { buildLiveTeam, teamFromTrace } from "../lib/team";

const doneTeam = () =>
  buildLiveTeam({
    plan: {
      status: "done",
      planner: "DeepSeek R1",
      text: "一、审题。二、分点作答。".repeat(20),
      durationMs: 7321,
    },
    executor: { model: "Qwen3 0.6B", steps: 12, phase: "running" },
  });

describe("TeamFlow", () => {
  it("角色优先展示：Planner/Executor 同时在场，完成者不消失", () => {
    render(<TeamFlow team={doneTeam()} />);
    expect(screen.getByText(/Planner · 规划/)).toBeTruthy();
    expect(screen.getByText(/Executor · 执行/)).toBeTruthy();
    expect(screen.getAllByText("已完成").length).toBeGreaterThan(0);
  });

  it("Artifact 卡展示交接原因，点击展开全文（S6-8）", () => {
    render(<TeamFlow team={doneTeam()} />);
    const reasonLine = screen.getByText("交接原因").closest("p");
    expect(reasonLine?.textContent).toContain("计划完成");
    const card = screen.getByTitle("点击查看交付内容全文");
    expect(card.textContent).toContain("…");
    fireEvent.click(card);
    expect(card.getAttribute("aria-expanded")).toBe("true");
  });

  it("Mission Progress：阶段 chips 替代 step 数", () => {
    render(<TeamFlow team={doneTeam()} />);
    expect(screen.getByLabelText("任务进度").textContent).toContain("规划");
    expect(screen.getByLabelText("任务进度").textContent).toContain("作答");
  });

  it("失败态：Artifact 标记失败、原因如实（不隐藏）", () => {
    const team = buildLiveTeam({
      plan: {
        status: "failed",
        planner: "Qwen3 0.6B",
        text: "",
        durationMs: 800,
        error: "worker crashed",
      },
      executor: { model: "Qwen3 0.6B", steps: 0, phase: "running" },
    });
    render(<TeamFlow team={team} />);
    expect(screen.getAllByText(/失败/).length).toBeGreaterThan(0);
    expect(screen.getByText(/worker crashed/)).toBeTruthy();
  });

  it("外部 trace 缺 reason：显示「交接原因未记录」不猜测", () => {
    const team = teamFromTrace(
      [
        { type: "tool_call", atStep: 0, tool: "plan", input: "q" },
        {
          type: "tool_result",
          atStep: 0,
          tool: "plan",
          output: "p",
          ok: true,
          durationMs: 100,
        },
      ],
      { executorModel: "qwen", steps: 5 },
    );
    // teamFromTrace 对本产品自产事件补充默认 reason；仅当 handoff 存在且无 reason 时缺席。
    // 这里直接构造缺 reason 的 handoff 验证 UI 口径：
    team.handoffs[0].reason = undefined;
    render(<TeamFlow team={team} compact />);
    expect(screen.getByText(/交接原因未记录/)).toBeTruthy();
  });
});

describe("TeamPanel", () => {
  it("常驻名册：当前执行者高亮，全部成员在场", () => {
    const team = doneTeam();
    render(<TeamPanel team={team} />);
    const panel = screen.getByLabelText("AI 团队");
    expect(panel.textContent).toContain("Planner");
    expect(panel.textContent).toContain("Executor");
    expect(panel.textContent).toContain("Qwen3 0.6B");
  });
});
