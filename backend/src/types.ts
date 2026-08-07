/**
 * 类型定义 - 与前端保持一致
 */

// ============================================================================
// GenerationTrace (.aitrace 格式)
// ============================================================================

export interface TokenStep {
  id: number;
  text: string;
  prob: number;
  topk: TokenCandidate[];
  entropy: number;
  dt: number;
}

export interface TokenCandidate {
  id: number;
  text: string;
  prob: number;
}

export interface GenerationTrace {
  modelId: string;
  params: {
    temperature: number;
    topP: number;
    seed?: number | null;
  };
  promptIds: number[];
  steps: TokenStep[];
  device: "webgpu" | "wasm";
  pipeline?: {
    tokenizeMs: number;
    prefillMs: number;
    decodeMs: number;
  };
}

// ============================================================================
// 文档相关
// ============================================================================

export interface DocumentPage {
  pageNumber: number;
  text: string;
  charStart: number;
  charEnd: number;
}

export interface ParsedDocument {
  name: string;
  text: string;
  truncated: boolean;
  pages: DocumentPage[];
  metadata: {
    totalPages: number;
    totalChars: number;
    parsedPages: number;
  };
}

// ============================================================================
// 主张相关
// ============================================================================

export interface AtomicClaim {
  id: string;
  text: string;
  startToken: number;
  endToken: number;
  category: "fact" | "opinion" | "citation" | "number" | "date";
  runId: number;
  source?: {
    docName: string;
    pageNumber: number;
    excerpt: string;
    similarity: number;
    charStart: number;
    charEnd: number;
  };
}

// ============================================================================
// 审计相关
// ============================================================================

export type AnomalySeverity = "low" | "medium" | "high";

export interface Anomaly {
  type: string;
  tokenIndex: number;
  entropy?: number;
  threshold?: number;
  severity: AnomalySeverity;
  explanation: string;
}

export interface UsabilityAudit {
  modelId: string;
  totalTokens: number;
  entropyAnomalies: Anomaly[];
  timeSeriesAnomalies: Anomaly[];
  factualRiskMarkers: Anomaly[];
  overallSeverity: AnomalySeverity;
  summary: string;
}

export interface ClaimCluster {
  representative: AtomicClaim;
  members: Array<{
    claim: AtomicClaim;
    similarity: number;
  }>;
  runIds: Set<number>;
  consistencyRate: number;
}

export interface SemanticConsistencyResult {
  runs: number;
  totalClaims: number;
  consistentClaims: number;
  inconsistentClaims: number;
  consistencyRate: number;
  clusters: ClaimCluster[];
  severity: AnomalySeverity;
  explanation: string;
}

// ============================================================================
// API 请求/响应
// ============================================================================

// 1. API 代理
export interface ProxyRequest {
  provider: 'openai' | 'anthropic' | 'gemini';
  apiKey: string;
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  enableLogprobs: boolean;
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
      input: number;
      output: number;
      total: number;
    };
  };
}

// 2. 文档解析
export interface ParseDocumentRequest {
  file: string;
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

// 3. 审计分析
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

export interface AuditResponse {
  success: true;
  data: {
    audit: UsabilityAudit;
    claims: AtomicClaim[];
    semanticConsistency: SemanticConsistencyResult;
    cost: {
      claimExtraction: number;
      embedding: number;
      total: number;
    };
  };
}

// 4. 配额查询
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
    code: 'INVALID_API_KEY' | 'RATE_LIMIT' | 'PROVIDER_ERROR' | 'INTERNAL_ERROR' | 'NETWORK_ERROR' | 'INVALID_SIGNATURE' | 'EXPIRED';
    message: string;
    details?: any;
  };
}

// ============================================================================
// Cloudflare 环境
// ============================================================================

export interface Env {
  CACHE: KVNamespace;
  DB: D1Database;
  ENCRYPTION_SECRET: string;
  HMAC_SECRET: string;
  EMBEDDING_MODEL: string;
}
