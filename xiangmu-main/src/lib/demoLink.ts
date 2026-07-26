/** 演示切片链接（锚点 E2）：只对随构建内置的录制示例发 hash 链接——
 *  接收方无需下载模型即可直达同一犹豫点。用户自己的实验不走 URL
 *  （trace 太大，塞不进链接且不做假后端），分享用 .aitrace 文件。 */

export interface DemoSlice {
  step: number;
  /** 是否直达该步的双结局视图（存在真实分支才生效） */
  dual: boolean;
}

export function buildDemoHash(step: number, dual = false): string {
  return `#demo/step/${step}${dual ? "/dual" : ""}`;
}

export function parseDemoHash(hash: string): DemoSlice | null {
  const m = /^#demo\/step\/(\d+)(\/dual)?$/.exec(hash);
  if (!m) return null;
  const step = Number(m[1]);
  if (!Number.isInteger(step) || step < 0) return null;
  return { step, dual: m[2] !== undefined };
}
