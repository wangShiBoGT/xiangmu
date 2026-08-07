/**
 * API Client for backend integration
 *
 * 前端与后端的统一接口层
 * - 开发环境：使用本地 Mock 数据
 * - 生产环境：调用后端 API
 *
 * 环境变量控制：
 * - VITE_USE_BACKEND=true  启用后端调用
 * - VITE_API_BASE_URL      后端地址
 */

import type { GenerationTrace } from './trace';
import type { ParsedDocument } from './documents';
import type { UsabilityAudit } from './usabilityAudit';
import type { SemanticConsistencyResult, AtomicClaim } from './semanticConsistency';
import { parseDocument as parseDocumentLocal } from './documents';
import { auditUsability } from './usabilityAudit';
import { checkSemanticConsistency } from './semanticConsistency';

// ============================================================================
// 环境配置
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

// ============================================================================
// 类型定义（与后端接口契约）
// ============================================================================

// 1. API 代理接口
export interface ProxyRequest {
  provider: 'openai' | 'anthropic' | 'gemini';
  apiKey: string;  // 前端 AES 加密后传输
  model: string;   // 例如 "gpt-4", "claude-3-5-sonnet-20241022"
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  enableLogprobs: boolean;  // 必须为 true
}

export interface ProxyResponse {
  success: true;
  data: {
    trace: GenerationTrace;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    cost: {
      input: number;   // 美元
      output: number;
      total: number;
    };
  };
}

// 2. 文档解析接口
export interface ParseDocumentRequest {
  file: string;      // Base64 编码
  filename: string;
  options?: {
    maxPages?: number;
    enableEmbedding?: boolean;
  };
}

export interface ParseDocumentResponse {
  success: true;
  data: {
    document: ParsedDocument;
    embeddings: Array<{
      pageNumber: number;
      embedding: number[];
    }>;
    cost: {
      parsing: number;
      embedding: number;
      total: number;
    };
  };
}

// 3. 审计分析接口
export interface AuditRequest {
  traces: GenerationTrace[];
  documents?: ParsedDocument[];
  options?: {
    enableClaimExtraction?: boolean;
    enableSourceTracing?: boolean;
    enableSemanticConsistency?: boolean;
    similarityThreshold?: number;
  };
}

export interface AtomicClaimWithSource extends AtomicClaim {
  // source 字段已经在 AtomicClaim 中定义，这里保持兼容
  source?: {
    docName: string;
    pageNumber: number;
    excerpt: string;
    similarity: number;
    charStart: number;
    charEnd: number;
  };
}

export interface AuditResponse {
  success: true;
  data: {
    audit: UsabilityAudit;
    claims: AtomicClaimWithSource[];
    semanticConsistency: SemanticConsistencyResult;
    cost: {
      claimExtraction: number;
      embedding: number;
      total: number;
    };
  };
}

// 4. 配额查询接口
export interface QuotaResponse {
  success: true;
  data: {
    userId: string;
    quota: {
      daily: {
        limit: number;
        used: number;
        remaining: number;
        resetAt: string;
      };
      cost: {
        total: number;
        thisMonth: number;
      };
    };
  };
}

// 统一错误响应
export interface ErrorResponse {
  success: false;
  error: {
    code: 'INVALID_API_KEY' | 'RATE_LIMIT' | 'PROVIDER_ERROR' | 'INTERNAL_ERROR' | 'NETWORK_ERROR';
    message: string;
    details?: any;
  };
}

// ============================================================================
// 通用请求函数
// ============================================================================

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error.message);
    }

    return data.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network request failed');
  }
}

// ============================================================================
// API 函数（带 Mock 策略）
// ============================================================================

/**
 * 1. API 代理 - 调用 OpenAI/Anthropic API 获取 logprobs
 */
