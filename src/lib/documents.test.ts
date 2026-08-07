import { describe, it, expect } from "vitest";
import {
  truncateDoc,
  buildDocPrompt,
  parseDocument,
  MAX_DOC_CHARS,
} from "./documents";

describe("truncateDoc", () => {
  it("短文本原样保留", () => {
    expect(truncateDoc("hello")).toEqual({ text: "hello", truncated: false });
  });

  it("超长文本被截断", () => {
    const { text, truncated } = truncateDoc("x".repeat(MAX_DOC_CHARS + 100));
    expect(text).toHaveLength(MAX_DOC_CHARS);
    expect(truncated).toBe(true);
  });

  it("压缩连续空行", () => {
    expect(truncateDoc("a\n\n\n\n\nb").text).toBe("a\n\nb");
  });
});

describe("buildDocPrompt", () => {
  it("拼接文档与问题", () => {
    const p = buildDocPrompt(
      [{
        name: "报表.xlsx",
        text: "一月,100",
        truncated: false,
        pages: [{ pageNumber: 1, text: "一月,100", charStart: 0, charEnd: 7 }],
        metadata: { totalPages: 1, totalChars: 7, parsedPages: 1 }
      }],
      "一月销售额是多少？",
    );
    expect(p).toContain("《报表.xlsx》");
    expect(p).toContain("一月,100");
    expect(p).toContain("请基于以上文档内容回答：一月销售额是多少？");
  });

  it("截断的文档带节选说明", () => {
    const p = buildDocPrompt(
      [{
        name: "长文.pdf",
        text: "内容",
        truncated: true,
        pages: [{ pageNumber: 1, text: "内容", charStart: 0, charEnd: 2 }],
        metadata: { totalPages: 1, totalChars: 2, parsedPages: 1 }
      }],
      "问",
    );
    expect(p).toContain("节选");
  });
});

describe("parseDocument", () => {
  it("解析纯文本文件", async () => {
    const f = new File(["第一行\n第二行"], "笔记.txt", { type: "text/plain" });
    const d = await parseDocument(f);
    expect(d.name).toBe("笔记.txt");
    expect(d.text).toBe("第一行\n第二行");
  });

  it("不支持的扩展名报友好错误", async () => {
    const f = new File(["x"], "视频.mp4");
    await expect(parseDocument(f)).rejects.toThrow(/暂不支持/);
  });

  it("空文件报错", async () => {
    const f = new File([""], "空.txt");
    await expect(parseDocument(f)).rejects.toThrow(/没有提取到文字/);
  });
});
