/**
 * 余烬回响 — T3 回归种子库
 * ========================
 * 一组登记在册的"金标准"种子，用于：
 *   - 检测任何 Engine/Policy/Invariant 改动导致的运行时退化
 *   - 作为复现脚本的核心数据（每次新增 bug fix 都应添加一个最小复现 seed）
 *
 * 参考：Beyond-the-Light-Cone/simulation/regressionSeeds.ts
 *
 * 每个 entry 的字段：
 *   - id: 形如 'SIM-YYYYMMDD-NN' 的唯一编号
 *   - seed: 数值种子
 *   - targetTicks: 该 seed 的目标 tick 数
 *   - policy: 策略 id（见 policies.js）
 *   - protects: 该 seed 用于保护的关键场景列表
 */

export const REGRESSION_SEEDS = [
  {
    id: 'SIM-20260726-01',
    seed: 20260726,
    targetTicks: 50,
    policy: 'conservative',
    protects: ['SPARK→CAMP 推进', '基础 income 结算'],
  },
  {
    id: 'SIM-20260726-02',
    seed: 314159,
    targetTicks: 80,
    policy: 'aggressive',
    protects: ['CAMP→ABYSS 推进', 'lurker 消耗 ember 产 grayMatter'],
  },
  {
    id: 'SIM-20260726-03',
    seed: 271828,
    targetTicks: 100,
    policy: 'balanced',
    protects: ['ABYSS→MAP 推进', 'riftBeacon 建造'],
  },
  {
    id: 'SIM-20260726-04',
    seed: 161803,
    targetTicks: 120,
    policy: 'seeded-random',
    protects: ['多 phase 随机压力', '资源 cap 钳制'],
  },
  {
    id: 'SIM-20260726-05',
    seed: 999983,
    targetTicks: 60,
    policy: 'conservative',
    protects: ['sentinel 降低 erosion', 'sanity zone 切换'],
  },
]
