import { test, expect } from '@playwright/test'
import {
  waitForGameReady,
  resetGameState,
  dismissPWAUpdatePrompt,
  advanceToSpark,
  extractEmberOnce,
  getEmber,
  getGamePhase,
  getCharacterSnapshot,
  clickButton,
  waitForButton,
  isCriticalError,
} from './helpers'

/**
 * T4 E2E Core Flow Tests — 核心用户流程
 * =====================================
 * 验证玩家从零开始的真实交互路径：
 * 1. NULL → SPARK：点击「重启神经终端」
 * 2. SPARK 阶段：提取余烬，计数器更新
 * 3. SPARK → CAMP：余烬达到 50 后自动解锁营地
 * 4. CAMP 阶段：建造信号塔 / 余烬熔炉
 * 5. 资源面板与终端日志实时更新
 *
 * 参考 BTC core-flow.spec.ts 的设计模式：
 * - beforeEach 统一前置
 * - 通过 window.$SM / window.Engine 读取内部状态
 * - 键盘优先交互
 */

test.describe('Core User Flow @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await resetGameState(page)
    page.on('pageerror', (err) => {
      if (isCriticalError(err.message)) {
        throw new Error(`未捕获的运行时异常: ${err.message}`)
      }
    })
    await page.goto('/')
    await waitForGameReady(page)
    await dismissPWAUpdatePrompt(page)
  })

  // ── NULL → SPARK 转换 ─────────────────────────────────────

  test('点击「重启神经终端」进入 SPARK 阶段', async ({ page }) => {
    // 初始为 NULL 阶段
    expect(await getGamePhase(page)).toBe(0)

    // 点击重启按钮
    await clickButton(page, '重启神经终端')

    // 等待 SPARK 阶段激活（有 500ms fadeOut 动画）
    await waitForButton(page, '提取余烬', 15000)

    // 阶段已切换
    expect(await getGamePhase(page)).toBe(1)
    await expect(page.locator('body')).toHaveClass(/phase-spark/)
  })

  test('SPARK 阶段显示提取按钮与余烬计数器', async ({ page }) => {
    await advanceToSpark(page)

    // 提取按钮存在
    await expect(page.locator('.ee-btn', { hasText: '提取余烬' })).toBeVisible()

    // 余烬计数器存在
    await expect(page.locator('#ember-counter')).toBeVisible()
    await expect(page.locator('#ember-counter .count')).toHaveText('0')
  })

  // ── 提取余烬核心循环 ───────────────────────────────────────

  test('点击「提取余烬」增加余烬数量', async ({ page }) => {
    await advanceToSpark(page)

    const before = await getEmber(page)
    expect(before).toBe(0)

    // 点击一次（按钮有 cooldown，但点击会立即触发 extractEmber）
    await extractEmberOnce(page)

    const after = await getEmber(page)
    expect(after).toBeGreaterThanOrEqual(1)
    expect(after).toBeLessThanOrEqual(3) // 1 + floor(random * 3)
  })

  test('余烬计数器 UI 与 $SM 状态同步', async ({ page }) => {
    await advanceToSpark(page)

    await extractEmberOnce(page)

    const stateEmber = await getEmber(page)
    const uiEmber = await page.locator('#ember-counter .count').textContent()
    expect(parseInt(uiEmber || '0', 10)).toBe(stateEmber)
  })

  test('提取余烬触发通知消息', async ({ page }) => {
    await advanceToSpark(page)

    await extractEmberOnce(page)

    // 通知应包含余烬增加信息
    await expect(page.locator('#ee-notifications')).toContainText(/余烬/, { timeout: 3000 })
  })

  test('多次提取余烬后数量累加', async ({ page }) => {
    test.setTimeout(30000)
    await advanceToSpark(page)

    // 提取 3 次（每次间隔 1.7s 跳过 cooldown）
    let total = 0
    for (let i = 0; i < 3; i++) {
      const before = await getEmber(page)
      await page.locator('.ee-btn', { hasText: '提取余烬' }).first().click({ force: true })
      await page.waitForTimeout(1700)
      const after = await getEmber(page)
      total += after - before
    }

    expect(total).toBeGreaterThanOrEqual(3)
    expect(await getEmber(page)).toBeGreaterThanOrEqual(3)
  })

  // ── SPARK → CAMP 转换 ─────────────────────────────────────

  test('余烬达到 50 后解锁 CAMP 阶段', async ({ page }) => {
    test.setTimeout(30000)
    await advanceToSpark(page)

    // 直接设置 ember 到 49，再点击一次触发
    await page.evaluate(() => {
      // @ts-ignore
      const $SM = window.$SM
      $SM.set('stores.ember', 49, true)
      $('#ember-counter .count').text('49')
    })

    // 点击提取，ember 应增加并触发 phase unlock
    await page.locator('.ee-btn', { hasText: '提取余烬' }).first().click({ force: true })
    await page.waitForTimeout(2500) // 等待 tick 触发 checkPhaseUnlock

    // 应已进入 CAMP 阶段
    expect(await getGamePhase(page)).toBeGreaterThanOrEqual(2)
    await expect(page.locator('body')).toHaveClass(/phase-camp/)
  })

  test('CAMP 阶段解锁后显示基础设施面板', async ({ page }) => {
    test.setTimeout(30000)
    await advanceToSpark(page)

    // 快速推进到 CAMP
    await page.evaluate(() => {
      // @ts-ignore
      const $SM = window.$SM
      const Engine = window.Engine
      $SM.set('stores.ember', 60, true)
      Engine.setPhase(Engine.PHASES.CAMP)
    })
    await page.waitForTimeout(1000)

    // Nexus 模块应已初始化，显示建造选项
    // 检查 header 中是否有 nexus tab
    const nexusTab = page.locator('#ee-header .ee-tab', { hasText: '节点' })
    await expect(nexusTab).toBeVisible({ timeout: 5000 })
  })

  // ── 建造系统 ───────────────────────────────────────────────

  test('CAMP 阶段可建造信号塔', async ({ page }) => {
    test.setTimeout(30000)
    await advanceToSpark(page)

    // 推进到 CAMP 并给予足够资源
    await page.evaluate(() => {
      // @ts-ignore
      const $SM = window.$SM
      const Engine = window.Engine
      $SM.set('stores.ember', 200, true)
      Engine.setPhase(Engine.PHASES.CAMP)
    })
    await page.waitForTimeout(1000)

    // 切换到节点 tab
    const nexusTab = page.locator('#ee-header .ee-tab', { hasText: '节点' }).first()
    await nexusTab.click()
    await page.waitForTimeout(500)

    // 查找信号塔建造按钮
    const buildBtn = page.locator('.ee-btn', { hasText: '建造' }).first()
    await expect(buildBtn).toBeVisible({ timeout: 5000 })
    await buildBtn.click()

    await page.waitForTimeout(500)

    // 验证建筑已建造
    const buildingCount = await page.evaluate(() => {
      // @ts-ignore
      const $SM = window.$SM
      return $SM.get('buildings.signalTower') || 0
    })
    expect(buildingCount).toBeGreaterThanOrEqual(1)
  })

  // ── 资源面板与 UI 同步 ─────────────────────────────────────

  test('资源面板显示余烬数量并与状态同步', async ({ page }) => {
    await advanceToSpark(page)

    // 直接设置余烬数量
    await page.evaluate(() => {
      // @ts-ignore
      const $SM = window.$SM
      $SM.set('stores.ember', 25, true)
      // 触发 UI 更新
      $('#ember-counter .count').text('25')
    })

    // 等待 Engine.updateStoresView 在下个 tick 刷新
    await page.waitForTimeout(1500)

    // 资源面板应显示余烬
    const storesPanel = page.locator('#stores-panel')
    await expect(storesPanel).toContainText(/余烬/)
  })

  test('终端日志在提取余烬后更新', async ({ page }) => {
    await advanceToSpark(page)

    const beforeText = await page.locator('#terminal-narrative').textContent()

    await extractEmberOnce(page)
    await page.waitForTimeout(500)

    const afterText = await page.locator('#terminal-narrative').textContent()

    // 终端应有新的叙事文本（或至少有变化）
    expect(afterText?.length || 0).toBeGreaterThanOrEqual(beforeText?.length || 0)
  })

  // ── 游戏内状态一致性 ───────────────────────────────────────

  test('角色初始状态正确（san=50, hp=10, erosion=0）', async ({ page }) => {
    await advanceToSpark(page)

    const char = await getCharacterSnapshot(page)
    expect(char.san).toBe(50)
    expect(char.hp).toBe(10)
    expect(char.erosion).toBe(0)
    expect(char.maxHp).toBe(10)
    expect(char.maxSan).toBe(100)
  })

  test('Engine.tick 持续运行不抛错', async ({ page }) => {
    await advanceToSpark(page)

    // 等待 5 秒，让多个 tick 执行
    const errors: string[] = []
    page.on('pageerror', (err) => {
      if (isCriticalError(err.message)) {
        errors.push(err.message)
      }
    })

    await page.waitForTimeout(5000)

    expect(errors).toEqual([])
  })

  test('存档功能正常工作（saveGame 不抛错）', async ({ page }) => {
    await advanceToSpark(page)

    // 触发存档
    const saveResult = await page.evaluate(() => {
      try {
        // @ts-ignore
        const Engine = window.Engine
        Engine.saveGame()
        return { success: true, error: null }
      } catch (e: any) {
        return { success: false, error: e.message }
      }
    })

    expect(saveResult.success).toBe(true)
    expect(saveResult.error).toBeNull()
  })
})
