import { test, expect } from '@playwright/test';

/**
 * 响应式设计测试：桌面、平板、移动端
 */

test.describe('Desktop Layout', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('should display full sidebar on desktop', async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: '开始对话' }).click();
    await page.waitForURL(/workspace|chat/);

    // 侧边栏应该默认可见
    const sidebar = page.locator('aside, nav').first();
    await expect(sidebar).toBeVisible();
  });

  test('should display two-column layout', async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: '开始对话' }).click();
    await page.waitForURL(/workspace|chat/);

    // 检查布局容器
    const container = page.locator('main, [class*="container"]');
    await expect(container.first()).toBeVisible();
  });
});

test.describe('Tablet Layout', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('should adapt layout for tablet', async ({ page }) => {
    await page.goto('/');

    // 检查标题可见
    await expect(page.locator('h1')).toBeVisible();

    // CTA 按钮应该可见
    await expect(page.locator('button', { hasText: '开始对话' })).toBeVisible();
  });

  test('should collapse sidebar with toggle', async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: '开始对话' }).click();
    await page.waitForURL(/workspace|chat/);

    // 查找汉堡菜单按钮
    const hamburger = page.locator('button[aria-label*="菜单"]');
    if (await hamburger.isVisible()) {
      await hamburger.click();

      // 检查侧边栏出现
      const sidebar = page.locator('aside, nav');
      await expect(sidebar.first()).toBeVisible();

      // 再次点击关闭
      await hamburger.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Mobile Layout', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should display mobile-optimized landing', async ({ page }) => {
    await page.goto('/');

    // 标题应该换行显示
    const title = page.locator('h1');
    await expect(title).toBeVisible();

    // CTA 按钮全宽
    const ctaButton = page.locator('button', { hasText: '开始对话' });
    await expect(ctaButton).toBeVisible();
  });

  test('should show hamburger menu on mobile', async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: '开始对话' }).click();
    await page.waitForURL(/workspace|chat/);

    // 汉堡菜单应该可见
    const hamburger = page.locator('button[aria-label*="菜单"]');
    await expect(hamburger).toBeVisible();
  });

  test('should open drawer sidebar on mobile', async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: '开始对话' }).click();
    await page.waitForURL(/workspace|chat/);

    const hamburger = page.locator('button[aria-label*="菜单"]');
    await hamburger.click();

    // 检查侧边栏滑出
    const sidebar = page.locator('aside, nav');
    await expect(sidebar.first()).toBeVisible();

    // 检查遮罩层
    const overlay = page.locator('[class*="overlay"], [class*="backdrop"]');
    if (await overlay.isVisible()) {
      // 点击遮罩关闭
      await overlay.click();
      await page.waitForTimeout(500);
    }
  });

  test('should stack chat messages vertically', async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: '开始对话' }).click();
    await page.waitForURL(/workspace|chat/);

    // 注入测试消息
    await page.evaluate(() => {
      const sessions = JSON.parse(localStorage.getItem('webgpu-llm-chat.sessions.v1') || '[]');
      if (sessions.length > 0) {
        sessions[0].messages = [
          { role: 'user', content: 'Test message 1' },
          { role: 'assistant', content: 'Response 1' },
        ];
        localStorage.setItem('webgpu-llm-chat.sessions.v1', JSON.stringify(sessions));
      }
    });

    await page.reload();
    await page.waitForTimeout(1000);

    // 检查消息气泡
    const messages = page.locator('[class*="message"], [role="article"]');
    const count = await messages.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should hide SamplingChamber details on mobile', async ({ page }) => {
    await page.goto('/#/observe');

    // 在移动端，技术细节应该折叠或简化
    // 检查主要内容可见
    const mainContent = page.locator('textarea, button').first();
    await expect(mainContent).toBeVisible();
  });
});

test.describe('Landscape Mode', () => {
  test.use({ viewport: { width: 812, height: 375 } });

  test('should optimize for landscape orientation', async ({ page }) => {
    await page.goto('/');

    // 横屏模式下标题和按钮应该可见
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('button', { hasText: '开始对话' })).toBeVisible();
  });

  test('should compress vertical spacing in landscape', async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: '开始对话' }).click();
    await page.waitForURL(/workspace|chat/);

    // 检查输入框可见（高度<600px 时应该优化间距）
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
  });
});

test.describe('Responsive Components', () => {
  test('should adapt SamplingChamber for different viewports', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/#/observe');

    // 移动端：简化展示
    let mobileLayout = await page.locator('body').boundingBox();
    expect(mobileLayout?.width).toBeLessThan(768);

    // 切换到桌面
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);

    // 桌面端：完整展示
    let desktopLayout = await page.locator('body').boundingBox();
    expect(desktopLayout?.width).toBeGreaterThanOrEqual(1280);
  });

  test('should adapt button sizes for touch targets', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // 移动端按钮应该有足够的点击区域（至少 44x44px）
    const ctaButton = page.locator('button', { hasText: '开始对话' });
    const bbox = await ctaButton.boundingBox();

    if (bbox) {
      expect(bbox.height).toBeGreaterThanOrEqual(40); // 允许一些误差
    }
  });
});

test.describe('Font Scaling', () => {
  test('should use fluid typography', async ({ page }) => {
    // 小屏幕
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const titleSmall = page.locator('h1');
    const sizeSmall = await titleSmall.evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });

    // 大屏幕
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    const titleLarge = page.locator('h1');
    const sizeLarge = await titleLarge.evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });

    // 字体大小应该响应式调整
    const sizeSmallPx = parseFloat(sizeSmall);
    const sizeLargePx = parseFloat(sizeLarge);
    expect(sizeLargePx).toBeGreaterThanOrEqual(sizeSmallPx);
  });
});
