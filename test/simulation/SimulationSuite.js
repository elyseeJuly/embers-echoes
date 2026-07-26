/**
 * 余烬回响 — T3 模拟批量执行器
 * ==============================
 * 把多个 SimulationCase 串行执行，聚合统计结果。
 * 参考：Beyond-the-Light-Cone/simulation/SimulationSuite.ts
 */
import { GameSimulationAdapter } from './GameSimulationAdapter.js'
import { createGameEnvironment } from '../setup.js'

/**
 * @typedef {Object} SimulationSuiteCase
 * @property {number} seed
 * @property {number} targetTicks
 * @property {number} [maxTickAttempts]
 * @property {number} [traceLimit]
 * @property {boolean} [strictMode]
 * @property {(seed: number) => import('./types.js').SimulationPolicy} createPolicy
 * @property {() => Object} [createEnv] 可选：自定义环境工厂，默认 createGameEnvironment
 */

/**
 * @typedef {Object} SimulationSuiteSummary
 * @property {number} totalRuns
 * @property {number} passedRuns
 * @property {number} failedRuns
 * @property {number} gameOverRuns
 * @property {number} averageTicksAdvanced
 * @property {Record<string, number>} terminationCounts
 * @property {Record<string, number>} policyCounts
 * @property {Record<string, number>} finalPhaseCounts
 * @property {import('./types.js').SimulationRunResult[]} failures
 * @property {import('./types.js').SimulationRunResult[]} results
 */

/**
 * 批量执行模拟。
 * 每个 case 都会创建一个干净的游戏环境，避免状态污染。
 *
 * @param {SimulationSuiteCase[]} cases
 * @returns {SimulationSuiteSummary}
 */
export function runSimulationSuite(cases) {
  const results = cases.map((suiteCase) => {
    const env = suiteCase.createEnv ? suiteCase.createEnv() : createGameEnvironment()
    const policy = suiteCase.createPolicy(suiteCase.seed)
    const adapter = new GameSimulationAdapter({
      seed: suiteCase.seed,
      targetTicks: suiteCase.targetTicks,
      maxTickAttempts: suiteCase.maxTickAttempts,
      traceLimit: suiteCase.traceLimit,
      strictMode: suiteCase.strictMode,
      policy,
      env,
    })
    return adapter.run()
  })

  const terminationCounts = {}
  const policyCounts = {}
  const finalPhaseCounts = {}
  let totalTicksAdvanced = 0
  let gameOverRuns = 0

  for (const result of results) {
    increment(terminationCounts, result.terminationReason)
    increment(policyCounts, result.policyId)
    increment(finalPhaseCounts, String(result.end.phase))
    totalTicksAdvanced += result.ticksAdvanced
    if (result.terminationReason === 'game-over') gameOverRuns++
  }

  const failures = results.filter(
    (result) => result.violations.length > 0 || result.errorMessage !== undefined,
  )

  return {
    totalRuns: results.length,
    passedRuns: results.length - failures.length,
    failedRuns: failures.length,
    gameOverRuns,
    averageTicksAdvanced: results.length > 0 ? totalTicksAdvanced / results.length : 0,
    terminationCounts,
    policyCounts,
    finalPhaseCounts,
    failures,
    results,
  }
}

function increment(record, key) {
  record[key] = (record[key] || 0) + 1
}
