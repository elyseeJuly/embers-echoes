# 余烬回响 — 测试体系标准

> **Date**: 2026-07-26
> **Status**: Implemented
> **Category**: Testing Standards (`TEST_`)
> **Scope**: 余烬回响完整测试体系架构与规范
> **Reference**: Beyond-the-Light-Cone `TEST_20260517_HEADLESS_AUTOPLAY_STANDARD.md`

## 目录

1. [概述与目标](#1-概述与目标)
2. [六层测试架构](#2-六层测试架构)
3. [T0/T1 单元测试规范](#3-t0t1-单元测试规范)
4. [T2 集成测试规范](#4-t2-集成测试规范)
5. [T3 无头模拟测试规范](#5-t3-无头模拟测试规范)
6. [T4 浏览器端到端测试规范](#6-t4-浏览器端到端测试规范)
7. [T5 体验审计规范](#7-t5-体验审计规范)
8. [CI/CD 集成规范](#8-cicd-集成规范)
9. [测试环境与 Mock 规范](#9-测试环境与-mock-规范)
10. [命名与目录约定](#10-命名与目录约定)

---

## 1. 概述与目标

### 1.1 定义

余烬回响测试体系是一套参考 Beyond-the-Light-Cone（BTC）无头自动试玩标准建立的六层测试架构，覆盖从静态代码契约到真实浏览器端到端的完整质量保障链路。

### 1.2 适用场景

| 场景 | 测试层 | 执行时机 |
|:---|:---|:---|
| 代码提交前本地验证 | T0/T1/T2 | 开发者手动 `npm test` |
| PR 合并门禁 | T0-T4 | CI 自动触发 `ci.yml` |
| 每日平衡性审计 | T3 | 定时触发 `simulation-nightly.yml` |
| 发版前全量回归 | T0-T5 | 手动触发 `workflow_dispatch` |

### 1.3 核心原则

1. **确定性优先**：所有涉及随机数的测试必须通过 `SeededRng` 或 `vi.spyOn(Math, 'random')` 保证可复现
2. **层次隔离**：每层测试只验证本层职责，不跨层依赖
3. **快速反馈**：T0-T2 在 30 秒内完成，T3 smoke 在 60 秒内完成
4. **真实环境验证**：T4 必须在真实浏览器中验证 DOM 渲染与用户交互
5. **状态隔离**：每个测试用例通过 `createGameEnvironment()` 获得干净的 jsdom 环境

---

## 2. 六层测试架构

```
┌─────────────────────────────────────────────────────────┐
│  T5  体验审计        手动 / 问卷 / 视觉评审              │
├─────────────────────────────────────────────────────────┤
│  T4  浏览器 E2E      Playwright × 5 浏览器矩阵           │
├─────────────────────────────────────────────────────────┤
│  T3  无头模拟        GameSimulationAdapter × 策略 AI     │
├─────────────────────────────────────────────────────────┤
│  T2  集成测试        Vitest × jsdom × 跨模块链路         │
├─────────────────────────────────────────────────────────┤
│  T1  单元测试        Vitest × jsdom × 单模块             │
├─────────────────────────────────────────────────────────┤
│  T0  静态与数据契约  语法检查 / 类型契约 / 配置校验       │
└─────────────────────────────────────────────────────────┘
```

### 2.1 各层职责

| 层次 | 名称 | 工具 | 用例数 | 执行环境 |
|:---|:---|:---|:---|:---|
| T0 | 静态与数据契约 | JSHint / 语法检查 | 4 | Node.js |
| T1 | 单元测试 | Vitest 2.1 + jsdom 25 | 118 | jsdom |
| T2 | 集成测试 | Vitest 2.1 + jsdom 25 | 77 | jsdom |
| T3 | 无头模拟 | Vitest 2.1 + 自研 Adapter | 12（+3 可选） | jsdom |
| T4 | 浏览器 E2E | Playwright 1.62 | 105 | 真实浏览器 |
| T5 | 体验审计 | 人工评审 | — | 真实设备 |

### 2.2 测试文件分布

```
test/
├── _bootstrap.test.js          # T0 引导测试
├── setup.js                    # 测试环境工厂
├── unit/                       # T1 单元测试
│   ├── endgame.test.js
│   ├── narrative.test.js
│   ├── sanity.test.js
│   └── state_manager.test.js
├── integration/                # T2 集成测试
│   ├── fragment_relic_endgame.integration.test.js
│   ├── income_state_cap.integration.test.js
│   ├── phase_progression.integration.test.js
│   └── riftmap_combat_survival.integration.test.js
├── simulation/                 # T3 无头模拟
│   ├── SeededRng.js            # 确定性随机数生成器
│   ├── GameSimulationAdapter.js # 模拟驱动器
│   ├── SimulationSuite.js      # 批量执行器
│   ├── invariants.js           # 不变量校验规则
│   ├── policies.js             # AI 策略集
│   ├── regressionSeeds.js      # 回归种子库
│   ├── types.js                # 类型契约
│   └── suites/
│       ├── smoke.sim.test.js       # 烟囱测试
│       ├── regression.sim.test.js  # 回归种子库
│       ├── soak.sim.test.js        # 长周期压力
│       ├── balance.sim.test.js     # 平衡性统计
│       └── replay.sim.test.js      # 单次复现
└── e2e/                        # T4 浏览器 E2E
    ├── helpers.ts              # 公共辅助函数
    ├── smoke.spec.ts           # 冒烟测试
    └── core-flow.spec.ts       # 核心用户流程
```

---

## 3. T0/T1 单元测试规范

### 3.1 T0 静态与数据契约

T0 验证项目基础结构完整性：

| 校验项 | 断言 | 严重度 |
|:---|:---|:---|
| `package.json` 可解析且含必要脚本 | 字段存在 | FATAL |
| `vitest.config.ts` 配置正确 | environment=jsdom | FATAL |
| 游戏脚本文件全部存在 | 26 个文件 | FATAL |
| 测试 setup 可加载 | 无异常 | FATAL |

### 3.2 T1 单元测试

T1 针对单个模块进行隔离测试，覆盖核心系统：

| 模块 | 文件 | 用例数 | 关键覆盖点 |
|:---|:---|:---|:---|
| StateManager | `state_manager.test.js` | 42 | get/set/add 路径解析、存储上限钳制、收入结算、片段/遗物库存 |
| Sanity | `sanity.test.js` | 34 | 三区域切换（同化/觉醒/疯狂）、SAN 衰减、侵蚀增长、最大值提升 |
| Narrative | `narrative.test.js` | 27 | 残片定义、合成配方、遗物属性、环境日志 |
| Endgame | `endgame.test.js` | 15 | 五种结局判定（bad/neutral/true/good/secret）、遗物计数阈值 |

### 3.3 单元测试编写规范

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { createGameEnvironment } from '../setup.js'

describe('T1 单元：模块名', () => {
  let env
  beforeEach(() => {
    env = createGameEnvironment()
    // 每个测试获得干净状态
  })

  it('功能描述 — 具体断言', () => {
    // Arrange
    env.$SM.set('stores.ember', 10, true)
    // Act
    env.Module.doSomething()
    // Assert
    expect(env.$SM.get('stores.ember')).toBe(expected)
  })
})
```

---

## 4. T2 集成测试规范

### 4.1 覆盖范围

T2 验证跨模块协作链路：

| 测试文件 | 链路 | 用例数 |
|:---|:---|:---|
| `income_state_cap.integration.test.js` | Population → $SM.collectIncome → 存储上限钳制 | 14 |
| `fragment_relic_endgame.integration.test.js` | RiftMap.dropFragment → Relics.craft → Endgame.evaluate | 16 |
| `phase_progression.integration.test.js` | Engine.setPhase → 各模块 handlePhaseChange | 20 |
| `riftmap_combat_survival.integration.test.js` | RiftMap.move → Combat.startEncounter → Survival.addLoot/depositLoot | 27 |

### 4.2 集成测试编写规范

```javascript
describe('T2 集成：模块A → 模块B', () => {
  let env
  beforeEach(() => {
    env = createGameEnvironment()
    // 初始化必要的模块状态（不调用 init 以避免 DOM 绑定）
    env.RiftMap.setTile(0, 0, env.RiftMap.TILE.CAMP)
    env.RiftMap.active = true
  })

  it('完整链路：触发条件 → 中间状态 → 最终断言', () => {
    // 设置初始状态
    env.$SM.set('stores.concentrate', 10, true)
    // 执行链路
    env.Combat.startEncounter(env.Combat.ENEMIES[2])
    env.Combat.playerAttack(env.Combat.WEAPONS['Logic Bomb'])
    // 断言中间状态与最终状态
    expect(env.Survival.loot.ember).toBeGreaterThanOrEqual(50)
  })
})
```

---

## 5. T3 无头模拟测试规范

### 5.1 架构设计

```
┌────────────────────────────────────────────────┐
│           SimulationSuite (批量执行)             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Case 1   │ │ Case 2   │ │ Case N   │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       │            │            │               │
│  ┌────▼────────────▼────────────▼─────┐        │
│  │     GameSimulationAdapter           │        │
│  │  ┌─────────┐  ┌────────────────┐  │        │
│  │  │ Policy  │  │  Invariants    │  │        │
│  │  │ (AI)    │  │  (校验规则)     │  │        │
│  │  └────┬────┘  └───────┬────────┘  │        │
│  │       │               │            │        │
│  │  ┌────▼───────────────▼────────┐  │        │
│  │  │    GameEnvironment (jsdom)  │  │        │
│  │  │  Engine / $SM / Sanity ...  │  │        │
│  │  └─────────────────────────────┘  │        │
│  └───────────────────────────────────┘        │
└────────────────────────────────────────────────┘
```

### 5.2 核心组件

| 组件 | 文件 | 职责 |
|:---|:---|:---|
| SeededRng | `SeededRng.js` | 基于 Mulberry32 的确定性 PRNG，保证同 seed 同序列 |
| GameSimulationAdapter | `GameSimulationAdapter.js` | 模拟驱动器，管理 tick 循环、状态快照、不变量校验 |
| SimulationSuite | `SimulationSuite.js` | 批量执行器，聚合多 case 结果并生成统计摘要 |
| Policies | `policies.js` | 4 种 AI 策略：conservative / aggressive / balanced / seeded-random |
| Invariants | `invariants.js` | 12 条不变量校验：资源非负、SAN 钳制、phase 单调推进等 |
| RegressionSeeds | `regressionSeeds.js` | 5 个登记 seed，保护核心推进路径 |

### 5.3 测试套件

| 套件 | 触发条件 | 默认规模 | 用途 |
|:---|:---|:---|:---|
| smoke | 默认 | 9 用例 | 验证 harness 基础功能 |
| regression | 默认 | 3 用例（5 seed） | 确保登记 seed 可复现 |
| soak | `SIM_SOAK=1` | 4 runs × 300 ticks | 长周期稳定性 |
| balance | `SIM_MODE=balance` | 3 runs × 150 ticks | 多策略平衡性统计 |
| replay | `SIM_SEED`+`SIM_POLICY`+`SIM_TICKS` | 单次 | 复现特定运行 |

### 5.4 回归种子库

```javascript
export const REGRESSION_SEEDS = [
  { id: 'SIM-20260726-01', seed: 20260726, targetTicks: 50,  policy: 'conservative', protects: ['SPARK→CAMP', '基础 income'] },
  { id: 'SIM-20260726-02', seed: 314159,   targetTicks: 80,  policy: 'aggressive',   protects: ['CAMP→ABYSS', 'grayMatter 生产'] },
  { id: 'SIM-20260726-03', seed: 271828,   targetTicks: 100, policy: 'balanced',     protects: ['ABYSS→MAP', 'riftBeacon'] },
  { id: 'SIM-20260726-04', seed: 161803,   targetTicks: 120, policy: 'seeded-random',protects: ['多 phase 压力', '资源 cap'] },
  { id: 'SIM-20260726-05', seed: 999983,   targetTicks: 60,  policy: 'conservative', protects: ['sentinel/erosion', 'sanity zone'] },
]
```

### 5.5 不变量校验清单

| ID | 校验项 | 严重度 |
|:---|:---|:---|
| INV-NO-NEGATIVE-STORES | 所有 stores 值 ≥ 0 | FATAL |
| INV-SAN-IN-RANGE | SAN ∈ [0, maxSan] | FATAL |
| INV-EROSION-IN-RANGE | erosion ∈ [0, 100] | FATAL |
| INV-PHASE-MONOTONIC | phase 只能单调递增 | FATAL |
| INV-NO-RUNTIME-EXCEPTION | tick 不抛异常 | FATAL |
| INV-TICK-PROGRESSES | simTick 计数器递增 | ERROR |
| INV-WORKERS-NON-NEGATIVE | worker 数量 ≥ 0 | ERROR |

---

## 6. T4 浏览器端到端测试规范

### 6.1 浏览器矩阵

| 项目 | 设备 | 用途 |
|:---|:---|:---|
| chromium-desktop | Desktop Chrome | 主开发浏览器 |
| firefox-desktop | Desktop Firefox | 跨引擎兼容性 |
| webkit-desktop | Desktop Safari | macOS/iOS Safari 兼容性 |
| mobile-chrome | Pixel 5 | Android Chrome 响应式 |
| mobile-safari | iPhone 12 | iOS Safari 响应式 |

### 6.2 测试覆盖

| 文件 | 场景 | 用例数 |
|:---|:---|:---|
| `smoke.spec.ts` | 页面加载、布局渲染、资源加载、模块挂载、错误监控 | 7 × 5 = 35 |
| `core-flow.spec.ts` | NULL→SPARK→CAMP 转换、提取余烬、建造、状态同步 | 14 × 5 = 70 |

### 6.3 webServer 配置

```typescript
webServer: {
  command: 'npm start',           // dev-server.js (express 静态服务)
  url: 'http://localhost:8080/',
  reuseExistingServer: !process.env.CI,
  timeout: 60000,
}
```

### 6.4 Helper 函数

| 函数 | 用途 |
|:---|:---|
| `waitForGameReady(page)` | 等待 #ee-wrapper + #terminal-panel 可见 |
| `advanceToSpark(page)` | 点击「重启神经终端」进入 SPARK |
| `extractEmberOnce(page)` | 点击「提取余烬」一次 |
| `getGamePhase(page)` | 读取 `window.Engine.getPhase()` |
| `getEmber(page)` | 读取 `window.$SM.get('stores.ember')` |
| `getCharacterSnapshot(page)` | 读取 san/erosion/hp/maxHp/maxSan |
| `clickButton(page, text)` | 通过文本定位 `.ee-btn` 并点击 |
| `isCriticalError(message)` | 过滤已知非阻塞错误白名单 |

---

## 7. T5 体验审计规范

T5 为手动评审层，不在自动化范围内。评审清单：

| 维度 | 检查点 |
|:---|:---|
| 视觉 | CSS 变量主题一致、动画过渡平滑、暗色对比度达标 |
| 交互 | 按钮反馈即时、cooldown 可视化、通知不遮挡 |
| 叙事 | 文本无错别字、叙事节奏合理、结局触发条件清晰 |
| 音频 | BGM 切换自然、SFX 不刺耳、音量可控 |
| 性能 | 首屏 < 3s、tick 无卡顿、长周期无内存泄漏 |

---

## 8. CI/CD 集成规范

### 8.1 CI Pipeline (`ci.yml`)

| 触发 | 执行内容 |
|:---|:---|
| pull_request | T0-T2 覆盖率 + T3 smoke/regression + Build + T4 chromium-only |
| push to main | T0-T2 覆盖率 + T3 smoke/regression + Build + T4 全矩阵 |

### 8.2 Nightly Audit (`simulation-nightly.yml`)

| 触发 | 执行内容 |
|:---|:---|
| cron 30 18 * * * | T3 regression + balance + soak（完整规模） |
| workflow_dispatch | 可自定义 runs/ticks 参数 |

### 8.3 CI 通过标准

| 门禁 | 阈值 | 失败行为 |
|:---|:---|:---|
| 单元+集成测试 | 0 失败 | 阻断合并 |
| 模拟 smoke | 0 违例 | 阻断合并 |
| 模拟 regression | 0 违例 | 阻断合并 |
| 构建 | 成功生成 dist/ | 阻断合并 |
| E2E chromium | 0 失败 | 阻断合并 |
| 覆盖率 | ≥ 60%（建议） | 警告 |

---

## 9. 测试环境与 Mock 规范

### 9.1 jsdom 环境工厂

`createGameEnvironment()` 提供：

- 完整 JSDOM 实例（含 `#ee-wrapper` / `#ee-left` / `#ee-middle` / `#ee-right` 结构）
- 本地 jQuery 1.10 + jQuery.Color 加载
- 26 个游戏脚本按 `index.html` 顺序注入
- `localStorage` / `AudioContext` / `fetch` mock
- `window.Math = global.Math` 别名（关键：使 `vi.spyOn(Math, 'random')` 生效）

### 9.2 关键 Mock 规则

| 对象 | Mock 方式 | 原因 |
|:---|:---|:---|
| `Math.random` | `vi.spyOn(Math, 'random').mockReturnValue(x)` | 测试需确定性随机；需 `window.Math = global.Math` |
| `setInterval` | `vi.useFakeTimers({ shouldAdvanceTime: true })` | 控制 Combat tick 但不阻塞测试 |
| `AudioContext` | 返回空 mock 对象 | 浏览器 API 在 Node.js 不可用 |
| `localStorage` | 内存对象 mock | jsdom 不持久化 |
| `fetch` | 返回空 ArrayBuffer | 音频文件不可访问 |

### 9.3 状态重置

每个 `beforeEach` 调用 `createGameEnvironment()` 获得全新：
- `$SM.options.state`（状态树重置为初始值）
- `RiftMap.grid` / `RiftMap.visited`（地图重置）
- `Combat.active = false`（战斗状态清除）
- `Survival.loot = {}` / `Survival.supplies = 0`（背包清空）

---

## 10. 命名与目录约定

### 10.1 测试文件命名

| 类型 | 模式 | 示例 |
|:---|:---|:---|
| 单元测试 | `{module}.test.js` | `state_manager.test.js` |
| 集成测试 | `{chain}.integration.test.js` | `riftmap_combat_survival.integration.test.js` |
| 模拟测试 | `{suite}.sim.test.js` | `smoke.sim.test.js` |
| E2E 测试 | `{scenario}.spec.ts` | `core-flow.spec.ts` |

### 10.2 describe/it 命名

```javascript
describe('T{层} {类型}：{模块/链路}', () => {
  it('{行为描述} — {断言要点}', () => { ... })
})
```

示例：
```javascript
describe('T2 集成：RiftMap → Combat → Survival', () => {
  it('完整链路：进入 ANOMALY 触发战斗 → 胜利 → 撤回营地 → depositLoot', () => { ... })
})
```

### 10.3 文档命名

```
{前缀}_{YYYYMMDD}_{主题大写_下划线分隔}.md
```

- `TEST_`：测试规范/计划
- `EXEC_`：执行日志/任务记录
- `REPORT_`：总结报告

---

> 文档生成日期：2026-07-26
> 本文档定义余烬回响项目的完整测试体系架构，覆盖 T0-T5 六层测试的规范、CI/CD 集成方案与测试环境配置标准。
