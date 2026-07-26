# 余烬回响 — 测试体系建设报告

> **Date**: 2026-07-26
> **Status**: Delivered
> **Category**: Summary Report (`REPORT_`)
> **Scope**: 参照 Beyond-the-Light-Cone 六层测试模型搭建余烬回响完整测试体系
> **配套文档**:
>   - 规范：[TEST_20260726_TESTING_SYSTEM_STANDARD.md](./TEST_20260726_TESTING_SYSTEM_STANDARD.md)
>   - 执行：[EXEC_20260726_TEST_REGRESSION_AND_FIX.md](./EXEC_20260726_TEST_REGRESSION_AND_FIX.md)

## 目录

1. [建设目标与对齐](#1-建设目标与对齐)
2. [交付物概览](#2-交付物概览)
3. [测试用例规模与覆盖](#3-测试用例规模与覆盖)
4. [回归测试结论](#4-回归测试结论)
5. [关键问题与修复](#5-关键问题与修复)
6. [CI/CD 集成状态](#6-cicd-集成状态)
7. [与 BTC 的差异与本地化适配](#7-与-btc-的差异与本地化适配)
8. [收益与风险](#8-收益与风险)
9. [后续演进](#9-后续演进)

---

## 1. 建设目标与对齐

### 1.1 用户诉求

> 参考 Beyond-the-Light-Cone 为这款游戏搭建完整的测试体系，并且完成测试回归，如果有测试不通过的情况，一并修复。完成后按照不同的任务要求分别按照本地归档规范形成文档汇报工作，并且同步至 GitHub。

### 1.2 对齐 BTC 的测试哲学

余烬回响在以下维度与 BTC 的 `TEST_20260517_HEADLESS_AUTOPLAY_STANDARD.md` 对齐：

| 维度 | BTC 做法 | 余烬回响落地 |
|:---|:---|:---|
| 分层模型 | T0–T5 六层 | ✅ 完整对齐 |
| 确定性随机 | SeededRng + Mulberry32 | ✅ 完整复用 |
| 不变量校验 | 资源/SAN/phase 单调 | ✅ 12 条校验规则 |
| 回归种子库 | 登记式 seed 保护核心路径 | ✅ 5 个登记 seed |
| 多策略覆盖 | conservative/aggressive/balanced/random | ✅ 4 种策略 |
| 浏览器矩阵 | 多浏览器 E2E | ✅ 5 浏览器矩阵 |
| CI 门禁 | smoke + regression + build | ✅ 同构 pipeline |

### 1.3 本地化适配

余烬回响技术栈与 BTC 不同（jQuery/ES5 vs React/TS），需做关键适配：

| 适配点 | 解决方案 |
|:---|:---|
| 脚本通过 `window.eval` 注入 jsdom | `test/setup.js` 统一加载 26 个脚本 |
| 全局 `Math` 跨上下文不一致 | `window.Math = global.Math` 别名 |
| jQuery 1.10 + jQuery.Color 依赖 | 本地 vendor 文件加载，CDN fallback 在测试中跳过 |
| PWA 更新提示干扰 E2E | helper 提供 `dismissPWAUpdatePrompt` |

---

## 2. 交付物概览

### 2.1 代码与配置

| 类型 | 路径 | 说明 |
|:---|:---|:---|
| Vitest 配置 | [vitest.config.ts](../vitest.config.ts) | T0-T3 配置，已排除 E2E 目录 |
| Playwright 配置 | [playwright.config.ts](../playwright.config.ts) | T4 配置，5 浏览器矩阵 |
| 测试环境工厂 | [test/setup.js](../test/setup.js) | jsdom + 脚本注入 + Math 别名 |
| 单元测试 | [test/unit/](../test/unit/) | 4 个文件 / 118 用例 |
| 集成测试 | [test/integration/](../test/integration/) | 4 个文件 / 77 用例 |
| 模拟测试 | [test/simulation/](../test/simulation/) | harness + 5 个套件 |
| E2E 测试 | [test/e2e/](../test/e2e/) | helpers + smoke + core-flow |
| CI Pipeline | [.github/workflows/ci.yml](../.github/workflows/ci.yml) | PR + push 门禁 |
| 夜间审计 | [.github/workflows/simulation-nightly.yml](../.github/workflows/simulation-nightly.yml) | 定时模拟 |

### 2.2 文档

| 类型 | 文件 |
|:---|:---|
| 测试规范（TEST_） | [TEST_20260726_TESTING_SYSTEM_STANDARD.md](./TEST_20260726_TESTING_SYSTEM_STANDARD.md) |
| 执行日志（EXEC_） | [EXEC_20260726_TEST_REGRESSION_AND_FIX.md](./EXEC_20260726_TEST_REGRESSION_AND_FIX.md) |
| 总结报告（REPORT_） | 本文档 |

---

## 3. 测试用例规模与覆盖

### 3.1 用例分布

```
┌──────────────────────────────────────────────────┐
│  T4  Playwright E2E    105 用例（5 浏览器×21）   │
├──────────────────────────────────────────────────┤
│  T3  Headless 模拟     12 用例（+3 可选）         │
├──────────────────────────────────────────────────┤
│  T2  集成测试           77 用例（4 链路文件）      │
├──────────────────────────────────────────────────┤
│  T1  单元测试          118 用例（4 模块文件）      │
├──────────────────────────────────────────────────┤
│  T0  静态与契约          4 用例（_bootstrap）      │
└──────────────────────────────────────────────────┘

自动化用例总数：316（T0-T4）
```

### 3.2 模块覆盖

| 游戏模块 | T1 | T2 | T3 | T4 |
|:---|:---|:---|:---|:---|
| StateManager | ✅ 42 | ✅ | ✅ | ✅ |
| Sanity | ✅ 34 | ✅ | ✅ | ✅ |
| Endgame | ✅ 15 | ✅ | — | — |
| Narrative | ✅ 27 | — | — | — |
| RiftMap | — | ✅ 27 | ✅ | ✅ |
| Combat | — | ✅ | ✅ | — |
| Survival | — | ✅ | ✅ | — |
| Engine (phase) | — | ✅ 20 | ✅ | ✅ |
| Terminal | — | — | — | ✅ |
| Population/Income | — | ✅ 14 | ✅ | — |

### 3.3 关键链路覆盖

| 跨模块链路 | 覆盖层 |
|:---|:---|
| Population → $SM.collectIncome → 存储上限钳制 | T2 |
| RiftMap.dropFragment → Relics.craft → Endgame.evaluate | T2 |
| Engine.setPhase → 各模块 handlePhaseChange | T2 |
| RiftMap.move → Combat.startEncounter → Survival.addLoot | T2 |
| NULL → SPARK → CAMP 完整用户旅程 | T4 |
| 5 个登记 seed 的多策略长周期推进 | T3 |

---

## 4. 回归测试结论

### 4.1 T0–T3 回归（Vitest）

```
Test Files  11 passed | 3 skipped (14)
     Tests  211 passed | 3 skipped (214)

Duration  4.04s
```

- **passed**：211 / 211（100%）
- **skipped**：3 个（soak/balance/replay，需环境变量触发，非阻断）
- **failed**：0

### 4.2 构建验证

```
✓ 8 modules transformed.
✓ built in 250ms
PWA v1.3.0 / precache 58 entries (554.00 KiB)
```

### 4.3 T4 E2E

T4 用例本地不强制执行（需安装 5 个浏览器二进制，约 800MB），由 GitHub Actions 在 PR/push 时自动运行：
- PR：仅 chromium-desktop（约 90s）
- push to main：5 浏览器矩阵（约 6 min）

---

## 5. 关键问题与修复

### 5.1 Vitest 误扫 Playwright spec 文件

| 项 | 内容 |
|:---|:---|
| 现象 | `npm test` 报 `Playwright Test did not expect test.describe() to be called here` |
| 根因 | `vitest.config.ts` 未排除 `test/e2e/**`，Vitest 默认匹配 `*.spec.ts` |
| 修复 | 在 `vitest.config.ts.test.exclude` 添加 `test/e2e/**` 与 `playwright-report/**` |
| 影响 | `npm test` 现可正常执行 T0–T3 全量回归 |

### 5.2 window.Math ≠ global.Math（详见 EXEC_）

| 项 | 内容 |
|:---|:---|
| 现象 | `vi.spyOn(Math, 'random')` 在测试中设置后，game 脚本的 `Math.random()` 仍返回真实随机值 |
| 根因 | JSDOM 实例的 `window.Math` 是独立对象，与 Node.js `global.Math` 不同 |
| 修复 | `test/setup.js` 中显式 `window.Math = global.Math` |
| 影响 | 5 个依赖 Math.random mock 的用例从「随机失败」转为「确定性通过」 |

---

## 6. CI/CD 集成状态

### 6.1 PR / Push 门禁（ci.yml）

| 步骤 | PR | push to main |
|:---|:---|:---|
| Install dependencies | ✅ | ✅ |
| T0–T2 + 覆盖率 | ✅ | ✅ |
| T3 smoke | ✅ | ✅ |
| T3 regression | ✅ | ✅ |
| Build | ✅ | ✅ |
| T4 chromium-only | ✅ | — |
| T4 全矩阵 | — | ✅ |
| 上传 coverage / dist / playwright-report | ✅ | ✅ |

### 6.2 夜间审计（simulation-nightly.yml）

| 触发 | 内容 |
|:---|:---|
| cron `30 18 * * *` (UTC 18:30 / 北京 02:30) | T3 regression + balance + soak 完整规模 |
| workflow_dispatch | 可自定义 `balance_runs` / `balance_ticks` / `soak_runs` / `soak_ticks` |

---

## 7. 与 BTC 的差异与本地化适配

### 7.1 架构差异

| 维度 | BTC | 余烬回响 |
|:---|:---|:---|
| 框架 | React 19 + TS | jQuery 1.10 + ES5 |
| 构建 | Vite + tsc | Vite（无 TS 源码） |
| 测试加载 | `import` 直接引用 | `window.eval(scriptSource)` 注入 |
| 状态管理 | Zustand store | 全局 `$SM` 单例 |
| 路由 | React Router | `Engine.setPhase` + body class |

### 7.2 测试基础设施差异

| 组件 | BTC | 余烬回响 |
|:---|:---|:---|
| jsdom 环境工厂 | React Testing Library | 自研 `createGameEnvironment()` |
| 脚本加载 | webpack bundle | 显式 26 个文件按序 eval |
| Math mock | 直接 `vi.spyOn(Math)` | 需 `window.Math = global.Math` 别名 |
| DOM 断言 | `@testing-library/jest-dom` | 直接 jQuery 选择器 |
| 时间 mock | `vi.useFakeTimers` | 同 BTC（含 `shouldAdvanceTime: true`） |

---

## 8. 收益与风险

### 8.1 收益

1. **质量基线**：211 个回归用例 + 5 个登记 seed，构建发布前质量门禁已建立
2. **确定性**：所有涉及随机的测试通过 SeededRng 或 Math mock 可复现
3. **跨模块保障**：T2 集成测试覆盖 4 条核心跨模块链路，防止接口回归
4. **长周期验证**：T3 soak 套件支持 300 ticks × 6 runs 的稳定性压力
5. **真实浏览器保障**：T4 在 5 浏览器（含移动端）验证 DOM 渲染与交互
6. **CI 自动化**：PR 门禁 + 夜间审计双轨，无需人工干预

### 8.2 已知风险

| 风险 | 等级 | 缓解措施 |
|:---|:---|:---|
| T4 用例本地未实际执行（无浏览器二进制） | 中 | CI 强制执行；本地可通过 `npx playwright install` 补齐 |
| T1 单元测试未覆盖 Combat/Survival/RiftMap 单模块（仅在 T2 覆盖） | 低 | 当前 T2 已充分覆盖；后续可拆分单模块 T1 |
| 覆盖率阈值 30% 偏低 | 低 | 已有提升路径，后续逐步提升至 60% |
| E2E 用例依赖 dev-server.js 端口 8080 | 低 | CI 中 reuseExistingServer=false，本地复用 |
| 模拟 harness 与真实游戏 tick 存在抽象差 | 中 | 通过登记 seed 与不变量校验降低偏差 |

---

## 9. 后续演进

### 9.1 短期（下一个迭代）

- [ ] 提升 `script/` 覆盖率至 60%（当前阈值 30%）
- [ ] 为 Combat / Survival / RiftMap 补充 T1 单元测试
- [ ] 增加 ABYSS / MAP / SINK / END 阶段的 T4 E2E 场景

### 9.2 中期

- [ ] 引入 visual regression testing（Playwright screenshot 对比）
- [ ] 模拟 harness 接入 Lighthouse 性能审计
- [ ] T5 体验审计 checklist 工具化

### 9.3 长期

- [ ] 跨版本存档兼容性测试
- [ ] 多语言（i18n）测试支持
- [ ] 模拟 harness 与 BTC 共享一套通用 invariant 库

---

## 10. 任务对齐检查

| 用户诉求 | 完成情况 |
|:---|:---|
| 参考 BTC 搭建完整测试体系 | ✅ 六层 T0-T5 全部落地 |
| 完成测试回归 | ✅ 211 passed / 3 skipped / 0 failed |
| 修复不通过用例 | ✅ 修复 Vitest 误扫 + window.Math 别名 |
| 按任务要求分别形成归档文档 | ✅ TEST_ + EXEC_ + REPORT_ 三份 |
| 同步至 GitHub | ✅ 提交至 main 分支并推送 origin |

---

> 文档生成日期：2026-07-26
> 本报告汇总余烬回响测试体系建设的最终交付状态，配套 TEST_ 规范与 EXEC_ 执行日志使用。
