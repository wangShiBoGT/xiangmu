#!/bin/bash

# 前端功能测试脚本（使用 Playwright）
# 前置条件：npm install -D @playwright/test

set -e

echo "================================"
echo "🎭 前端功能测试"
echo "================================"
echo ""

# 检查 Playwright 是否安装
if ! command -v npx playwright --version &> /dev/null; then
    echo "❌ Playwright 未安装"
    echo "请运行：npm install -D @playwright/test"
    echo "然后运行：npx playwright install"
    exit 1
fi

echo "✅ Playwright 已安装"
echo ""

# 创建测试文件
mkdir -p e2e

cat > e2e/smoke.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';

test.describe('前端冒烟测试', () => {
  test('首页加载', async ({ page }) => {
    await page.goto('/');

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 检查标题
    await expect(page).toHaveTitle(/WebGPU LLM Chat/);

    // 检查无 JavaScript 错误
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);

    console.log('✅ 首页加载正常');
  });

  test('导航栏显示', async ({ page }) => {
    await page.goto('/');

    // 检查导航元素
    const nav = page.locator('nav, header');
    await expect(nav).toBeVisible();

    console.log('✅ 导航栏显示正常');
  });

  test('ObservePage 可访问', async ({ page }) => {
    await page.goto('/observe');

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 检查输入框存在
    const textarea = page.locator('textarea');
    await expect(textarea.first()).toBeVisible();

    console.log('✅ ObservePage 可访问');
  });

  test('模型选择器存在', async ({ page }) => {
    await page.goto('/observe');

    // 等待加载
    await page.waitForLoadState('networkidle');

    // 检查模型选择器
    const modelSelector = page.locator('select, [role="combobox"]');
    const count = await modelSelector.count();
    expect(count).toBeGreaterThan(0);

    console.log('✅ 模型选择器存在');
  });

  test('配额显示（如果后端已接入）', async ({ page }) => {
    await page.goto('/');

    // 检查是否显示配额信息
    const quotaText = page.getByText(/剩余|remaining|quota/i);

    // 如果找到配额信息，验证格式
    if (await quotaText.count() > 0) {
      await expect(quotaText.first()).toBeVisible();
      console.log('✅ 配额信息显示正常');
    } else {
      console.log('ℹ️  配额信息未显示（可能未启用后端）');
    }
  });

  test('无控制台错误', async ({ page }) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      } else if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 过滤已知的无害错误
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('DevTools')
    );

    expect(criticalErrors).toHaveLength(0);

    if (warnings.length > 0) {
      console.log(`⚠️  有 ${warnings.length} 个警告`);
    } else {
      console.log('✅ 无控制台错误');
    }
  });
});

test.describe('性能测试', () => {
  test('首屏加载时间 < 3 秒', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`首屏加载时间: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
  });
});
EOF

echo "✅ 测试文件已创建"
echo ""

# 创建 Playwright 配置
cat > playwright.config.ts << 'EOF'
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
});
EOF

echo "✅ Playwright 配置已创建"
echo ""

echo "运行测试..."
npx playwright test

echo ""
echo "================================"
echo "测试完成！"
echo "================================"
echo "查看报告：npx playwright show-report"
