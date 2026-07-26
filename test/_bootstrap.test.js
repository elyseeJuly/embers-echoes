/**
 * 环境冒烟测试 — 验证 setup.js 能正确加载所有脚本
 */
import { describe, it, expect } from 'vitest'
import { createGameEnvironment } from './setup.js'

describe('test setup bootstrap', () => {
  it('应当加载所有核心全局对象', () => {
    const env = createGameEnvironment()
    expect(env.$SM).toBeDefined()
    expect(env.Engine).toBeDefined()
    expect(env.Sanity).toBeDefined()
    expect(env.Narrative).toBeDefined()
    expect(env.RiftMap).toBeDefined()
    expect(env.Combat).toBeDefined()
    expect(env.Survival).toBeDefined()
    expect(env.MatrixSink).toBeDefined()
    expect(env.Endgame).toBeDefined()
    expect(env.Population).toBeDefined()
    expect(env.Nexus).toBeDefined()
    expect(env.Relics).toBeDefined()
  })

  it('Narrative.dict 数据契约应当完整', () => {
    const { Narrative } = createGameEnvironment()
    expect(Narrative.dict.relics).toBeDefined()
    expect(Narrative.dict.fragments).toBeDefined()
    expect(Narrative.dict.craftingRecipes).toBeDefined()
    expect(Narrative.dict.finalInquiry).toBeDefined()
    expect(Narrative.dict.events.length).toBeGreaterThan(0)
  })

  it('$SM.init 应当初始化干净状态树', () => {
    const { $SM } = createGameEnvironment()
    expect($SM.get('game.phase')).toBe(0)
    expect($SM.get('stores.ember')).toBeUndefined()
    expect($SM.get('character.san')).toBe(50)
  })

  it('jQuery + $.Dispatch 应当正常工作', () => {
    const { window, $SM } = createGameEnvironment()
    expect(window.$).toBeDefined()
    expect(window.$.Dispatch).toBeDefined()
    let received = null
    window.$.Dispatch('stateUpdate').subscribe((e) => { received = e })
    $SM.set('stores.ember', 10)
    expect(received).toEqual({ path: 'stores.ember' })
  })
})
