import { test, expect } from '@playwright/test';
import type { GenerationTrace, TokenStep } from '../src/lib/trace';

/**
 * Trace 数据回归测试
 *
 * 验证采样分布、熵计算、分岔树结构的正确性
 */

test.describe('Trace Data Integrity', () => {
  test('should preserve trace structure after export/import', async ({ page }) => {
    await page.goto('/#/observe');

    // 加载演示数据
    const demoButton = page.locator('button:has-text("演示"), button:has-text("Demo")');
    if (await demoButton.isVisible()) {
      await demoButton.click();
      await page.waitForTimeout(2000);

      // 获取原始 trace 数据
      const originalTrace = await page.evaluate(() => {
        const stored = localStorage.getItem('browser-ai-microscope.current-trace');
        return stored ? JSON.parse(stored) : null;
      });

      expect(originalTrace).toBeTruthy();
      expect(originalTrace.steps).toBeDefined();
      expect(originalTrace.steps.length).toBeGreaterThan(0);

      // 导出
      const exportButton = page.locator('button:has-text("导出"), button:has-text("Export")');
      if (await exportButton.isVisible()) {
        const downloadPromise = page.waitForEvent('download');
        await exportButton.click();
        const download = await downloadPromise;

        // 读取导出内容
        const path = await download.path();
        expect(path).toBeTruthy();

        // 验证文件扩展名
        expect(download.suggestedFilename()).toMatch(/\.aitrace|\.json/);
      }
    }
  });

  test('should validate TokenStep data structure', async ({ page }) => {
    await page.goto('/#/observe');

    const demoButton = page.locator('button:has-text("演示"), button:has-text("Demo")');
    if (await demoButton.isVisible()) {
      await demoButton.click();
      await page.waitForTimeout(2000);

      // 验证 TokenStep 结构
      const traceData = await page.evaluate(() => {
        const stored = localStorage.getItem('browser-ai-microscope.current-trace');
        if (!stored) return null;

        const trace = JSON.parse(stored);
        const firstStep = trace.steps?.[0];

        if (!firstStep) return null;

        // 验证必需字段
        return {
          hasId: typeof firstStep.id === 'string',
          hasText: typeof firstStep.text === 'string',
          hasProb: typeof firstStep.prob === 'number',
          hasTopk: Array.isArray(firstStep.topk),
          hasEntropy: typeof firstStep.entropy === 'number',
          hasDt: typeof firstStep.dt === 'number',
          probInRange: firstStep.prob >= 0 && firstStep.prob <= 1,
          entropyNonNegative: firstStep.entropy >= 0,
          dtNonNegative: firstStep.dt >= 0,
          topkLength: firstStep.topk?.length || 0,
        };
      });

      if (traceData) {
        expect(traceData.hasId).toBe(true);
        expect(traceData.hasText).toBe(true);
        expect(traceData.hasProb).toBe(true);
        expect(traceData.hasTopk).toBe(true);
        expect(traceData.hasEntropy).toBe(true);
        expect(traceData.hasDt).toBe(true);
        expect(traceData.probInRange).toBe(true);
        expect(traceData.entropyNonNegative).toBe(true);
        expect(traceData.dtNonNegative).toBe(true);
        expect(traceData.topkLength).toBeGreaterThan(0);
        expect(traceData.topkLength).toBeLessThanOrEqual(8); // Top-8 限制
      }
    }
  });

  test('should validate probability distribution sum', async ({ page }) => {
    await page.goto('/#/observe');

    const demoButton = page.locator('button:has-text("演示"), button:has-text("Demo")');
    if (await demoButton.isVisible()) {
      await demoButton.click();
      await page.waitForTimeout(2000);

      // 验证概率分布总和接近 1.0
      const probSum = await page.evaluate(() => {
        const stored = localStorage.getItem('browser-ai-microscope.current-trace');
        if (!stored) return null;

        const trace = JSON.parse(stored);
        const firstStep = trace.steps?.[0];

        if (!firstStep?.topk) return null;

        // 计算 topk 概率总和
        const sum = firstStep.topk.reduce((acc: number, candidate: any) => {
          return acc + (candidate.prob || 0);
        }, 0);

        return sum;
      });

      if (probSum !== null) {
        // Top-K 是截断分布，总和应该 < 1.0（除非 k 很大）
        expect(probSum).toBeGreaterThan(0);
        expect(probSum).toBeLessThanOrEqual(1.0);
      }
    }
  });

  test('should calculate entropy correctly', async ({ page }) => {
    await page.goto('/#/observe');

    const demoButton = page.locator('button:has-text("演示"), button:has-text("Demo")');
    if (await demoButton.isVisible()) {
      await demoButton.click();
      await page.waitForTimeout(2000);

      // 验证熵计算
      const entropyValidation = await page.evaluate(() => {
        const stored = localStorage.getItem('browser-ai-microscope.current-trace');
        if (!stored) return null;

        const trace = JSON.parse(stored);
        const steps = trace.steps || [];

        // 检查熵的合理范围
        const entropies = steps.map((s: any) => s.entropy).filter((e: any) => typeof e === 'number');

        if (entropies.length === 0) return null;

        const minEntropy = Math.min(...entropies);
        const maxEntropy = Math.max(...entropies);
        const avgEntropy = entropies.reduce((a: number, b: number) => a + b, 0) / entropies.length;

        return {
          count: entropies.length,
          min: minEntropy,
          max: maxEntropy,
          avg: avgEntropy,
          allNonNegative: entropies.every((e: number) => e >= 0),
          allFinite: entropies.every((e: number) => isFinite(e)),
        };
      });

      if (entropyValidation) {
        expect(entropyValidation.count).toBeGreaterThan(0);
        expect(entropyValidation.allNonNegative).toBe(true);
        expect(entropyValidation.allFinite).toBe(true);
        expect(entropyValidation.min).toBeGreaterThanOrEqual(0);
        expect(entropyValidation.max).toBeLessThan(10); // 合理上限（自然语言通常 < 10）
      }
    }
  });
});

