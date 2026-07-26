/**
 * T3 Headless 模拟 — 单 seed 回放测试
 * ===================================
 * 通过环境变量复现某次失败的模拟：
 *   SIM_SEED=20260726 SIM_POLICY=conservative SIM_TICKS=50 npx vitest run test/simulation/suites/replay.sim.test.js
 *
 * 参考：Beyond-the-Light-Cone/src/test/simulation/replay.sim.test.ts
 */
import { describe, expect, it } from 'vitest'
import { createGameEnvironment } from '../../setup.js'
import { GameSimulationAdapter } from '../GameSimulationAdapter.js'
import { createPolicy, isSimulationPolicyId } from '../policies.js'

const ENV = (globalThis.process?.env) || {}

function parsePositiveInteger(value, fallback) {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected positive integer, received: ${value}`)
  }
  return parsed
}

const REPLAY_SEED = ENV.SIM_SEED ? parsePositiveInteger(ENV.SIM_SEED, 0) : null
const REPLAY_POLICY = ENV.SIM_POLICY || null
const REPLAY_TICKS = ENV.SIM_TICKS ? parsePositiveInteger(ENV.SIM_TICKS, 0) : null

describe.runIf(REPLAY_SEED !== null && REPLAY_POLICY !== null && REPLAY_TICKS !== null)(
  'T3 Headless Simulation — replay',
  () => {
    it(`复现 seed=${REPLAY_SEED} policy=${REPLAY_POLICY} ticks=${REPLAY_TICKS}`, () => {
      if (!isSimulationPolicyId(REPLAY_POLICY)) {
        throw new Error(`Unknown policy: ${REPLAY_POLICY}`)
      }

      const env = createGameEnvironment()
      const result = new GameSimulationAdapter({
        seed: REPLAY_SEED,
        targetTicks: REPLAY_TICKS,
        policy: createPolicy(REPLAY_POLICY, REPLAY_SEED),
        env,
      }).run()

      console.info('[ReplayReport]', JSON.stringify({
        seed: result.seed,
        policyId: result.policyId,
        targetTicks: result.targetTicks,
        completedTicks: result.completedTicks,
        terminationReason: result.terminationReason,
        violations: result.violations,
        start: result.start,
        end: result.end,
        trace: result.trace.slice(-20),
        replayCommand: result.replayCommand,
      }, null, 2))

      // 复现时不强制断言通过——目的是让人看到完整 trace
      expect(result).toBeDefined()
      expect(result.completedTicks).toBeGreaterThan(0)
    })
  },
)
