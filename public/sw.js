/**
 * Service Worker for WebGPU LLM Chat.
 *
 * 应用资源由 Vite 使用内容哈希发布。绝不能把 HTML、入口脚本或 chunk 以
 * Cache First 返回，否则一次非原子部署会让旧入口引用已删除的 chunk，导致
 * React 的动态导入失败并白屏。模型文件不随应用发布变化，仍可独立缓存。
 */

const CACHE_VERSION = "v2";
const MODEL_CACHE = `webgpu-llm-models-${CACHE_VERSION}`;

const MODEL_URL_PATTERNS = [
  /huggingface\.co/,
  /cdn-lfs\.huggingface\.co/,
  /\/models\//,
];

self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");

  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) =>
            name.startsWith("webgpu-llm-") && name !== MODEL_CACHE,
          )
          .map((name) => {
            console.log("[SW] Deleting stale cache:", name);
            return caches.delete(name);
          }),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 只代理可安全重放的 GET 请求；其他请求保持浏览器默认网络语义。
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!url.protocol.startsWith("http")) return;

  if (isModelFile(url)) {
    event.respondWith(cacheWithNetworkFallback(request, MODEL_CACHE));
  }
  // 应用 shell、动态 chunk、API 与图片全部走浏览器默认网络请求。
  // 这样一次部署中的任意页面都只会使用服务器上的同一版本资源。
});

function isModelFile(url) {
  return MODEL_URL_PATTERNS.some((pattern) => pattern.test(url.href));
}

/**
 * 模型文件的缓存策略：Range 请求直通网络，完整小文件才落盘。
 */
async function cacheWithNetworkFallback(request, cacheName) {
  const cache = await caches.open(cacheName);

  if (request.headers.has("range")) {
    return fetch(request);
  }

  const cached = await cache.match(request);
  if (cached) {
    console.log("[SW] Model cache hit:", request.url);
    return cached;
  }

  try {
    const response = await fetch(request);

    if (response.ok && response.status === 200) {
      const contentLength = response.headers.get("content-length");
      const sizeMB = contentLength ? Number(contentLength) / (1024 * 1024) : 0;

      if (sizeMB > 0 && sizeMB < 100) {
        void cache.put(request, response.clone());
      }
    }

    return response;
  } catch (error) {
    if (cached) return cached;
    console.error("[SW] Model fetch failed:", error);
    return new Response("Network error", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

self.addEventListener("message", (event) => {
  const { type } = event.data ?? {};

  switch (type) {
    case "SKIP_WAITING":
      self.skipWaiting();
      break;

    case "CLEAR_CACHE":
      event.waitUntil(
        caches.keys().then((names) =>
          Promise.all(
            names
              .filter((name) => name.startsWith("webgpu-llm-"))
              .map((name) => caches.delete(name)),
          ),
        ).then(() => event.ports[0]?.postMessage({ success: true }))
          .catch((error) => {
            console.error("[SW] Clear cache failed:", error);
            event.ports[0]?.postMessage({ success: false, error: error.message });
          }),
      );
      break;

    case "GET_CACHE_SIZE":
      event.waitUntil(
        getCacheSize()
          .then((size) => event.ports[0]?.postMessage({ size }))
          .catch((error) => {
            console.error("[SW] Get cache size failed:", error);
            event.ports[0]?.postMessage({ size: 0, error: error.message });
          }),
      );
      break;

    default:
      console.warn("[SW] Unknown message type:", type);
  }
});

async function getCacheSize() {
  const names = await caches.keys();
  let totalSize = 0;

  for (const name of names) {
    if (!name.startsWith("webgpu-llm-")) continue;

    const cache = await caches.open(name);
    const requests = await cache.keys();
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) totalSize += (await response.blob()).size;
    }
  }

  return totalSize;
}

console.log("[SW] Service Worker script loaded");
