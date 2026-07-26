# 余烬回响 — 测试回归执行与修复日志

> **Date**: 2026-07-26
> **Status**: Completed
> **Category**: Execution Log (`EXEC_`)
> **Scope**: 测试体系搭建后的首次全量回归、失败用例修复与 T4 E2E 落地

## 目录

1. [执行概要](#1-执行概要)
2. [回归测试结果](#2-回归测试结果)
3. [失败用例分析与修复](#3-失败用例分析与修复)
4. [T4 Playwright E2E 实现](#4-t4-playwright-e2e-实现)
5. [CI Workflow 配置](#5-ci-workflow-配置)
6. [变更文件清单](#6-变更文件清单)

---

## 1. 执行概要

### 1.1 任务目标

1. 执行全量测试回归，修复所有失败用例
2. 实现 T4 Playwright E2E 测试（config + helpers + smoke + core-flow）
3. 配置 CI workflow（ci.yml + simulation-nightly.yml）
4. 生成归档文档并同步 GitHub

### 1.2 执行结果

| 任务 | 状态 | 结果 |
|:---|:---|:---|
| T0-T3 测试回归 | ✅ 完成 | 211 passed / 3 skipped / 0 failed |
| 失败用例修复 | ✅ 完成 | 修复 setup.js Math 对象别名问题 |
| T4 E2E 实现 | ✅ 完成 | 105 用例（5 浏览器 × 21 场景） |
| CI workflow | ✅ 完成 | ci.yml + simulation-nightly.yml |
| 文档归档 | ✅ 完成 | TEST_ + EXEC_ + REPORT_ 三份 |

---

## 2. 回归测试结果

### 2.1 首次回归（修复前）

```
Test Files  11 passed | 3 skipped (14)
     Tests  209 passed | 3 skipped | 2 failed (214)
```

失败用例：
1. `riftmap_combat_survival > ANOMALY tile：random<=0.5 时 +2 erosion`
2. `riftmap_combat_survival > 完整链路：进入 ANOMALY 触发战斗`

### 2.2 修复后回归

```
Test Files  11 passed | 3 skipped (14)
     Tests  211 passed | 3 skipped (214)

Duration  29.26s
```

全部通过。3 个 skipped 为需要环境变量的可选套件（soak/balance/replay）。

### 2.3 各层测试分布

| 层次 | 文件数 | 用例数 | 状态 |
|:---|:---|:---|:---|
| T0 引导 | 1 | 4 | ✅ 全通过 |
| T1 单元 | 4 | 118 | ✅ 全通过 |
| T2 集成 | 4 | 77 | ✅ 全通过 |
| T3 模拟 smoke | 1 | 9 | ✅ 全通过 |
| T3 模拟 regression | 1 | 3 | ✅ 全通过 |
| T3 模拟 soak/balance/replay | 3 | 3 skipped | ⏸ 需环境变量 |
| **合计** | **14** | **211+3** | **✅** |

---

## 3. 失败用例分析与修复

### 3.1 根因分析

**现象**：`vi.spyOn(Math, 'random').mockReturnValue(0.4)` 在测试中设置后，game 脚本中的 `Math.random()` 调用并未返回 mock 值。

**调试过程**：

1. 在 `Combat.checkVictory` 击杀强敌测试中添加 `console.log`：
   ```
   [DBG] after atk3 enemyHp= -10 active= false fragInv= [] loot= { ember: 63 }
   ```
   - `loot.ember = 63` 说明 `Math.random()` 返回了真实随机值（应为 50 + Math.floor(0 * 50) = 50）
   - `fragInv = []` 说明 fragment 未掉落（`Math.random() < 0.33` 判定失败）

2. 确认 mock 设置正确：`vi.spyOn(Math, 'random').mockReturnValue(0)` 在测试中生效

3. 定位根因：**`window.Math !== global.Math`**

### 3.2 根因详解

```javascript
// test/setup.js 中 createGameEnvironment()
const dom = new JSDOM(...)  // 创建独立 jsdom 实例
const { window } = dom

// 游戏脚本通过 window.eval(src) 在 window 上下文执行
// 脚本中的 Math 引用 window.Math（JSDOM 独立实例）

// 但 vi.spyOn(Math, 'random') 作用于 Node.js 的 global.Math
// 两者是不同对象，mock 不影响 window.Math
```

### 3.3 修复方案

在 `test/setup.js` 中添加 `window.Math = global.Math` 别名：

```javascript
// 关键：让 window.Math 与 global.Math 共享同一对象。
// 否则 vi.spyOn(Math, 'random') 作用于 Node 全局 Math，
// 而 game 脚本在 window 上下文中访问 window.Math，mock 不生效。
// JSDOM 默认的 window.Math 是独立实例，需要显式别名。
try {
  Object.defineProperty(window, 'Math', {
    value: Math,
    writable: true,
    configurable: true,
    enumerable: true
  })
} catch (_e) {
  window.Math = Math
}
```

### 3.4 修复影响范围

此修复解决了所有依赖 `vi.spyOn(Math, 'random')` 的测试用例的不稳定性：

| 测试 | 修复前 | 修复后 |
|:---|:---|:---|
| `Combat.checkVictory 击杀强敌 fragment 掉率` | 随机失败（67%） | ✅ 确定性通过 |
| `RiftMap.move ANOMALY erosion 分支` | 随机失败（50%） | ✅ 确定性通过 |
| `RiftMap.move ANOMALY combat 分支` | 随机失败（50%） | ✅ 确定性通过 |
| `RiftMap.move RUIN fragment/anomaly` | 随机失败（25%） | ✅ 确定性通过 |
| `完整链路 ANOMALY→战斗→depositLoot` | 随机失败（67%） | ✅ 确定性通过 |

---

## 4. T4 Playwright E2E 实现

### 4.1 配置文件

`playwright.config.ts`：

| 配置项 | 值 | 说明 |
|:---|:---|:---|
| testDir | `./test/e2e` | E2E 测试目录 |
| baseURL | `http://localhost:8080/` | dev-server.js 端口 |
| webServer.command | `npm start` | express 静态服务 |
| webServer.reuseExistingServer | `!process.env.CI` | 本地复用，CI 新建 |
| retries | CI=2, local=0 | CI 重试 2 次 |
| workers | CI=1, local=auto | CI 单 worker 保证可复现 |
| reporter | list + html | 双报告输出 |
| trace | on-first-retry | 首次重试时记录 trace |
| screenshot | only-on-failure | 失败时截图 |
| video | retain-on-failure | 失败时保留视频 |

### 4.2 浏览器矩阵

5 个项目并行执行：

1. `chromium-desktop` — Desktop Chrome (1280×720)
2. `firefox-desktop` — Desktop Firefox (1280×720)
3. `webkit-desktop` — Desktop Safari (1280×720)
4. `mobile-chrome` — Pixel 5 (393×651)
5. `mobile-safari` — iPhone 12 (390×844)

### 4.3 Smoke 测试（7 个场景 × 5 浏览器 = 35 用例）

| 场景 | 验证点 |
|:---|:---|
| 页面标题与核心布局 | `#ee-wrapper` / `#ee-header` / `#ee-content` / `#ee-notifications` 可见 |
| 终端面板 NULL 阶段渲染 | body.phase-null / `#terminal-panel` / `#spark-controls` / 重启按钮 |
| 资源面板渲染 | `#stores-panel` 标题为「资源」 |
| CSS/JS 资源加载 | 无 requestfailed（CDN jQuery 除外） |
| jQuery fallback | `window.jQuery` 为 function |
| 核心模块挂载 | Engine / $SM / Sanity / Nexus / RiftMap / Combat / Survival / Endgame 均为 object |
| 无运行时异常 | pageerror 白名单过滤后为空 |

### 4.4 Core-Flow 测试（14 个场景 × 5 浏览器 = 70 用例）

| 场景 | 验证点 |
|:---|:---|
| NULL→SPARK 转换 | 点击「重启神经终端」后 phase=1, body.phase-spark |
| SPARK 显示提取按钮 | `#ember-counter` 显示 0 |
| 提取余烬增加数量 | ember ∈ [1,3] |
| 计数器与 $SM 同步 | UI 文本 === $SM.get('stores.ember') |
| 通知消息触发 | `#ee-notifications` 包含「余烬」 |
| 多次提取累加 | 3 次后 ember ≥ 3 |
| SPARK→CAMP 解锁 | ember≥50 后 phase≥2, body.phase-camp |
| CAMP 显示基础设施面板 | header 出现「节点」tab |
| 建造信号塔 | buildings.signalTower ≥ 1 |
| 资源面板同步 | `#stores-panel` 包含「余烬」 |
| 终端日志更新 | narrative 区域文本变化 |
| 角色初始状态 | san=50, hp=10, erosion=0, maxHp=10, maxSan=100 |
| tick 持续无错 | 5 秒内无 critical pageerror |
| 存档功能 | Engine.saveGame() 不抛错 |

### 4.5 Helper 函数

`test/e2e/helpers.ts` 提供 16 个公共函数：

- 环境控制：`waitForGameReady` / `resetGameState` / `dismissPWAUpdatePrompt`
- 状态读取：`getGamePhase` / `getEmber` / `getResourceSnapshot` / `getCharacterSnapshot`
- 交互操作：`clickButton` / `waitForButton` / `extractEmberOnce` / `extractEmberMultiple`
- 流程推进：`advanceToSpark` / `advanceToCamp`
- 工具：`waitForNotification` / `isCriticalError`

---

## 5. CI Workflow 配置

### 5.1 ci.yml — CI Pipeline

**触发**：push to main / pull_request / workflow_dispatch

**Job 结构**（单 job `validate`）：

| 步骤 | 命令 | 条件 |
|:---|:---|:---|
| Install | `npm ci` | — |
| 单元+集成测试（含覆盖率） | `npm run test:coverage` | — |
| 上传覆盖率 | artifact `coverage-report` | always |
| 模拟 smoke 门禁 | `npm run test:sim:smoke` | — |
| 模拟 regression 门禁 | `npm run test:sim:regression` | — |
| 上传模拟诊断 | artifact `simulation-smoke-diagnostics` | failure |
| 构建 | `npm run build` (GITHUB_ACTIONS=true) | — |
| 上传构建产物 | artifact `dist-build` | always |
| 安装 Chromium | `npx playwright install --with-deps chromium` | pull_request |
| PR E2E 门禁 | `npx playwright test --project=chromium-desktop` | pull_request |
| 安装全矩阵 | `npx playwright install --with-deps` | push |
| 全矩阵 E2E | `npm run test:e2e` | push |
| 上传 Playwright 报告 | artifact `playwright-report` | always |

**并发控制**：`cancel-in-progress: true`

### 5.2 simulation-nightly.yml — 每日模拟审计

**触发**：cron `30 18 * * *`（UTC 18:30 = 北京时间 02:30）/ workflow_dispatch

**可自定义参数**：

| 参数 | 默认值 | 说明 |
|:---|:---|:---|
| balance_runs | 5 | 每策略 seed 数 |
| balance_ticks | 150 | 目标 tick 数 |
| soak_runs | 6 | soak 运行次数 |
| soak_ticks | 300 | soak 目标 tick 数 |

**执行内容**：

1. `npm run test:sim:regression` — 回归种子库
2. `SIM_MODE=balance npm run test:sim:balance` — 平衡性统计
3. `SIM_SOAK=1 npm run test:sim:soak` — 长周期 soak

**报告上传**：artifact `simulation-audit-reports`，保留 30 天

---

## 6. 变更文件清单

### 6.1 修改的文件

| 文件 | 变更类型 | 说明 |
|:---|:---|:---|
| `test/setup.js` | 修复 | 添加 `window.Math = global.Math` 别名，解决 mock 不生效 |

### 6.2 新增的文件

| 文件 | 类型 | 说明 |
|:---|:---|:---|
| `playwright.config.ts` | 配置 | Playwright E2E 测试配置 |
| `test/e2e/helpers.ts` | 代码 | E2E 公共辅助函数（16 个） |
| `test/e2e/smoke.spec.ts` | 测试 | T4 冒烟测试（7 场景） |
| `test/e2e/core-flow.spec.ts` | 测试 | T4 核心用户流程（14 场景） |
| `.github/workflows/ci.yml` | CI | CI Pipeline（PR+push） |
| `.github/workflows/simulation-nightly.yml` | CI | 每日模拟审计 |
| `docs/TEST_20260726_TESTING_SYSTEM_STANDARD.md` | 文档 | 测试体系标准 |
| `docs/EXEC_20260726_TEST_REGRESSION_AND_FIX.md` | 文档 | 本执行日志 |
| `docs/REPORT_20260726_TESTING_SYSTEM_BUILD.md` | 文档 | 测试体系建设报告 |

---

> 文档生成日期：2026-07-26
> 本日志记录余烬回响测试体系首次全量回归的执行过程、失败用例根因分析与修复方案，以及 T4 E2E 测试和 CI workflow 的实现细节。
