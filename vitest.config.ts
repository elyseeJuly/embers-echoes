import { defineConfig } from 'vitest/config'

/**
 * Vitest 配置 — 余烬回响测试体系
 * 参考 Beyond-the-Light-Cone 的六层测试模型：
 *   T0 静态契约 / T1 单元 / T2 集成·场景·回归 / T3 Headless 模拟 / T4 E2E / T5 体验审计
 *
 * 由于本项目 script/ 下均为 ES5 风格 IIFE + 全局变量，无法直接 import，
 * 测试代码通过 setup 文件读取并注入 jsdom 全局环境后再 eval 源码。
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    testTimeout: 30000,
    hookTimeout: 30000,
    // T4 E2E 测试由 Playwright 接管（npm run test:e2e），需从 Vitest 排除
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'test/e2e/**',
      'playwright-report/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['script/**/*.js'],
      exclude: [
        'script/responsive.js',
        'script/orientation_prompt.js',
        'script/pwa_updater.js',
        'script/indexed_db.js',
        'script/audio_manager.js'
      ],
      thresholds: {
        statements: 30,
        branches: 25,
        functions: 25,
        lines: 30
      }
    }
  }
})
