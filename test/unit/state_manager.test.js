/**
 * T1 单元测试 — State Manager ($SM)
 * 覆盖：路径访问、硬上限钳制、SAN/erosion 钳制、原子收入结算、库存管理、Perk
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createGameEnvironment } from '../setup.js'

let env
beforeEach(() => {
  env = createGameEnvironment()
})

describe('$SM.get — 路径访问', () => {
  it('点分路径读取存在值', () => {
    env.$SM.set('stores.ember', 42, true)
    expect(env.$SM.get('stores.ember')).toBe(42)
  })

  it('读取不存在的路径返回 undefined', () => {
    expect(env.$SM.get('stores.undefined_key')).toBeUndefined()
  })

  it('requestZero=true 时缺失值返回 0', () => {
    expect(env.$SM.get('stores.undefined_key', true)).toBe(0)
  })

  it('支持方括号语法 stores["alien alloy"]', () => {
    env.$SM.set('stores.alien alloy', 7, true)
    expect(env.$SM.get('stores["alien alloy"]')).toBe(7)
  })

  it('支持嵌套对象路径', () => {
    env.$SM.set('character.buffs.ember_reflux', true, true)
    expect(env.$SM.get('character.buffs.ember_reflux')).toBe(true)
  })

  it('null/undefined 中间节点安全返回', () => {
    env.$SM.set('a.b.c', 1, true)
    env.$SM.set('a.b', null, true)
    expect(env.$SM.get('a.b.c')).toBeUndefined()
    expect(env.$SM.get('a.b.c', true)).toBe(0)
  })
})

describe('$SM.set / setM — 写入', () => {
  it('set 自动创建中间对象', () => {
    env.$SM.set('deeply.nested.value', 'hello', true)
    expect(env.$SM.get('deeply.nested.value')).toBe('hello')
  })

  it('set 默认触发 stateUpdate 事件', () => {
    let received = null
    env.window.$.Dispatch('stateUpdate').subscribe((e) => { received = e })
    env.$SM.set('stores.ember', 100)
    expect(received).toEqual({ path: 'stores.ember' })
  })

  it('set noEvent=true 不触发事件', () => {
    let count = 0
    env.window.$.Dispatch('stateUpdate').subscribe(() => { count++ })
    env.$SM.set('stores.ember', 100, true)
    expect(count).toBe(0)
  })

  it('setM 批量写入并触发一次父路径事件', () => {
    let events = []
    env.window.$.Dispatch('stateUpdate').subscribe((e) => { events.push(e.path) })
    env.$SM.setM('stores', { ember: 1, grayMatter: 2, whispers: 3 })
    expect(env.$SM.get('stores.ember')).toBe(1)
    expect(env.$SM.get('stores.grayMatter')).toBe(2)
    expect(env.$SM.get('stores.whispers')).toBe(3)
    expect(events).toContain('stores')
  })
})

describe('$SM.add — 数值增减与硬上限', () => {
  it('数值递增正常工作', () => {
    env.$SM.set('stores.ember', 50, true)
    expect(env.$SM.add('stores.ember', 10)).toBe(0)
    expect(env.$SM.get('stores.ember')).toBe(60)
  })

  it('数值递减不跌破 0', () => {
    env.$SM.set('stores.ember', 5, true)
    env.$SM.add('stores.ember', -100)
    expect(env.$SM.get('stores.ember')).toBe(0)
  })

  it('未初始化数值 add 时从 0 开始', () => {
    env.$SM.add('stores.ember', 30)
    expect(env.$SM.get('stores.ember')).toBe(30)
  })

  it('ember 受存储上限钳制（base cap=100）', () => {
    env.$SM.add('stores.ember', 200)
    expect(env.$SM.get('stores.ember')).toBe(100)
  })

  it('emberFurnace 提升 ember 上限 +50/座', () => {
    env.$SM.set('buildings.emberFurnace', 2, true)
    env.$SM.add('stores.ember', 300)
    expect(env.$SM.get('stores.ember')).toBe(200) // 100 + 2*50
  })

  it('grayMatter 受 cap=50 + 30/座 钳制', () => {
    env.$SM.set('buildings.graySynthesizer', 1, true)
    env.$SM.add('stores.grayMatter', 1000)
    expect(env.$SM.get('stores.grayMatter')).toBe(80) // 50 + 30
  })

  it('whispers cap=20 + 10/数据金库', () => {
    env.$SM.set('buildings.dataVault', 3, true)
    env.$SM.add('stores.whispers', 1000)
    expect(env.$SM.get('stores.whispers')).toBe(50) // 20 + 30
  })

  it('whispers 满载时触发通知（仅一次）', () => {
    let notifCount = 0
    const origNotify = env.Notifications.notify
    env.Notifications.notify = () => { notifCount++ }
    env.$SM.add('stores.whispers', 25)
    expect(env.$SM.get('stores.whispers')).toBe(20)
    expect(notifCount).toBe(1)
    env.Notifications.notify = origNotify
  })

  it('SAN 钳制到 [0, maxSan]', () => {
    env.$SM.set('character.san', 50, true)
    env.$SM.add('character.san', -200)
    expect(env.$SM.get('character.san')).toBe(0)
    env.$SM.add('character.san', 500)
    expect(env.$SM.get('character.san')).toBe(100) // 默认 maxSan=100
  })

  it('SAN 上限受认知屏障建筑影响', () => {
    env.$SM.set('buildings.cognitiveBarrier', 3, true)
    env.$SM.set('character.san', 50, true)
    env.$SM.add('character.san', 500)
    expect(env.$SM.get('character.san')).toBe(130) // 100 + 3*10
  })

  it('erosion 钳制到 [0, 100]', () => {
    env.$SM.add('character.erosion', 500)
    expect(env.$SM.get('character.erosion')).toBe(100)
    env.$SM.add('character.erosion', -1000)
    expect(env.$SM.get('character.erosion')).toBe(0)
  })

  it('非数值字段 add 返回 1', () => {
    env.$SM.set('stores.textfield', 'not a number', true)
    expect(env.$SM.add('stores.textfield', 5)).toBe(1)
  })

  it('addM 返回失败计数', () => {
    env.$SM.set('stores.textfield', 'string', true)
    const failures = env.$SM.addM('stores', { ember: 1, textfield: 5 })
    expect(failures).toBe(1)
  })
})

describe('$SM.getStorageCap — 上限计算', () => {
  it('ember 默认 100', () => {
    expect(env.$SM.getStorageCap('ember')).toBe(100)
  })

  it('ember + emberFurnace*50', () => {
    env.$SM.set('buildings.emberFurnace', 4, true)
    expect(env.$SM.getStorageCap('ember')).toBe(300)
  })

  it('anomalies 默认 200 + dataVault*50', () => {
    expect(env.$SM.getStorageCap('anomalies')).toBe(200)
    env.$SM.set('buildings.dataVault', 2, true)
    expect(env.$SM.getStorageCap('anomalies')).toBe(300)
  })

  it('relics cap 受数据金库影响', () => {
    expect(env.$SM.getStorageCap('relics')).toBe(10)
    env.$SM.set('buildings.dataVault', 3, true)
    expect(env.$SM.getStorageCap('relics')).toBe(40)
  })

  it('未知资源使用 MAX_STORE', () => {
    expect(env.$SM.getStorageCap('unknownResource')).toBe(env.$SM.MAX_STORE)
  })
})

describe('$SM 收入系统', () => {
  beforeEach(() => {
    env.$SM.setIncome('scavenger', { delay: 10, stores: { ember: 1 } })
    env.$SM.setIncome('lurker', { delay: 10, stores: { ember: -2, grayMatter: 1 } })
  })

  it('setIncome/getIncome 注册与读取', () => {
    expect(env.$SM.getIncome('scavenger')).toEqual({ delay: 10, stores: { ember: 1 } })
    expect(env.$SM.getIncome('unknown')).toBeNull()
  })

  it('getNetIncome 汇总工人净产出', () => {
    env.$SM.set('workers.scavenger', 3, true)
    env.$SM.set('workers.lurker', 1, true)
    const net = env.$SM.getNetIncome()
    expect(net.ember).toBe(1) // 3*1 + 1*(-2) = 1
    expect(net.grayMatter).toBe(1) // 1*1 = 1
  })

  it('collectIncome 原子结算产出', () => {
    env.$SM.set('workers.scavenger', 5, true)
    env.$SM.collectIncome()
    expect(env.$SM.get('stores.ember')).toBe(5)
  })

  it('collectIncome 在消耗品不足时跳过该工人', () => {
    // 多个 lurker 共需 6 ember，初始 1 + scavenger 产出 1 = 2 不足以支撑 lurker(3)
    env.$SM.set('workers.scavenger', 1, true)
    env.$SM.set('workers.lurker', 3, true) // 3 * 2 = 6 ember needed
    env.$SM.set('stores.ember', 1, true)
    env.$SM.collectIncome()
    // scavenger 先 +1 → ember=2；lurker needed=6 > 2，跳过
    expect(env.$SM.get('stores.ember')).toBe(2)
    expect(env.$SM.get('stores.grayMatter')).toBeUndefined()
  })

  it('collectIncome 顺序结算使前序产出可供后续消耗（同 tick 内联动）', () => {
    // lurker 需要 2 ember/工人，初始 ember=1；scavenger 先 +1 → ember=2，lurker 满足后消耗
    env.$SM.set('workers.scavenger', 1, true)
    env.$SM.set('workers.lurker', 1, true)
    env.$SM.set('stores.ember', 1, true)
    env.$SM.collectIncome()
    expect(env.$SM.get('stores.ember')).toBe(0) // 1 + 1 - 2
    expect(env.$SM.get('stores.grayMatter')).toBe(1)
  })

  it('collectIncome 在同化区(SAN > max-30)应用 +50% 产出倍率', () => {
    env.$SM.set('workers.scavenger', 2, true)
    env.$SM.set('character.san', 95, true) // 默认 max=100，阈值 70
    env.$SM.collectIncome()
    expect(env.$SM.get('stores.ember')).toBe(3) // 2*1*1.5=3 (floor)
  })

  it('collectIncome ember_reflux perk 给 ember 额外 +15%', () => {
    env.$SM.set('workers.scavenger', 20, true)
    env.$SM.set('character.san', 50, true)
    env.$SM.addPerk('ember_reflux')
    env.$SM.collectIncome()
    // 20 * 1 * 1.15 = 23
    expect(env.$SM.get('stores.ember')).toBe(23)
  })
})

describe('$SM 库存管理', () => {
  it('addFragment/hasFragment/consumeFragment', () => {
    expect(env.$SM.hasFragment('frag_turing')).toBe(false)
    env.$SM.addFragment('frag_turing')
    expect(env.$SM.hasFragment('frag_turing')).toBe(true)
    env.$SM.addFragment('frag_turing')
    expect(env.$SM.get('fragmentInventory').length).toBe(2)
    env.$SM.consumeFragment('frag_turing')
    expect(env.$SM.get('fragmentInventory').length).toBe(1)
    expect(env.$SM.hasFragment('frag_turing')).toBe(true)
    env.$SM.consumeFragment('frag_turing')
    expect(env.$SM.hasFragment('frag_turing')).toBe(false)
  })

  it('addRelic/hasRelic/consumeRelic', () => {
    expect(env.$SM.hasRelic('relic_carbon')).toBe(false)
    env.$SM.addRelic('relic_carbon')
    expect(env.$SM.hasRelic('relic_carbon')).toBe(true)
    env.$SM.consumeRelic('relic_carbon')
    expect(env.$SM.hasRelic('relic_carbon')).toBe(false)
  })

  it('consumeFragment/Relic 在缺失时不报错', () => {
    expect(() => env.$SM.consumeFragment('nonexistent')).not.toThrow()
    expect(() => env.$SM.consumeRelic('nonexistent')).not.toThrow()
  })
})

describe('$SM Perk 系统', () => {
  it('addPerk/hasPerk 设置与查询', () => {
    expect(env.$SM.hasPerk('spatial_fold')).toBe(false)
    env.$SM.addPerk('spatial_fold')
    expect(env.$SM.hasPerk('spatial_fold')).toBe(true)
  })

  it('addPerk 触发通知', () => {
    let notif = null
    const orig = env.Notifications.notify
    env.Notifications.notify = (msg) => { notif = msg }
    env.$SM.addPerk('spatial_fold')
    env.Notifications.notify = orig
    expect(notif).toBe('学会了折叠空间的技巧')
  })
})

describe('$SM.remove — 删除路径', () => {
  it('删除叶子节点', () => {
    env.$SM.set('stores.ember', 50, true)
    env.$SM.remove('stores.ember')
    expect(env.$SM.get('stores.ember')).toBeUndefined()
  })

  it('删除不存在的路径不报错', () => {
    expect(() => env.$SM.remove('nonexistent.path')).not.toThrow()
  })
})
