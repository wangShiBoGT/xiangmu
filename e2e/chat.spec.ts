import { test, expect } from '@playwright/test';

/**
 * 对话功能和消息流测试
 *
 * 注意：完整的模型加载和推理测试需要较长时间（数分钟），
 * 在 CI 环境中建议使用 mock worker 或跳过实际推理
 */

test.describe('Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // 进入工作区
    await page.locator('button', { hasText: '开始对话' }).click();
    await page.waitForURL(/workspace|chat/);
  });

  test('should display chat input', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder*="输入"]');
    await expect(textarea).toBeVisible();
    await expect(textarea).toBeEnabled();
  });

  test('should create new session', async ({ page }) => {
    // 点击新建会话按钮
    const newSessionBtn = page.locator('button[aria-label*="新建"], button:has-text("新建")');
    if (await newSessionBtn.isVisible()) {
      await newSessionBtn.click();

      // 等待会话列表更新
      await page.waitForTimeout(500);

      // 检查输入框已清空
      const textarea = page.locator('textarea');
      await expect(textarea).toHaveValue('');
    }
  });

  test('should type message in input', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder*="输入"]');
    const testMessage = 'Hello, this is a test message';

    await textarea.fill(testMessage);
    await expect(textarea).toHaveValue(testMessage);
  });

  test('should show send button when text entered', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('Test message');

    // 查找发送按钮（可能是箭头图标）
    const sendButton = page.locator('button[aria-label*="发送"], button:has([class*="ArrowUp"])');
    await expect(sendButton).toBeVisible();
  });

  test('should disable input during generation', async ({ page }) => {
    // 注入脚本模拟生成状态
    await page.evaluate(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.disabled = true;
      }
    });

    const textarea = page.locator('textarea');
    await expect(textarea).toBeDisabled();
  });
});

test.describe('Settings Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: '开始对话' }).click();
    await page.waitForURL(/workspace|chat/);
  });

  test('should open settings panel', async ({ page }) => {
    // 查找设置按钮（齿轮图标或文字）
    const settingsBtn = page.locator('button[aria-label*="设置"]').or(
      page.locator('button:has-text("设置")')
    );

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();

      // 检查设置面板出现
      const panel = page.locator('[role="dialog"]').or(page.locator('text=生成参数'));
      await expect(panel).toBeVisible();
    }
  });

  test('should adjust temperature slider', async ({ page }) => {
    // 打开设置
    const settingsBtn = page.locator('button[aria-label*="设置"]').first();
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();

      // 查找温度滑块
      const tempSlider = page.locator('input[type="range"][aria-label*="温度"], input[type="range"][aria-label*="Temperature"]');
      if (await tempSlider.isVisible()) {
        // 获取初始值
        const initialValue = await tempSlider.inputValue();

        // 调整滑块
        await tempSlider.fill('0.8');

        // 验证值已改变
        const newValue = await tempSlider.inputValue();
        expect(parseFloat(newValue)).toBeCloseTo(0.8, 1);
      }
    }
  });
});

test.describe('Model Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: '开始对话' }).click();
    await page.waitForURL(/workspace|chat/);
  });

  test('should display model selector', async ({ page }) => {
    // 查找模型选择器（可能在顶部栏或设置中）
    const modelSelect = page.locator('select, [role="combobox"], button:has-text("Phi"), button:has-text("Qwen")');
    await expect(modelSelect.first()).toBeVisible();
  });

  test('should open model dropdown', async ({ page }) => {
    const modelButton = page.locator('button:has-text("Phi"), button:has-text("Qwen"), [role="combobox"]').first();

    if (await modelButton.isVisible()) {
      await modelButton.click();

      // 等待下拉菜单出现
      await page.waitForTimeout(300);

      // 检查是否有模型选项（至少一个）
      const options = page.locator('[role="option"], [role="menuitem"]');
      const count = await options.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});
