/**
 * 余烬回响 — T3 模拟策略
 * ======================
 * 不同 AI 策略：决定何时建造、分配工人、推进阶段、是否探索裂隙。
 *
 * 策略应保持"无外部状态依赖"——除 RNG 外的所有决策都应基于当前 env 状态。
 * 这保证：给定相同 seed + 策略 + 初始状态，模拟结果完全可复现。
 *
 * 参考：Beyond-the-Light-Cone/simulation/policies.ts
 */

import { SeededRng } from './SeededRng.js'

/**
 * 取 SAN 安全值（处理 SAN=0 falsy 陷阱）
 */
function getSan(env) {
  const raw = env.$SM.get('character.san')
  return raw === undefined || raw === null ? 50 : raw
}

/**
 * 通用基础策略：
 *   - 启动时把 phase 推到 SPARK 并收集初始 ember
 *   - 每 tick 检查是否可以建造 / 分配工人
 *   - 每 tick 检查 phase 升级条件
 */
class BasePolicy {
  constructor(seed) {
    this.id = 'base'
    this.rng = new SeededRng(seed).fork(0x504f4c49)
  }

  beforeRun(env) {
    // 模拟玩家点击【重启神经终端】进入 SPARK
    if (env.Engine.getPhase() === env.Engine.PHASES.NULL) {
      env.Engine.setPhase(env.Engine.PHASES.SPARK)
    }
    // 注册 Population 收入来源（脚本加载时未触发 Population.init）
    for (const key in env.Population._WORKERS) {
      const w = env.Population._WORKERS[key]
      env.$SM.setIncome(key, { delay: w.delay, stores: w.stores })
    }
    // 给一些初始 ember，避免 SPARK 阶段无法启动
    env.$SM.set('stores.ember', 5, true)
  }

  beforeTick(ctx) {
    const { env } = ctx
    // SPARK 阶段：手动 extract ember 直到 >= 50（CAMP 解锁阈值）
    if (env.Engine.getPhase() === env.Engine.PHASES.SPARK) {
      const ember = env.$SM.get('stores.ember') || 0
      if (ember < 50) {
        // 模拟 Terminal.extractEmber 的产出：1 + floor(random()*3)
        const amount = 1 + this.rng.int(0, 3)
        env.$SM.add('stores.ember', amount, true)
      }
    }

    // CAMP 阶段：建造 signalTower / emberFurnace / graySynthesizer
    if (env.Engine.getPhase() >= env.Engine.PHASES.CAMP) {
      this.maybeBuildCamp(env)
      this.maybeAssignWorkers(env)
    }

    // ABYSS 阶段：建造 cognitiveBarrier / riftBeacon
    if (env.Engine.getPhase() >= env.Engine.PHASES.ABYSS) {
      this.maybeBuildAbyss(env)
    }

    // MAP 阶段：建造 dataVault / conceptDecrypter
    if (env.Engine.getPhase() >= env.Engine.PHASES.MAP) {
      this.maybeBuildMap(env)
    }

    // SINK 阶段：把资源注入 MatrixSink
    if (env.Engine.getPhase() >= env.Engine.PHASES.SINK) {
      this.maybeSubmitMatrix(env)
    }

    // 尝试推进 phase
    env.Engine.checkPhaseUnlock()
  }

  afterTick(_ctx) {
    // 子类可覆盖
  }

  // ── 建造决策 ───────────────────────────────────────────

  maybeBuildCamp(env) {
    const buildings = env.$SM.get('buildings') || {}
    const ember = env.$SM.get('stores.ember') || 0

    // signalTower: 扩展人口上限（最高 5 座就够大多数模拟）
    const towers = buildings.signalTower || 0
    if (towers < 5 && ember >= (10 + towers * 10)) {
      env.Nexus.build('signalTower')
    }

    // emberFurnace: 扩展余烬上限（建 3 座）
    const furnaces = buildings.emberFurnace || 0
    if (furnaces < 3 && ember >= (30 + furnaces * 20)) {
      env.Nexus.build('emberFurnace')
    }

    // graySynthesizer: 解锁灰质生产（至少 1 座）
    const synths = buildings.graySynthesizer || 0
    if (synths < 1 && ember >= 50) {
      env.Nexus.build('graySynthesizer')
    }
  }

