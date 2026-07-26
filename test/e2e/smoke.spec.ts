import { test, expect } from '@playwright/test'
import {
  waitForGameReady,
  resetGameState,
  dismissPWAUpdatePrompt,
  isCriticalError,
} from './helpers'

/**
 * T4 E2E Smoke Tests — 冒烟测试
 * =============================
 * 验证游戏最基础的加载与渲染能力：
 * - 页面标题正确
 * - 核心布局元素存在
 * - 终端面板渲染
 * - 无未捕获的运行时异常
 * - 静态资源（CSS / JS）全部加载成功
 *
 * 所有 5 个浏览器矩阵（3 桌面 + 2 移动）均执行。
 */

test.describe('Smoke Tests @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await resetGameState(page)
    // 收集运行时错误
    page.on('pageerror', (err) => {
      if (isCriticalError(err.message)) {
        throw new Error(`未捕获的运行时异常: ${err.message}`)
      }
    })
    await page.goto('/')
    await dismissPWAUpdatePrompt(page)
  })

  test('页面标题与核心布局元素存在', async ({ page }) => {
    await expect(page).toHaveTitle(/余烬回响|Embers Echoes/)

    // 核心布局骨架
    await expect(page.locator('#ee-wrapper')).toBeVisible()
    await expect(page.locator('#ee-header')).toBeVisible()
    await expect(page.locator('#ee-content')).toBeVisible()
    await expect(page.locator('#ee-main')).toBeVisible()
    await expect(page.locator('#ee-left')).toBeVisible()
    await expect(page.locator('#ee-middle')).toBeVisible()
    await expect(page.locator('#ee-right')).toBeVisible()

    // 通知容器
    await expect(page.locator('#ee-notifications')).toBeVisible()
  })

  test('终端面板在 NULL 阶段渲染并显示启动按钮', async ({ page }) => {
    await waitForGameReady(page)

    // body 应有 phase-null 类
    await expect(page.locator('body')).toHaveClass(/phase-null/)

    // 终端面板存在
    await expect(page.locator('#terminal-panel')).toBeVisible()
    await expect(page.locator('#terminal-narrative')).toBeVisible()
    await expect(page.locator('#spark-controls')).toBeVisible()

    // 重启按钮存在且有文本
    const restartBtn = page.locator('.ee-btn', { hasText: '重启神经终端' })
    await expect(restartBtn).toBeVisible()
    await expect(restartBtn).toHaveClass(/ee-btn--primary/)
  })

  test('资源面板在左侧渲染', async ({ page }) => {
    await waitForGameReady(page)

    // stores-panel 是左侧资源面板
    await expect(page.locator('#stores-panel')).toBeVisible()
    await expect(page.locator('#stores-panel .ee-panel-title')).toHaveText('资源')
  })

  test('核心 CSS 与 JS 资源加载成功', async ({ page }) => {
    const failedRequests: string[] = []
    page.on('requestfailed', (req) => {
      const url = req.url()
      // 忽略 CDN jQuery 失败（有本地 fallback）
      if (!url.includes('ajax.googleapis.com')) {
        failedRequests.push(`${url} — ${req.failure()?.errorText}`)
      }
    })

    await page.goto('/')
    await waitForGameReady(page)

    // 给页面一点时间加载所有延迟资源
    await page.waitForTimeout(2000)

    expect(failedRequests).toEqual([])
  })

  test('jQuery 本地 fallback 正常工作', async ({ page }) => {
    // 即使 CDN 不可用，本地 jQuery 也应加载
    const hasJQuery = await page.evaluate(() => {
      return typeof (window as any).jQuery === 'function'
    })
    expect(hasJQuery).toBe(true)
  })

  test('游戏核心模块全部挂载到 window', async ({ page }) => {
    await waitForGameReady(page)

    const modules = await page.evaluate(() => {
      return {
        Engine: typeof (window as any).Engine,
        $SM: typeof (window as any).$SM,
        Sanity: typeof (window as any).Sanity,
        Narrative: typeof (window as any).Narrative,
        Nexus: typeof (window as any).Nexus,
        RiftMap: typeof (window as any).RiftMap,
        Combat: typeof (window as any).Combat,
        Survival: typeof (window as any).Survival,
        Endgame: typeof (window as any).Endgame,
      }
    })

    for (const [name, type] of Object.entries(modules)) {
      expect(type, `模块 ${name} 应为 object`).toBe('object')
    }
  })

  test('无未捕获的运行时异常', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => {
      if (isCriticalError(err.message)) {
        errors.push(err.message)
      }
    })

    await page.goto('/')
    await waitForGameReady(page)
    // 等待若干 tick 让延迟执行的代码有机会抛错
    await page.waitForTimeout(3000)

    expect(errors).toEqual([])
  })
})
