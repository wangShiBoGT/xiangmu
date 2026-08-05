/**
 * 模型文件增量更新和断点续传支持
 * 为 transformers.js 模型下载添加 Range 请求和缓存恢复
 */

interface DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface CachedChunk {
  url: string;
  start: number;
  end: number;
  data: ArrayBuffer;
  timestamp: number;
}

const CACHE_NAME = 'model-chunks-v1';
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB 分片
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒

/**
 * 检查服务器是否支持 Range 请求
 */
export async function supportsRangeRequests(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
    });

    const acceptRanges = response.headers.get('accept-ranges');
    const contentLength = response.headers.get('content-length');

    return acceptRanges === 'bytes' && !!contentLength;
  } catch (error) {
    console.error('[Incremental] Range support check failed:', error);
    return false;
  }
}

/**
 * 获取已缓存的分片
 */
async function getCachedChunks(url: string): Promise<CachedChunk[]> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();

    const chunks: CachedChunk[] = [];

    for (const request of keys) {
      const reqUrl = new URL(request.url);
      const baseUrl = reqUrl.searchParams.get('base');
      const start = reqUrl.searchParams.get('start');
      const end = reqUrl.searchParams.get('end');

      if (baseUrl === url && start && end) {
        const response = await cache.match(request);
        if (response) {
          const data = await response.arrayBuffer();
          chunks.push({
            url,
            start: parseInt(start),
            end: parseInt(end),
            data,
            timestamp: parseInt(reqUrl.searchParams.get('timestamp') || '0'),
          });
        }
      }
    }

    // 按起始位置排序
    return chunks.sort((a, b) => a.start - b.start);
  } catch (error) {
    console.error('[Incremental] Get cached chunks failed:', error);
    return [];
  }
}

/**
 * 缓存分片
 */
async function cacheChunk(chunk: CachedChunk): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAME);

    // 构造唯一的请求 URL
    const chunkUrl = new URL('https://chunk.local/');
    chunkUrl.searchParams.set('base', chunk.url);
    chunkUrl.searchParams.set('start', chunk.start.toString());
    chunkUrl.searchParams.set('end', chunk.end.toString());
    chunkUrl.searchParams.set('timestamp', chunk.timestamp.toString());

    const response = new Response(chunk.data, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': chunk.data.byteLength.toString(),
      },
    });

    await cache.put(chunkUrl.toString(), response);
  } catch (error) {
    console.error('[Incremental] Cache chunk failed:', error);
  }
}

/**
 * 下载单个分片（支持重试）
 */
async function downloadChunk(
  url: string,
  start: number,
  end: number,
  retries = 0
): Promise<ArrayBuffer> {
  try {
    const response = await fetch(url, {
      headers: {
        Range: `bytes=${start}-${end}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // 检查是否返回 206 Partial Content
    if (response.status !== 206) {
      throw new Error('Server does not support range requests');
    }

    const data = await response.arrayBuffer();

    // 验证分片大小
    const expectedSize = end - start + 1;
    if (data.byteLength !== expectedSize) {
      throw new Error(
        `Chunk size mismatch: expected ${expectedSize}, got ${data.byteLength}`
      );
    }

    return data;
  } catch (error) {
    console.error(`[Incremental] Download chunk ${start}-${end} failed:`, error);

    // 重试机制
    if (retries < MAX_RETRIES) {
      console.log(`[Incremental] Retrying chunk ${start}-${end} (${retries + 1}/${MAX_RETRIES})...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * (retries + 1)));
      return downloadChunk(url, start, end, retries + 1);
    }

    throw error;
  }
}

/**
 * 计算缺失的分片范围
 */
function getMissingRanges(
  totalSize: number,
  cachedChunks: CachedChunk[]
): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];

  if (cachedChunks.length === 0) {
    // 没有缓存，全部下载
    return [{ start: 0, end: totalSize - 1 }];
  }

  let currentPos = 0;

  for (const chunk of cachedChunks) {
    if (chunk.start > currentPos) {
      // 有缺口，添加缺失范围
      ranges.push({ start: currentPos, end: chunk.start - 1 });
    }
    currentPos = Math.max(currentPos, chunk.end + 1);
  }

  // 检查末尾是否有缺失
  if (currentPos < totalSize) {
    ranges.push({ start: currentPos, end: totalSize - 1 });
  }

  return ranges;
}

