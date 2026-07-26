/**
 * 余烬回响 — T3 Headless 模拟适配器
 * =================================
 * 把 createGameEnvironment() 返回的 sandbox + 模拟策略 + 不变量
 * 串成一个可重复、可审计的"自动试玩"循环。
 *
 * 与 Beyond-the-Light-Cone/simulation/GameSimulationAdapter.ts 对齐：
 *   - 单 tick 内：policy.beforeTick → Engine.tick → policy.afterTick → snapshot → invariants
 *   - 任何 invariant 违例或运行时异常都会终止并记录
 *   - 完整 trace + replayCommand 让任何失败都能在本地复现
 *
 * 注意：本游戏的"tick"对应 Engine.tick（每秒触发一次的全局调度），
 * 而不是 Beyond-the-Light-Cone 的 runARound（按"年"推进）。
 * 我们用 tick/tickAttempt 概念，并把 targetTicks 当成"目标推进的 tick 数"。
 */
import { defaultSimulationInvariants } from './invariants.js'
import { PHASE_NAMES } from './types.js'

/**
 * @typedef {import('./types.js').SimulationConfig} SimulationConfig
 * @typedef {import('./types.js').SimulationRunResult} SimulationRunResult
 * @typedef {import('./types.js').SimulationSnapshot} SimulationSnapshot
 * @typedef {import('./types.js').SimulationTraceEntry} SimulationTraceEntry
 * @typedef {import('./types.js').InvariantViolation} InvariantViolation
 * @typedef {import('./types.js').SimulationTerminationReason} SimulationTerminationReason
 */

export class GameSimulationAdapter {
  /**
   * @param {SimulationConfig} config
   * @param {import('./invariants.js').SimulationInvariant[]} [invariants]
   */
  constructor(config, invariants = defaultSimulationInvariants) {
    if (!Number.isInteger(config.targetTicks) || config.targetTicks <= 0) {
      throw new RangeError(`targetTicks must be a positive integer: ${config.targetTicks}`)
    }
    if (!config.env) {
      throw new Error('SimulationConfig.env is required (use createGameEnvironment())')
    }
    if (!config.policy || typeof config.policy.id !== 'string') {
      throw new Error('SimulationConfig.policy must have an id')
    }

    this.config = {
      maxTickAttempts: config.maxTickAttempts ?? config.targetTicks * 5,
      traceLimit: config.traceLimit ?? 200,
      strictMode: config.strictMode ?? true,
      ...config,
    }
    this.invariants = invariants
    /** @type {SimulationTraceEntry[]} */
    this.trace = []
    this.observedEndings = new Set()
    this.observedPhases = new Set()
    this.traceStep = 0
  }

