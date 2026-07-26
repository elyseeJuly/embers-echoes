/**
 * T1 单元测试 — Sanity System
 * 覆盖：zone 划分、getMaxSan、tick 各区域效果、actionGaze/Inject/Sedate、erosion 事件
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createGameEnvironment } from '../setup.js'

let env
beforeEach(() => {
  env = createGameEnvironment()
})

describe('Sanity.getZone — 区间划分', () => {
  it('san <= 0 → mindbreak', () => {
    env.$SM.set('character.san', 0, true)
    expect(env.Sanity.getZone()).toBe('mindbreak')
    env.$SM.set('character.san', -10, true)
    expect(env.Sanity.getZone()).toBe('mindbreak')
  })

  it('0 < san < 30 → madness', () => {
    env.$SM.set('character.san', 15, true)
    expect(env.Sanity.getZone()).toBe('madness')
    env.$SM.set('character.san', 29.9, true)
    expect(env.Sanity.getZone()).toBe('madness')
  })

  it('30 <= san <= maxSan-30 → awakened', () => {
    env.$SM.set('character.san', 50, true)
    expect(env.Sanity.getZone()).toBe('awakened')
    env.$SM.set('character.san', 70, true) // maxSan=100, threshold=70
    expect(env.Sanity.getZone()).toBe('awakened')
  })

  it('san > maxSan-30 → assimilation', () => {
    env.$SM.set('character.san', 71, true)
    expect(env.Sanity.getZone()).toBe('assimilation')
    env.$SM.set('character.san', 100, true)
    expect(env.Sanity.getZone()).toBe('assimilation')
  })

  it('cognitiveBarrier 提升 maxSan 后区间边界随之变化', () => {
    env.$SM.set('buildings.cognitiveBarrier', 3, true) // maxSan=130, threshold=100
    env.$SM.set('character.san', 95, true)
    expect(env.Sanity.getZone()).toBe('awakened') // 95 < 100
    env.$SM.set('character.san', 105, true)
    expect(env.Sanity.getZone()).toBe('assimilation')
  })

  it('显式参数优先于 $SM 读取', () => {
    env.$SM.set('character.san', 50, true)
    expect(env.Sanity.getZone(10, 100)).toBe('madness')
    expect(env.Sanity.getZone(80, 100)).toBe('assimilation')
  })
})

describe('Sanity.getMaxSan — 上限计算', () => {
  it('base 100', () => {
    expect(env.Sanity.getMaxSan()).toBe(100)
  })

  it('+10 / cognitiveBarrier', () => {
    env.$SM.set('buildings.cognitiveBarrier', 4, true)
    expect(env.Sanity.getMaxSan()).toBe(140)
  })

  it('未建造时返回 base', () => {
    env.$SM.set('buildings', {}, true)
    expect(env.Sanity.getMaxSan()).toBe(100)
  })
})

describe('Sanity.tick — 各区域效果', () => {
  it('awakened 区缓慢向 50% maxSan 漂移', () => {
    env.$SM.set('character.san', 30, true) // target=50, drift=+0.2
    env.Sanity.tick()
    expect(env.$SM.get('character.san')).toBeGreaterThan(30)
    expect(env.$SM.get('character.san')).toBeLessThan(31)
  })

  it('madness 区每 tick +0.5 whispers, +0.5 erosion', () => {
    env.$SM.set('character.san', 20, true) // madness
    env.Sanity.tick()
    expect(env.$SM.get('stores.whispers')).toBeCloseTo(0.5, 5)
    expect(env.$SM.get('character.erosion')).toBeCloseTo(0.5, 5)
  })

  it('madness 区 entropy_resist perk 削减 erosion 25%', () => {
    env.$SM.set('character.san', 20, true)
    env.$SM.addPerk('entropy_resist')
    env.Sanity.tick()
    expect(env.$SM.get('character.erosion')).toBeCloseTo(0.375, 5) // 0.5 * 0.75
  })

  it('mindbreak 区每 tick +5 erosion', () => {
    env.$SM.set('character.san', 0, true)
    env.Sanity.tick()
    expect(env.$SM.get('character.erosion')).toBe(5)
  })

  it('assimilation 区每 tick -2 ember（系统散热）', () => {
    env.$SM.set('character.san', 90, true)
    env.$SM.set('stores.ember', 50, true)
    env.Sanity.tick()
    expect(env.$SM.get('stores.ember')).toBe(48)
  })

  it('非 madness 区每 tick 自然侵蚀衰减 -0.05', () => {
    env.$SM.set('character.san', 50, true)
    env.$SM.set('character.erosion', 10, true)
    env.Sanity.tick()
    expect(env.$SM.get('character.erosion')).toBeCloseTo(9.95, 5)
  })

  it('erosion >= 100 触发 erosionDeath', () => {
    env.$SM.set('character.erosion', 100, true)
    env.$SM.set('character.san', 50, true)
    const orig = env.Sanity.erosionDeath
    let called = false
    env.Sanity.erosionDeath = () => { called = true }
    env.Sanity.tick()
    env.Sanity.erosionDeath = orig
    expect(called).toBe(true)
  })
})

describe('Sanity.actionGaze — 直视深渊', () => {
  it('余烬不足时拒绝执行', () => {
    env.$SM.set('stores.ember', 5, true) // < 10
    env.$SM.set('character.san', 50, true)
    const before = env.$SM.get('character.san')
    env.Sanity.actionGaze()
    expect(env.$SM.get('stores.ember')).toBe(5)
    expect(env.$SM.get('character.san')).toBe(before)
  })

  it('SAN < 5 时拒绝执行', () => {
    env.$SM.set('stores.ember', 50, true)
    env.$SM.set('character.san', 3, true)
    env.Sanity.actionGaze()
    expect(env.$SM.get('stores.ember')).toBe(50)
  })

  it('正常执行：消耗 10 ember, -5 SAN, +1 whispers, 设置 3 tick 冷却', () => {
    env.$SM.set('stores.ember', 100, true)
    env.$SM.set('character.san', 50, true)
    env.Sanity.actionGaze()
    expect(env.$SM.get('stores.ember')).toBe(90)
    expect(env.$SM.get('character.san')).toBe(45)
    expect(env.$SM.get('stores.whispers')).toBe(1)
    expect(env.Sanity._gazeCooldown).toBe(3)
  })

  it('冷却中拒绝执行', () => {
    env.$SM.set('stores.ember', 100, true)
    env.$SM.set('character.san', 50, true)
    env.Sanity._gazeCooldown = 2
    env.Sanity.actionGaze()
    expect(env.$SM.get('stores.ember')).toBe(100) // 未消耗
    expect(env.$SM.get('character.san')).toBe(50)
  })
})

describe('Sanity.actionInject — 注射抑制剂', () => {
  it('材料不足时拒绝执行', () => {
    env.$SM.set('stores.concentrate', 1, true) // 需 2
    env.$SM.set('stores.grayMatter', 100, true)
    env.$SM.set('character.san', 10, true)
    env.Sanity.actionInject()
    expect(env.$SM.get('character.san')).toBe(10)
  })

  it('正常执行：消耗 2 concentrate + 20 grayMatter，SAN 重置 50%，erosion -30', () => {
    env.$SM.set('stores.concentrate', 5, true)
    env.$SM.set('stores.grayMatter', 50, true) // cap=50
    env.$SM.set('character.san', 5, true)
    env.$SM.set('character.erosion', 60, true)
    env.Sanity.actionInject()
    expect(env.$SM.get('stores.concentrate')).toBe(3)
    expect(env.$SM.get('stores.grayMatter')).toBe(30)
    expect(env.$SM.get('character.san')).toBe(50) // floor(100 * 0.5)
    expect(env.$SM.get('character.erosion')).toBe(30)
    expect(env.Sanity._injectCooldown).toBe(120)
  })

  it('erosion 不足 30 时钳制到 0', () => {
    env.$SM.set('stores.concentrate', 5, true)
    env.$SM.set('stores.grayMatter', 50, true)
    env.$SM.set('character.erosion', 10, true)
    env.Sanity.actionInject()
    expect(env.$SM.get('character.erosion')).toBe(0)
  })

  it('冷却中拒绝执行', () => {
    env.$SM.set('stores.concentrate', 5, true)
    env.$SM.set('stores.grayMatter', 50, true)
    env.Sanity._injectCooldown = 60
    const before = env.$SM.get('stores.concentrate')
    env.Sanity.actionInject()
    expect(env.$SM.get('stores.concentrate')).toBe(before)
  })

  it('maxSan 提升时按比例重置 SAN', () => {
    env.$SM.set('buildings.cognitiveBarrier', 4, true) // maxSan=140
    env.$SM.set('stores.concentrate', 5, true)
    env.$SM.set('stores.grayMatter', 50, true)
    env.$SM.set('character.san', 5, true)
    env.Sanity.actionInject()
    expect(env.$SM.get('character.san')).toBe(70) // floor(140 * 0.5)
  })
})

describe('Sanity.actionSedate — 强行镇静', () => {
  it('SAN > 0 时拒绝执行', () => {
    env.$SM.set('character.san', 5, true)
    env.$SM.set('stores.ember', 100, true)
    env.Sanity.actionSedate()
    expect(env.$SM.get('stores.ember')).toBe(100)
    expect(env.$SM.get('character.san')).toBe(5)
  })

  it('SAN = 0 时执行：清空常规资源，SAN 重置 10', () => {
    env.$SM.set('character.san', 0, true)
    env.$SM.set('stores.ember', 100, true)
    env.$SM.set('stores.grayMatter', 50, true)
    env.$SM.set('stores.concentrate', 5, true)
    env.Sanity.actionSedate()
    expect(env.$SM.get('stores.ember')).toBe(0)
    expect(env.$SM.get('stores.grayMatter')).toBe(0)
    expect(env.$SM.get('stores.concentrate')).toBe(0)
    expect(env.$SM.get('character.san')).toBe(10)
  })
})

describe('Sanity.erosionEvent — 侵蚀事件', () => {
  it('moderate: 损失 10% ember', () => {
    env.$SM.set('stores.ember', 100, true)
    env.Sanity.erosionEvent('moderate')
    expect(env.$SM.get('stores.ember')).toBe(90)
  })

  it('high: 随机损失一名工人', () => {
    env.$SM.set('workers.scavenger', 3, true)
    env.$SM.set('workers.lurker', 2, true)
    env.$SM.set('workers.wanderer', 5, true) // wanderer 应被排除
    // 强制 Math.random 返回 0 选择第一个
    const origRandom = Math.random
    Math.random = () => 0
    env.Sanity.erosionEvent('high')
    Math.random = origRandom
    const workers = env.$SM.get('workers')
    const total = (workers.scavenger || 0) + (workers.lurker || 0)
    expect(total).toBe(4) // 5 - 1
    expect(workers.wanderer).toBe(5) // 未受影响
  })

  it('high: 没有工人时不报错', () => {
    env.$SM.set('workers', {}, true)
    expect(() => env.Sanity.erosionEvent('high')).not.toThrow()
  })

  it('critical: 随机摧毁一座建筑', () => {
    env.$SM.set('buildings.emberFurnace', 2, true)
    env.$SM.set('buildings.dataVault', 1, true)
    const origRandom = Math.random
    Math.random = () => 0
    env.Sanity.erosionEvent('critical')
    Math.random = origRandom
    const buildings = env.$SM.get('buildings')
    const total = (buildings.emberFurnace || 0) + (buildings.dataVault || 0)
    expect(total).toBe(2) // 3 - 1
  })

  it('critical: 没有建筑时不报错', () => {
    env.$SM.set('buildings', {}, true)
    expect(() => env.Sanity.erosionEvent('critical')).not.toThrow()
  })
})

describe('Sanity.onZoneChange — 区域转换通知', () => {
  it('进入 madness 触发通知', () => {
    let msg = null
    const orig = env.Notifications.notify
    env.Notifications.notify = (m) => { msg = m }
    env.Sanity.onZoneChange('awakened', 'madness')
    env.Notifications.notify = orig
    expect(msg).toContain('崩塌')
  })

  it('进入 mindbreak 触发 critical 通知', () => {
    let msg = null, lvl = null
    const orig = env.Notifications.notify
    env.Notifications.notify = (m, l) => { msg = m; lvl = l }
    env.Sanity.onZoneChange('madness', 'mindbreak')
    env.Notifications.notify = orig
    expect(lvl).toBe('critical')
  })
})
