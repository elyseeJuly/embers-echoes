/**
 * T3 Headless 模拟 — Smoke 测试
 * ==============================
 * 快速验证：
 *   1. SeededRng 跨运行可复现
 *   2. 单一策略 + 小 seed 可稳定完成 N 个 tick
 *   3. 相同 seed + 相同策略 → 相同终态 + 相同 trace
 *   4. 多 seed smoke 无运行时不变量违例
 *
 * 参考：Beyond-the-Light-Cone/src/test/simulation/smoke.sim.test.ts
 */
import { describe, expect, it } from 'vitest'
import { createGameEnvironment } from '../../setup.js'
import { GameSimulationAdapter } from '../GameSimulationAdapter.js'
import { createPolicy } from '../policies.js'
import { SeededRng } from '../SeededRng.js'

function expectHealthyRun(result) {
  if (result.violations.length > 0 || result.errorMessage) {
    console.error(JSON.stringify(result, null, 2))
  }
  expect(result.errorMessage).toBeUndefined()
  expect(result.violations).toEqual([])
  expect(result.terminationReason).not.toBe('exception')
  expect(result.terminationReason).not.toBe('tick-attempt-cap')
}

describe('T3 Headless Simulation — smoke', () => {
  it('SeededRng 对同一 seed 产生相同序列', () => {
    const left = new SeededRng(20260726)
    const right = new SeededRng(20260726)
    const leftSeq = Array.from({ length: 12 }, () => left.random())
    const rightSeq = Array.from({ length: 12 }, () => right.random())

    expect(leftSeq).toEqual(rightSeq)
    expect(new Set(leftSeq).size).toBeGreaterThan(1)
  })

  it('conservative 策略可稳定完成 10 个 tick', () => {
    const env = createGameEnvironment()
    const result = new GameSimulationAdapter({
      seed: 20260726,
      targetTicks: 10,
      policy: createPolicy('conservative', 20260726),
      env,
    }).run()

    expectHealthyRun(result)
    expect(result.completedTicks).toBe(10)
    expect(result.trace.length).toBeGreaterThan(0)
    expect(result.replayCommand).toContain('SIM_SEED=20260726')
    expect(result.replayCommand).toContain('SIM_POLICY=conservative')
  })

  it('相同 seed + 相同策略得到相同终态和轨迹', () => {
    const run = () => {
      const env = createGameEnvironment()
      return new GameSimulationAdapter({
        seed: 314159,
        targetTicks: 15,
        policy: createPolicy('seeded-random', 314159),
        env,
      }).run()
    }

    const first = run()
    const second = run()

    expectHealthyRun(first)
    expectHealthyRun(second)
    expect(second.end).toEqual(first.end)
    expect(second.terminationReason).toBe(first.terminationReason)
    expect(second.trace).toEqual(first.trace)
  })

  it.each([1, 7, 42, 2026, 65537])('多 seed smoke 无运行时不变量违例：seed=%s', (seed) => {
    const env = createGameEnvironment()
    const result = new GameSimulationAdapter({
      seed,
      targetTicks: 12,
      policy: createPolicy('seeded-random', seed),
      env,
    }).run()

    expectHealthyRun(result)
    expect(result.completedTicks).toBe(12)
  })

  it('模拟过程中 phase 至少推进到 SPARK', () => {
    const env = createGameEnvironment()
    const result = new GameSimulationAdapter({
      seed: 42,
      targetTicks: 8,
      policy: createPolicy('conservative', 42),
      env,
    }).run()

    expectHealthyRun(result)
    expect(result.end.phase).toBeGreaterThanOrEqual(1) // 至少 SPARK
    expect(result.coverage.observedPhases).toContain(1)
  })
})