  /**
   * 执行一次完整的模拟试玩。
   * @returns {SimulationRunResult}
   */
  run() {
    const startedAt = Date.now()
    /** @type {InvariantViolation[]} */
    const violations = []
    /** @type {SimulationTerminationReason} */
    let terminationReason = 'target-reached'
    let errorMessage
    let tickAttempts = 0
    let completedTicks = 0

    const env = this.config.env
    const previousStrictMode = env.Engine.options?.debug ?? false
    if (env.Engine.options) {
      env.Engine.options.debug = this.config.strictMode ? false : env.Engine.options.debug
    }

    // 显式重置模拟 tick 计数器（让 snapshot.tick 严格单调递增）
    env.$SM.set('game.simTick', 0, true)

    // 初始快照（在 policy.beforeRun 之前抓一份，作为 start 状态）
    let previousSnapshot = this.snapshot(env)
    const start = previousSnapshot
    this.captureCoverage(env)

    try {
      // 策略初始化（推 phase、注册 income、给初始 ember 等）
      if (typeof this.config.policy.beforeRun === 'function') {
        this.config.policy.beforeRun(env)
      }
      previousSnapshot = this.snapshot(env)

      while (completedTicks < this.config.targetTicks && !env.Engine.GAME_OVER) {
        if (tickAttempts >= this.config.maxTickAttempts) {
          terminationReason = 'tick-attempt-cap'
          break
        }
        tickAttempts++

        const ctx = { env, tickAttempt: tickAttempts, completedTicks }
        if (typeof this.config.policy.beforeTick === 'function') {
          this.config.policy.beforeTick(ctx)
        }

        // 防御性：如果 policy 在 beforeTick 中把 phase 推到了 END，不再继续
        if (env.Engine.getPhase() >= env.Engine.PHASES.END) {
          terminationReason = 'game-over'
          break
        }

        // 推进一个 tick
        try {
          env.Engine.tick()
          // 显式记录模拟 tick 计数（保证 snapshot.tick 严格单调）
          const prevTick = numOr(env.$SM.get('game.simTick'), 0)
          env.$SM.set('game.simTick', prevTick + 1, true)
        } catch (tickErr) {
          // tick 内部异常视作 invariant violation + exception
          terminationReason = 'exception'
          errorMessage = tickErr instanceof Error
            ? tickErr.stack || tickErr.message
            : String(tickErr)
          violations.push({
            id: 'INV-TICK-EXCEPTION',
            message: `Engine.tick threw: ${errorMessage}`,
            tick: completedTicks,
            phase: env.Engine.getPhase(),
            snapshot: this.snapshot(env),
          })
          break
        }

        if (typeof this.config.policy.afterTick === 'function') {
          try {
            this.config.policy.afterTick(ctx)
          } catch (afterErr) {
            terminationReason = 'exception'
            errorMessage = afterErr instanceof Error
              ? afterErr.stack || afterErr.message
              : String(afterErr)
            violations.push({
              id: 'INV-AFTERTICK-EXCEPTION',
              message: `policy.afterTick threw: ${errorMessage}`,
              tick: completedTicks,
              phase: env.Engine.getPhase(),
              snapshot: this.snapshot(env),
            })
            break
          }
        }

        completedTicks++

        const currentSnapshot = this.snapshot(env)
        this.captureCoverage(env)

        this.pushTrace({
          kind: 'tick',
          tick: completedTicks,
          phase: currentSnapshot.phase,
          message: `attempt=${tickAttempts}, completed=${completedTicks}, phase=${PHASE_NAMES[currentSnapshot.phase]}, ember=${currentSnapshot.ember.toFixed(0)}`,
        })

        // 运行所有 invariants
        for (const invariant of this.invariants) {
          try {
            const result = invariant(env, previousSnapshot, currentSnapshot)
            if (Array.isArray(result)) {
              for (const v of result) violations.push(v)
            } else if (result) {
              violations.push(result)
            }
          } catch (invErr) {
            violations.push({
              id: 'INV-INVARIANT-EXCEPTION',
              message: `invariant threw: ${invErr instanceof Error ? invErr.message : String(invErr)}`,
              tick: completedTicks,
              phase: currentSnapshot.phase,
              snapshot: currentSnapshot,
            })
          }
        }
        previousSnapshot = currentSnapshot

        if (violations.length > 0) {
          terminationReason = 'invariant-violation'
          break
        }

        if (env.Engine.GAME_OVER) {
          terminationReason = 'game-over'
          break
        }
      }

      if (env.Engine.GAME_OVER && terminationReason !== 'invariant-violation' && terminationReason !== 'exception') {
        terminationReason = 'game-over'
      }
    } catch (error) {
      terminationReason = 'exception'
      errorMessage = error instanceof Error ? error.stack || error.message : String(error)
      violations.push({
        id: 'INV-NO-RUNTIME-EXCEPTION',
        message: errorMessage,
        tick: completedTicks,
        phase: env.Engine.getPhase(),
        snapshot: this.snapshot(env),
      })
    } finally {
      if (env.Engine.options) {
        env.Engine.options.debug = previousStrictMode
      }
      this.captureCoverage(env)
    }

    const end = this.snapshot(env)
    this.pushTrace({
      kind: 'termination',
      tick: completedTicks,
      phase: end.phase,
      message: `${terminationReason}; completed=${completedTicks}/${this.config.targetTicks}, attempts=${tickAttempts}`,
    })

    return {
      seed: this.config.seed,
      policyId: this.config.policy.id,
      targetTicks: this.config.targetTicks,
      completedTicks,
      tickAttempts,
      ticksAdvanced: end.tick - start.tick,
      terminationReason,
      start,
      end,
      violations,
      trace: [...this.trace],
      coverage: {
        observedPhases: [...this.observedPhases].sort((a, b) => a - b),
        observedEndings: [...this.observedEndings].sort(),
      },
      errorMessage,
      replayCommand: `SIM_SEED=${this.config.seed} SIM_POLICY=${this.config.policy.id} SIM_TICKS=${this.config.targetTicks} npm run test:sim:replay`,
      durationMs: Date.now() - startedAt,
    }
  }

