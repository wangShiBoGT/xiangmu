/**
 * 文档解析服务
 */

import type { ParsedDocument, DocumentPage } from '../types';

/**
 * 解析 PDF 文件
 */
export async function parsePDF(
  base64: string,
  filename: string,
  maxPages: number = 50
): Promise<ParsedDocument> {
  try {
    // 解码 Base64
    const buffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

    // 使用 pdf-parse（需要在 Worker 中适配）
    // 注意：pdf-parse 依赖 Node.js，需要使用 Cloudflare 兼容版本或替代方案
    // 这里提供简化实现，生产环境需要完整 PDF 解析库

    const pages: DocumentPage[] = [];
    let charOffset = 0;

    // TODO: 实现完整 PDF 解析
    // 临时方案：返回占位符
    const placeholderText = `[PDF 内容: ${filename}]\n这是 PDF 文件的占位符文本。\n生产环境需要集成完整的 PDF 解析库。`;

    pages.push({
      pageNumber: 1,
      text: placeholderText,
      charStart: 0,
      charEnd: placeholderText.length
    });

    return {
      name: filename,
      text: placeholderText,
      truncated: false,
      pages,
      metadata: {
        totalPages: 1,
        totalChars: placeholderText.length,
        parsedPages: 1
      }
    };
  } catch (error) {
    throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 解析 TXT 文件
 */
export async function parseTXT(
  base64: string,
  filename: string,
  maxPages: number = 50
): Promise<ParsedDocument> {
  try {
    // 解码 Base64
    const text = atob(base64);

    // 按段落分页（每 2000 字符一页）
    const charsPerPage = 2000;
    const pages: DocumentPage[] = [];

    let pageNumber = 1;
    let charOffset = 0;

    while (charOffset < text.length && pageNumber <= maxPages) {
      const pageEnd = Math.min(charOffset + charsPerPage, text.length);
      const pageText = text.substring(charOffset, pageEnd);

      pages.push({
        pageNumber,
        text: pageText,
        charStart: charOffset,
        charEnd: pageEnd
      });

      charOffset = pageEnd;
      pageNumber++;
    }

    const truncated = charOffset < text.length;

    return {
      name: filename,
      text: pages.map(p => p.text).join(''),
      truncated,
      pages,
      metadata: {
        totalPages: pages.length,
        totalChars: charOffset,
        parsedPages: pages.length
      }
    };
  } catch (error) {
    throw new Error(`TXT parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 根据文件类型解析文档
 */
export async function parseDocument(
  base64: string,
  filename: string,
  maxPages: number = 50
): Promise<ParsedDocument> {
  const ext = filename.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'pdf':
      return parsePDF(base64, filename, maxPages);
    case 'txt':
      return parseTXT(base64, filename, maxPages);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}
