/** 文档问答：前端解析 PDF / Word / Excel / 文本，抽出文字喂给模型 */

export interface DocumentPage {
  pageNumber: number;
  text: string;
  charStart: number;  // 在全文中的字符偏移
  charEnd: number;
}

export interface ParsedDocument {
  name: string;
  text: string;  // 保留兼容性：全文拼接
  truncated: boolean;
  pages: DocumentPage[];  // 新增：页面级别的边界信息
  metadata: {
    totalPages: number;
    totalChars: number;
    parsedPages: number;  // 实际解析的页数
  };
}

/** 小模型上下文有限，单文档最多注入的字符数 */
export const MAX_DOC_CHARS = 6000;

export const ACCEPT_EXTS = ".pdf,.docx,.xlsx,.xls,.csv,.txt,.md";

export function truncateDoc(text: string): { text: string; truncated: boolean } {
  const trimmed = text.replace(/\n{3,}/g, "\n\n").trim();
  if (trimmed.length <= MAX_DOC_CHARS) return { text: trimmed, truncated: false };
  return { text: trimmed.slice(0, MAX_DOC_CHARS), truncated: true };
}

async function parsePdf(file: File): Promise<{ pages: DocumentPage[]; totalChars: number }> {
  // 标准构建依赖 Uint8Array.toHex 等新 API（Chrome 140+），legacy 构建兼容更老的浏览器
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: DocumentPage[] = [];
  let charOffset = 0;

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ");

    const charStart = charOffset;
    const charEnd = charOffset + pageText.length;

    pages.push({
      pageNumber: i,
      text: pageText,
      charStart,
      charEnd
    });

    charOffset = charEnd + 1; // +1 for newline separator

    // 如果超过限制的2倍，停止解析
    if (charOffset > MAX_DOC_CHARS * 2) break;
  }

  return { pages, totalChars: charOffset };
}

async function parseDocx(file: File): Promise<{ pages: DocumentPage[]; totalChars: number }> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({
    arrayBuffer: await file.arrayBuffer(),
  });

  // Word 文档没有真正的页码概念，将整个文档作为单页
  const pages: DocumentPage[] = [{
    pageNumber: 1,
    text: value,
    charStart: 0,
    charEnd: value.length
  }];

  return { pages, totalChars: value.length };
}

async function parseSheet(file: File): Promise<{ pages: DocumentPage[]; totalChars: number }> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const pages: DocumentPage[] = [];
  let charOffset = 0;

  wb.SheetNames.forEach((sheetName, index) => {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]).trim();
    const pageText = wb.SheetNames.length > 1 ? `【工作表 ${sheetName}】\n${csv}` : csv;

    const charStart = charOffset;
    const charEnd = charOffset + pageText.length;

    pages.push({
      pageNumber: index + 1,
      text: pageText,
      charStart,
      charEnd
    });

    charOffset = charEnd + 2; // +2 for double newline separator
  });

  return { pages, totalChars: charOffset };
}

export async function parseDocument(file: File): Promise<ParsedDocument> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  let result: { pages: DocumentPage[]; totalChars: number };

  switch (ext) {
    case "pdf":
      result = await parsePdf(file);
      break;
    case "docx":
      result = await parseDocx(file);
      break;
    case "xlsx":
    case "xls":
    case "csv":
      result = await parseSheet(file);
      break;
    case "txt":
    case "md": {
      const rawText = await file.text();
      result = {
        pages: [{
          pageNumber: 1,
          text: rawText,
          charStart: 0,
          charEnd: rawText.length
        }],
        totalChars: rawText.length
      };
      break;
    }
    default:
      throw new Error(`暂不支持 .${ext} 文件，支持：${ACCEPT_EXTS}`);
  }

  // 合并所有页面文本用于兼容性
  const fullText = result.pages.map(p => p.text).join("\n");
  const { text: truncatedText, truncated } = truncateDoc(fullText);

  if (!truncatedText) {
    throw new Error(`《${file.name}》没有提取到文字内容（可能是扫描件或空文件）`);
  }

  // 计算实际解析的页数（被截断后）
  let parsedPages = result.pages.length;
  if (truncated) {
    const truncatedLength = truncatedText.length;
    parsedPages = result.pages.findIndex(p => p.charEnd > truncatedLength) + 1;
    if (parsedPages <= 0) parsedPages = 1;
  }

  return {
    name: file.name,
    text: truncatedText,
    truncated,
    pages: result.pages,
    metadata: {
      totalPages: result.pages.length,
      totalChars: result.totalChars,
      parsedPages
    }
  };
}

/** 把文档内容和用户问题拼成喂给模型的完整消息 */
export function buildDocPrompt(docs: ParsedDocument[], question: string): string {
  const parts = docs.map(
    (d) =>
      `【文档《${d.name}》${d.truncated ? "（内容较长，以下为节选）" : ""}】\n${d.text}`,
  );
  return `${parts.join("\n\n")}\n\n请基于以上文档内容回答：${question}`;
}
