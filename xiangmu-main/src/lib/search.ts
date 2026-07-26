/** 联网搜索：走本机 dev server 的 /api/search 代理（浏览器直连搜索引擎会被 CORS 拦） */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function webSearch(query: string): Promise<SearchResult[]> {
  const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!r.ok) throw new Error(`联网搜索失败（HTTP ${r.status}）`);
  const data = (await r.json()) as { results?: SearchResult[]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.results ?? [];
}

/** 把搜索结果拼进提问，让模型参考最新网络信息作答 */
export function buildSearchPrompt(
  results: SearchResult[],
  question: string,
): string {
  const refs = results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}`)
    .join("\n\n");
  return `以下是关于这个问题的最新网络搜索结果，请参考它们回答（搜索结果可能不完整，仅作补充）：\n\n${refs}\n\n问题：${question}`;
}