/**
 * 增量下载文件（支持断点续传）
 */
export async function downloadWithResume(
  url: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<ArrayBuffer> {
  // 检查是否支持 Range 请求
  const supportsRange = await supportsRangeRequests(url);

  if (!supportsRange) {
    console.log('[Incremental] Server does not support range requests, falling back to full download');
    return downloadFull(url, onProgress);
  }

  // 获取文件总大小
  const headResponse = await fetch(url, { method: 'HEAD' });
  const totalSize = parseInt(headResponse.headers.get('content-length') || '0');

  if (totalSize === 0) {
    throw new Error('Unable to determine file size');
  }

  console.log(`[Incremental] File size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);

  // 获取已缓存的分片
  const cachedChunks = await getCachedChunks(url);
  console.log(`[Incremental] Found ${cachedChunks.length} cached chunks`);

  // 计算缺失的范围
  const missingRanges = getMissingRanges(totalSize, cachedChunks);
  console.log(`[Incremental] Missing ranges: ${missingRanges.length}`);

  if (missingRanges.length === 0) {
    console.log('[Incremental] File fully cached, assembling...');
    return assembleChunks(cachedChunks, totalSize);
  }

  // 下载缺失的分片
  const newChunks: CachedChunk[] = [];
  let downloadedBytes = cachedChunks.reduce((sum, c) => sum + (c.end - c.start + 1), 0);

  for (const range of missingRanges) {
    let start = range.start;

    while (start <= range.end) {
      const end = Math.min(start + CHUNK_SIZE - 1, range.end);

      console.log(
        `[Incremental] Downloading chunk ${start}-${end} (${((end - start + 1) / (1024 * 1024)).toFixed(2)} MB)`
      );

      const data = await downloadChunk(url, start, end);

      const chunk: CachedChunk = {
        url,
        start,
        end,
        data,
        timestamp: Date.now(),
      };

      newChunks.push(chunk);

      // 立即缓存下载的分片
      await cacheChunk(chunk);

      downloadedBytes += data.byteLength;

      // 报告进度
      if (onProgress) {
        onProgress({
          loaded: downloadedBytes,
          total: totalSize,
          percentage: (downloadedBytes / totalSize) * 100,
        });
      }

      start = end + 1;
    }
  }

  // 合并所有分片
  const allChunks = [...cachedChunks, ...newChunks].sort((a, b) => a.start - b.start);
  return assembleChunks(allChunks, totalSize);
}

/**
 * 合并分片为完整文件
 */
function assembleChunks(chunks: CachedChunk[], totalSize: number): ArrayBuffer {
  const buffer = new Uint8Array(totalSize);
  let offset = 0;

  for (const chunk of chunks) {
    const chunkData = new Uint8Array(chunk.data);
    buffer.set(chunkData, offset);
    offset += chunkData.length;
  }

  if (offset !== totalSize) {
    console.warn(`[Incremental] Assembled size mismatch: expected ${totalSize}, got ${offset}`);
  }

  return buffer.buffer;
}

/**
 * 完整下载（回退方案）
 */
async function downloadFull(
  url: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<ArrayBuffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const totalSize = parseInt(response.headers.get('content-length') || '0');

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loadedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    chunks.push(value);
    loadedBytes += value.length;

    if (onProgress && totalSize > 0) {
      onProgress({
        loaded: loadedBytes,
        total: totalSize,
        percentage: (loadedBytes / totalSize) * 100,
      });
    }
  }

  // 合并所有 chunks
  const buffer = new Uint8Array(loadedBytes);
  let offset = 0;

  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }

  return buffer.buffer;
}

/**
 * 清除模型缓存
 */
export async function clearModelCache(): Promise<boolean> {
  try {
    const deleted = await caches.delete(CACHE_NAME);
    console.log('[Incremental] Model cache cleared:', deleted);
    return deleted;
  } catch (error) {
    console.error('[Incremental] Clear cache failed:', error);
    return false;
  }
}

/**
 * 获取缓存大小
 */
export async function getModelCacheSize(): Promise<number> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();

    let totalSize = 0;

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }

    return totalSize;
  } catch (error) {
    console.error('[Incremental] Get cache size failed:', error);
    return 0;
  }
}
