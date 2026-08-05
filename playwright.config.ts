import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 测试配置
 *
 * 测试范围：
 * - 核心用户流程：首页加载、模型选择、对话生成
 * - Observe 模式：trace 记录、可视化渲染
 * - 多模态：文档上传、图像理解
 * - 设置面板：参数调整、模型切换
 */

export default defineConfig({
  testDir: './e2e',

  // 超时配置
  timeout: 60 * 1000, // 单个测试 60 秒（模型加载较慢）
  expect: {
    timeout: 10 * 1000, // 断言超时 10 秒
  },

  // 并发配置
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // 报告器
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  use: {
    // 基础 URL
    baseURL: 'http://localhost:5173',

    // 追踪配置
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // 视口大小
    viewport: { width: 1280, height: 720 },
  },

  // 测试项目（不同浏览器/设备）
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // 移动端测试（可选）
    // {
    //   name: 'mobile-chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // 开发服务器
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true, // 复用已有服务器，避免 CI 超时
    timeout: 120 * 1000, // 2 分钟启动超时
  },
});
