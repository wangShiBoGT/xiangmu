/**
 * Service Worker for WebGPU LLM Chat
 * 实现离线访问支持和资源缓存策略
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `webgpu-llm-static-${CACHE_VERSION}`;
const MODEL_CACHE = `webgpu-llm-models-${CACHE_VERSION}`;
const RUNTIME_CACHE = `webgpu-llm-runtime-${CACHE_VERSION}`;

// 静态资源列表（需在构建时更新）
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/index.css',
  '/assets/index.js',
  '/manifest.json',
];

// 模型文件路径模式
const MODEL_URL_PATTERNS = [
  /huggingface\.co/,
  /cdn-lfs\.huggingface\.co/,
  /\/models\//,
];

// 安装事件：预缓存静态资源
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache some assets:', err);
        // 非阻塞失败，部分缓存也可用
      });
    }).then(() => {
      console.log('[SW] Installation complete');
      return self.skipWaiting(); // 立即激活新 SW
    })
  );
});

// 激活事件：清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // 删除不属于当前版本的缓存
            return name.startsWith('webgpu-llm-') &&
                   name !== STATIC_CACHE &&
                   name !== MODEL_CACHE &&
                   name !== RUNTIME_CACHE;
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim(); // 立即接管所有客户端
    })
  );
});

// Fetch 事件：应用缓存策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 HTTP(S) 请求
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 跳过 Chrome 扩展请求
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // 策略 1: 静态资源 - Cache First
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 策略 2: 模型文件 - Cache with Network Fallback (支持 Range 请求)
  if (isModelFile(url)) {
    event.respondWith(cacheWithNetworkFallback(request, MODEL_CACHE));
    return;
  }

  // 策略 3: API 和动态内容 - Network First
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

/**
 * 判断是否为静态资源
 */
function isStaticAsset(url) {
  // 同源的 HTML/CSS/JS/字体/图片
  if (url.origin !== self.location.origin) {
    return false;
  }

  const pathname = url.pathname;
  return (
    pathname === '/' ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/images/') ||
    pathname.endsWith('.html') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.ttf') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.webp')
  );
}

/**
 * 判断是否为模型文件
 */
function isModelFile(url) {
  return MODEL_URL_PATTERNS.some((pattern) => pattern.test(url.href));
}

/**
 * Cache First 策略：优先使用缓存，缓存未命中时从网络获取
 */
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    if (cached) {
      console.log('[SW] Cache hit:', request.url);
      return cached;
    }

    console.log('[SW] Cache miss, fetching:', request.url);
    const response = await fetch(request);

    // 只缓存成功的响应
    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Cache First failed:', error);
    // 返回离线页面或错误响应
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Network First 策略：优先使用网络，网络失败时使用缓存
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);

    // 缓存成功的响应
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    if (cached) {
      console.log('[SW] Serving from cache:', request.url);
      return cached;
    }

    console.error('[SW] Network First failed, no cache:', error);
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Cache with Network Fallback 策略：优先缓存，缓存未命中时从网络获取并缓存
 * 支持 HTTP Range 请求（模型文件分片下载）
 */
async function cacheWithNetworkFallback(request, cacheName) {
  const cache = await caches.open(cacheName);

  // 检查是否为 Range 请求
  const rangeHeader = request.headers.get('range');

  if (rangeHeader) {
    // Range 请求不使用缓存，直接转发到网络
    console.log('[SW] Range request, bypassing cache:', request.url);
    try {
      return await fetch(request);
    } catch (error) {
      console.error('[SW] Range request failed:', error);
      return new Response('Network error', { status: 503 });
    }
  }

  // 非 Range 请求，尝试缓存
  const cached = await cache.match(request);

  if (cached) {
    console.log('[SW] Model cache hit:', request.url);
    return cached;
  }

  // 缓存未命中，从网络获取
  console.log('[SW] Model cache miss, fetching:', request.url);
  try {
    const response = await fetch(request);

    // 只缓存完整的成功响应（200）
    if (response.ok && response.status === 200) {
      // 检查文件大小，避免缓存过大文件（>100MB）
      const contentLength = response.headers.get('content-length');
      const sizeMB = contentLength ? parseInt(contentLength) / (1024 * 1024) : 0;

      if (sizeMB > 0 && sizeMB < 100) {
        console.log(`[SW] Caching model file (${sizeMB.toFixed(2)}MB):`, request.url);
        cache.put(request, response.clone());
      } else if (sizeMB >= 100) {
        console.log(`[SW] Model file too large (${sizeMB.toFixed(2)}MB), not caching:`, request.url);
      }
    }

    return response;
  } catch (error) {
    console.error('[SW] Network fetch failed:', error);
    return new Response('Network error', { status: 503, statusText: 'Service Unavailable' });
  }
}

// 消息事件：处理来自主线程的消息
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      console.log('[SW] Received SKIP_WAITING message');
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      console.log('[SW] Received CLEAR_CACHE message');
      event.waitUntil(
        caches.keys().then((names) => {
          return Promise.all(
            names
              .filter((name) => name.startsWith('webgpu-llm-'))
              .map((name) => caches.delete(name))
          );
        }).then(() => {
          event.ports[0].postMessage({ success: true });
        }).catch((error) => {
          console.error('[SW] Clear cache failed:', error);
          event.ports[0].postMessage({ success: false, error: error.message });
        })
      );
      break;

    case 'GET_CACHE_SIZE':
      console.log('[SW] Received GET_CACHE_SIZE message');
      event.waitUntil(
        getCacheSize().then((size) => {
          event.ports[0].postMessage({ size });
        }).catch((error) => {
          console.error('[SW] Get cache size failed:', error);
          event.ports[0].postMessage({ size: 0, error: error.message });
        })
      );
      break;

    default:
      console.warn('[SW] Unknown message type:', type);
  }
});

/**
 * 计算所有缓存的总大小（估算）
 */
async function getCacheSize() {
  const names = await caches.keys();
  let totalSize = 0;

  for (const name of names) {
    if (name.startsWith('webgpu-llm-')) {
      const cache = await caches.open(name);
      const requests = await cache.keys();

      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }
  }

  return totalSize;
}

console.log('[SW] Service Worker script loaded');
