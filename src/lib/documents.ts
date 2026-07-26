/** 文档问答：前端解析 PDF / Word / Excel / 文本，抽出文字喂给模型 */

export interface ParsedDocument {
  name: string;
  text: string;
  truncated: boolean;
}

/** 小模型上下文有限，单文档最多注入的字符数 */
export const MAX_DOC_CHARS = 6000;

export const ACCEPT_EXTS = ".pdf,.docx,.xlsx,.xls,.csv,.txt,.md";

export function truncateDoc(text: string): { text: string; truncated: boolean } {
  const trimmed = text.replace(/\n{3,}/g, "\n\n").trim();
  if (trimmed.length <= MAX_DOC_CHARS) return { text: trimmed, truncated: false };
  return { text: trimmed.slice(0, MAX_DOC_CHARS), truncated: true };
}

async function parsePdf(file: File): Promise<string> {
  // 标准构建依赖 Uint8Array.toHex 等新 API（Chrome 140+），legacy 构建兼容更老的浏览器
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((it) => ("str" in it ? it.str : ""))
        .join(" "),
    );
    if (pages.join("\n").length > MAX_DOC_CHARS * 2) break;
  }
  return pages.join("\n");
}

async function parseDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({
    arrayBuffer: await file.arrayBuffer(),
  });
  return value;
}

async function parseSheet(file: File): Promise<string> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  return wb.SheetNames.map((n) => {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[n]).trim();
    return wb.SheetNames.length > 1 ? `【工作表 ${n}】\n${csv}` : csv;
  }).join("\n\n");
}

export async function parseDocument(file: File): Promise<ParsedDocument> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  let raw: string;
  switch (ext) {
    case "pdf":
      raw = await parsePdf(file);
      break;
    case "docx":
      raw = await parseDocx(file);
      break;
    case "xlsx":
    case "xls":
    case "csv":
      raw = await parseSheet(file);
      break;
    case "txt":
    case "md":
      raw = await file.text();
      break;
    default:
      throw new Error(`暂不支持 .${ext} 文件，支持：${ACCEPT_EXTS}`);
  }
  const { text, truncated } = truncateDoc(raw);
  if (!text) throw new Error(`《${file.name}》没有提取到文字内容（可能是扫描件或空文件）`);
  return { name: file.name, text, truncated };
}

/** 把文档内容和用户问题拼成喂给模型的完整消息 */
export function buildDocPrompt(docs: ParsedDocument[], question: string): string {
  const parts = docs.map(
    (d) =>
      `【文档《${d.name}》${d.truncated ? "（内容较长，以下为节选）" : ""}】\n${d.text}`,
  );
  return `${parts.join("\n\n")}\n\n请基于以上文档内容回答：${question}`;
}