  maybeBuildAbyss(env) {
    const buildings = env.$SM.get('buildings') || {}
    const ember = env.$SM.get('stores.ember') || 0
    const gray = env.$SM.get('stores.grayMatter') || 0

    // cognitiveBarrier: 至少 2 座（maxSan +20）
    const barriers = buildings.cognitiveBarrier || 0
    if (barriers < 2 && ember >= (40 + barriers * 25) && gray >= (10 + barriers * 10)) {
      env.Nexus.build('cognitiveBarrier')
    }

    // riftBeacon: 解锁裂隙坐标（推进到 MAP 必需）
    const beacons = buildings.riftBeacon || 0
    if (beacons < 1 && ember >= 200 && gray >= 50 && (env.$SM.get('stores.whispers') || 0) >= 10) {
      env.Nexus.build('riftBeacon')
    }
  }

  maybeBuildMap(env) {
    const buildings = env.$SM.get('buildings') || {}
    const ember = env.$SM.get('stores.ember') || 0
    const gray = env.$SM.get('stores.grayMatter') || 0

    // dataVault: 扩展遗物上限（建 1 座即可）
    const vaults = buildings.dataVault || 0
    if (vaults < 1 && ember >= 60 && gray >= 20) {
      env.Nexus.build('dataVault')
    }

    // conceptDecrypter: 解锁遗物合成（不必每次都建，看策略）
    const decrypters = buildings.conceptDecrypter || 0
    if (decrypters < 1 && ember >= 500 && gray >= 100 && (env.$SM.get('stores.whispers') || 0) >= 20) {
      env.Nexus.build('conceptDecrypter')
    }
  }

  // ── 工人分配决策 ─────────────────────────────────────────

  maybeAssignWorkers(env) {
    const phase = env.Engine.getPhase()
    const wanderers = env.$SM.get('workers.wanderer') || 0
    if (wanderers <= 0) return

    // CAMP 阶段：50% 给 scavenger（产 ember），30% 给 lurker（消耗 ember 产 grayMatter，但需 graySynthesizer）
    if (phase === env.Engine.PHASES.CAMP) {
      const buildings = env.$SM.get('buildings') || {}
      const synths = buildings.graySynthesizer || 0
      if (synths > 0 && this.rng.random() < 0.4 && wanderers > 0) {
        env.Population.assignWorker('lurker')
      } else if (this.rng.random() < 0.6 && wanderers > 0) {
        env.Population.assignWorker('scavenger')
      }
    }

    // ABYSS 阶段：分配 sentinel（消耗灰质降低侵蚀）
    if (phase >= env.Engine.PHASES.ABYSS && wanderers > 0) {
      const erosion = env.$SM.get('character.erosion') || 0
      if (erosion > 20 && this.rng.random() < 0.4) {
        env.Population.assignWorker('sentinel')
      }
    }

    // MAP 阶段：分配 chemist（消耗 ember+grayMatter 产 concentrate）
    if (phase >= env.Engine.PHASES.MAP && wanderers > 0) {
      const ember = env.$SM.get('stores.ember') || 0
      const gray = env.$SM.get('stores.grayMatter') || 0
      if (ember > 30 && gray > 10 && this.rng.random() < 0.3) {
        env.Population.assignWorker('chemist')
      }
    }
  }

  // ── 矩阵提交决策 ─────────────────────────────────────────