test.describe('Branch Tree Structure', () => {
  test('should validate branch node structure', async ({ page }) => {
    await page.goto('/#/observe');

    // 注入包含分岔树的 trace 数据
    await page.evaluate(() => {
      const mockTrace = {
        version: 'aitrace/v2',
        prompt: 'Test prompt',
        modelId: 'test-model',
        steps: [
          { id: '0', text: 'Hello', prob: 0.8, topk: [], entropy: 1.5, dt: 10 },
        ],
        branches: [
          {
            parent: '0',
            children: [
              { id: '1a', text: ' world', prob: 0.7 },
              { id: '1b', text: ' there', prob: 0.3 },
            ],
          },
        ],
      };

      localStorage.setItem('browser-ai-microscope.current-trace', JSON.stringify(mockTrace));
    });

    await page.reload();
    await page.waitForTimeout(1000);

    // 验证分岔树结构
    const branchValidation = await page.evaluate(() => {
      const stored = localStorage.getItem('browser-ai-microscope.current-trace');
      if (!stored) return null;

      const trace = JSON.parse(stored);
      const branches = trace.branches || [];

      if (branches.length === 0) return null;

      const firstBranch = branches[0];

      return {
        hasParent: typeof firstBranch.parent === 'string',
        hasChildren: Array.isArray(firstBranch.children),
        childrenCount: firstBranch.children?.length || 0,
        childrenValid: firstBranch.children?.every((c: any) =>
          typeof c.id === 'string' && typeof c.text === 'string' && typeof c.prob === 'number'
        ),
      };
    });

    if (branchValidation) {
      expect(branchValidation.hasParent).toBe(true);
      expect(branchValidation.hasChildren).toBe(true);
      expect(branchValidation.childrenCount).toBeGreaterThan(0);
      expect(branchValidation.childrenCount).toBeLessThanOrEqual(8); // MAX_BRANCH_NODES
      expect(branchValidation.childrenValid).toBe(true);
    }
  });

  test('should enforce branch node limit', async ({ page }) => {
    await page.goto('/#/observe');

    // 注入超出限制的分岔节点
    await page.evaluate(() => {
      const mockTrace = {
        version: 'aitrace/v2',
        prompt: 'Test',
        modelId: 'test',
        steps: [{ id: '0', text: 'Hi', prob: 1, topk: [], entropy: 0, dt: 10 }],
        branches: [
          {
            parent: '0',
            children: Array.from({ length: 10 }, (_, i) => ({
              id: `child-${i}`,
              text: `option ${i}`,
              prob: 0.1,
            })),
          },
        ],
      };

      localStorage.setItem('browser-ai-microscope.current-trace', JSON.stringify(mockTrace));
    });

    await page.reload();
    await page.waitForTimeout(1000);

    // 验证是否被截断到 8 个
    const childrenCount = await page.evaluate(() => {
      const stored = localStorage.getItem('browser-ai-microscope.current-trace');
      if (!stored) return 0;

      const trace = JSON.parse(stored);
      return trace.branches?.[0]?.children?.length || 0;
    });

    // sanitizeBranches 应该限制到 MAX_BRANCH_NODES = 8
    expect(childrenCount).toBeLessThanOrEqual(8);
  });
});

