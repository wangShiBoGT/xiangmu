import { GLOSSARY } from "../lib/glossary";
import { Tooltip } from "./Tooltip";

interface TermProps {
  /** 术语 key（从 GLOSSARY 查找）*/
  id: keyof typeof GLOSSARY;
  /** 显示的文本（默认使用术语名称）*/
  children?: React.ReactNode;
}

export function Term({ id, children }: TermProps) {
  const entry = GLOSSARY[id];
  if (!entry) {
    console.warn(`术语 "${id}" 未在 GLOSSARY 中定义`);
    return <>{children}</>;
  }

  return (
    <Tooltip
      term={entry.term}
      explanation={entry.explanation}
      example={entry.example}
      learnMoreUrl={entry.learnMoreUrl}
    >
      {children || entry.term.split("（")[0]}
    </Tooltip>
  );
}
