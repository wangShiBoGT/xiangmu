/** 排行榜页只读渲染：三种真实状态各自说实话
 *  ——文件不存在说「还没生成」、读取失败给重试、有数据才画表。 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LeaderboardPage from "./LeaderboardPage";
import type { LeaderboardEntry } from "../lib/leaderboard";

function entry(over: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    id: "d-12",
    author: "someone",
    avatarUrl: null,
    nickname: "阿花",
    deviceName: "ThinkPad X1",
    deviceTier: 2,
    gpuName: "Intel Iris Xe",
    modelId: "Qwen3-0.6B-q4f16_1-MLC",
    device: "webgpu",
    tps: 23.45,
    tokens: 48,
    timedTokens: 47,
    machineScore: { total: 7200, grade: "A" },
    traceHash: "abc123",
    verify: "trace-attached",
    discussionUrl: "https://github.com/o/r/discussions/12",
    discussionNumber: 12,
    createdAt: "2026-08-01T00:00:00.000Z",
    ...over,
  };
}

function mockFetch(impl: () => Response | Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(async () => impl()));
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LeaderboardPage", () => {
  it("榜单文件不存在时如实说还没生成，不画空表", async () => {
    mockFetch(() => new Response("Not Found", { status: 404 }));
    render(<LeaderboardPage />);

    expect(await screen.findByText("榜单还没有生成")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "提交第一条成绩" }),
    ).toBeInTheDocument();
  });

  it("SPA 回退返回 HTML 也算文件不存在，不当成解析失败", async () => {
    mockFetch(
      () =>
        new Response("<!doctype html><html></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
    );
    render(<LeaderboardPage />);

    expect(await screen.findByText("榜单还没有生成")).toBeInTheDocument();
  });

  it("读取失败时报错并可重试", async () => {
    const fetchMock = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(new Response("boom", { status: 500 }))
      .mockResolvedValueOnce(new Response("Not Found", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<LeaderboardPage />);

    expect(await screen.findByText(/HTTP 500/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重试" }));

    expect(await screen.findByText("榜单还没有生成")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("有成绩时按 tok/s 降序画表，并标注可信程度", async () => {
    mockFetch(() =>
      jsonResponse({
        v: 1,
        generatedAt: "2026-08-05T10:00:00.000Z",
        entries: [
          entry({ id: "a", nickname: "慢的", tps: 8.1, discussionNumber: 1 }),
          entry({
            id: "b",
            nickname: "快的",
            tps: 41.9,
            verify: "account",
            traceHash: null,
            machineScore: null,
            discussionNumber: 2,
          }),
        ],
      }),
    );
    render(<LeaderboardPage />);

    await screen.findByRole("table");
    const rows = screen.getAllByRole("row").slice(1); // 去掉表头
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("快的");
    expect(rows[0]).toHaveTextContent("41.9");
    expect(rows[0]).toHaveTextContent("仅账号");
    expect(rows[1]).toHaveTextContent("慢的");
    expect(rows[1]).toHaveTextContent("已附 trace");
    expect(screen.getByText(/Score 7200 A/)).toBeInTheDocument();
  });

  it("档位筛选为空时区分「这个档位没有」与「榜单没生成」", async () => {
    mockFetch(() =>
      jsonResponse({
        v: 1,
        generatedAt: "2026-08-05T10:00:00.000Z",
        entries: [entry({ deviceTier: 2 })],
      }),
    );
    render(<LeaderboardPage />);

    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: "高端显卡组" }));

    await waitFor(() =>
      expect(screen.getByText("这个档位还没有成绩")).toBeInTheDocument(),
    );
    expect(screen.queryByText("榜单还没有生成")).not.toBeInTheDocument();
    expect(screen.getByText(/榜单共 1 条/)).toBeInTheDocument();
  });
});
