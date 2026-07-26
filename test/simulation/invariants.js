/**
 * 余烬回响 — T3 模拟不变量
 * =========================
 * 在每个 tick 之后校验游戏状态合法性。
 * 任何违例会被记录为 InvariantViolation，可触发模拟提前终止。
 *
 * 参考：
 *   - Beyond-the-Light-Cone/simulation/invariants.ts
 *   - script/state_manager.js  (storage cap, SAN clamp)
 *   - script/sanity.js         (zone thresholds)
 *   - script/engine.js         (phase enum)
 */

const STORE_KEYS = ['ember', 'grayMatter', 'whispers', 'concentrate', 'anomalies', 'relics']

function violation(id, message, snapshot) {
  return {
    id,
    message,
    tick: snapshot.tick,
    phase: snapshot.phase,
    snapshot,
  }
}

/**
 * 数值型字段必须有限且非负。
 * 这覆盖：所有 stores、SAN、erosion、hp、godPressure、worker 数量。
 */
export const finiteAndNonNegativeInvariant = (_env, _previous, current) => {
  const violations = []
  const checkedFields = [
    ...STORE_KEYS.map((k) => [`store:${k}`, current[k]]),
    ['san', current.san],
    ['erosion', current.erosion],
    ['godPressure', current.godPressure],
    ['hp', current.hp],
    ['wanderer', current.wanderer],
    ['scavenger', current.scavenger],
    ['lurker', current.lurker],
    ['sentinel', current.sentinel],
    ['chemist', current.chemist],
    ['matrixProgress', current.matrixProgress],
  ]
  for (const [name, value] of checkedFields) {
    if (!Number.isFinite(value)) {
      violations.push(violation('INV-NUM-FINITE', `${name} is not finite: ${value}`, current))
    } else if (value < 0) {
      violations.push(violation('INV-NUM-NONNEGATIVE', `${name} is negative: ${value}`, current))
    }
  }
  return violations
}

/**
 * SAN 必须落在 [0, maxSan]。
 */
export const sanRangeInvariant = (_env, _previous, current) => {
  const violations = []
  if (current.san < 0 || current.san > current.maxSan) {
    violations.push(
      violation(
        'INV-SAN-RANGE',
        `san=${current.san} out of [0, ${current.maxSan}]`,
        current,
      ),
    )
  }
  return violations
}

/**
 * Erosion 必须落在 [0, 100]。
 */
export const erosionRangeInvariant = (_env, _previous, current) => {
  const violations = []
  if (current.erosion < 0 || current.erosion > 100) {
    violations.push(
      violation(
        'INV-EROSION-RANGE',
        `erosion=${current.erosion} out of [0, 100]`,
        current,
      ),
    )
  }
  return violations
}

/**
 * HP 必须 >= 0 且 <= maxHp（除非 GAME_OVER）。
 */
export const hpRangeInvariant = (_env, _previous, current) => {
  if (current.gameOver) return []
  const violations = []
  if (current.hp < 0) {
    violations.push(violation('INV-HP-NEGATIVE', `hp=${current.hp} < 0`, current))
  }
  if (current.hp > current.maxHp) {
    violations.push(violation('INV-HP-OVER', `hp=${current.hp} > maxHp=${current.maxHp}`, current))
  }
  return violations
}

/**
 * Phase 只能单调递增。
 */
export const monotonicPhaseInvariant = (_env, previous, current) => {
  if (!previous) return []
  if (current.phase < previous.phase) {
    return [
      violation(
        'INV-PHASE-MONOTONIC',
        `phase moved backwards: ${previous.phase} -> ${current.phase}`,
        current,
      ),
    ]
  }
  return []
}

/**
 * Tick 计数必须单调递增。
 */
export const monotonicTickInvariant = (_env, previous, current) => {
  if (!previous) return []
  if (current.tick < previous.tick) {
    return [
      violation(
        'INV-TICK-MONOTONIC',
        `tick moved backwards: ${previous.tick} -> ${current.tick}`,
        current,
      ),
    ]
  }
  return []
}

/**
 * Worker 总数不能为负且不超过 maxPopulation（如果有 signalTower）。
 */
export const workerPopulationInvariant = (env, _previous, current) => {
  const violations = []
  const max = env.Population.getMaxPopulation()
  if (current.totalWorkers > max && max > 0) {
    violations.push(
      violation(
        'INV-POP-OVER',
        `totalWorkers=${current.totalWorkers} > maxPopulation=${max}`,
        current,
      ),
    )
  }
  return violations
}

/**
 * 默认不变量集合：所有模拟都至少执行这些校验。
 */
export const defaultSimulationInvariants = [
  finiteAndNonNegativeInvariant,
  sanRangeInvariant,
  erosionRangeInvariant,
  hpRangeInvariant,
  monotonicPhaseInvariant,
  monotonicTickInvariant,
  workerPopulationInvariant,
]
