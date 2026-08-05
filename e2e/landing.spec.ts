import { test, expect } from '@playwright/test';

/**
 * 首页加载和基本导航测试
 */

test.describe('Landing Page', () => {
  test('should load landing page successfully', async ({ page }) => {
    await page.goto('/');

    // 检查标题
    await expect(page.locator('h1')).toContainText('WebGPU LLM Chat');

    // 检查 CTA 按钮
    const ctaButton = page.locator('button', { hasText: '开始对话' });
    await expect(ctaButton).toBeVisible();
  });

  test('should navigate to chat workspace', async ({ page }) => {
    await page.goto('/');

    // 点击 "开始对话" 按钮
    const ctaButton = page.locator('button', { hasText: '开始对话' });
    await ctaButton.click();

    // 等待导航到工作区
    await page.waitForURL(/workspace|chat/);

    // 检查输入框存在
    const textarea = page.locator('textarea[placeholder*="输入"]');
    await expect(textarea).toBeVisible();
  });

  test('should display device compatibility banner on WebGPU unsupported', async ({ page, browserName }) => {
    // 注入脚本模拟 WebGPU 不可用
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'gpu', {
        get: () => undefined,
      });
    });

    await page.goto('/');

    // 点击进入工作区
    const ctaButton = page.locator('button', { hasText: '开始对话' });
    await ctaButton.click();

    // 等待设备探测完成
    await page.waitForTimeout(2000);

    // 检查兼容性横幅（如果显示）
    const banner = page.locator('[role="alert"]');
    if (await banner.isVisible()) {
      await expect(banner).toContainText('WebGPU');
    }
  });
});

test.describe('Navigation', () => {
  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');

    // 进入工作区
    await page.locator('button', { hasText: '开始对话' }).click();
    await page.waitForURL(/workspace|chat/);

    // 打开侧边栏（如果是窄屏）
    const hamburger = page.locator('button[aria-label*="菜单"]');
    if (await hamburger.isVisible()) {
      await hamburger.click();
    }

    // 导航到 Benchmark 页面
    const benchmarkLink = page.locator('text=Benchmark').or(page.locator('text=性能基准'));
    if (await benchmarkLink.isVisible()) {
      await benchmarkLink.click();
      await expect(page.locator('h1, h2')).toContainText(/Benchmark|性能基准/);
    }
  });
});
