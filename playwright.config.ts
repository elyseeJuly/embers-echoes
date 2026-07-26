import { defineConfig, devices } from '@playwright/test'

/**
 * 余烬回响 — Playwright E2E 测试配置
 *
 * 核心用户路径覆盖：
 * - 终端启动（NULL → SPARK）
 * - 提取余烬（SPARK 阶段核心循环）
 * - 解锁营地（SPARK → CAMP）
 * - 建造基础设施（信号塔 / 余烬熔炉）
 * - 资源面板与终端日志渲染
 * - 移动端响应式布局
 *
 * 测试层次定位：T4 — 真实浏览器端到端
 * 与 T3（无头模拟）的区别：T4 验证真实 DOM 渲染、用户交互、视听反馈链路。
 */
export default defineConfig({
  testDir: './test/e2e',
  outputDir: './playwright-report/test-artifacts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { outputFolder: './playwright-report/html' }]],
  use: {
    baseURL: 'http://localhost:8080/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    // dev-server.js 通过 express 静态服务根目录，无需构建即可测试
    // CI 环境同样适用（不依赖 Vite 构建产物）
    command: 'npm start',
    url: 'http://localhost:8080/',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
})
