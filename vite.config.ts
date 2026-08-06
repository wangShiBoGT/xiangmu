/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

interface SearchResult {
  title: string
  url: string
  snippet: string
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** 必应 RSS 输出（比 HTML 页面稳定、无反爬验证页） */
function parseBingRss(xml: string): SearchResult[] {
  const results: SearchResult[] = []
  const items = xml.split('<item>')
  for (const item of items.slice(1)) {
    const title = /<title>([\s\S]*?)<\/title>/.exec(item)
    const link = /<link>([\s\S]*?)<\/link>/.exec(item)
    const desc = /<description>([\s\S]*?)<\/description>/.exec(item)
    if (!title || !link) continue
    results.push({
      title: stripTags(title[1]),
      url: stripTags(link[1]),
      snippet: stripTags(desc?.[1] ?? ''),
    })
    if (results.length >= 5) break
  }
  return results
}

/** 浏览器直连搜索引擎会被 CORS 拦，由本机 dev server 代理抓取必应结果 */
function searchProxy(): Plugin {
  return {
    name: 'search-proxy',
    configureServer(server) {
      server.middlewares.use('/api/search', async (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        const q = new URL(req.url ?? '', 'http://localhost').searchParams
          .get('q')
          ?.trim()
        if (!q) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: '缺少搜索关键词' }))
          return
        }
        try {
          const r = await fetch(
            `https://www.bing.com/search?q=${encodeURIComponent(q)}&format=rss&mkt=zh-CN&count=5`,
            {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept-Language': 'zh-CN,zh;q=0.9',
              },
              signal: AbortSignal.timeout(10000),
            },
          )
          const results = parseBingRss(await r.text())
          if (results.length === 0) {
            res.statusCode = 502
            res.end(JSON.stringify({ error: '没有抓到搜索结果，请稍后重试' }))
            return
          }
          res.end(JSON.stringify({ results }))
        } catch (e) {
          res.statusCode = 502
          res.end(
            JSON.stringify({ error: `联网搜索失败：${String(e).slice(0, 120)}` }),
          )
        }
      })
    },
  }
}

// WebGPU 仅在安全上下文（https 或 localhost）下可用，
// 局域网 IP 访问必须走 https，故启用自签证书
export default defineConfig({
  base: '/',  // 自定义域名使用根路径
  plugins: [react(), tailwindcss(), searchProxy()],  // 暂时禁用 SSL 以便预览
  // 监听 0.0.0.0：启动时终端会额外打印 Network 地址（https://<局域网IP>:5173），
  // 同一局域网内其他设备可直接访问（自签证书需在对方浏览器手动信任一次）
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 三大体积瓶颈独立拆分
          'vendor-three': ['three', 'three/examples/jsm/controls/OrbitControls'],
          'vendor-office': ['xlsx', 'mammoth'],
          'vendor-pdf': ['pdfjs-dist/legacy/build/pdf.mjs'],
        },
      },
    },
    // 警告阈值提高到 1000 KB，xlsx 压缩后 934KB 是合理的大小
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