export async function proxyGeneration(
  req: ProxyRequest
): Promise<ProxyResponse['data']> {
  if (!USE_BACKEND) {
    // Mock: 返回假数据
    console.warn('[API Client] Using mock data for proxyGeneration');

    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      trace: createMockTrace(),
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
      cost: {
        input: 0.0001,
        output: 0.00015,
        total: 0.00025,
      },
    };
  }

  return apiRequest<ProxyResponse['data']>('/api/proxy', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/**
 * 2. 文档解析 - 上传文件并解析
 */
export async function parseDocumentAPI(
  file: File
): Promise<ParsedDocument> {
  if (!USE_BACKEND) {
    // Mock: 使用本地解析
    console.warn('[API Client] Using local parsing');
    return parseDocumentLocal(file);
  }

  const base64 = await fileToBase64(file);
  const result = await apiRequest<ParseDocumentResponse['data']>('/api/parse-document', {
    method: 'POST',
    body: JSON.stringify({
      file: base64,
      filename: file.name,
    }),
  });

  return result.document;
}

/**
 * 3. 审计分析 - 幻觉检测、主张提取、语义一致性
 */
export async function auditTracesAPI(
  traces: GenerationTrace[],
  documents: ParsedDocument[] = []
): Promise<AuditResponse['data']> {
  if (!USE_BACKEND) {
    // Mock: 使用本地审计
    console.warn('[API Client] Using local audit');

    const audit = await auditUsability(traces[0]);
    const semanticConsistency = traces.length > 1
      ? await checkSemanticConsistency(traces, documents)
      : null;

    return {
      audit,
      claims: semanticConsistency?.clusters.flatMap(c =>
        c.members.map(m => m.claim)
      ) || [],
      semanticConsistency: semanticConsistency || {
        runs: traces.length,
        totalClaims: 0,
        consistentClaims: 0,
        inconsistentClaims: 0,
        consistencyRate: 0,
        clusters: [],
        severity: 'low' as const,
        explanation: '无法进行语义一致性分析',
      },
      cost: {
        claimExtraction: 0,
        embedding: 0,
        total: 0,
      },
    };
  }

  return apiRequest<AuditResponse['data']>('/api/audit', {
    method: 'POST',
    body: JSON.stringify({
      traces,
      documents,
    }),
  });
}

/**
 * 4. 配额查询
 */
export async function getQuota(): Promise<QuotaResponse['data']> {
  if (!USE_BACKEND) {
    // Mock: 返回假数据
    console.warn('[API Client] Using mock quota data');

    return {
      userId: 'mock-user',
      quota: {
        daily: {
          limit: 100,
          used: 5,
          remaining: 95,
          resetAt: new Date(Date.now() + 86400000).toISOString(),
        },
        cost: {
          total: 0.05,
          thisMonth: 0.05,
        },
      },
    };
  }

  return apiRequest<QuotaResponse['data']>('/api/quota');
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * File 转 Base64
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // 移除 data:xxx;base64, 前缀
      resolve(base64.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 创建 Mock Trace（用于开发环境）
 */
function createMockTrace(): GenerationTrace {
  return {
    modelId: 'gpt-4-mock',
    params: {
      temperature: 0.7,
      topP: 1.0,
    },
    promptIds: [],
    steps: [
      { id: 0, text: 'This', prob: 0.95, entropy: 0.2, dt: 50, topk: [] },
      { id: 1, text: ' is', prob: 0.92, entropy: 0.3, dt: 45, topk: [] },
      { id: 2, text: ' a', prob: 0.88, entropy: 0.5, dt: 48, topk: [] },
      { id: 3, text: ' mock', prob: 0.75, entropy: 1.2, dt: 52, topk: [] },
      { id: 4, text: ' response', prob: 0.70, entropy: 1.5, dt: 55, topk: [] },
      { id: 5, text: ' for', prob: 0.85, entropy: 0.7, dt: 47, topk: [] },
      { id: 6, text: ' testing', prob: 0.68, entropy: 1.8, dt: 60, topk: [] },
      { id: 7, text: '.', prob: 0.99, entropy: 0.1, dt: 40, topk: [] },
    ],
    device: 'webgpu' as const,
  };
}
