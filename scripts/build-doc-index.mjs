// 生成 docs/AOKS/DOC-INDEX.md：全部文档的标题+行号索引，供 AI 按行号精准取段，避免整篇读取。
// 用法：node scripts/build-doc-index.mjs   （零依赖；文档变动后重跑并随交付写回）
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SCAN_DIRS = ['docs', 'Design'];
const ROOT_FILES = ['README.md', 'AGENTS.md'];
const OUT = join(ROOT, 'docs/AOKS/DOC-INDEX.md');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
}

const files = [
  ...ROOT_FILES.map((f) => join(ROOT, f)),
  ...SCAN_DIRS.flatMap((d) => walk(join(ROOT, d))),
].filter((p) => !p.endsWith(`AOKS${sep}DOC-INDEX.md`));

const sections = [];
for (const file of files.sort()) {
  const rel = relative(ROOT, file);
  const lines = readFileSync(file, 'utf8').split('\n');
  const heads = [];
  let inCode = false;
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) inCode = !inCode;
    const m = !inCode && line.match(/^(#{1,3})\s+(.+)/);
    if (m) heads.push(`${'  '.repeat(m[1].length - 1)}- L${i + 1} ${m[2].trim()}`);
  });
  sections.push(`### ${rel}（${lines.length} 行）\n\n${heads.join('\n') || '- （无标题）'}`);
}

const body = `# DOC-INDEX · 全文档标题行号索引（自动生成，勿手改）

> 生成命令：\`node scripts/build-doc-index.mjs\`（文档变动后重跑）。
> 用法：先在本文定位目标文件与标题行号，再只读该行号附近的片段（桥接 \`/api/file?offset=&limit=\` 或本地按行读取），**不要整篇加载**。

${sections.join('\n\n')}
`;
writeFileSync(OUT, body);
console.log(`DOC-INDEX.md written: ${files.length} files indexed`);
