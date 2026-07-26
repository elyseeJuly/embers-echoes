/**
 * 余烬回响 — T3 模拟类型契约
 * ==========================
 * 与 Beyond-the-Light-Cone/simulation/types.ts 对齐的 JS 版本。
 * 这些类型仅作为运行时文档与 JSDoc 引用，不参与运行时校验。
 */

/**
 * 模拟终止原因
 * @typedef {'target-reached'|'game-over'|'tick-attempt-cap'|'invariant-violation'|'exception'} SimulationTerminationReason
 */

/**
 * @typedef {Object} SimulationConfig
 * @property {number} seed
 * @property {number} targetTicks
 * @property {number} [maxTickAttempts]
 * @property {number} [traceLimit]
 * @property {boolean} [strictMode]
 * @property {SimulationPolicy} policy
 * @property {Object} env createGameEnvironment() 返回的 sandbox
 */

/**
 * @typedef {Object} SimulationPolicyContext
 * @property {Object} env
 * @property {number} tickAttempt
 * @property {number} completedTicks
 */

/**
 * @typedef {Object} SimulationPolicy
 * @property {string} id
 * @property {(env: Object) => void} [beforeRun]
 * @property {(ctx: SimulationPolicyContext) => void} [beforeTick]
 * @property {(ctx: SimulationPolicyContext) => void} [afterTick]
 */

/**
 * @typedef {Object} SimulationSnapshot
 * @property {number} phase
 * @property {number} tick
 * @property {number} ember
 * @property {number} grayMatter
 * @property {number} whispers
 * @property {number} concentrate
 * @property {number} anomalies
 * @property {number} relics
 * @property {number} san
 * @property {number} maxSan
 * @property {number} erosion
 * @property {number} godPressure
 * @property {number} hp
 * @property {number} maxHp
 * @property {number} totalWorkers
 * @property {number} wanderer
 * @property {number} scavenger
 * @property {number} lurker
 * @property {number} sentinel
 * @property {number} chemist
 * @property {number} matrixProgress
 * @property {boolean} gameOver
 * @property {string} [ending]
 */

/**
 * @typedef {Object} InvariantViolation
 * @property {string} id
 * @property {string} message
 * @property {number} tick
 * @property {number} phase
 * @property {SimulationSnapshot} [snapshot]
 */

/**
 * @typedef {Object} SimulationTraceEntry
 * @property {number} step
 * @property {'tick'|'phase'|'build'|'assign'|'event'|'combat'|'explore'|'matrix'|'termination'} kind
 * @property {number} tick
 * @property {number} phase
 * @property {string} message
 */

/**
 * @typedef {Object} SimulationRunResult
 * @property {number} seed
 * @property {string} policyId
 * @property {number} targetTicks
 * @property {number} completedTicks
 * @property {number} tickAttempts
 * @property {SimulationTerminationReason} terminationReason
 * @property {SimulationSnapshot} start
 * @property {SimulationSnapshot} end
 * @property {InvariantViolation[]} violations
 * @property {SimulationTraceEntry[]} trace
 * @property {string} replayCommand
 * @property {number} durationMs
 * @property {string} [errorMessage]
 */

export const PHASE_NAMES = ['NULL', 'SPARK', 'CAMP', 'ABYSS', 'MAP', 'SINK', 'END']
