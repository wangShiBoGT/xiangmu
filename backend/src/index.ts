/**
 * Cloudflare Workers 主入口 - 使用 Hono 框架
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, ErrorResponse } from './types';
import { verifyHmacSignature, decryptApiKey, generateUserId } from './utils/security';
import { getQuota, consumeQuota } from './utils/quota';
import { parseDocument } from './services/documentParser';
import { computeEmbedding } from './services/embedding';
import { proxyGeneration } from './services/apiProxy';
import {
  auditUsability,
  extractAtomicClaims,
  checkSemanticConsistency,
  addSourceTracing
} from './services/audit';

const app = new Hono<{ Bindings: Env }>();

// ============================================================================
// 中间件
// ============================================================================

// CORS
app.use('/*', cors({
  origin: ['http://localhost:5173', 'https://your-frontend-domain.com'],
  credentials: true,
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Timestamp', 'X-Signature']
}));

// HMAC 签名验证
app.use('/api/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    return next();
  }

  const timestamp = c.req.header('X-Timestamp');
  const signature = c.req.header('X-Signature');
  const body = await c.req.text();

  if (!timestamp || !signature) {
    return c.json<ErrorResponse>({
      success: false,
      error: {
        code: 'INVALID_SIGNATURE',
        message: 'Missing timestamp or signature'
      }
    }, 400);
  }

  const verification = verifyHmacSignature(
    timestamp,
    body,
    signature,
    c.env.HMAC_SECRET
  );

  if (!verification.valid) {
    return c.json(verification.error!, 403);
  }

  // 解析 body 并存储到 context
  c.set('requestBody', JSON.parse(body));

  await next();
});

// ============================================================================
// 路由
// ============================================================================

/**
 * 1. API 代理接口
 */
app.post('/api/proxy', async (c) => {
  try {
    const req = c.get('requestBody');
    const userId = generateUserId(c.req.raw);

    // 检查配额
    const quota = await getQuota(userId, c.env);
    if (quota.quota.daily.remaining <= 0) {
      return c.json<ErrorResponse>({
        success: false,
        error: {
          code: 'RATE_LIMIT',
          message: 'Daily quota exceeded'
        }
      }, 429);
    }

    // 解密 API key
    let apiKey: string;
    try {
      apiKey = decryptApiKey(req.apiKey, c.env.ENCRYPTION_SECRET);
    } catch (error) {
      return c.json<ErrorResponse>({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Failed to decrypt API key'
        }
      }, 400);
    }

    // 调用 API
    const result = await proxyGeneration({
      ...req,
      apiKey // 使用解密后的 key
    });

    // 消耗配额
    await consumeQuota(userId, result.cost.total, c.env);

    // 立即清除解密后的 key
    apiKey = '';

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return c.json<ErrorResponse>({
      success: false,
      error: {
        code: 'PROVIDER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      }
    }, 500);
  }
});

/**
 * 2. 文档解析接口
 */
app.post('/api/parse-document', async (c) => {
  try {
    const req = c.get('requestBody');
    const userId = generateUserId(c.req.raw);

    // 检查配额
    const quota = await getQuota(userId, c.env);
    if (quota.quota.daily.remaining <= 0) {
      return c.json<ErrorResponse>({
        success: false,
        error: {
          code: 'RATE_LIMIT',
          message: 'Daily quota exceeded'
        }
      }, 429);
    }

    // 解析文档
    const document = await parseDocument(
      req.file,
      req.filename,
      req.options?.maxPages || 50
    );

    // 计算 embedding
    const embeddings: Array<{ pageNumber: number; embedding: number[] }> = [];

    if (req.options?.enableEmbedding !== false) {
      for (const page of document.pages) {
        const embedding = await computeEmbedding(page.text, c.env);
        embeddings.push({
          pageNumber: page.pageNumber,
          embedding
        });
      }
    }

    // 计算成本
    const parsingCost = 0.0001;
    const embeddingCost = embeddings.length * 0.0005;
    const totalCost = parsingCost + embeddingCost;

    // 消耗配额
    await consumeQuota(userId, totalCost, c.env);

    return c.json({
      success: true,
      data: {
        document,
        embeddings,
        cost: {
          parsing: parsingCost,
          embedding: embeddingCost,
          total: totalCost
        }
      }
    });
  } catch (error) {
    console.error('Parse document error:', error);
    return c.json<ErrorResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      }
    }, 500);
  }
});

/**
 * 3. 审计分析接口（核心）
 */
app.post('/api/audit', async (c) => {
  try {
    const req = c.get('requestBody');
    const userId = generateUserId(c.req.raw);

    // 检查配额
    const quota = await getQuota(userId, c.env);
    if (quota.quota.daily.remaining <= 0) {
      return c.json<ErrorResponse>({
        success: false,
        error: {
          code: 'RATE_LIMIT',
          message: 'Daily quota exceeded'
        }
      }, 429);
    }

    const { traces, documents = [], options = {} } = req;

    // 1. 可用性审计
    const audit = auditUsability(traces[0]);

    // 2. 提取主张
    let claims = traces.flatMap((trace, idx) => extractAtomicClaims(trace, idx));

    // 3. 来源追溯
    if (options.enableSourceTracing !== false && documents.length > 0) {
      claims = await addSourceTracing(claims, documents, c.env);
    }

    // 4. 语义一致性
    const semanticConsistency = traces.length > 1
      ? await checkSemanticConsistency(traces, c.env)
      : {
          runs: traces.length,
          totalClaims: 0,
          consistentClaims: 0,
          inconsistentClaims: 0,
          consistencyRate: 1.0,
          clusters: [],
          severity: 'low' as const,
          explanation: '单次运行无法分析'
        };

    // 计算成本
    const claimExtractionCost = claims.length * 0.0001;
    const embeddingCost = (claims.length + documents.reduce((sum, d) => sum + d.pages.length, 0)) * 0.0005;
    const totalCost = claimExtractionCost + embeddingCost;

    // 消耗配额
    await consumeQuota(userId, totalCost, c.env);

    return c.json({
      success: true,
      data: {
        audit,
        claims,
        semanticConsistency,
        cost: {
          claimExtraction: claimExtractionCost,
          embedding: embeddingCost,
          total: totalCost
        }
      }
    });
  } catch (error) {
    console.error('Audit error:', error);
    return c.json<ErrorResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      }
    }, 500);
  }
});

/**
 * 4. 配额查询接口
 */
app.get('/api/quota', async (c) => {
  try {
    const userId = generateUserId(c.req.raw);
    const quota = await getQuota(userId, c.env);

    return c.json({
      success: true,
      data: quota
    });
  } catch (error) {
    console.error('Quota error:', error);
    return c.json<ErrorResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }, 500);
  }
});

// ============================================================================
// 健康检查
// ============================================================================

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 导出
// ============================================================================

export default app;
