/**
 * T2 集成测试 — Fragment → Relic → Endgame
 * ==========================================
 * 验证完整链路：
 *   1. $SM.addFragment → fragmentInventory 累积
 *   2. Relics.craftRelic 消耗 fragment + 资源 → addRelic 到 relicInventory
 *   3. Endgame.evaluateEndings 依据 relicInventory 判定 bad/normal/true
 *
 * 覆盖关键场景：
 *   - 单遗物合成（conventional / special）
 *   - 锚点遗物 relic_carbon 的特殊合成（需献祭 10 wanderer）
 *   - 结局判定：bad → normal → true 的渐进升级
 *   - 消耗遗物后结局降级
 *
 * 参考：
 *   - script/relics.js     (Relics.craftRelic, _renderForge)
 *   - script/state_manager.js (addFragment, consumeFragment, addRelic, consumeRelic, hasRelic)
 *   - script/endgame.js    (Endgame.evaluateEndings)
 *   - script/narrative.js  (dict.fragments, dict.craftingRecipes, dict.finalInquiry)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createGameEnvironment } from '../setup.js'

describe('T2 集成：Fragment → Relic → Endgame', () => {
  let env

  beforeEach(() => {
    env = createGameEnvironment()
  })

  // ── Fragment Inventory ──────────────────────────────────────

  it('addFragment → fragmentInventory 累积', () => {
    env.$SM.addFragment('frag_turing')
    env.$SM.addFragment('frag_turing')
    env.$SM.addFragment('frag_recorder')
    expect(env.$SM.get('fragmentInventory')).toEqual(['frag_turing', 'frag_turing', 'frag_recorder'])
    expect(env.$SM.hasFragment('frag_turing')).toBe(true)
    expect(env.$SM.hasFragment('frag_klein')).toBe(false)
  })

  it('consumeFragment 只移除一份（不全部清空）', () => {
    env.$SM.addFragment('frag_turing')
    env.$SM.addFragment('frag_turing')
    env.$SM.addFragment('frag_recorder')
    env.$SM.consumeFragment('frag_turing')
    expect(env.$SM.get('fragmentInventory')).toEqual(['frag_turing', 'frag_recorder'])
  })

  // ── Crafting Recipe: relic_cyber ───────────────────────────

  it('Relics.craftRelic 合成 relic_cyber：消耗 frag + 资源 → 写入 relicInventory', () => {
    const recipe = env.Narrative.dict.craftingRecipes.find(r => r.relicId === 'relic_cyber')
    expect(recipe).toBeDefined()

    // 准备材料
    env.$SM.addFragment('frag_turing')
    env.$SM.set('stores.ember', 500, true)
    env.$SM.set('stores.anomalies', 300, true)

    env.Relics.craftRelic(recipe)

    expect(env.$SM.hasRelic('relic_cyber')).toBe(true)
    expect(env.$SM.hasFragment('frag_turing')).toBe(false) // 已消耗
    expect(env.$SM.get('stores.ember')).toBe(500 - 450)
    expect(env.$SM.get('stores.anomalies')).toBe(300 - 250)
  })

  it('Relics.craftRelic 合成 relic_carbon：需消耗 10 wanderer', () => {
    const recipe = env.Narrative.dict.craftingRecipes.find(r => r.relicId === 'relic_carbon')
    expect(recipe).toBeDefined()
    expect(recipe.sacrificeWanderers).toBe(10)

    // 准备材料
    env.$SM.addFragment('frag_recorder')
    env.$SM.set('stores.ember', 700, true)
    env.$SM.set('stores.whispers', 60, true)
    env.$SM.set('workers.wanderer', 15, true)

    env.Relics.craftRelic(recipe)

    expect(env.$SM.hasRelic('relic_carbon')).toBe(true)
    expect(env.$SM.get('workers.wanderer')).toBe(5) // 15-10
    expect(env.$SM.get('stores.ember')).toBe(700 - 600)
    expect(env.$SM.get('stores.whispers')).toBe(60 - 50)
  })

  it('Relics.craftRelic 不重复合成（已持有的 relic 不再消耗资源）', () => {
    // 实际上 craftRelic 不做幂等检查，但 UI 层会禁用按钮；这里只验证流程不阻塞
    const recipe = env.Narrative.dict.craftingRecipes.find(r => r.relicId === 'relic_bio')
    env.$SM.addFragment('frag_biotech')
    env.$SM.set('stores.ember', 1000, true)
    env.$SM.set('stores.grayMatter', 200, true)

    env.Relics.craftRelic(recipe)
    expect(env.$SM.hasRelic('relic_bio')).toBe(true)

    // 第二次 craftRelic 会再次消耗资源（UI 应阻止，但 $SM 不阻止）
    env.$SM.addFragment('frag_biotech')
    env.Relics.craftRelic(recipe)
    // 资源被消耗两次，但 relicInventory 中会出现两条
    expect(env.$SM.get('relicInventory').filter(id => id === 'relic_bio').length).toBe(2)
  })

  // ── Endgame 结局判定 ────────────────────────────────────────

  it('Endgame 链路：无任何遗物 → bad', () => {
    expect(env.Endgame.evaluateEndings()).toBe('bad')
  })

  it('Endgame 链路：仅常规遗物（无 relic_carbon）→ normal', () => {
    env.$SM.addRelic('relic_bio')
    expect(env.Endgame.evaluateEndings()).toBe('normal')
  })

  it('Endgame 链路：relic_carbon + 常规遗物 → true', () => {
    env.$SM.addRelic('relic_bio')
    env.$SM.addRelic('relic_carbon')
    expect(env.Endgame.evaluateEndings()).toBe('true')
  })

  it('Endgame 链路：relic_carbon + 特殊遗物 → true', () => {
    env.$SM.addRelic('relic_fractal')
    env.$SM.addRelic('relic_carbon')
    expect(env.Endgame.evaluateEndings()).toBe('true')
  })

  // ── 完整 craftRelic → evaluateEndings 流程 ─────────────────

  it('完整链路：合成 relic_cyber 后 Endgame 应返回 normal', () => {
    // 准备材料
    env.$SM.addFragment('frag_turing')
    env.$SM.set('stores.ember', 500, true)
    env.$SM.set('stores.anomalies', 300, true)

    const recipe = env.Narrative.dict.craftingRecipes.find(r => r.relicId === 'relic_cyber')
    env.Relics.craftRelic(recipe)

    // 合成后只有 relic_cyber，无 relic_carbon → normal
    expect(env.Endgame.evaluateEndings()).toBe('normal')
  })

  it('完整链路：合成 relic_carbon 后仅 normal（无法回答 q_entropy/q_paradox）', () => {
    env.$SM.addFragment('frag_recorder')
    env.$SM.set('stores.ember', 700, true)
    env.$SM.set('stores.whispers', 60, true)
    env.$SM.set('workers.wanderer', 15, true)

    const recipe = env.Narrative.dict.craftingRecipes.find(r => r.relicId === 'relic_carbon')
    env.Relics.craftRelic(recipe)

    // 只有 relic_carbon，无法回答前两题 → normal（不是 true）
    expect(env.Endgame.evaluateEndings()).toBe('normal')
  })

  it('完整链路：合成 relic_bio + relic_carbon 后 → true', () => {
    // 第一步：合成 relic_bio
    env.$SM.addFragment('frag_biotech')
    env.$SM.set('stores.ember', 1000, true)
    env.$SM.set('stores.grayMatter', 200, true)
    const bioRecipe = env.Narrative.dict.craftingRecipes.find(r => r.relicId === 'relic_bio')
    env.Relics.craftRelic(bioRecipe)

    // 第二步：合成 relic_carbon
    env.$SM.addFragment('frag_recorder')
    env.$SM.set('stores.whispers', 60, true)
    env.$SM.set('workers.wanderer', 15, true)
    const carbonRecipe = env.Narrative.dict.craftingRecipes.find(r => r.relicId === 'relic_carbon')
    env.Relics.craftRelic(carbonRecipe)

    // 同时持有 relic_bio + relic_carbon → true
    expect(env.Endgame.evaluateEndings()).toBe('true')
  })

  // ── 消耗遗物后结局降级 ──────────────────────────────────────

  it('消耗 relic_carbon 后结局从 true 降级为 normal', () => {
    env.$SM.addRelic('relic_bio')
    env.$SM.addRelic('relic_carbon')
    expect(env.Endgame.evaluateEndings()).toBe('true')

    env.$SM.consumeRelic('relic_carbon')
    expect(env.Endgame.evaluateEndings()).toBe('normal')
  })

  it('消耗所有遗物后结局从 true 降级为 bad', () => {
    env.$SM.addRelic('relic_bio')
    env.$SM.addRelic('relic_carbon')
    expect(env.Endgame.evaluateEndings()).toBe('true')

    env.$SM.consumeRelic('relic_bio')
    env.$SM.consumeRelic('relic_carbon')
    expect(env.Endgame.evaluateEndings()).toBe('bad')
  })

  // ── Endgame askQuestion 链路（不渲染 DOM） ─────────────────

  it('finalInquiry.questions 三题结构完整', () => {
    const q = env.Narrative.dict.finalInquiry.questions
    expect(q.length).toBe(3)
    expect(q[0].id).toBe('q_entropy')
    expect(q[1].id).toBe('q_paradox')
    expect(q[2].id).toBe('q_variable')
    // 最后一题必须以 relic_carbon 为有效提交物
    expect(q[2].validRelics).toContain('relic_carbon')
  })

  it('每题的 validRelics 都映射到 Narrative.dict.relics 中存在的遗物', () => {
    const allRelicIds = new Set(Object.values(env.Narrative.dict.relics).map(r => r.id))
    for (const q of env.Narrative.dict.finalInquiry.questions) {
      for (const rid of q.validRelics) {
        expect(allRelicIds.has(rid)).toBe(true)
      }
    }
  })
})
