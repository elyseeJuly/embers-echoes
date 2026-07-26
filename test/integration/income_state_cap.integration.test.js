/**
 * T2 集成测试 — Income → State → Cap enforcement
 * ===============================================
 * 验证 Population 注册工人产出 → $SM.collectIncome 原子结算 → Storage 上限钳制 →
 * Sanity 区域产出倍率 → Perk 加成 的跨模块链路。
 *
 * 参考：
 *   - Beyond-the-Light-Cone T2 集成测试模型
 *   - script/population.js   (Population._WORKERS, $SM.setIncome)
 *   - script/state_manager.js (collectIncome, getStorageCap, add)
 *   - script/sanity.js        (getZone, assimilation 阈值)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createGameEnvironment } from '../setup.js'

describe('T2 集成：Income → State → Cap enforcement', () => {
  let env

  beforeEach(() => {
    env = createGameEnvironment()
    // 模拟 Population.init 中的 setIncome 注册流程（不在测试中调用 init，避免触发 DOM/timer）
    // Population._WORKERS 已经在脚本加载时构造好，但 $SM._income 需要显式注册
    for (const key in env.Population._WORKERS) {
      const w = env.Population._WORKERS[key]
      env.$SM.setIncome(key, { delay: w.delay, stores: w.stores })
    }
  })

  it('Population._WORKERS 在脚本加载时已正确配置', () => {
    expect(env.Population._WORKERS.scavenger).toBeDefined()
    expect(env.Population._WORKERS.scavenger.stores.ember).toBe(1)
    expect(env.Population._WORKERS.lurker.stores.ember).toBe(-2)
    expect(env.Population._WORKERS.lurker.stores.grayMatter).toBe(1)
  })

  it('scavenger 收入链路：worker → collectIncome → stores.ember', () => {
    env.$SM.set('workers.scavenger', 5, true)
    env.$SM.collectIncome()
    // 5 * 1 ember = 5
    expect(env.$SM.get('stores.ember')).toBe(5)
  })

  it('lurker 消耗链路：消耗 ember 2/个 → 产出 grayMatter 1/个', () => {
    // 给 5 lurker 准备 10 ember
    env.$SM.set('stores.ember', 10, true)
    env.$SM.set('workers.lurker', 5, true)
    env.$SM.collectIncome()
    // 5 lurker 消耗 10 ember (-10)，产出 5 grayMatter
    expect(env.$SM.get('stores.ember')).toBe(0)
    expect(env.$SM.get('stores.grayMatter')).toBe(5)
  })

  it('lurker 在 ember 不足时跳过产出（atomic skip）', () => {
    env.$SM.set('stores.ember', 5, true) // 仅够 2 lurker，但 5 lurker 整体不足
    env.$SM.set('workers.lurker', 5, true)
    env.$SM.collectIncome()
    // 整体不满足 → 跳过 lurker；ember 保持 5，grayMatter 不产出
    expect(env.$SM.get('stores.ember')).toBe(5)
    expect(env.$SM.get('stores.grayMatter')).toBeUndefined()
  })

  it('存储上限钳制：scavenger 产出超过 ember cap 时被钳制', () => {
    env.$SM.set('stores.ember', 95, true) // cap=100
    env.$SM.set('workers.scavenger', 20, true) // 产出 20 → 115 → 钳到 100
    env.$SM.collectIncome()
    expect(env.$SM.get('stores.ember')).toBe(100)
  })

  it('emberFurnace 提升 cap：(+50/座) 容纳更多产出', () => {
    env.$SM.set('buildings.emberFurnace', 2, true) // cap = 100 + 100 = 200
    env.$SM.set('stores.ember', 150, true)
    env.$SM.set('workers.scavenger', 100, true) // 产出 100 → 250 → 钳到 200
    env.$SM.collectIncome()
    expect(env.$SM.get('stores.ember')).toBe(200)
    expect(env.$SM.getStorageCap('ember')).toBe(200)
  })

  it('assimilation 区(SAN > maxSan-30) 产出 +50%', () => {
    // maxSan=100，assimilation 阈值 = 70；SAN=80 触发倍率
    env.$SM.set('character.san', 80, true)
    env.$SM.set('workers.scavenger', 10, true)
    env.$SM.collectIncome()
    // 10 * 1 * 1.5 = 15
    expect(env.$SM.get('stores.ember')).toBe(15)
  })

  it('awakened 区(SAN 在 30~70) 产出无加成', () => {
    env.$SM.set('character.san', 50, true)
    env.$SM.set('workers.scavenger', 10, true)
    env.$SM.collectIncome()
    expect(env.$SM.get('stores.ember')).toBe(10)
  })

  it('ember_reflux perk 与 assimilation 倍率叠加', () => {
    env.$SM.set('character.san', 80, true) // assimilation
    env.$SM.addPerk('ember_reflux') // +15%
    env.$SM.set('workers.scavenger', 20, true)
    env.$SM.collectIncome()
    // 20 * 1 * 1.5 = 30；30 * 1.15 = 34.5 → floor = 34
    expect(env.$SM.get('stores.ember')).toBe(34)
  })

  it('chemist 同时消耗 ember + grayMatter 产出 concentrate', () => {
    env.$SM.set('stores.ember', 30, true)
    env.$SM.set('stores.grayMatter', 10, true)
    env.$SM.set('workers.chemist', 10, true)
    env.$SM.collectIncome()
    // 10 chemist * -3 ember = -30；-1 grayMatter * 10 = -10；+1 concentrate * 10 = 10
    expect(env.$SM.get('stores.ember')).toBe(0)
    expect(env.$SM.get('stores.grayMatter')).toBe(0)
    expect(env.$SM.get('stores.concentrate')).toBe(10)
  })

  it('sentinel 消耗 grayMatter 但不直接产出 stores（仅 erosion 衰减）', () => {
    env.$SM.set('stores.grayMatter', 5, true)
    env.$SM.set('workers.sentinel', 5, true)
    env.$SM.collectIncome()
    // sentinel.stores = { grayMatter: -1 } → 5 * -1 = -5
    expect(env.$SM.get('stores.grayMatter')).toBe(0)
  })

  it('sentinel.onTick 联动：每 tick -0.5 erosion/sentinel', () => {
    env.$SM.set('character.erosion', 10, true)
    env.$SM.set('workers.sentinel', 4, true)
    // 触发 Population.onTick（模拟 Engine.tick 调用）
    env.Population.onTick()
    // 4 * -0.5 = -2，但 erosion 已为 10 → 8（且不会低于 0）
    expect(env.$SM.get('character.erosion')).toBe(8)
  })

  it('多类型工人混合结算：scavenger 供给 lurker 的链式产出', () => {
    // 设计场景：初始 4 ember + 2 scavenger(产 2) + 3 lurker(消 6)
    // collectIncome 顺序：scavenger 先 → ember=6 → lurker 整体需要 6 ≤ 6 → 通过
    env.$SM.set('stores.ember', 4, true)
    env.$SM.set('workers.scavenger', 2, true)
    env.$SM.set('workers.lurker', 3, true)
    env.$SM.collectIncome()
    // scavenger: +2 → ember=6；lurker: -6 → ember=0, +3 grayMatter
    expect(env.$SM.get('stores.ember')).toBe(0)
    expect(env.$SM.get('stores.grayMatter')).toBe(3)
  })

  it('getNetIncome 反映当前工人配置的净产出', () => {
    env.$SM.set('stores.ember', 100, true)
    env.$SM.set('workers.scavenger', 5, true)
    env.$SM.set('workers.lurker', 2, true)
    const net = env.$SM.getNetIncome()
    // scavenger: +5 ember；lurker: -4 ember, +2 grayMatter
    expect(net.ember).toBe(5 + (-4))
    expect(net.grayMatter).toBe(2)
  })
})
