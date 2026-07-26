import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("渲染基础 Markdown", () => {
    const html = renderMarkdown("**加粗** 和 `代码`");
    expect(html).toContain("<strong>加粗</strong>");
    expect(html).toContain("<code>代码</code>");
  });

  it("渲染代码块", () => {
    const html = renderMarkdown("```js\nconsole.log(1)\n```");
    expect(html).toContain("<pre>");
  });

  it("XSS 脚本被消毒", () => {
    const html = renderMarkdown('<script>alert(1)</script><img src=x onerror="alert(1)">');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
  });
});
