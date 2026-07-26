/**
 * T1 单元测试 — Endgame Module
 * 覆盖：evaluateEndings 结局判定逻辑、askQuestion 流转条件
 * 注意：不测试 DOM 渲染与定时器，只测试纯逻辑分支
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createGameEnvironment } from '../setup.js'

let env
beforeEach(() => {
  env = createGameEnvironment()
})

describe('Endgame.evaluateEndings — 结局判定', () => {
  it('无任何遗物 → bad', () => {
    expect(env.Endgame.evaluateEndings()).toBe('bad')
  })

  it('只有常规遗物（无 relic_carbon） → normal', () => {
    env.$SM.addRelic('relic_cyber')
    expect(env.Endgame.evaluateEndings()).toBe('normal')
  })

  it('只有特殊遗物（无 relic_carbon） → normal', () => {
    env.$SM.addRelic('relic_fractal')
    expect(env.Endgame.evaluateEndings()).toBe('normal')
  })

  it('只有 relic_carbon（无法回答 q_entropy/q_paradox） → normal', () => {
    // 设计意图：relic_carbon 是锚点，但单独持有无法通过前两题，应进入 normal 而非 true
    env.$SM.addRelic('relic_carbon')
    expect(env.Endgame.evaluateEndings()).toBe('normal')
  })

  it('relic_carbon + 任一常规遗物 → true', () => {
    env.$SM.addRelic('relic_carbon')
    env.$SM.addRelic('relic_bio')
    expect(env.Endgame.evaluateEndings()).toBe('true')
  })

  it('relic_carbon + 任一特殊遗物 → true', () => {
    env.$SM.addRelic('relic_carbon')
    env.$SM.addRelic('relic_time')
    expect(env.Endgame.evaluateEndings()).toBe('true')
  })

  it('relic_carbon + 多个遗物 → true', () => {
    env.$SM.addRelic('relic_carbon')
    env.$SM.addRelic('relic_cyber')
    env.$SM.addRelic('relic_bio')
    env.$SM.addRelic('relic_magic')
    env.$SM.addRelic('relic_fractal')
    env.$SM.addRelic('relic_time')
    expect(env.Endgame.evaluateEndings()).toBe('true')
  })

  it('所有遗物但缺少 relic_carbon → normal', () => {
    env.$SM.addRelic('relic_cyber')
    env.$SM.addRelic('relic_bio')
    env.$SM.addRelic('relic_magic')
    env.$SM.addRelic('relic_fractal')
    env.$SM.addRelic('relic_time')
    expect(env.Endgame.evaluateEndings()).toBe('normal')
  })

  it('消耗掉 relic_carbon 后降级为 normal', () => {
    env.$SM.addRelic('relic_carbon')
    env.$SM.addRelic('relic_cyber')
    expect(env.Endgame.evaluateEndings()).toBe('true')
    env.$SM.consumeRelic('relic_carbon')
    expect(env.Endgame.evaluateEndings()).toBe('normal')
  })

  it('消耗掉所有有效遗物后降级为 bad', () => {
    env.$SM.addRelic('relic_cyber')
    expect(env.Endgame.evaluateEndings()).toBe('normal')
    env.$SM.consumeRelic('relic_cyber')
    expect(env.Endgame.evaluateEndings()).toBe('bad')
  })
})

describe('Endgame.handlePhaseChange — 阶段监听', () => {
  it('to=END 时触发 startSequence', () => {
    let called = false
    const orig = env.Endgame.startSequence
    env.Endgame.startSequence = () => { called = true }
    env.Endgame.handlePhaseChange({ to: env.Engine.PHASES.END })
    env.Endgame.startSequence = orig
    expect(called).toBe(true)
  })

  it('非 END 阶段不触发', () => {
    let called = false
    const orig = env.Endgame.startSequence
    env.Endgame.startSequence = () => { called = true }
    env.Endgame.handlePhaseChange({ to: env.Engine.PHASES.MAP })
    env.Endgame.startSequence = orig
    expect(called).toBe(false)
  })
})

describe('Endgame.evaluateEndings — 边界与异常保护', () => {
  it('Narrative.dict 缺失 finalInquiry 时返回 bad', () => {
    const origFi = env.Narrative.dict.finalInquiry
    env.Narrative.dict.finalInquiry = null
    expect(env.Endgame.evaluateEndings()).toBe('bad')
    env.Narrative.dict.finalInquiry = origFi
  })

  it('finalInquiry.questions 为空数组 + 无任何遗物 → bad', () => {
    const origQ = env.Narrative.dict.finalInquiry.questions
    env.Narrative.dict.finalInquiry.questions = []
    expect(env.Endgame.evaluateEndings()).toBe('bad')
    env.Narrative.dict.finalInquiry.questions = origQ
  })

  it('finalInquiry.questions 为空数组 + 仅有 relic_carbon → normal（与 only-carbon 一致）', () => {
    const origQ = env.Narrative.dict.finalInquiry.questions
    env.Narrative.dict.finalInquiry.questions = []
    env.$SM.addRelic('relic_carbon')
    expect(env.Endgame.evaluateEndings()).toBe('normal')
    env.Narrative.dict.finalInquiry.questions = origQ
  })
})
