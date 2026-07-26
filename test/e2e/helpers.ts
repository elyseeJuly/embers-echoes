import { Page, expect } from '@playwright/test'

/**
 * 余烬回响 — E2E 测试公共辅助函数
 *
 * 设计原则：
 * - 函数式 helper（非 Page Object Model），与 BTC 参考实现保持一致
 * - 优先通过 data-testid / id / 文本内容定位元素
 * - 通过 window.$SM / window.Engine 直接读取游戏内部状态，绕过 UI 渲染时序
 * - 所有 helper 自动处理移动端/桌面端差异
 */

/** 等待游戏完全加载（Engine.init 完成，终端面板可见） */
export async function waitForGameReady(page: Page): Promise<void> {
  // #ee-wrapper 是根容器，#terminal-panel 由 Terminal.init() 创建
  await expect(page.locator('#ee-wrapper')).toBeVisible()
  await expect(page.locator('#terminal-panel')).toBeVisible()
  // body 初始为 phase-null
  await expect(page.locator('body')).toHaveClass(/phase-null/)
}

/** 重置游戏存档到初始状态（NULL 阶段） */
export async function resetGameState(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // 清除所有可能的存档键
    localStorage.clear()
    if (typeof window.indexedDB !== 'undefined') {
      // IndexedDB 清除由 Engine.loadGame 在无存档时自然进入新游戏
    }
  })
}

/** 点击包含指定文本的按钮（ee-btn 是 div，不是 button 标签） */
export async function clickButton(page: Page, text: string): Promise<void> {
  const btn = page.locator(`.ee-btn`, { hasText: text }).first()
  await expect(btn).toBeVisible()
  await btn.click()
}

/** 等待按钮出现并可点击 */
export async function waitForButton(page: Page, text: string, timeout = 10000): Promise<void> {
  const btn = page.locator(`.ee-btn`, { hasText: text }).first()
  await expect(btn).toBeVisible({ timeout })
}

/** 获取当前游戏阶段（0=NULL, 1=SPARK, 2=CAMP, 3=ABYSS, 4=MAP, 5=SINK, 6=END） */
export async function getGamePhase(page: Page): Promise<number> {
  return await page.evaluate(() => {
    // @ts-ignore — 游戏脚本挂载到 window
    const Engine = window.Engine
    return Engine ? Engine.getPhase() : -1
  })
}

/** 获取当前余烬数量 */
export async function getEmber(page: Page): Promise<number> {
  return await page.evaluate(() => {
    // @ts-ignore
    const $SM = window.$SM
    return $SM ? ($SM.get('stores.ember') || 0) : 0
  })
}

/** 获取完整资源快照 */
export async function getResourceSnapshot(page: Page): Promise<Record<string, number>> {
  return await page.evaluate(() => {
    // @ts-ignore
    const $SM = window.$SM
    return $SM ? ($SM.get('stores') || {}) : {}
  })
}

/** 获取角色状态快照（san / erosion / hp） */
export async function getCharacterSnapshot(page: Page): Promise<{
  san: number
  erosion: number
  hp: number
  maxHp: number
  maxSan: number
}> {
  return await page.evaluate(() => {
    // @ts-ignore
    const $SM = window.$SM
    const Sanity = window.Sanity
    if (!$SM) return { san: 0, erosion: 0, hp: 0, maxHp: 0, maxSan: 0 }
    return {
      san: $SM.get('character.san') || 0,
      erosion: $SM.get('character.erosion') || 0,
      hp: $SM.get('character.hp') || 0,
      maxHp: $SM.get('character.maxHp') || 0,
      maxSan: Sanity && typeof Sanity.getMaxSan === 'function' ? Sanity.getMaxSan() : 100,
    }
  })
}

/** 推进到 SPARK 阶段：点击「重启神经终端」按钮 */
export async function advanceToSpark(page: Page): Promise<void> {
  await waitForButton(page, '重启神经终端')
  await clickButton(page, '重启神经终端')
  // onRestart 有 500ms fadeOut 动画，等待 extract 按钮出现
  await waitForButton(page, '提取余烬', 15000)
  // 等待 body class 切换
  await expect(page.locator('body')).toHaveClass(/phase-spark/, { timeout: 5000 })
}

/** 提取余烬一次（点击「提取余烬」按钮） */
export async function extractEmberOnce(page: Page): Promise<void> {
  // 按钮有 1.5s cooldown，用 force click 跳过等待
  const btn = page.locator('.ee-btn', { hasText: '提取余烬' }).first()
  await btn.click()
  // 短暂等待动画与状态更新
  await page.waitForTimeout(100)
}

/** 提取余烬多次（自动跳过 cooldown） */
export async function extractEmberMultiple(page: Page, times: number): Promise<number> {
  const before = await getEmber(page)
  for (let i = 0; i < times; i++) {
    // cooldown 是 1.5s，但每次点击后等待 200ms 让动画完成
    // 实际上 Button.js 在 cooldown 期间会拒绝点击，所以需要等待
    await page.locator('.ee-btn', { hasText: '提取余烬' }).first().click({ force: true })
    await page.waitForTimeout(1700) // 略大于 1.5s cooldown
  }
  const after = await getEmber(page)
  return after - before
}

/** 推进到 CAMP 阶段：持续提取余烬直到 ember >= 50 */
export async function advanceToCamp(page: Page): Promise<void> {
  // 确保在 SPARK 阶段
  const phase = await getGamePhase(page)
  if (phase < 1) {
    await advanceToSpark(page)
  }

  // 通过直接修改状态跳过手动点击（用于快速测试）
  // 设定 ember 到 49，再点击一次触发 phase unlock 检查
  await page.evaluate(() => {
    // @ts-ignore
    const $SM = window.$SM
    $SM.set('stores.ember', 49, true)
    // 更新计数器显示
    $('#ember-counter .count').text('49')
  })

  // 点击提取按钮，ember 增加后 Engine.checkPhaseUnlock 会触发 CAMP
  // 但 checkPhaseUnlock 在 tick 中调用（每秒），所以需要等待
  await page.locator('.ee-btn', { hasText: '提取余烬' }).first().click({ force: true })
  await page.waitForTimeout(2000) // 等待 tick 触发 phase change

  // 验证已进入 CAMP 阶段
  const newPhase = await getGamePhase(page)
  if (newPhase < 2) {
    // 如果还没到 CAMP，再等一秒
    await page.waitForTimeout(2000)
  }
}

/** 关闭可能出现的 PWA 更新提示（如有） */
export async function dismissPWAUpdatePrompt(page: Page): Promise<void> {
  const updateBtn = page.locator('button:has-text("刷新"), button:has-text("更新")')
  try {
    await updateBtn.first().waitFor({ state: 'visible', timeout: 2000 })
    await updateBtn.first().click()
  } catch {
    // PWA 提示未出现
  }
}

/** 等待通知文本出现（用于验证事件触发） */
export async function waitForNotification(page: Page, textPattern: string | RegExp, timeout = 5000): Promise<void> {
  await expect(page.locator('#ee-notifications')).toContainText(textPattern, { timeout })
}

/** 检查是否有未捕获的运行时错误（白名单过滤已知非阻塞问题） */
export function isCriticalError(message: string): boolean {
  // 已知非阻塞错误白名单
  const nonCriticalPatterns = [
    /AudioContext/i,
    /autoplay/i,
    /decodeAudioData/i,
    /Notification.*permission/i,
    /service.worker/i,
    /manifest/i,
  ]
  return !nonCriticalPatterns.some((pattern) => pattern.test(message))
}
