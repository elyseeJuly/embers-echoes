/**
 * T2 集成测试 — Phase Progression & Engine Tick Chain
 * ===================================================
 * 验证完整阶段链路：
 *   NULL(0) → SPARK(1) → CAMP(2) → ABYSS(3) → MAP(4) → SINK(5) → END(6)
 *
 * 测试：
 *   1. Engine.setPhase 单调递增
 *   2. Engine.checkPhaseUnlock 依据资源阈值推进
 *   3. Engine.tick 调用 $SM.collectIncome + Sanity.tick + MatrixSink.tick
 *   4. phaseChange 事件触发模块响应（Population / RiftMap / MatrixSink / Endgame）
 *   5. MatrixSink.submitResources 消耗资源推进进度
 *   6. MatrixSink.checkCompletion 触发 END phase
 *
 * 参考：
 *   - script/engine.js      (setPhase, checkPhaseUnlock, tick, onPhaseChange)
 *   - script/state_manager.js (collectIncome, add)
 *   - script/sanity.js      (tick)
 *   - script/matrix_sink.js (submitResources, checkCompletion, stabilizeAnchor)
 *   - script/endgame.js     (handlePhaseChange)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createGameEnvironment } from '../setup.js'

describe('T2 集成：Phase Progression & Engine Tick Chain', () => {
  let env

  beforeEach(() => {
    env = createGameEnvironment()
    // 注册 Population 的 income（与 Population.init 中相同）
    for (const key in env.Population._WORKERS) {
      const w = env.Population._WORKERS[key]
      env.$SM.setIncome(key, { delay: w.delay, stores: w.stores })
    }
  })

  // ── 阶段枚举完整性 ─────────────────────────────────────────

  it('Engine.PHASES 七阶段枚举完整', () => {
    expect(env.Engine.PHASES.NULL).toBe(0)
    expect(env.Engine.PHASES.SPARK).toBe(1)
    expect(env.Engine.PHASES.CAMP).toBe(2)
    expect(env.Engine.PHASES.ABYSS).toBe(3)
    expect(env.Engine.PHASES.MAP).toBe(4)
    expect(env.Engine.PHASES.SINK).toBe(5)
    expect(env.Engine.PHASES.END).toBe(6)
  })

  // ── setPhase 单调性 ────────────────────────────────────────

  it('Engine.setPhase 单调递增（拒绝回退）', () => {
    env.$SM.set('game.phase', 3, true)
    env.Engine.setPhase(2) // 尝试回退
    expect(env.Engine.getPhase()).toBe(3)

    env.Engine.setPhase(5)
    expect(env.Engine.getPhase()).toBe(5)
  })

  it('Engine.setPhase 推进时触发 phaseChange 事件', () => {
    let received = null
    env.window.$.Dispatch('phaseChange').subscribe((e) => { received = e })
    env.Engine.setPhase(2)
    expect(received).toEqual({ from: 0, to: 2 })
  })

  // ── checkPhaseUnlock 阈值推进 ──────────────────────────────

  it('checkPhaseUnlock SPARK→CAMP：ember >= 50 推进', () => {
    env.$SM.set('game.phase', env.Engine.PHASES.SPARK, true)
    env.$SM.set('stores.ember', 49, true)
    env.Engine.checkPhaseUnlock()
    expect(env.Engine.getPhase()).toBe(env.Engine.PHASES.SPARK) // 未达阈值

    env.$SM.set('stores.ember', 50, true)
    env.Engine.checkPhaseUnlock()
    expect(env.Engine.getPhase()).toBe(env.Engine.PHASES.CAMP)
  })

  it('checkPhaseUnlock CAMP→ABYSS：ember >= 200 或 grayMatter >= 50', () => {
    env.$SM.set('game.phase', env.Engine.PHASES.CAMP, true)

    // 路径 A：ember ≥ 200
    env.$SM.set('stores.ember', 200, true)
    env.$SM.set('stores.grayMatter', 0, true)
    env.Engine.checkPhaseUnlock()
    expect(env.Engine.getPhase()).toBe(env.Engine.PHASES.ABYSS)
  })

  it('checkPhaseUnlock CAMP→ABYSS：grayMatter >= 50 也可推进', () => {
    env.$SM.set('game.phase', env.Engine.PHASES.CAMP, true)
    env.$SM.set('stores.ember', 100, true) // < 200
    env.$SM.set('stores.grayMatter', 50, true)
    env.Engine.checkPhaseUnlock()
    expect(env.Engine.getPhase()).toBe(env.Engine.PHASES.ABYSS)
  })

  it('checkPhaseUnlock ABYSS→MAP：需要 game.hasRiftCoord 标志', () => {
    env.$SM.set('game.phase', env.Engine.PHASES.ABYSS, true)
    env.Engine.checkPhaseUnlock()
    expect(env.Engine.getPhase()).toBe(env.Engine.PHASES.ABYSS) // 未触发

    env.$SM.set('game.hasRiftCoord', true, true)
    env.Engine.checkPhaseUnlock()
    expect(env.Engine.getPhase()).toBe(env.Engine.PHASES.MAP)
  })

  // ── Engine.tick 调度链 ─────────────────────────────────────

  it('Engine.tick 在 phase<CAMP 时不调用 collectIncome', () => {
    env.$SM.set('game.phase', env.Engine.PHASES.SPARK, true)
    env.$SM.set('workers.scavenger', 10, true)
    env.Engine.tick()
    // SPARK 阶段不应结算 income
    expect(env.$SM.get('stores.ember')).toBeUndefined()
  })

  it('Engine.tick 在 phase>=CAMP 时调用 collectIncome', () => {
    env.$SM.set('game.phase', env.Engine.PHASES.CAMP, true)
    env.$SM.set('workers.scavenger', 10, true)
    env.Engine.tick()
    expect(env.$SM.get('stores.ember')).toBe(10)
  })

  it('Engine.tick 在 phase>=ABYSS 时调用 Sanity.tick', () => {
    env.$SM.set('game.phase', env.Engine.PHASES.ABYSS, true)
    env.$SM.set('character.san', 25, true) // madness 区
    env.$SM.set('character.erosion', 0, true)
    env.Engine.tick()
    // madness 区每 tick +0.5 erosion
    expect(env.$SM.get('character.erosion')).toBe(0.5)
  })

  it('Engine.tick 在 phase>=SINK 时调用 MatrixSink.tick', () => {
    env.$SM.set('game.phase', env.Engine.PHASES.SINK, true)
    env.$SM.set('game.matrixProgress', 100, true)
    // MatrixSink.tick 调用 updateView，但 DOM 不存在 → 应安全跳过
    expect(() => env.Engine.tick()).not.toThrow()
  })

  it('Engine.tick 在 GAME_OVER=true 时跳过所有调度', () => {
    env.Engine.GAME_OVER = true
    env.$SM.set('game.phase', env.Engine.PHASES.CAMP, true)
    env.$SM.set('workers.scavenger', 10, true)
    env.Engine.tick()
    expect(env.$SM.get('stores.ember')).toBeUndefined()
    env.Engine.GAME_OVER = false
  })

  // ── MatrixSink 阶段推进 ────────────────────────────────────

  it('MatrixSink.submitResources 消耗 ember/grayMatter/concentrate/whispers 推进进度', () => {
    env.$SM.set('game.phase', env.Engine.PHASES.SINK, true)
    env.$SM.set('game.matrixProgress', 0, true)
    env.$SM.set('stores.ember', 100, true)
    env.$SM.set('stores.grayMatter', 50, true)
    env.$SM.set('stores.concentrate', 10, true)
    env.$SM.set('stores.whispers', 20, true)

    env.MatrixSink.submitResources()

    // ember=0, grayMatter=0, concentrate=0, whispers=0
    expect(env.$SM.get('stores.ember')).toBe(0)
    expect(env.$SM.get('stores.grayMatter')).toBe(0)
    expect(env.$SM.get('stores.concentrate')).toBe(0)
    expect(env.$SM.get('stores.whispers')).toBe(0)

    // work = 100*1 + 50*5 + 10*50 + 20*20 = 100 + 250 + 500 + 400 = 1250
    expect(env.$SM.get('game.matrixProgress')).toBe(1250)
  })

  it('MatrixSink.submitResources 在 phase<4 时受 capWork 限制（每阶段 25%）', () => {
    env.$SM.set('game.phase', env.Engine.PHASES.SINK, true)
    env.$SM.set('game.matrixPhase', 0, true) // phase 0 → capWork = 25% = 250000
    env.$SM.set('game.matrixProgress', 240000, true) // 接近上限
    env.$SM.set('stores.ember', 100000, true) // 试图注入超过剩余空间

    env.MatrixSink.submitResources()

    // 应被钳制到 250000
    expect(env.$SM.get('game.matrixProgress')).toBe(250000)
  })

  it('MatrixSink.submitRelic 消耗 1 relic 推进 10000 work', () => {
    env.$SM.set('game.phase', env.Engine.PHASES.SINK, true)
    env.$SM.set('game.matrixProgress', 0, true)
    env.$SM.set('stores.relics', 5, true)

    env.MatrixSink.submitRelic()

    expect(env.$SM.get('stores.relics')).toBe(4)
    expect(env.$SM.get('game.matrixProgress')).toBe(10000)
  })

  it('MatrixSink.checkCompletion 在 100% 时触发 END phase', () => {
    env.$SM.set('game.phase', env.Engine.PHASES.SINK, true)
    env.$SM.set('game.matrixProgress', env.MatrixSink.TOTAL_WORK_REQUIRED, true)

    env.MatrixSink.checkCompletion()

    expect(env.Engine.getPhase()).toBe(env.Engine.PHASES.END)
  })

  it('MatrixSink.stabilizeAnchor 消耗 (phase+1)*10 人口推进 phase', () => {
    env.$SM.set('game.phase', env.Engine.PHASES.SINK, true)
    env.$SM.set('game.matrixPhase', 0, true)
    env.$SM.set('game.matrixProgress', env.MatrixSink.TOTAL_WORK_REQUIRED * 0.25, true) // 满 25%
    env.$SM.set('workers.wanderer', 15, true)
    env.$SM.set('workers.scavenger', 5, true)

    env.MatrixSink.stabilizeAnchor()

    // 消耗 10 人口（先 wanderer 后其他）
    expect(env.Population.getCurrentPopulation()).toBe(10) // 15+5-10=10
    expect(env.$SM.get('game.matrixPhase')).toBe(1)
  })

  it('MatrixSink.stabilizeAnchor 人口不足时拒绝执行', () => {
    env.$SM.set('game.phase', env.Engine.PHASES.SINK, true)
    env.$SM.set('game.matrixPhase', 0, true)
    env.$SM.set('workers.wanderer', 5, true) // < 10

    env.MatrixSink.stabilizeAnchor()

    expect(env.$SM.get('game.matrixPhase')).toBe(0) // 未推进
    expect(env.$SM.get('workers.wanderer')).toBe(5) // 未消耗
  })

  // ── Endgame 阶段触发 ───────────────────────────────────────

  it('phaseChange → END 时触发 Endgame.startSequence（不报错即可）', () => {
    env.$SM.set('game.phase', env.Engine.PHASES.SINK, true)
    // startSequence 会调用 $('body').fadeOut，jsdom 中可能不报错；但内部 setTimeout 链较深
    // 这里只验证 handlePhaseChange 能正确路由
    expect(() => env.Endgame.handlePhaseChange({ from: 5, to: 6 })).not.toThrow()
  })

  // ── 完整阶段推进链 ─────────────────────────────────────────

  it('完整阶段推进：NULL → SPARK → CAMP → ABYSS → MAP → SINK → END', () => {
    // NULL → SPARK（直接 set，SPARK 通常由玩家点击触发）
    env.Engine.setPhase(env.Engine.PHASES.SPARK)
    expect(env.Engine.getPhase()).toBe(1)

    // SPARK → CAMP（ember >= 50）
    env.$SM.set('stores.ember', 50, true)
    env.Engine.checkPhaseUnlock()
    expect(env.Engine.getPhase()).toBe(2)

    // CAMP → ABYSS（ember >= 200）
    env.$SM.set('stores.ember', 200, true)
    env.Engine.checkPhaseUnlock()
    expect(env.Engine.getPhase()).toBe(3)

    // ABYSS → MAP（hasRiftCoord）
    env.$SM.set('game.hasRiftCoord', true, true)
    env.Engine.checkPhaseUnlock()
    expect(env.Engine.getPhase()).toBe(4)

    // MAP → SINK（直接 setPhase，模拟 MatrixSink 模块被触发）
    env.Engine.setPhase(env.Engine.PHASES.SINK)
    expect(env.Engine.getPhase()).toBe(5)

    // SINK → END（MatrixSink 完成）
    env.$SM.set('game.matrixProgress', env.MatrixSink.TOTAL_WORK_REQUIRED, true)
    env.MatrixSink.checkCompletion()
    expect(env.Engine.getPhase()).toBe(6)
  })
})