  maybeSubmitMatrix(env) {
    const progress = env.$SM.get('game.matrixProgress') || 0
    const phase = env.$SM.get('game.matrixPhase') || 0
    const capWork = ((phase + 1) * 25 / 100) * env.MatrixSink.TOTAL_WORK_REQUIRED
    if (progress >= capWork && phase < 4) {
      // 需要建立稳定锚点
      if (env.Population.getCurrentPopulation() >= (phase + 1) * 10) {
        env.MatrixSink.stabilizeAnchor()
      }
    } else {
      // 还没到 cap，注入资源
      const ember = env.$SM.get('stores.ember') || 0
      if (ember > 50) {
        env.MatrixSink.submitResources()
      }
    }
  }
}

/**
 * 保守策略：尽快推进到 CAMP，然后稳定运营，不主动触发战斗或探索。
 */
export class ConservativePolicy extends BasePolicy {
  constructor(seed) {
    super(seed)
    this.id = 'conservative'
  }
}

/**
 * 激进策略：分配更多 lurker（消耗 ember 换取 grayMatter），加速 ABYSS 解锁。
 */
export class AggressivePolicy extends BasePolicy {
  constructor(seed) {
    super(seed)
    this.id = 'aggressive'
  }

  maybeAssignWorkers(env) {
    const phase = env.Engine.getPhase()
    const wanderers = env.$SM.get('workers.wanderer') || 0
    if (wanderers <= 0) return

    if (phase === env.Engine.PHASES.CAMP) {
      const buildings = env.$SM.get('buildings') || {}
      const synths = buildings.graySynthesizer || 0
      if (synths > 0 && this.rng.random() < 0.7 && wanderers > 0) {
        env.Population.assignWorker('lurker')
      } else if (this.rng.random() < 0.3 && wanderers > 0) {
        env.Population.assignWorker('scavenger')
      }
    } else {
      super.maybeAssignWorkers(env)
    }
  }
}

/**
 * 平衡策略：lurker 与 scavenger 比例约 1:1，并主动建造 cognitiveBarrier 维持 SAN。
 */
export class BalancedPolicy extends BasePolicy {
  constructor(seed) {
    super(seed)
    this.id = 'balanced'
  }

  maybeAssignWorkers(env) {
    const wanderers = env.$SM.get('workers.wanderer') || 0
    if (wanderers <= 0) return

    const scavenger = env.$SM.get('workers.scavenger') || 0
    const lurker = env.$SM.get('workers.lurker') || 0
    const buildings = env.$SM.get('buildings') || {}
    const synths = buildings.graySynthesizer || 0

    if (synths > 0 && lurker < scavenger + 1 && this.rng.random() < 0.5) {
      env.Population.assignWorker('lurker')
    } else if (this.rng.random() < 0.5) {
      env.Population.assignWorker('scavenger')
    }
  }
}

/**
 * 种子化随机策略：用 RNG 决定所有动作。
 * 主要用于压力测试与覆盖率检测。
 */
export class SeededRandomPolicy extends BasePolicy {
  constructor(seed) {
    super(seed)
    this.id = 'seeded-random'
  }

  maybeBuildCamp(env) {
    if (this.rng.random() < 0.3) super.maybeBuildCamp(env)
  }

  maybeBuildAbyss(env) {
    if (this.rng.random() < 0.3) super.maybeBuildAbyss(env)
  }

  maybeBuildMap(env) {
    if (this.rng.random() < 0.3) super.maybeBuildMap(env)
  }

  maybeAssignWorkers(env) {
    if (this.rng.random() < 0.5) super.maybeAssignWorkers(env)
  }

  maybeSubmitMatrix(env) {
    if (this.rng.random() < 0.5) super.maybeSubmitMatrix(env)
  }
}

export const POLICIES = {
  conservative: ConservativePolicy,
  aggressive: AggressivePolicy,
  balanced: BalancedPolicy,
  'seeded-random': SeededRandomPolicy,
}

export function createPolicy(policyId, seed) {
  const PolicyClass = POLICIES[policyId] || ConservativePolicy
  return new PolicyClass(seed)
}

export function isSimulationPolicyId(value) {
  return Object.prototype.hasOwnProperty.call(POLICIES, value)
}
