/**
 * API 代理服务 - 调用 OpenAI/Anthropic API
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type { GenerationTrace, TokenStep, ProxyRequest } from '../types';

/**
 * OpenAI API 代理
 */
export async function proxyOpenAI(req: ProxyRequest): Promise<{
  trace: GenerationTrace;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  cost: { input: number; output: number; total: number };
}> {
  const client = new OpenAI({ apiKey: req.apiKey });

  try {
    const response = await client.chat.completions.create({
      model: req.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 1000,
      logprobs: true,
      top_logprobs: 5
    });

    const choice = response.choices[0];
    if (!choice || !choice.logprobs) {
      throw new Error('No logprobs returned from OpenAI');
    }

    // 转换为 .aitrace 格式
    const steps: TokenStep[] = choice.logprobs.content.map((logprob, idx) => ({
      id: logprob.token ? logprob.token.charCodeAt(0) : idx,
      text: logprob.token || '',
      prob: Math.exp(logprob.logprob),
      entropy: calculateEntropy([logprob, ...(logprob.top_logprobs || [])]),
      dt: 50, // 估算值
      topk: (logprob.top_logprobs || []).map(top => ({
        id: top.token ? top.token.charCodeAt(0) : 0,
        text: top.token || '',
        prob: Math.exp(top.logprob)
      }))
    }));

    const trace: GenerationTrace = {
      modelId: req.model,
      params: {
        temperature: req.temperature ?? 0.7,
        topP: 1.0,
        seed: null
      },
      promptIds: [],
      steps,
      device: 'webgpu' as const
    };

    // 计算成本（GPT-4 定价）
    const inputCost = (response.usage?.prompt_tokens || 0) * 0.00003;
    const outputCost = (response.usage?.completion_tokens || 0) * 0.00006;

    return {
      trace,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      },
      cost: {
        input: inputCost,
        output: outputCost,
        total: inputCost + outputCost
      }
    };
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Anthropic API 代理
 */
export async function proxyAnthropic(req: ProxyRequest): Promise<{
  trace: GenerationTrace;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  cost: { input: number; output: number; total: number };
}> {
  const client = new Anthropic({ apiKey: req.apiKey });

  try {
    // Anthropic 不直接支持 logprobs，需要使用其他方法获取概率
    const response = await client.messages.create({
      model: req.model,
      max_tokens: req.maxTokens ?? 1000,
      temperature: req.temperature ?? 0.7,
      messages: req.messages
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // 简化：将文本拆分为 token（实际需要使用 tokenizer）
    const tokens = text.split(/(\s+)/).filter(t => t.length > 0);

    const steps: TokenStep[] = tokens.map((token, idx) => ({
      id: idx,
      text: token,
      prob: 0.8, // Anthropic 不提供 logprobs，使用估算值
      entropy: 0.5,
      dt: 50,
      topk: []
    }));

    const trace: GenerationTrace = {
      modelId: req.model,
      params: {
        temperature: req.temperature ?? 0.7,
        topP: 1.0,
        seed: null
      },
      promptIds: [],
      steps,
      device: 'webgpu' as const
    };

    // 计算成本（Claude 3.5 Sonnet 定价）
    const inputCost = response.usage.input_tokens * 0.000003;
    const outputCost = response.usage.output_tokens * 0.000015;

    return {
      trace,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens
      },
      cost: {
        input: inputCost,
        output: outputCost,
        total: inputCost + outputCost
      }
    };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new Error(`Anthropic API error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * 根据 provider 选择代理
 */
export async function proxyGeneration(req: ProxyRequest) {
  switch (req.provider) {
    case 'openai':
      return proxyOpenAI(req);
    case 'anthropic':
      return proxyAnthropic(req);
    case 'gemini':
      throw new Error('Gemini provider not yet implemented');
    default:
      throw new Error(`Unknown provider: ${req.provider}`);
  }
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 计算熵（从 logprobs）
 */
function calculateEntropy(logprobs: Array<{ logprob: number }>): number {
  const probs = logprobs.map(lp => Math.exp(lp.logprob));
  const sum = probs.reduce((a, b) => a + b, 0);
  const normalized = probs.map(p => p / sum);

  let entropy = 0;
  for (const p of normalized) {
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }

  return entropy;
}
