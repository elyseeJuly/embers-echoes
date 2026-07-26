/**
 * T3 Headless 模拟 — Balance 平衡性统计测试
 * ========================================
 * 仅在 SIM_MODE=balance 时运行。
 * 用多种策略跑若干局，统计：
 *   - 终局 phase 分布
 *   - 资源峰值/均值
 *   - 不同策略下推进速度差异
 *
 * 这些不是严格的"通过/失败"断言，而是输出统计报告用于人工审视。
 * 但仍保留几个最低门槛断言以保证游戏基础可玩。
 *
 * 参考：Beyond-the-Light-Cone/src/test/simulation/balance.sim.test.ts
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

const BALANCE_POLICIES = ['conservative', 'aggressive', 'balanced']

describe.runIf(ENV.SIM_MODE === 'balance')('T3 Headless Simulation — balance stats', () => {
  it('多策略平衡性统计：终局 phase 与资源峰值', () => {
    const runsPerPolicy = parsePositiveInteger(ENV.SIM_BALANCE_RUNS, 3)
    const ticks = parsePositiveInteger(ENV.SIM_BALANCE_TICKS, 150)

    const cases = []
    for (const policyId of BALANCE_POLICIES) {
      for (let i = 0; i < runsPerPolicy; i++) {
        const seed = 20260000 + BALANCE_POLICIES.indexOf(policyId) * 10000 + i * 137
        cases.push({
          seed,
          targetTicks: ticks,
          createPolicy: () => createPolicy(policyId, seed),
        })
      }
    }

    const summary = runSimulationSuite(cases)

    const stats = {
      totalRuns: summary.totalRuns,
      averageTicksAdvanced: summary.averageTicksAdvanced,
      terminationCounts: summary.terminationCounts,
      policyCounts: summary.policyCounts,
      finalPhaseCounts: summary.finalPhaseCounts,
      resourceStats: computeResourceStats(summary.results),
    }

    console.info('[BalanceReport]', JSON.stringify(stats, null, 2))

    // 最低门槛断言
    expect(summary.failedRuns).toBe(0)
    expect(summary.averageTicksAdvanced).toBeGreaterThan(0)

    // 至少有一局推进到 CAMP 以上
    const advancedRuns = summary.results.filter((r) => r.end.phase >= 2).length
    expect(advancedRuns).toBeGreaterThan(0)
  })
})

function computeResourceStats(results) {
  const fields = ['ember', 'grayMatter', 'whispers', 'concentrate']
  const stats = {}
  for (const f of fields) {
    const values = results.map((r) => r.end[f] || 0)
    stats[f] = {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
    }
  }
  return stats
}
