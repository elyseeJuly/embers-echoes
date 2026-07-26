/**
 * T1 单元测试 — Narrative Dictionary 数据契约
 * 覆盖：relics/fragments/craftingRecipes/finalInquiry/events 完整性与互引一致性
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createGameEnvironment } from '../setup.js'

let env
beforeEach(() => {
  env = createGameEnvironment()
})

describe('Narrative.dict 基础结构', () => {
  it('所有顶层契约字段存在', () => {
    const d = env.Narrative.dict
    expect(d.ambientLogs).toBeDefined()
    expect(d.relics).toBeDefined()
    expect(d.events).toBeDefined()
    expect(d.finalInquiry).toBeDefined()
    expect(d.resourcesLore).toBeDefined()
    expect(d.mapNodes).toBeDefined()
    expect(d.infrastructureLogs).toBeDefined()
    expect(d.deathEchoes).toBeDefined()
    expect(d.fragments).toBeDefined()
    expect(d.craftingRecipes).toBeDefined()
  })

  it('ambientLogs 各场景至少 1 条', () => {
    const al = env.Narrative.dict.ambientLogs
    for (const key of ['ember_high', 'ember_low', 'san_awakened', 'san_assimilated', 'san_madness']) {
      expect(al[key], `ambientLogs.${key} 应存在`).toBeDefined()
      expect(al[key].length).toBeGreaterThan(0)
    }
  })
})

describe('Narrative.relics — 遗物图鉴', () => {
  it('包含三大类遗物（conventional/special/anchor）', () => {
    const relics = env.Narrative.dict.relics
    const types = Object.values(relics).map(r => r.type)
    expect(types).toContain('conventional')
    expect(types).toContain('special')
    expect(types).toContain('anchor')
  })

  it('每个遗物具备 id/name/origin/type/desc', () => {
    const relics = env.Narrative.dict.relics
    for (const key in relics) {
      const r = relics[key]
      expect(r.id, `${key}.id`).toBeDefined()
      expect(r.name, `${key}.name`).toBeDefined()
      expect(r.origin, `${key}.origin`).toBeDefined()
      expect(r.type, `${key}.type`).toBeDefined()
      expect(r.desc, `${key}.desc`).toBeDefined()
    }
  })

  it('relic_carbon 是唯一 anchor 类型', () => {
    const relics = env.Narrative.dict.relics
    const anchors = Object.values(relics).filter(r => r.type === 'anchor')
    expect(anchors.length).toBe(1)
    expect(anchors[0].id).toBe('relic_carbon')
  })

  it('relic IDs 全局唯一', () => {
    const ids = Object.values(env.Narrative.dict.relics).map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('Narrative.fragments — 残片图鉴', () => {
  it('每个 fragment 具有 id/name/origin/desc/weight/craftsRelic', () => {
    const frags = env.Narrative.dict.fragments
    for (const key in frags) {
      const f = frags[key]
      expect(f.id, `${key}.id`).toBeDefined()
      expect(f.name, `${key}.name`).toBeDefined()
      expect(f.origin, `${key}.origin`).toBeDefined()
      expect(f.desc, `${key}.desc`).toBeDefined()
      expect(f.weight, `${key}.weight`).toBeGreaterThan(0)
      expect(f.craftsRelic, `${key}.craftsRelic`).toBeDefined()
    }
  })

  it('fragment IDs 全局唯一', () => {
    const ids = Object.values(env.Narrative.dict.fragments).map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('每个 fragment.craftsRelic 在 relics 中存在', () => {
    const relics = env.Narrative.dict.relics
    const relicIds = new Set(Object.values(relics).map(r => r.id))
    const frags = env.Narrative.dict.fragments
    for (const key in frags) {
      expect(relicIds.has(frags[key].craftsRelic), `${key}.craftsRelic=${frags[key].craftsRelic} 应在 relics 中`).toBe(true)
    }
  })
})

describe('Narrative.craftingRecipes — 合成配方', () => {
  it('每个配方具备 relicId/name/fragments/costs/craftText', () => {
    const recipes = env.Narrative.dict.craftingRecipes
    for (const r of recipes) {
      expect(r.relicId).toBeDefined()
      expect(r.name).toBeDefined()
      expect(Array.isArray(r.fragments)).toBe(true)
      expect(r.fragments.length).toBeGreaterThan(0)
      expect(r.costs).toBeDefined()
      expect(r.craftText).toBeDefined()
    }
  })

  it('每个配方 relicId 在 relics 中存在', () => {
    const relicIds = new Set(Object.values(env.Narrative.dict.relics).map(r => r.id))
    for (const r of env.Narrative.dict.craftingRecipes) {
      expect(relicIds.has(r.relicId), `配方 ${r.relicId} 应在 relics 中`).toBe(true)
    }
  })

  it('每个配方 fragments 在 fragments 字典中存在', () => {
    const fragIds = new Set(Object.values(env.Narrative.dict.fragments).map(f => f.id))
    for (const r of env.Narrative.dict.craftingRecipes) {
      for (const fid of r.fragments) {
        expect(fragIds.has(fid), `配方 ${r.relicId} 引用 fragment ${fid} 应存在`).toBe(true)
      }
    }
  })

  it('relic_carbon 配方要求 sacrificeWanderers=10', () => {
    const recipe = env.Narrative.dict.craftingRecipes.find(r => r.relicId === 'relic_carbon')
    expect(recipe).toBeDefined()
    expect(recipe.sacrificeWanderers).toBe(10)
    expect(recipe.sacrificeText).toBeDefined()
  })

  it('配方 relicId 全局唯一', () => {
    const ids = env.Narrative.dict.craftingRecipes.map(r => r.relicId)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('Narrative.finalInquiry — 终极质询', () => {
  it('具备 intro 和 questions 数组', () => {
    const fi = env.Narrative.dict.finalInquiry
    expect(fi.intro).toBeDefined()
    expect(Array.isArray(fi.questions)).toBe(true)
    expect(fi.questions.length).toBeGreaterThan(0)
  })

  it('每个问题具备 id/text/validRelics/successText', () => {
    for (const q of env.Narrative.dict.finalInquiry.questions) {
      expect(q.id).toBeDefined()
      expect(q.text).toBeDefined()
      expect(Array.isArray(q.validRelics)).toBe(true)
      expect(q.validRelics.length).toBeGreaterThan(0)
      expect(q.successText).toBeDefined()
    }
  })

  it('validRelics 引用的遗物在 relics 中存在', () => {
    const relicIds = new Set(Object.values(env.Narrative.dict.relics).map(r => r.id))
    for (const q of env.Narrative.dict.finalInquiry.questions) {
      for (const rid of q.validRelics) {
        expect(relicIds.has(rid), `问题 ${q.id} 引用 ${rid} 应存在`).toBe(true)
      }
    }
  })

  it('最后一题 validRelics 必须包含 relic_carbon（真结局门控）', () => {
    const questions = env.Narrative.dict.finalInquiry.questions
    const last = questions[questions.length - 1]
    expect(last.validRelics).toContain('relic_carbon')
  })

  it('问题 id 全局唯一', () => {
    const ids = env.Narrative.dict.finalInquiry.questions.map(q => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('Narrative.events — 随机事件池', () => {
  it('每个事件具备 id/title/text/condition/choices', () => {
    for (const ev of env.Narrative.dict.events) {
      expect(ev.id).toBeDefined()
      expect(ev.title).toBeDefined()
      expect(ev.text).toBeDefined()
      expect(ev.condition).toBeDefined()
      expect(Array.isArray(ev.choices)).toBe(true)
      expect(ev.choices.length).toBeGreaterThan(0)
    }
  })

  it('事件 id 全局唯一', () => {
    const ids = env.Narrative.dict.events.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('每个 choice 具备 label 和 outcome', () => {
    for (const ev of env.Narrative.dict.events) {
      for (const c of ev.choices) {
        expect(c.label).toBeDefined()
        expect(c.outcome).toBeDefined()
      }
    }
  })
})

describe('Narrative.deathEchoes — 死亡结局文案', () => {
  it('包含三种死亡类型 + rebirth_intro', () => {
    const de = env.Narrative.dict.deathEchoes
    expect(de.death_by_ember).toBeDefined()
    expect(de.death_by_sanity).toBeDefined()
    expect(de.death_by_combat).toBeDefined()
    expect(Array.isArray(de.rebirth_intro)).toBe(true)
    expect(de.rebirth_intro.length).toBeGreaterThan(0)
  })

  it('每种死亡具备 title 和 text', () => {
    const de = env.Narrative.dict.deathEchoes
    for (const key of ['death_by_ember', 'death_by_sanity', 'death_by_combat']) {
      expect(de[key].title).toBeDefined()
      expect(de[key].text).toBeDefined()
    }
  })
})

describe('Narrative.resourcesLore / mapNodes / infrastructureLogs', () => {
  it('resourcesLore 覆盖所有核心资源', () => {
    const rl = env.Narrative.dict.resourcesLore
    for (const key of ['ember', 'grayMatter', 'whispers', 'erosion', 'suppression', 'anomalies']) {
      expect(rl[key], `resourcesLore.${key}`).toBeDefined()
    }
  })

  it('mapNodes 至少 4 种地形', () => {
    const mn = env.Narrative.dict.mapNodes
    expect(Object.keys(mn).length).toBeGreaterThanOrEqual(4)
    for (const k in mn) {
      expect(mn[k].length).toBeGreaterThan(0)
    }
  })

  it('infrastructureLogs 包含核心日志 key', () => {
    const il = env.Narrative.dict.infrastructureLogs
    expect(il.assign_scavenger).toBeDefined()
    expect(il.build_node).toBeDefined()
    expect(il.insufficient_resources).toBeDefined()
  })
})
