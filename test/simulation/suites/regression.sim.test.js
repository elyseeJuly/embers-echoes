/**
 * T3 Headless 模拟 — 回归种子库测试
 * =================================
 * 所有登记在 regressionSeeds.js 中的 seed 必须可复现且无运行时违例。
 * 每次 Engine/Policy/Invariant 改动后都应跑这个测试，验证未引入退化。
 *
 * 参考：Beyond-the-Light-Cone/src/test/simulation/regression.sim.test.ts
 */
import { describe, expect, it } from 'vitest'
import { createPolicy } from '../policies.js'
import { REGRESSION_SEEDS } from '../regressionSeeds.js'
import { runSimulationSuite } from '../SimulationSuite.js'

describe('T3 Headless Simulation — regression seed bank', () => {
  it('全部登记 seed 可复现且无运行时违例', () => {
    const summary = runSimulationSuite(
      REGRESSION_SEEDS.map((entry) => ({
        seed: entry.seed,
        targetTicks: entry.targetTicks,
        createPolicy: (seed) => createPolicy(entry.policy, seed),
      })),
    )

    if (summary.failedRuns > 0) {
      console.error(JSON.stringify(summary.failures, null, 2))
    }

    expect(summary.totalRuns).toBe(REGRESSION_SEEDS.length)
    expect(summary.failedRuns).toBe(0)
    expect(summary.passedRuns).toBe(REGRESSION_SEEDS.length)
    expect(summary.averageTicksAdvanced).toBeGreaterThan(0)
  })

  it('每个 seed 都有审计或场景保护目标', () => {
    for (const entry of REGRESSION_SEEDS) {
      expect(entry.id).toMatch(/^SIM-\d{8}-\d{2}$/)
      expect(entry.protects.length).toBeGreaterThan(0)
      expect(new Set(entry.protects).size).toBe(entry.protects.length)
    }
  })

  it('相同 seed 重复运行产生相同终态（确定性）', () => {
    const targetEntry = REGRESSION_SEEDS[0]
    const firstSummary = runSimulationSuite([
      {
        seed: targetEntry.seed,
        targetTicks: targetEntry.targetTicks,
        createPolicy: (seed) => createPolicy(targetEntry.policy, seed),
      },
    ])
    const secondSummary = runSimulationSuite([
      {
        seed: targetEntry.seed,
        targetTicks: targetEntry.targetTicks,
        createPolicy: (seed) => createPolicy(targetEntry.policy, seed),
      },
    ])

    expect(firstSummary.results.length).toBe(1)
    expect(secondSummary.results.length).toBe(1)

    const first = firstSummary.results[0]
    const second = secondSummary.results[0]

    expect(second.end).toEqual(first.end)
    expect(second.trace).toEqual(first.trace)
    expect(second.violations).toEqual(first.violations)
  })
})
