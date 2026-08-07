/**
 * RAG 来源追溯测试
 */

import { describe, it, expect } from 'vitest';
import { findClaimSource, findClaimSources, analyzeSourceTracing } from './sourceTracing';
import type { AtomicClaim } from './semanticConsistency';
import type { ParsedDocument } from './documents';

describe('sourceTracing', () => {
  const mockClaim: AtomicClaim = {
    id: 'claim-1',
    text: 'Transformer 模型使用了 8 个注意力头',
    startToken: 0,
    endToken: 10,
    category: 'fact',
    runId: 0,
  };

  const mockDocument: ParsedDocument = {
    name: 'paper.pdf',
    text: '本文介绍 Transformer 架构。该模型使用了 8 个注意力头（attention heads）来处理输入序列。',
    truncated: false,
    pages: [
      {
        pageNumber: 1,
        text: '本文介绍 Transformer 架构。',
        charStart: 0,
        charEnd: 19,
      },
      {
        pageNumber: 2,
        text: '该模型使用了 8 个注意力头（attention heads）来处理输入序列。',
        charStart: 20,
        charEnd: 57,
      },
    ],
    metadata: {
      totalPages: 2,
      totalChars: 57,
      parsedPages: 2,
    },
  };

  describe('findClaimSource', () => {
    it('应该找到相似度高的来源', async () => {
      const source = await findClaimSource(mockClaim, [mockDocument], {
        similarityThreshold: 0.5,
      });

      expect(source).not.toBeNull();
      if (source) {
        expect(source.docName).toBe('paper.pdf');
        expect(source.pageNumber).toBe(2);
        expect(source.similarity).toBeGreaterThan(0.5);
        expect(source.excerpt).toContain('8 个注意力头');
      }
    });

    it('没有文档时应返回 null', async () => {
      const source = await findClaimSource(mockClaim, []);
      expect(source).toBeNull();
    });

    it('相似度低于阈值时应返回 null', async () => {
      const unrelatedClaim: AtomicClaim = {
        ...mockClaim,
        text: '完全不相关的内容',
      };

      const source = await findClaimSource(unrelatedClaim, [mockDocument], {
        similarityThreshold: 0.9,
      });

      expect(source).toBeNull();
    });
  });

  describe('findClaimSources', () => {
    it('应该批量找到来源', async () => {
      const claims: AtomicClaim[] = [
        mockClaim,
        {
          id: 'claim-2',
          text: 'Transformer 架构',
          startToken: 0,
          endToken: 5,
          category: 'fact',
          runId: 0,
        },
      ];

      const results = await findClaimSources(claims, [mockDocument]);

      expect(results).toHaveLength(2);
      expect(results[0].source).not.toBeUndefined();
      expect(results[1].source).not.toBeUndefined();
    });

    it('应该调用进度回调', async () => {
      const progressCalls: Array<[number, number]> = [];

      await findClaimSources(
        [mockClaim],
        [mockDocument],
        {},
        (current, total) => {
          progressCalls.push([current, total]);
        }
      );

      expect(progressCalls).toHaveLength(1);
      expect(progressCalls[0]).toEqual([1, 1]);
    });
  });

  describe('analyzeSourceTracing', () => {
    it('应该正确统计来源追溯结果', () => {
      const claimsWithSource = [
        {
          ...mockClaim,
          source: {
            docName: 'paper.pdf',
            pageNumber: 2,
            excerpt: 'test',
            similarity: 0.9,
            charStart: 20,
            charEnd: 57,
          },
        },
        {
          id: 'claim-2',
          text: 'test',
          startToken: 0,
          endToken: 1,
          category: 'fact' as const,
          runId: 0,
        },
      ];

      const stats = analyzeSourceTracing(claimsWithSource);

      expect(stats.total).toBe(2);
      expect(stats.withSource).toBe(1);
      expect(stats.withoutSource).toBe(1);
      expect(stats.coverageRate).toBe(0.5);
      expect(stats.avgSimilarity).toBe(0.9);
      expect(stats.sourceDistribution['paper.pdf 第 2 页']).toBe(1);
    });

    it('空列表应返回零值', () => {
      const stats = analyzeSourceTracing([]);

      expect(stats.total).toBe(0);
      expect(stats.withSource).toBe(0);
      expect(stats.withoutSource).toBe(0);
      expect(stats.coverageRate).toBe(0);
      expect(stats.avgSimilarity).toBe(0);
      expect(Object.keys(stats.sourceDistribution)).toHaveLength(0);
    });
  });
});
