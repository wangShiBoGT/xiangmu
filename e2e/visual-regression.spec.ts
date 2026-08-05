import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { readFileSync, writeFileSync } from 'fs';

/**
 * 视觉回归测试
 *
 * 使用 Playwright 内置截图对比功能验证 UI 一致性
 */

// 辅助函数：等待所有动画完成
async function waitForAnimations(page: Page) {
  await page.evaluate(() => {
    return Promise.all(
      document.getAnimations().map((animation) => animation.finished)
    );
  });
}

// 辅助函数：隐藏动态内容（时间戳、随机 ID）
async function hideDynamicContent(page: Page) {
  await page.addStyleTag({
    content: `
      [data-testid="timestamp"],
      .timestamp,
      [class*="pulse"],
      [class*="animate"] {
        visibility: hidden !important;
      }
    `,
  });
}

test.describe('Landing Page Visual Regression', () => {
  test('should match landing page screenshot', async ({ page }) => {
    await page.goto('/');
    await waitForAnimations(page);

    // 全屏截图
    await expect(page).toHaveScreenshot('landing-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match landing page hero section', async ({ page }) => {
    await page.goto('/');
    await waitForAnimations(page);

    // 仅截取 hero 区域
    const hero = page.locator('main > div').first();
    await expect(hero).toHaveScreenshot('landing-hero.png', {
      animations: 'disabled',
    });
  });

  test('should match CTA button hover state', async ({ page }) => {
    await page.goto('/');

    const ctaButton = page.locator('button', { hasText: '开始对话' });
    await ctaButton.hover();
    await page.waitForTimeout(300);

    await expect(ctaButton).toHaveScreenshot('cta-button-hover.png');
  });
});

test.describe('Chat Interface Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: '开始对话' }).click();
    await page.waitForURL(/workspace|chat/);
    await waitForAnimations(page);
  });

  test('should match chat workspace layout', async ({ page }) => {
    await expect(page).toHaveScreenshot('chat-workspace.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match empty chat state', async ({ page }) => {
    // 清空会话
    await page.evaluate(() => {
      localStorage.setItem('webgpu-llm-chat.sessions.v1', JSON.stringify([]));
    });
    await page.reload();
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('chat-empty-state.png', {
      fullPage: true,
    });
  });

  test('should match chat input area', async ({ page }) => {
    const inputArea = page.locator('textarea').locator('..');
    await expect(inputArea).toHaveScreenshot('chat-input.png');
  });

  test('should match model selector dropdown', async ({ page }) => {
    const modelButton = page.locator('button:has-text("Phi"), button:has-text("Qwen")').first();

    if (await modelButton.isVisible()) {
      await modelButton.click();
      await page.waitForTimeout(300);

      const dropdown = page.locator('[role="menu"], [role="listbox"]');
      if (await dropdown.isVisible()) {
        await expect(dropdown).toHaveScreenshot('model-dropdown.png');
      }
    }
  });

  test('should match settings panel', async ({ page }) => {
    const settingsBtn = page.locator('button[aria-label*="设置"]').first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(500);

      const panel = page.locator('[role="dialog"]');
      if (await panel.isVisible()) {
        await expect(panel).toHaveScreenshot('settings-panel.png');
      }
    }
  });
});

test.describe('Observe Mode Visual Regression', () => {
  test('should match Observe page layout', async ({ page }) => {
    await page.goto('/#/observe');
    await waitForAnimations(page);

    await expect(page).toHaveScreenshot('observe-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match SamplingChamber with demo data', async ({ page }) => {
    await page.goto('/#/observe');

    const demoButton = page.locator('button:has-text("演示"), button:has-text("Demo")');
    if (await demoButton.isVisible()) {
      await demoButton.click();
      await page.waitForTimeout(3000); // 等待 3D 渲染

      await hideDynamicContent(page);

      // 截取可视化区域
      const chamber = page.locator('canvas').locator('..').locator('..');
      if (await chamber.isVisible()) {
        await expect(chamber).toHaveScreenshot('sampling-chamber.png', {
          animations: 'disabled',
        });
      }
    }
  });

  test('should match token probability bars', async ({ page }) => {
    await page.goto('/#/observe');

    const demoButton = page.locator('button:has-text("演示"), button:has-text("Demo")');
    if (await demoButton.isVisible()) {
      await demoButton.click();
      await page.waitForTimeout(2000);

      const probBars = page.locator('[class*="topk"]').first();
      if (await probBars.isVisible()) {
        await expect(probBars).toHaveScreenshot('probability-bars.png');
      }
    }
  });

  test('should match timeline controls', async ({ page }) => {
    await page.goto('/#/observe');

    const demoButton = page.locator('button:has-text("演示"), button:has-text("Demo")');
    if (await demoButton.isVisible()) {
      await demoButton.click();
      await page.waitForTimeout(2000);

      const controls = page.locator('button[aria-label*="上"], button[aria-label*="Previous"]').locator('..');
      if (await controls.isVisible()) {
        await expect(controls).toHaveScreenshot('timeline-controls.png');
      }
    }
  });
});

test.describe('Responsive Visual Regression', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 720 },
  ];

  for (const viewport of viewports) {
    test(`should match landing page on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await waitForAnimations(page);

      await expect(page).toHaveScreenshot(`landing-${viewport.name}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test(`should match chat workspace on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.locator('button', { hasText: '开始对话' }).click();
      await page.waitForURL(/workspace|chat/);
      await waitForAnimations(page);

      await expect(page).toHaveScreenshot(`chat-${viewport.name}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    });
  }
});