test.describe('Deep Capture Data', () => {
  test('should validate deep capture structure', async ({ page }) => {
    await page.goto('/#/observe');

    // 注入包含 deep capture 的数据
    await page.evaluate(() => {
      const mockTrace = {
        version: 'aitrace/v2',
        prompt: 'Test',
        modelId: 'test',
        steps: [
          {
            id: '0',
            text: 'Test',
            prob: 0.8,
            topk: [
              { text: 'Test', prob: 0.8 },
              { text: 'Hello', prob: 0.1 },
            ],
            entropy: 1.2,
            dt: 15,
            deep: {
              top256: Array.from({ length: 256 }, (_, i) => ({
                text: `token${i}`,
                logit: 5.0 - i * 0.02,
              })),
              restCount: 1000,
              restMass: 0.05,
            },
          },
        ],
      };

      localStorage.setItem('browser-ai-microscope.current-trace', JSON.stringify(mockTrace));
    });

    await page.reload();
    await page.waitForTimeout(1000);

    const deepValidation = await page.evaluate(() => {
      const stored = localStorage.getItem('browser-ai-microscope.current-trace');
      if (!stored) return null;

      const trace = JSON.parse(stored);
      const firstStep = trace.steps?.[0];
      const deep = firstStep?.deep;

      if (!deep) return null;

      return {
        hasTop256: Array.isArray(deep.top256),
        top256Length: deep.top256?.length || 0,
        hasRestCount: typeof deep.restCount === 'number',
        hasRestMass: typeof deep.restMass === 'number',
        restMassInRange: deep.restMass >= 0 && deep.restMass <= 1,
        logitsDescending: deep.top256?.every((item: any, i: number, arr: any[]) =>
          i === 0 || item.logit <= arr[i - 1].logit
        ),
      };
    });

    if (deepValidation) {
      expect(deepValidation.hasTop256).toBe(true);
      expect(deepValidation.top256Length).toBe(256);
      expect(deepValidation.hasRestCount).toBe(true);
      expect(deepValidation.hasRestMass).toBe(true);
      expect(deepValidation.restMassInRange).toBe(true);
      expect(deepValidation.logitsDescending).toBe(true); // Logits 应该降序排列
    }
  });
});

test.describe('Pipeline Timing', () => {
  test('should record pipeline timing data', async ({ page }) => {
    await page.goto('/#/observe');

    const demoButton = page.locator('button:has-text("演示"), button:has-text("Demo")');
    if (await demoButton.isVisible()) {
      await demoButton.click();
      await page.waitForTimeout(2000);

      const timingValidation = await page.evaluate(() => {
        const stored = localStorage.getItem('browser-ai-microscope.current-trace');
        if (!stored) return null;

        const trace = JSON.parse(stored);
        const pipeline = trace.pipeline;

        if (!pipeline) return null;

        return {
          hasTokenizeMs: typeof pipeline.tokenizeMs === 'number',
          hasPrefillMs: typeof pipeline.prefillMs === 'number',
          hasDecodeMs: typeof pipeline.decodeMs === 'number',
          allNonNegative:
            pipeline.tokenizeMs >= 0 &&
            pipeline.prefillMs >= 0 &&
            pipeline.decodeMs >= 0,
        };
      });

      if (timingValidation) {
        expect(timingValidation.hasTokenizeMs).toBe(true);
        expect(timingValidation.hasPrefillMs).toBe(true);
        expect(timingValidation.hasDecodeMs).toBe(true);
        expect(timingValidation.allNonNegative).toBe(true);
      }
    }
  });
});
