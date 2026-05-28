# 余烬回响 (Embers Echoes) — 本地文档规范化重组与全局清理编年史

> **文档类别**: 历史编年史与归档 (Histories)  
> **版本号 (Version)**: V1.0.0  
> **基于**: 2026-05-28 本地开发会话记录与归档  
> **生成日期 (Date)**: 2026-05-28  

---

## 📖 一、 概述与行动背景

在 2026 年 5 月 28 日的开发会话中，为落实《Emberois 全局项目开发文档与归档管理规范》(SPEC_20260520_GLOBAL_DEVELOPMENT_STANDARDS.md)，我们针对 `embers-echoes` 本地项目中的冗余文档架构及外部符号链接进行了集中的“清理-合并-标准化”重构行动。

本次行动彻底消除了工作区内 `doc/` 与 `docs/` 两个文件夹并存的混乱状态，实现了核心规格文件的数字资产沉淀，清除了历史残留链接，并保证了本地与 GitHub 远程仓库 (elyseeJuly/embers-echoes) 的实时同步。

---

## 🏷️ 二、 2026-05-28 核心重构与归档记录

### 1. 文档结构扁平化与规范命名合并
*   **设计白皮书规格化 (Word -> Markdown)**：
    *   提取并精细重构了原 `《余烬回响》核心系统设计白皮书(终极版).docx` 与 `core_system_spec.txt`，生成 [SPEC_20260305_CORE_SYSTEM_DESIGN.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/docs/SPEC_20260305_CORE_SYSTEM_DESIGN.md)，用以固化零维、生火、污染、大地图考古、逆向运算矩阵与三重结局等底层机制。
    *   提取并精细重构了原 `《余烬回响》文明遗物与探索系统设计白皮书.docx` 与 `relics_system_spec.txt`，生成 [SPEC_20260305_RELIC_EXPLORATION_DESIGN.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/docs/SPEC_20260305_RELIC_EXPLORATION_DESIGN.md)，用以固化三级探索节点生成、概念解译器重构配方、限时高压质询等附加机制。
*   **战斗平衡数据标准化**：
    *   将 `doc/Zones.txt` 内的 tab 分隔平衡数值转换成 Markdown 表格，并重命名归档为 [SPEC_20260304_ZONE_COMBAT_BALANCE.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/docs/SPEC_20260304_ZONE_COMBAT_BALANCE.md)，用以固化不同半径（<10, <20, <30）下的 DPS 与生命值难度阶梯。
*   **资源图表重定义**：
    *   使用 `git mv` 将原 `doc/Events.xlsx`（遭遇事件总表）移动并重命名至 [SPEC_20260304_GAME_EVENTS.xlsx](file:///Users/quantumrose/Documents/Emberois/embers-echoes/docs/SPEC_20260304_GAME_EVENTS.xlsx)，维持其在 Git 内的历史跟踪。

### 2. 空间净化与性能清理
*   **删除 Bulky 文件**：
    *   永久删除了两份庞大且无法被直接检索的 Word 白皮书源文件（约 6MB），避免其提交至远程仓库造成不必要的体积膨胀。
    *   删除了转换后的临时文本文件 `core_system_spec.txt` 和 `relics_system_spec.txt`。
*   **物理目录合一**：
    *   删除了原有的 `doc/` 物理目录，将所有文档及数字资产完全集中在 `docs/` 文件夹下。

### 3. 全局关联链接清理
*   **废弃软链接删除**：
    *   删除了位于主工作区外部 `/Users/quantumrose/Documents/Emberois/adarkroom` 指向 `embers-echoes` 的符号链接，彻底清除了旧的品牌引用残留，确保全局依赖树的干净。

### 4. 主注册表目录同步
*   更新了本地主索引 [SPEC_20260520_DOCUMENT_REGISTRY.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/docs/SPEC_20260520_DOCUMENT_REGISTRY.md)，将本次转换的四份新规格说明文档（`SPEC_` 系列）以及此前遗漏的叙事重构历史编年史（`HIST_20260304`）全量注册，维护了一致的文档引用树。

---

## 🏗️ 三、 终极物理架构状态

本次重构后，项目的文档树结构精炼如下：
```
embers-echoes/docs/
├── AUDIT_20260422_COMPREHENSIVE_SYSTEM_AUDIT.md
├── AUDIT_20260422_STRUCTURAL_AUDIT.md
├── AUDIT_20260422_UX_LOGIC_AUDIT.md
├── HIST_20260304_ADR_CLEANUP_AND_BRAND_TRANSITION.md
├── HIST_20260304_REBRANDING_AND_NARRATIVE_CHRONICLE.md
├── HIST_20260307_SYSTEM_HOTFIX_AND_AMBIENT_INTEGRATION.md
├── HIST_20260308_FUNCTIONAL_DESIGN_REFINEMENTS_AND_HOTFIX.md
├── HIST_20260308_HOTFIX_V1_1_AND_RELIC_REBALANCE.md
├── HIST_20260528_DOCUMENTATION_REORGANIZATION_AND_CLEANUP.md (NEW)
├── SPEC_20260304_GAME_EVENTS.xlsx
├── SPEC_20260304_ZONE_COMBAT_BALANCE.md
├── SPEC_20260305_CORE_SYSTEM_DESIGN.md
├── SPEC_20260305_RELIC_EXPLORATION_DESIGN.md
├── SPEC_20260306_CORE_IMPLEMENTATION_PLAN.md
└── SPEC_20260520_DOCUMENT_REGISTRY.md
```

> [!NOTE]
> 本次合并及清理在本地及 GitHub 远端上保持了 1:1 的完美一致性。整个过程在不影响游戏核心代码及逻辑的原则下平稳落地，为今后的协作开发夯实了规范化的基石。
