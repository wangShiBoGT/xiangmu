import { marked, Renderer } from "marked";
import DOMPurify from "dompurify";

const renderer = new Renderer();

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 代码块：顶部语言标签 + 复制按钮（点击由 ChatMessage 事件委托处理）
renderer.code = ({ text, lang }) => {
  const language = (lang ?? "").split(/\s+/)[0];
  return (
    `<div class="code-block">` +
    `<div class="code-head"><span>${escapeHtml(language || "代码")}</span>` +
    `<button type="button" class="code-copy">复制</button></div>` +
    `<pre><code>${escapeHtml(text)}</code></pre></div>`
  );
};

marked.setOptions({ gfm: true, breaks: true, renderer });

/** Markdown → 安全 HTML（DOMPurify 白名单消毒，防 XSS） */
export function renderMarkdown(md: string): string {
  const html = marked.parse(md, { async: false });
  return DOMPurify.sanitize(html);
}
