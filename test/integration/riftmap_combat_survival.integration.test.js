/**
 * T2 集成测试 — RiftMap → Combat → Survival
 * ==========================================
 * 验证完整链路：
 *   1. RiftMap.move 触发 tile 事件（CACHE/RUIN/ANOMALY/DUNGEON）
 *   2. ANOMALY tile 触发 Combat.startRandomEncounter
 *   3. Combat 胜利后调用 Survival.addLoot 累加 ember
 *   4. Survival.depositLoot 将 loot 写入 $SM.stores
 *   5. 玩家死亡时 RiftMap.die 清空 Survival.loot
 *
 * 由于 Combat 使用 setInterval(100ms) ATB 驱动，测试通过直接调用 playerAttack 跳过等待。
 *
 * 参考：
 *   - script/rift_map.js  (move, resolveTileEvent, pickRandomFragment)
 *   - script/combat.js    (startEncounter, playerAttack, checkVictory, endEncounter)
 *   - script/survival.js  (addLoot, depositLoot, clearLoot, getWeightLimit)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createGameEnvironment } from '../setup.js'

describe('T2 集成：RiftMap → Combat → Survival', () => {
  let env

  beforeEach(() => {
    env = createGameEnvironment()
    // 初始化 RiftMap 必要状态（不调用 init 以避免 DOM 绑定）
    env.RiftMap.setTile(0, 0, env.RiftMap.TILE.CAMP)
    env.RiftMap.visited['0,0'] = true
    env.RiftMap.active = true
    // 初始化角色状态
    env.$SM.set('character.hp', 20, true)
    env.$SM.set('character.maxHp', 20, true)
    // 注意：不在 beforeEach 设置 Survival.supplies，因为 supplies 会增加负重，
    // 影响负重相关测试。每个测试按需设置。
    env.Survival.supplies = 0
  })

  // ── Survival.addLoot / depositLoot / clearLoot ──────────────

  it('Survival.addLoot 累加 loot 并通过 weight 限制', () => {
    env.Survival.loot = {}
    env.Survival.addLoot('ember', 30)
    expect(env.Survival.loot.ember).toBe(30)
    env.Survival.addLoot('ember', 20)
    expect(env.Survival.loot.ember).toBe(50)
  })

  it('Survival.depositLoot 将 loot 写入 $SM.stores 并清空', () => {
    // 注意：concentrate 存储上限为 10，supplies 数量需控制在上限内
    env.Survival.loot = { ember: 30, grayMatter: 5 }
    env.Survival.supplies = 5 // 5 ≤ concentrate cap=10
    env.Survival.depositLoot()
    expect(env.$SM.get('stores.ember')).toBe(30)
    expect(env.$SM.get('stores.grayMatter')).toBe(5)
    expect(env.$SM.get('stores.concentrate')).toBe(5) // 0 + 5 supplies
    expect(env.Survival.loot).toEqual({})
    expect(env.Survival.supplies).toBe(0)
  })

  it('Survival.depositLoot 在 supplies 超过 cap 时被钳制（concentrate cap=10）', () => {
    env.Survival.loot = {}
    env.Survival.supplies = 50 // 远超 cap=10
    env.Survival.depositLoot()
    expect(env.$SM.get('stores.concentrate')).toBe(10) // 钳制到 cap
    expect(env.Survival.supplies).toBe(0)
  })

  it('Survival.clearLoot 清空 loot 和 supplies（死亡场景）', () => {
    env.Survival.loot = { ember: 100, grayMatter: 20 }
    env.Survival.supplies = 30
    env.Survival.clearLoot()
    expect(env.Survival.loot).toEqual({})
    expect(env.Survival.supplies).toBe(0)
  })

  it('spatial_fold perk 提升 weightLimit +20', () => {
    expect(env.Survival.getWeightLimit()).toBe(30)
    env.$SM.addPerk('spatial_fold')
    expect(env.Survival.getWeightLimit()).toBe(50)
  })

  it('负重超载时 addLoot 自动回滚（资源流失保护）', () => {
    env.Survival.loot = {}
    env.Survival.supplies = 0 // 清空 supplies 避免污染负重计算
    env.$SM.set('stores.relics', 0, true)
    // relics 单件重量 5.0；weightLimit=30；放 7 件 = 35 → 超载
    for (let i = 0; i < 7; i++) {
      env.Survival.addLoot('relics', 1)
    }
    // 第 7 次应被拒绝（回滚）
    expect(env.Survival.loot.relics).toBe(6)
    expect(env.Survival.getCurrentWeight()).toBe(30) // 6 * 5
  })

  // ── Combat 战斗链路 ─────────────────────────────────────────

  it('Combat.startEncounter 初始化敌人 HP / ATB / active', () => {
    const enemy = env.Combat.ENEMIES[0] // 游荡的代码碎屑 hp=15
    env.Combat.startEncounter(enemy)
    expect(env.Combat.active).toBe(true)
    expect(env.Combat.enemyName).toBe('游荡的代码碎屑')
    expect(env.Combat.enemyHp).toBe(15)
    expect(env.Combat.enemyMaxHp).toBe(15)
    expect(env.Combat.enemyDmg).toBe(2)
    expect(env.Combat.playerAtb).toBe(0)
    expect(env.Combat.enemyAtb).toBe(0)
    env.Combat.endEncounter(false)
  })

  it('Combat.startEncounter 受 godPressure 缩放敌人 HP/DMG', () => {
    env.$SM.set('character.godPressure', 50, true) // +50% multiplier
    env.Combat.startEncounter(env.Combat.ENEMIES[0]) // base hp=15 dmg=2
    // multiplier = 1 + 50/100 = 1.5
    expect(env.Combat.enemyMaxHp).toBe(Math.floor(15 * 1.5)) // 22
    expect(env.Combat.enemyDmg).toBe(Math.max(1, Math.floor(2 * 1.5))) // 3
    env.Combat.endEncounter(false)
  })

  it('Combat.playerAttack 在 ATB 未满时拒绝执行', () => {
    env.Combat.startEncounter(env.Combat.ENEMIES[0])
    env.Combat.playerAtb = 50 // < 100
    const enemyHpBefore = env.Combat.enemyHp
    env.Combat.playerAttack(env.Combat.WEAPONS['Data Blade'])
    expect(env.Combat.enemyHp).toBe(enemyHpBefore) // 未造成伤害
    env.Combat.endEncounter(false)
  })

  it('Combat.playerAttack ATB 满时造成伤害并消耗 ATB', () => {
    env.Combat.startEncounter(env.Combat.ENEMIES[0]) // hp=15
    env.Combat.playerAtb = 100
    env.Combat.playerAttack(env.Combat.WEAPONS['Data Blade']) // dmg=8
    expect(env.Combat.enemyHp).toBe(15 - 8)
    expect(env.Combat.playerAtb).toBe(0)
    env.Combat.endEncounter(false)
  })

  it('Combat.playerAttack data_blade_mastery perk 伤害 +50%', () => {
    env.$SM.addPerk('data_blade_mastery')
    env.Combat.startEncounter(env.Combat.ENEMIES[0]) // hp=15
    env.Combat.playerAtb = 100
    env.Combat.playerAttack(env.Combat.WEAPONS['Data Blade']) // dmg=8 * 1.5 = 12
    expect(env.Combat.enemyHp).toBe(15 - 12)
    env.Combat.endEncounter(false)
  })

  it('Combat.playerAttack Logic Bomb 消耗 concentrate', () => {
    env.$SM.set('stores.concentrate', 5, true)
    env.Combat.startEncounter(env.Combat.ENEMIES[1]) // hp=30
    env.Combat.playerAtb = 100
    env.Combat.playerAttack(env.Combat.WEAPONS['Logic Bomb']) // dmg=20, cost concentrate=1
    expect(env.Combat.enemyHp).toBe(30 - 20)
    expect(env.$SM.get('stores.concentrate')).toBe(4)
    env.Combat.endEncounter(false)
  })

  it('Combat.checkVictory 胜利时调用 Survival.addLoot 累加 ember', () => {
    env.Survival.loot = {}
    env.$SM.set('stores.concentrate', 5, true) // Logic Bomb 需要消耗 concentrate=1
    env.Combat.startEncounter(env.Combat.ENEMIES[0]) // hp=15
    env.Combat.playerAtb = 100
    env.Combat.playerAttack(env.Combat.WEAPONS['Logic Bomb']) // dmg=20 → 击杀
    // 胜利后 Combat.endEncounter(true)，Survival.loot.ember 应有值
    expect(env.Survival.loot.ember).toBeGreaterThanOrEqual(50)
    expect(env.Survival.loot.ember).toBeLessThanOrEqual(99) // 50 + random(0..49)
  })

  it('Combat.checkVictory 击杀强敌 hp>=50 时 fragment 掉率提升（mock random）', () => {
    // 强敌 hp>=50，dropChance=0.33；用 vi.spyOn 强制 Math.random 返回 0
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    env.Survival.loot = {}
    env.$SM.set('character.godPressure', 0, true)
    env.$SM.set('stores.concentrate', 10, true) // 3 次 Logic Bomb 需要 3 concentrate
    env.Combat.startEncounter(env.Combat.ENEMIES[2]) // 维度裂口看门人 hp=50
    env.Combat.playerAtb = 100
    env.Combat.playerAttack(env.Combat.WEAPONS['Logic Bomb']) // 50-20=30
    // 多次攻击直到击杀
    env.Combat.playerAtb = 100
    env.Combat.playerAttack(env.Combat.WEAPONS['Logic Bomb']) // 30-20=10
    env.Combat.playerAtb = 100
    env.Combat.playerAttack(env.Combat.WEAPONS['Logic Bomb']) // 10-20<0 → 胜利
    // 强敌掉落 frag_klein / frag_watch / frag_turing 之一
    expect(env.$SM.get('fragmentInventory').length).toBeGreaterThan(0)
    const droppedFrag = env.$SM.get('fragmentInventory')[0]
    expect(['frag_klein', 'frag_watch', 'frag_turing']).toContain(droppedFrag)
    randomSpy.mockRestore()
  })

  it('Combat.endEncounter(false) 不调用 Survival.addLoot', () => {
    env.Survival.loot = {}
    env.Combat.startEncounter(env.Combat.ENEMIES[0])
    env.Combat.endEncounter(false)
    expect(env.Survival.loot.ember).toBeUndefined()
  })

  // ── RiftMap tile 事件链路 ──────────────────────────────────

  it('RiftMap.move 进入 CACHE tile：调用 Survival.addLoot + $SM.add anomalies', () => {
    env.Survival.loot = {}
    env.Survival.supplies = 50
    env.$SM.set('stores.anomalies', 0, true)
    env.RiftMap.setTile(1, 0, env.RiftMap.TILE.CACHE)
    // 强制 Math.random 返回稳定值（避免 fragment 5% 掉率干扰）
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9)
    env.RiftMap.move(1, 0)
    // CACHE 给 15-34 ember 和 5-14 anomalies
    expect(env.Survival.loot.ember).toBeGreaterThanOrEqual(15)
    expect(env.Survival.loot.ember).toBeLessThanOrEqual(34)
    expect(env.$SM.get('stores.anomalies')).toBeGreaterThanOrEqual(5)
    // tile 被消耗为 VOID
    expect(env.RiftMap.getTile(1, 0)).toBe(env.RiftMap.TILE.VOID)
    randomSpy.mockRestore()
  })

  it('RiftMap.move 进入 RUIN tile：3-10 异常样本或 fragment（25% 概率）', () => {
    env.Survival.loot = {}
    env.Survival.supplies = 50
    env.$SM.set('stores.anomalies', 0, true)
    env.RiftMap.setTile(1, 0, env.RiftMap.TILE.RUIN)
    // Math.random=0.5 → 不会触发 25% fragment，走 anomalies 分支
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    env.RiftMap.move(1, 0)
    expect(env.$SM.get('stores.anomalies')).toBeGreaterThanOrEqual(3)
    expect(env.$SM.get('stores.anomalies')).toBeLessThanOrEqual(10)
    expect(env.RiftMap.getTile(1, 0)).toBe(env.RiftMap.TILE.VOID)
    randomSpy.mockRestore()
  })

  it('RiftMap.move 进入 ANOMALY tile：random<=0.5 时 +2 erosion（不触发战斗）', () => {
    env.Survival.supplies = 50
    env.$SM.set('character.erosion', 0, true)
    env.RiftMap.setTile(1, 0, env.RiftMap.TILE.ANOMALY)
    // 代码逻辑：if (Math.random() > 0.5) combat; else erosion
    // 因此 random=0.4 → else 分支 → +2 erosion
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.4)
    env.RiftMap.move(1, 0)
    expect(env.$SM.get('character.erosion')).toBe(2)
    expect(env.Combat.active).toBe(false)
    expect(env.RiftMap.getTile(1, 0)).toBe(env.RiftMap.TILE.VOID)
    randomSpy.mockRestore()
  })

  it('RiftMap.move 进入 ANOMALY tile：random>0.5 时触发战斗', () => {
    env.Survival.supplies = 50
    env.$SM.set('character.godPressure', 0, true)
    env.RiftMap.setTile(1, 0, env.RiftMap.TILE.ANOMALY)
    // random=0.9 → >0.5 → 战斗分支
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9)
    env.RiftMap.move(1, 0)
    expect(env.Combat.active).toBe(true)
    expect(env.RiftMap.getTile(1, 0)).toBe(env.RiftMap.TILE.VOID)
    // 清理战斗状态
    env.Combat.endEncounter(false)
    randomSpy.mockRestore()
  })

  it('RiftMap.move 进入 CAMP tile：调用 Survival.depositLoot + 满血恢复', () => {
    env.Survival.loot = { ember: 30 }
    env.Survival.supplies = 0
    env.$SM.set('stores.ember', 0, true)
    env.$SM.set('character.hp', 5, true)
    env.$SM.set('character.maxHp', 20, true)
    env.RiftMap.setTile(0, 1, env.RiftMap.TILE.CAMP)
    // 先离开营地到 (0,1) 再回 (0,0)
    env.RiftMap.pos = [0, 1]
    env.RiftMap.visited['0,1'] = true
    env.RiftMap.setTile(0, 0, env.RiftMap.TILE.CAMP)
    env.RiftMap.move(0, -1) // 回到 (0,0) CAMP
    expect(env.$SM.get('stores.ember')).toBe(30)
    expect(env.$SM.get('character.hp')).toBe(20)
  })

  it('RiftMap.move 补给不足时扣 HP 和额外 SAN', () => {
    env.Survival.supplies = 0
    env.$SM.set('character.hp', 20, true)
    env.$SM.set('character.san', 50, true)
    env.RiftMap.setTile(1, 0, env.RiftMap.TILE.VOID)
    env.RiftMap.move(1, 0)
    // hp -2，san -5（无 sanCost 因 tile=VOID，但补给不足会 +5）
    expect(env.$SM.get('character.hp')).toBe(18)
    expect(env.$SM.get('character.san')).toBe(45)
  })

  it('RiftMap.move 进入 ANOMALY tile：cognitive_filter perk 减少 SAN 消耗 30%', () => {
    env.$SM.addPerk('cognitive_filter')
    env.Survival.supplies = 50
    env.$SM.set('character.san', 50, true)
    env.RiftMap.setTile(1, 0, env.RiftMap.TILE.ANOMALY)
    // random=0.4 → erosion 分支（无战斗）；ANOMALY sanCost=2
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.4)
    env.RiftMap.move(1, 0)
    // sanCost = 2 (ANOMALY) - 2*0.30 = 1.4
    expect(env.$SM.get('character.san')).toBeCloseTo(48.6, 5)
    randomSpy.mockRestore()
  })

  it('RiftMap.pickRandomFragment 从允许的 ID 集合中选取', () => {
    const allowed = ['frag_klein', 'frag_watch']
    const frag = env.RiftMap.pickRandomFragment(allowed)
    expect(frag).not.toBeNull()
    expect(allowed).toContain(frag.id)
  })

  it('RiftMap.pickRandomFragment 允许空集合时返回任意 fragment', () => {
    const frag = env.RiftMap.pickRandomFragment([])
    expect(frag).not.toBeNull()
    expect(env.Narrative.dict.fragments[frag.id]).toBeDefined()
  })

  it('RiftMap.pickRandomFragment 允许 undefined 时返回任意 fragment', () => {
    const frag = env.RiftMap.pickRandomFragment(undefined)
    expect(frag).not.toBeNull()
  })

  // ── RiftMap.die 死亡流程 ───────────────────────────────────

  it('RiftMap.die 清空 Survival.loot 并将 HP 设为 1', () => {
    env.Survival.loot = { ember: 100, grayMatter: 50 }
    env.Survival.supplies = 30
    env.$SM.set('character.hp', 10, true)
    // die 会调用 Engine.travelTo(Nexus)，可能报错；用 try/catch 包裹
    try {
      env.RiftMap.die('测试死亡')
    } catch (e) {
      // Engine.travelTo 可能未定义，忽略
    }
    expect(env.Survival.loot).toEqual({})
    expect(env.$SM.get('character.hp')).toBe(1)
    expect(env.RiftMap.pos).toEqual([0, 0])
  })

  // ── 完整链路：移动 → 战斗 → 胜利 → 撤离 → 入库 ───────────

  it('完整链路：进入 ANOMALY 触发战斗 → 胜利 → 撤回营地 → depositLoot', () => {
    env.Survival.loot = {}
    env.Survival.supplies = 50
    env.$SM.set('stores.ember', 0, true)
    env.$SM.set('character.godPressure', 0, true)
    env.$SM.set('stores.concentrate', 20, true) // 为 Logic Bomb 准备足够的 concentrate

    env.RiftMap.setTile(1, 0, env.RiftMap.TILE.ANOMALY)
    // 代码逻辑：if (Math.random() > 0.5) combat; else erosion
    // random=0.9 → >0.5 → 触发战斗
    // 注意：random=0.9 还会影响 startRandomEncounter 中的敌人选择
    //   ENEMIES[Math.floor(0.9 * 3)] = ENEMIES[2] (hp=50)
    // 以及 checkVictory 中的 emberVal 计算（mock 期间不调用，因 mock 已 restore）
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9)
    env.RiftMap.move(1, 0)
    randomSpy.mockRestore()

    // 战斗已触发
    expect(env.Combat.active).toBe(true)
    expect(env.Combat.enemyMaxHp).toBe(50) // ENEMIES[2]

    // 用 Logic Bomb 多次攻击击杀（dmg=20，hp=50 → 需 3 次）
    env.Combat.playerAtb = 100
    env.Combat.playerAttack(env.Combat.WEAPONS['Logic Bomb']) // 50-20=30
    env.Combat.playerAtb = 100
    env.Combat.playerAttack(env.Combat.WEAPONS['Logic Bomb']) // 30-20=10
    env.Combat.playerAtb = 100
    env.Combat.playerAttack(env.Combat.WEAPONS['Logic Bomb']) // 10-20<0 → 胜利

    // 胜利后 Survival.loot.ember 应有掉落
    const droppedEmber = env.Survival.loot.ember
    expect(droppedEmber).toBeGreaterThanOrEqual(50)
    expect(droppedEmber).toBeLessThanOrEqual(99) // 50 + Math.floor(random*50) ∈ [50, 99]
    expect(env.Combat.active).toBe(false)

    // 撤回营地存放
    const initialEmber = env.$SM.get('stores.ember') || 0
    env.Survival.depositLoot()
    expect(env.$SM.get('stores.ember')).toBe(initialEmber + droppedEmber)
  })
})
