export interface ThinkingParts {
  /** 思考内容；模型未输出 <think> 时为 null */
  thinking: string | null;
  /** 正式回答内容 */
  answer: string;
  /** 思考是否已结束（</think> 已闭合或根本没有思考段） */
  done: boolean;
}

/** 喂回模型的历史需去掉思考段（DeepSeek 官方要求，否则污染上下文） */
export function stripThinking(content: string): string {
  const { thinking, answer } = splitThinking(content);
  return answer || thinking?.trim() || "";
}

/** 生成结束但 </think> 未闭合时：模型把这段内容当成了正式回答，去掉 <think> 标记按回答展示 */
export function finalizeUnclosedThinking(content: string): string {
  const start = content.indexOf("<think>");
  if (start === -1 || content.includes("</think>")) return content;
  return (content.slice(0, start) + content.slice(start + 7)).trim();
}

/** 从 DeepSeek-R1 输出中拆分 <think>...</think> 思考段与正式回答 */
export function splitThinking(content: string): ThinkingParts {
  const start = content.indexOf("<think>");
  if (start === -1) return { thinking: null, answer: content, done: true };
  const end = content.indexOf("</think>", start);
  if (end === -1) {
    return { thinking: content.slice(start + 7), answer: "", done: false };
  }
  return {
    thinking: content.slice(start + 7, end).trim(),
    answer: content.slice(end + 8).trim(),
    done: true,
  };
}