  /**
   * 抓取当前游戏状态快照。
   * @param {Object} env
   * @returns {SimulationSnapshot}
   */
  snapshot(env) {
    const $SM = env.$SM
    const Engine = env.Engine
    const Sanity = env.Sanity
    const Population = env.Population
    const MatrixSink = env.MatrixSink

    const tick = completedTickCounter(env)
    const phase = Engine.getPhase()
    const gameOver = !!Engine.GAME_OVER

    const san = numOr($SM.get('character.san'), 0)
    const maxSan = (Sanity && typeof Sanity.getMaxSan === 'function') ? Sanity.getMaxSan() : 100
    const erosion = numOr($SM.get('character.erosion'), 0)
    const godPressure = numOr($SM.get('character.godPressure'), 0)
    const hp = numOr($SM.get('character.hp'), 0)
    const maxHp = (Sanity && typeof Sanity.getMaxHp === 'function') ? Sanity.getMaxHp() : 100

    const stores = $SM.get('stores') || {}
    const workers = $SM.get('workers') || {}

    let ending
    if (gameOver) {
      // 尝试从 Endgame 推断 ending（如果没有可识别的标记则保持 undefined）
      ending = $SM.get('game.lastEnding') || undefined
    }

    return {
      phase,
      tick,
      ember: numOr(stores.ember, 0),
      grayMatter: numOr(stores.grayMatter, 0),
      whispers: numOr(stores.whispers, 0),
      concentrate: numOr(stores.concentrate, 0),
      anomalies: numOr(stores.anomalies, 0),
      relics: numOr(stores.relics, 0),
      san,
      maxSan,
      erosion,
      godPressure,
      hp,
      maxHp,
      totalWorkers:
        numOr(workers.wanderer, 0) +
        numOr(workers.scavenger, 0) +
        numOr(workers.lurker, 0) +
        numOr(workers.sentinel, 0) +
        numOr(workers.chemist, 0),
      wanderer: numOr(workers.wanderer, 0),
      scavenger: numOr(workers.scavenger, 0),
      lurker: numOr(workers.lurker, 0),
      sentinel: numOr(workers.sentinel, 0),
      chemist: numOr(workers.chemist, 0),
      matrixProgress: numOr($SM.get('game.matrixProgress'), 0),
      gameOver,
      ending,
    }
  }

  /**
   * 把观测到的覆盖信息登记到 set 里（不抛错）。
   */
  captureCoverage(env) {
    this.observedPhases.add(env.Engine.getPhase())
    if (env.Engine.GAME_OVER) {
      const ending = env.$SM.get('game.lastEnding')
      if (ending) this.observedEndings.add(ending)
    }
  }

  /**
   * @param {Omit<SimulationTraceEntry, 'step'>} entry
   */
  pushTrace(entry) {
    this.trace.push({ ...entry, step: ++this.traceStep })
    if (this.trace.length > this.config.traceLimit) this.trace.shift()
  }
}

/**
 * 模拟 tick 计数器：从 $SM.game.simTick 读取，由 adapter 在每次 Engine.tick() 后递增。
 * 这保证 snapshot.tick 严格单调递增，从而 monotonicTickInvariant 可以正常工作。
 */
function completedTickCounter(env) {
  return numOr(env.$SM.get('game.simTick'), 0)
}

function numOr(value, fallback) {
  if (value === undefined || value === null || Number.isNaN(value)) return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}