test.describe('Component Visual Regression', () => {
  test('should match message bubbles', async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: '开始对话' }).click();
    await page.waitForURL(/workspace|chat/);

    // 注入测试消息
    await page.evaluate(() => {
      const sessions = JSON.parse(localStorage.getItem('webgpu-llm-chat.sessions.v1') || '[]');
      if (sessions.length === 0) {
        sessions.push({
          id: 'test-session',
          createdAt: Date.now(),
          messages: [],
        });
      }
      sessions[0].messages = [
        { role: 'user', content: 'Hello, this is a test message!' },
        { role: 'assistant', content: 'Hi! This is an assistant response with multiple lines.\n\nIt includes paragraphs and formatting.' },
      ];
      localStorage.setItem('webgpu-llm-chat.sessions.v1', JSON.stringify(sessions));
    });

    await page.reload();
    await page.waitForTimeout(1000);

    const messages = page.locator('[class*="message"]');
    const count = await messages.count();

    if (count > 0) {
      // 截取第一条用户消息
      await expect(messages.nth(0)).toHaveScreenshot('message-user.png');

      if (count > 1) {
        // 截取第一条助手消息
        await expect(messages.nth(1)).toHaveScreenshot('message-assistant.png');
      }
    }
  });

  test('should match loading spinner', async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: '开始对话' }).click();
    await page.waitForURL(/workspace|chat/);

    // 模拟生成中状态
    await page.evaluate(() => {
      const spinner = document.createElement('div');
      spinner.className = 'animate-spin';
      spinner.textContent = '⏳';
      document.body.appendChild(spinner);
    });

    await page.waitForTimeout(300);

    const spinner = page.locator('.animate-spin').first();
    if (await spinner.isVisible()) {
      await expect(spinner).toHaveScreenshot('loading-spinner.png', {
        animations: 'disabled',
      });
    }
  });
});

test.describe('Dark Theme Visual Regression', () => {
  test('should match dark theme colors', async ({ page }) => {
    await page.goto('/');

    // 确保暗色主题生效
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    await waitForAnimations(page);

    await expect(page).toHaveScreenshot('dark-theme-landing.png', {
      fullPage: true,
    });
  });

  test('should match code blocks in dark theme', async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: '开始对话' }).click();
    await page.waitForURL(/workspace|chat/);

    // 注入代码块消息
    await page.evaluate(() => {
      const sessions = JSON.parse(localStorage.getItem('webgpu-llm-chat.sessions.v1') || '[]');
      if (sessions.length === 0) {
        sessions.push({ id: 'test', createdAt: Date.now(), messages: [] });
      }
      sessions[0].messages = [
        { role: 'assistant', content: '```javascript\nfunction hello() {\n  console.log("Hello, world!");\n}\n```' },
      ];
      localStorage.setItem('webgpu-llm-chat.sessions.v1', JSON.stringify(sessions));
    });

    await page.reload();
    await page.waitForTimeout(1000);

    const codeBlock = page.locator('pre, code').first();
    if (await codeBlock.isVisible()) {
      await expect(codeBlock).toHaveScreenshot('code-block-dark.png');
    }
  });
});

test.describe('Accessibility Visual Regression', () => {
  test('should match high contrast mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });
    await page.goto('/');
    await waitForAnimations(page);

    await expect(page).toHaveScreenshot('high-contrast.png', {
      fullPage: true,
    });
  });

  test('should match focus states', async ({ page }) => {
    await page.goto('/');

    const ctaButton = page.locator('button', { hasText: '开始对话' });
    await ctaButton.focus();
    await page.waitForTimeout(200);

    await expect(ctaButton).toHaveScreenshot('button-focus.png');
  });
});
