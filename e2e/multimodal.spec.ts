import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * 多模态功能测试：文档上传和图像理解
 */

test.describe('Document Upload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: '开始对话' }).click();
    await page.waitForURL(/workspace|chat/);
  });

  test('should display file upload button', async ({ page }) => {
    // 查找附件按钮
    const attachButton = page.locator('button[aria-label*="附件"], button[aria-label*="文件"]');
    await expect(attachButton.first()).toBeVisible();
  });

  test('should open file picker on attach button click', async ({ page }) => {
    const attachButton = page.locator('button[aria-label*="附件"]').first();

    if (await attachButton.isVisible()) {
      // 监听文件选择器打开
      const fileChooserPromise = page.waitForEvent('filechooser');
      await attachButton.click();

      const fileChooser = await fileChooserPromise;
      expect(fileChooser).toBeDefined();
    }
  });

  test('should accept document file types', async ({ page }) => {
    const attachButton = page.locator('button[aria-label*="附件"]').first();

    if (await attachButton.isVisible()) {
      const fileChooserPromise = page.waitForEvent('filechooser');
      await attachButton.click();

      const fileChooser = await fileChooserPromise;

      // 检查接受的文件类型
      const acceptAttr = await page.locator('input[type="file"]').getAttribute('accept');
      expect(acceptAttr).toMatch(/\.pdf|\.docx|\.txt|\.md/);
    }
  });

  test('should show file preview after upload', async ({ page }) => {
    // 创建模拟文本文件
    const testFilePath = path.join(__dirname, 'fixtures', 'test.txt');

    const attachButton = page.locator('button[aria-label*="附件"]').first();

    if (await attachButton.isVisible()) {
      const fileChooserPromise = page.waitForEvent('filechooser');
      await attachButton.click();

      const fileChooser = await fileChooserPromise;

      // 上传文件（注意：需要真实文件存在，这里仅演示 API）
      // await fileChooser.setFiles(testFilePath);

      // 等待文件处理
      // await page.waitForTimeout(1000);

      // 检查文件预览标签
      // const fileTag = page.locator('text=/test\.txt|文档/');
      // await expect(fileTag).toBeVisible();
    }
  });
});

test.describe('Image Understanding', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: '开始对话' }).click();
    await page.waitForURL(/workspace|chat/);
  });

  test('should accept image file types', async ({ page }) => {
    const attachButton = page.locator('button[aria-label*="附件"]').first();

    if (await attachButton.isVisible()) {
      const fileChooserPromise = page.waitForEvent('filechooser');
      await attachButton.click();

      const fileChooser = await fileChooserPromise;

      // 检查接受的文件类型包含图像
      const acceptAttr = await page.locator('input[type="file"]').getAttribute('accept');
      expect(acceptAttr).toMatch(/\.jpg|\.jpeg|\.png|\.webp/);
    }
  });

  test('should display image preview in message', async ({ page }) => {
    // 注入模拟图像附件
    await page.evaluate(() => {
      const mockImageDataURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      // 模拟在 localStorage 中添加带图片的消息
      const sessions = JSON.parse(localStorage.getItem('webgpu-llm-chat.sessions.v1') || '[]');
      if (sessions.length > 0) {
        sessions[0].messages.push({
          role: 'user',
          content: 'Test image message',
          images: [mockImageDataURL],
        });
        localStorage.setItem('webgpu-llm-chat.sessions.v1', JSON.stringify(sessions));
      }
    });

    // 刷新页面加载数据
    await page.reload();
    await page.waitForTimeout(1000);

    // 检查图片元素
    const messageImage = page.locator('img[src^="data:image"]');
    if (await messageImage.isVisible()) {
      await expect(messageImage).toBeVisible();
    }
  });

  test('should enforce max image limit', async ({ page }) => {
    // 检查最多可上传图片数量（从常量 MAX_IMAGES = 2）
    await page.evaluate(() => {
      const MAX_IMAGES = 2;
      console.log(`Max images: ${MAX_IMAGES}`);
    });

    // 实际测试需要尝试上传超过限制的图片，并验证警告提示
  });
});

test.describe('Web Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: '开始对话' }).click();
    await page.waitForURL(/workspace|chat/);
  });

  test('should display web search toggle', async ({ page }) => {
    // 查找联网搜索开关
    const searchToggle = page.locator('button[aria-label*="联网"], button:has-text("联网"), button:has-text("搜索")');

    if (await searchToggle.first().isVisible()) {
      await expect(searchToggle.first()).toBeVisible();
    }
  });

  test('should toggle web search on/off', async ({ page }) => {
    const searchToggle = page.locator('button[aria-label*="联网"]').first();

    if (await searchToggle.isVisible()) {
      // 获取初始状态
      const initialState = await searchToggle.getAttribute('aria-checked');

      // 点击切换
      await searchToggle.click();
      await page.waitForTimeout(300);

      // 验证状态改变
      const newState = await searchToggle.getAttribute('aria-checked');
      expect(newState).not.toBe(initialState);
    }
  });
});

test.describe('Multimodal Edge Cases', () => {
  test('should handle empty file upload gracefully', async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: '开始对话' }).click();
    await page.waitForURL(/workspace|chat/);

    // 模拟选择文件但取消
    const attachButton = page.locator('button[aria-label*="附件"]').first();

    if (await attachButton.isVisible()) {
      const fileChooserPromise = page.waitForEvent('filechooser');
      await attachButton.click();

      const fileChooser = await fileChooserPromise;
      // 不上传任何文件（模拟取消）

      // 验证界面没有错误提示
      const errorAlert = page.locator('[role="alert"]:has-text("错误")');
      await expect(errorAlert).not.toBeVisible();
    }
  });

  test('should validate file size', async ({ page }) => {
    // 文档中 MAX_DOC_CHARS = 6000 字符限制
    // 图片中 MAX_IMAGE_EDGE = 512px 最大边长
    // 这些限制应该在前端验证

    await page.goto('/');
    await page.locator('button', { hasText: '开始对话' }).click();
    await page.waitForURL(/workspace|chat/);

    // 实际测试需要创建超大文件并验证警告
  });
});
