import { describe, it, expect, vi, afterEach } from "vitest";
import { webSearch, buildSearchPrompt } from "./search";

afterEach(() => vi.unstubAllGlobals());

describe("buildSearchPrompt", () => {
  it("把搜索结果编号拼进提问", () => {
    const p = buildSearchPrompt(
      [
        { title: "标题一", url: "https://a", snippet: "摘要一" },
        { title: "标题二", url: "https://b", snippet: "摘要二" },
      ],
      "最新进展是什么？",
    );
    expect(p).toContain("[1] 标题一");
    expect(p).toContain("摘要二");
    expect(p).toContain("问题：最新进展是什么？");
  });
});

describe("webSearch", () => {
  it("返回代理接口的结果列表", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{ title: "t", url: "u", snippet: "s" }],
        }),
      }),
    );
    const r = await webSearch("hello");
    expect(r).toHaveLength(1);
    expect(r[0].title).toBe("t");
  });

  it("HTTP 失败时抛出友好错误", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 502 }),
    );
    await expect(webSearch("hello")).rejects.toThrow("联网搜索失败");
  });

  it("代理返回 error 字段时抛出该错误", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ error: "没有抓到搜索结果" }),
      }),
    );
    await expect(webSearch("hello")).rejects.toThrow("没有抓到搜索结果");
  });
});
