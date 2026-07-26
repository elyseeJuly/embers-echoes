/**
 * T3 Headless 模拟 — Soak 长周期压力测试
 * ======================================
 * 仅在 SIM_SOAK=1 时运行（避免每次 CI 都跑）。
 * 验证长周期运行不会出现：异常、tick 死锁、tick-attempt-cap。
 *
 * 参考：Beyond-the-Light-Cone/src/test/simulation/soak.sim.test.ts
 */
import { describe, expect, it } from 'vitest'
import { createPolicy } from '../policies.js'
import { runSimulationSuite } from '../SimulationSuite.js'

const ENV = (globalThis.process?.env) || {}

function parsePositiveInteger(value, fallback) {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected positive integer, received: ${value}`)
  }
  return parsed
}

const SOAK_POLICIES = ['conservative', 'aggressive', 'balanced', 'seeded-random']

describe.runIf(ENV.SIM_SOAK === '1')('T3 Headless Simulation — soak', () => {
  it('长周期运行不出现异常、tick 死锁或 tick-attempt 上限', () => {
    const runs = parsePositiveInteger(ENV.SIM_SOAK_RUNS, 4)
    const ticks = parsePositiveInteger(ENV.SIM_SOAK_TICKS, 300)
    const baseSeed = parsePositiveInteger(ENV.SIM_SOAK_BASE_SEED, 2026072699)

    const summary = runSimulationSuite(
      Array.from({ length: runs }, (_, index) => {
        const seed = baseSeed + index * 104729
        const policyId = SOAK_POLICIES[index % SOAK_POLICIES.length]
        return {
          seed,
          targetTicks: ticks,
          maxTickAttempts: ticks * 10,
          traceLimit: 500,
          createPolicy: () => createPolicy(policyId, seed),
        }
      }),
    )

    console.info('[SoakReport]', JSON.stringify({
      runs: summary.totalRuns,
      averageTicksAdvanced: summary.averageTicksAdvanced,
      terminationCounts: summary.terminationCounts,
      finalPhaseCounts: summary.finalPhaseCounts,
    }, null, 2))

    if (summary.failures.length > 0) {
      console.error(JSON.stringify(summary.failures, null, 2))
    }

    expect(summary.failedRuns).toBe(0)
    expect(summary.terminationCounts.exception ?? 0).toBe(0)
    expect(summary.terminationCounts['tick-attempt-cap'] ?? 0).toBe(0)
    expect(summary.terminationCounts['invariant-violation'] ?? 0).toBe(0)
  }, 30 * 60 * 1000)
})
