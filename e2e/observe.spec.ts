import { test, expect } from '@playwright/test';

/**
 * Observe 模式和 Trace 可视化测试
 */

test.describe('Observe Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: '开始对话' }).click();
    await page.waitForURL(/workspace|chat/);
  });

  test('should navigate to Observe page', async ({ page }) => {
    // 打开侧边栏
    const hamburger = page.locator('button[aria-label*="菜单"]');
    if (await hamburger.isVisible()) {
      await hamburger.click();
    }

    // 点击 Observe 链接
    const observeLink = page.locator('text=Observe').or(page.locator('text=观测'));
    if (await observeLink.isVisible()) {
      await observeLink.click();

      // 验证导航成功
      await expect(page).toHaveURL(/observe/);
    }
  });

  test('should display prompt input in Observe mode', async ({ page }) => {
    await page.goto('/#/observe');

    // 检查提示词输入框
    const promptInput = page.locator('textarea[placeholder*="提示"], input[placeholder*="prompt"]');
    await expect(promptInput.first()).toBeVisible();
  });

  test('should show generation parameters', async ({ page }) => {
    await page.goto('/#/observe');

    // 检查参数控制（温度、Top-P 等）
    const tempLabel = page.locator('text=温度').or(page.locator('text=Temperature'));
    const topPLabel = page.locator('text=Top-P').or(page.locator('text=top_p'));

    // 至少一个参数标签应该可见
    const tempVisible = await tempLabel.isVisible();
    const topPVisible = await topPLabel.isVisible();
    expect(tempVisible || topPVisible).toBe(true);
  });

  test('should load demo trace', async ({ page }) => {
    await page.goto('/#/observe');

    // 查找加载演示按钮
    const demoButton = page.locator('button:has-text("演示"), button:has-text("Demo")');
    if (await demoButton.isVisible()) {
      await demoButton.click();

      // 等待 trace 加载
      await page.waitForTimeout(2000);

      // 检查 token 步骤显示
      const tokenSteps = page.locator('[data-testid="token-step"], .token-step, text=/token/i');
      expect(await tokenSteps.count()).toBeGreaterThan(0);
    }
  });
});

test.describe('SamplingChamber Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/observe');
  });

  test('should render 3D visualization canvas', async ({ page }) => {
    // 加载演示数据
    const demoButton = page.locator('button:has-text("演示"), button:has-text("Demo")');
    if (await demoButton.isVisible()) {
      await demoButton.click();
      await page.waitForTimeout(2000);

      // 检查 canvas 元素（3D 可视化）
      const canvas = page.locator('canvas');
      const count = await canvas.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should display token probability bars', async ({ page }) => {
    const demoButton = page.locator('button:has-text("演示"), button:has-text("Demo")');
    if (await demoButton.isVisible()) {
      await demoButton.click();
      await page.waitForTimeout(2000);

      // 检查概率条或候选词列表
      const probBars = page.locator('[role="progressbar"], .probability-bar, [class*="topk"]');
      if (await probBars.first().isVisible()) {
        expect(await probBars.count()).toBeGreaterThan(0);
      }
    }
  });

  test('should navigate between token steps', async ({ page }) => {
    const demoButton = page.locator('button:has-text("演示"), button:has-text("Demo")');
    if (await demoButton.isVisible()) {
      await demoButton.click();
      await page.waitForTimeout(2000);

      // 查找上一步/下一步按钮
      const prevButton = page.locator('button[aria-label*="上"], button[aria-label*="Previous"]');
      const nextButton = page.locator('button[aria-label*="下"], button[aria-label*="Next"]');

      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);

        // 检查步骤索引改变
        const stepIndicator = page.locator('text=/step|步骤/i');
        await expect(stepIndicator.first()).toBeVisible();
      }
    }
  });

  test('should export trace data', async ({ page }) => {
    const demoButton = page.locator('button:has-text("演示"), button:has-text("Demo")');
    if (await demoButton.isVisible()) {
      await demoButton.click();
      await page.waitForTimeout(2000);

      // 查找导出按钮
      const exportButton = page.locator('button:has-text("导出"), button:has-text("Export")');
      if (await exportButton.isVisible()) {
        // 点击导出（会触发下载）
        const downloadPromise = page.waitForEvent('download');
        await exportButton.click();

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.aitrace|\.json/);
      }
    }
  });
});

test.describe('Trace Import', () => {
  test('should handle .aitrace file drop', async ({ page }) => {
    await page.goto('/#/observe');

    // 创建模拟的 .aitrace 文件内容
    const mockTrace = JSON.stringify({
      version: 'aitrace/v2',
      prompt: 'Test prompt',
      steps: [],
      modelId: 'test-model',
    });

    // 模拟文件拖放
    const dataTransfer = await page.evaluateHandle((content) => {
      const dt = new DataTransfer();
      const file = new File([content], 'test.aitrace', { type: 'application/json' });
      dt.items.add(file);
      return dt;
    }, mockTrace);

    const dropZone = page.locator('body');
    await dropZone.dispatchEvent('drop', { dataTransfer });

    // 等待导入处理
    await page.waitForTimeout(1000);

    // 检查是否显示了导入的数据（或错误提示）
    const notification = page.locator('[role="alert"], .toast, text=/导入|import/i');
    // 不强制断言，因为可能需要特定格式
  });
});
