# 余烬回响 (Embers Echoes) — 本地项目文档注册主表

> **版本号**: V1.0.0  
> **生效日期**: 2026-05-20  
> **适用对象**: 所有项目开发、AI 协同智能体、独立工程师与版本归档  
> **全局规范参考**: [SPEC_20260520_GLOBAL_DEVELOPMENT_STANDARDS.md](file:///Users/quantumrose/Documents/Emberois/SPEC_20260520_GLOBAL_DEVELOPMENT_STANDARDS.md)

---

## 📖 一、 概述

本项目遵循 **Emberois 全局项目开发文档与归档管理规范**，对所有设计规格书、系统审计报告、会话执行计划及交付 Walkthrough 实施扁平化、双重命名管理。

本注册表作为该项目本地所有规范化文档的**唯一物理主索引**。开发者及 AI 助手可在支持 Markdown 预览的编辑器中**一键点击**以下绝对路径链接，直达具体文档或精准的代码锚定位置。

---

## 🛠️ 二、 文档分类注册索引

### 1. ⚙️ 规格说明与设计系统 (Specifications — `SPEC_`)
主要承载核心架构、UI 设计准则、系统规格说明以及技术交接。

*   **[SPEC_20260304_ZONE_COMBAT_BALANCE.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/docs/SPEC_20260304_ZONE_COMBAT_BALANCE.md)**
    *   *说明*：大地图探索区域战斗数值平衡规格说明。以营地 (0,0) 为圆心，规定了不同半径（<10, <20, <30）下的怪物 DPS、生命值与玩家预期 DPS、生命值的难度阶梯与数值门限。
*   **[SPEC_20260304_GAME_EVENTS.xlsx](file:///Users/quantumrose/Documents/Emberois/embers-echoes/docs/SPEC_20260304_GAME_EVENTS.xlsx)**
    *   *说明*：核心游戏遭遇事件列表。包含游戏内所有大地图节点和营地内可触发的文本/战斗抉择事件总表。
*   **[SPEC_20260305_CORE_SYSTEM_DESIGN.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/docs/SPEC_20260305_CORE_SYSTEM_DESIGN.md)**
    *   *说明*：核心系统设计白皮书 (Master GDD V2.0)。详细定义了零维至终局的渐进式心流、防膨胀仓储天花板、理智/侵蚀状态机、大地图考古博弈、逆向运算矩阵与三重终局结局树等设计核心机制。
*   **[SPEC_20260305_RELIC_EXPLORATION_DESIGN.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/docs/SPEC_20260305_RELIC_EXPLORATION_DESIGN.md)**
    *   *说明*：大地图探索与遗物解译系统设计规格说明 (Master GDD V2.0 附加卷)。详细规划了基础资源、中继AVG事件、深渊遗迹三级探索节点生成，以及概念解译器重构配方、限时高压质询答题与结局检索逻辑。
*   **[SPEC_20260306_CORE_IMPLEMENTATION_PLAN.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/docs/SPEC_20260306_CORE_IMPLEMENTATION_PLAN.md)**
    *   *说明*：核心重构与系统设计实施方案。详细规划了从《小黑屋 (A Dark Room)》 codebase 演进到《余烬回响》的 6 个系统阶段（Null/Spark, Camp, Abyss, Leap, Endgame, Meta-Progression）。

---

### 2. 🔍 审计报告与系统平衡 (Audits — `AUDIT_`)
承载代码审计、玩法心流诊断、性能优化与综合评审记录。

*   **[AUDIT_20260422_COMPREHENSIVE_SYSTEM_AUDIT.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/docs/AUDIT_20260422_COMPREHENSIVE_SYSTEM_AUDIT.md)**
    *   *说明*：全景架构与体验审计报告。剖析了音效引擎的致命缺失、Rift Map (裂隙地图) 移动端手感缺失、ATB 战斗时钟刷新率等系统性能与交互优化空间。
*   **[AUDIT_20260422_STRUCTURAL_AUDIT.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/docs/AUDIT_20260422_STRUCTURAL_AUDIT.md)**
    *   *说明*：底层代码架构对比审计报告。详细梳理了《小黑屋》到《余烬回响》的演进细节，包含硬上限机制、SAN (理智) 及侵蚀系统设计、事件字典抽离等。
*   **[AUDIT_20260422_UX_LOGIC_AUDIT.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/docs/AUDIT_20260422_UX_LOGIC_AUDIT.md)**
    *   *说明*：深度 UX 与逻辑代码层审计。深入诊断游戏“丝滑感”降级的四大元凶（过渡动画缺失、全局状态暴力重绘导致布局抖动、遮罩模态打断心流、点击抖动防抖隐患）。

---

### 3. 🧪 测试套件与验证用例 (Tests — `TEST_`)
承载自动化跑测脚本报告、用例边界设计以及跑测结果。

*   *暂无测试套件文档，后续补充。*

---

### 4. 📜 历史编年史与归档 (Histories — `HIST_`)
承载开发日志大编年史、README 演进历史、Git 提交流水账、legacy 历史备忘录等静态归档。

*   **[HIST_20260304_ADR_CLEANUP_AND_BRAND_TRANSITION.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/docs/HIST_20260304_ADR_CLEANUP_AND_BRAND_TRANSITION.md)**
    *   *说明*：ADR 遗留清理与品牌重构历史编年史。完整记录 2026-03-04 期间进行的大规模死代码清理与新项目元数据/汉化警告页面的品牌独立转换。
*   **[HIST_20260304_REBRANDING_AND_NARRATIVE_CHRONICLE.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/docs/HIST_20260304_REBRANDING_AND_NARRATIVE_CHRONICLE.md)**
    *   *说明*：叙事重塑与品牌重构历史编年史。完整记录 2026-03-04 期间进行的大地图虚空移动格阻塞修正、血量归零后 Permadeath 机制接线、环境与资源幽灵图鉴叙事扩展，以及项目正式更名为 embers-echoes 并迁移 GitHub origin 的重大历程。
*   **[HIST_20260307_SYSTEM_HOTFIX_AND_AMBIENT_INTEGRATION.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/docs/HIST_20260307_SYSTEM_HOTFIX_AND_AMBIENT_INTEGRATION.md)**
    *   *说明*：全局系统热修复与环境状态播报开发历史归档。完整记录 2026-03-06 与 2026-03-07 期间实现的环境状态叙事广播系统、神经终端重启空白崩溃热修复、Nexus 基地建筑造价动态刷新以及 Favicon 品牌化资产升级。
*   **[HIST_20260308_FUNCTIONAL_DESIGN_REFINEMENTS_AND_HOTFIX.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/docs/HIST_20260308_FUNCTIONAL_DESIGN_REFINEMENTS_AND_HOTFIX.md)**
    *   *说明*：核心体验功能精细化重构与主板消失时序热修复历史编年史。完整记录 2026-03-07 至 2026-03-08 期间实施的六大设计痛点深度重构，以及彻底攻克理智上限死锁 40 与营地/工人管理面板刷新空白消失的重大崩溃时序热修复。
*   **[HIST_20260308_HOTFIX_V1_1_AND_RELIC_REBALANCE.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/docs/HIST_20260308_HOTFIX_V1_1_AND_RELIC_REBALANCE.md)**
    *   *说明*：系统数值死锁热更新与文明遗物平衡历史编年史。完整记录 2026-03-05 至 2026-03-08 期间进行的 Hotfix V1.1 版本部署（含理智上限动态 Clamp、高阶碎片 Smart Loot）及终局文明遗物合成成本的大规模重组优化，彻底解决系统卡死问题。
*   **[HIST_20260528_DOCUMENTATION_REORGANIZATION_AND_CLEANUP.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/docs/HIST_20260528_DOCUMENTATION_REORGANIZATION_AND_CLEANUP.md)**
    *   *说明*：本地文档规范化重组与全局清理编年史。完整记录 2026-05-28 期间进行的 `doc/` 与 `docs/` 合并重构，大地图平衡矩阵与游戏设计白皮书高保真 Markdown 规范化转换，以及全局 `adarkroom` 废弃软链接物理清理与 GitHub 双端同步的重大历程。

---

### 5. 📈 活动执行与阶段交付 (Executions — `EXEC_`)
承载开发任务拆解、方案计划书、 Walkthrough 交付汇报历史。

*   *暂无历史执行文档，后续补充。*
