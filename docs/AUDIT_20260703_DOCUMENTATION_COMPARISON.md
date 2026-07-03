# 《A Dark Room》与《余烬回响》游戏文档对比分析报告

> **文档分类**: 审计报告 (`AUDIT`)  
> **审查日期**: 2026-07-03  
> **版本号**: V1.0.0  
> **状态**: 已完成 (已同步)  
> **文档命名**: `AUDIT_20260703_DOCUMENTATION_COMPARISON.md`

---

本报告对比了原版游戏 **A Dark Room (ADR)** (https://github.com/doublespeakgames/adarkroom) 的所有官方文档与当前重构后的 **余烬回响 (Embers' Echoes)** 游戏文档。

经详细审查，原版 ADR 中的所有不匹配文档**已在之前的重构与品牌转换会话中被物理删除或重构替换**。以下是具体文档的逐项比对与状态确认：

---

## 📊 一、 官方文档对比映射表

| 原版 ADR 文档路径与名称 | 原文档主要内容与作用 | 《余烬回响》对应处理状态 | 是否匹配当前游戏 | 动作与结论 |
| :--- | :--- | :--- | :---: | :--- |
| **`doc/Events.xlsx`** | 描述原版小黑屋随机与剧情遭遇事件的数据表 | 已移动并重构为 [SPEC_20260304_GAME_EVENTS.xlsx](file:///Users/quantumrose/Documents/Emberois/embers-echoes/docs/SPEC_20260304_GAME_EVENTS.xlsx) | ❌ 否 (内容不匹配) | **已替换**。原版数据已删除，现存文档已完全改写为科幻废土与理智（SAN）机制事件。 |
| **`doc/Zones.txt`** | 描述原版大地图探索区域与怪物强度的文本表 | 已重构并转换为 Markdown 格式：[SPEC_20260304_ZONE_COMBAT_BALANCE.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/docs/SPEC_20260304_ZONE_COMBAT_BALANCE.md) | ❌ 否 (数值不匹配) | **已替换**。原版数值已废弃，现存规格书已完全重设为契合《余烬回响》的战斗数值体系。 |
| **`doc/translation.txt`** | 多语言本地化翻译指南与键值对说明 | 无（已物理删除） | ❌ 否 (语言包不匹配) | **已删除**。因《余烬回响》已精简为仅支持简体中文（`zh_cn`），该多语言文档已失去意义。 |
| **`README.md`** | 项目基础介绍、环境搭建与致谢声明 | 已完全重写为《余烬回响》项目主文档 [README.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/README.md) | ❌ 否 (品牌与运行说明不匹配) | **已更新**。保留了对原作者 Michael Townsend 及开源团队的致谢，内容已完全更新为新游戏的运行与特色介绍。 |
| **`LICENSE.md`** | 遵循 Mozilla Public License 2.0 (MPL-2.0) 的法律声明 | 保留在根目录下：[LICENSE.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/LICENSE.md) |  匹配 (开源授权匹配) | **保留**。为遵守开源许可协议，继续保留原版的许可证文档。 |
| **`CONTRIBUTING.md`** | 原版 ADR 项目贡献指南 | 本地无此文件 | ❌ 否 (项目归属不匹配) | **已清理**。本地已不存在该文件。 |

---

## 🔍 二、 局部细节核对与残留清理

### 1. `doc/` 物理目录清理状态
*   **核对结果**：经核实，原版 ADR 中的 `doc/` 目录在本地已被完全清除，所有文档数字资产已转移并规范化命名于 `docs/` 目录下。
*   **状态**：**干净**。

### 2. 外部软链接清理状态
*   **核对结果**：此前存在的外部软链接 `/Users/quantumrose/Documents/Emberois/adarkroom` 指向已在本机彻底清除，防止了旧路径引用残留和智能体的理解幻觉。
*   **状态**：**干净**。

### 3. 多语言翻译与配置关联
*   **发现**：`package.json` 中的命令 `"update_pot"` 仍残留有 `"lang/adarkroom.pot"` 字段。
*   **核对**：本地 `lang/` 目录下没有任何 `.pot` 模板文件，且多语言包已在 `2026-03-04` 会话中物理精简（仅剩 `zh_cn`）。此处的配置虽为不再使用的遗留配置，但并不属于“游戏文档”范畴。为了保持项目绝对纯净，我们在必要时可以对其进行静默更新。

---

## 📝 三、 结论

当前本地项目 `/Users/quantumrose/Documents/Emberois/embers-echoes` 下的所有游戏文档（主要位于 `docs/`）均是专门针对新游戏 **《余烬回响》(Embers' Echoes)** 编写的规格书（`SPEC_`）、审计报告（`AUDIT_`）和历史编年史（`HIST_`）。

原版 `doublespeakgames/adarkroom` 仓储中所有不匹配当前游戏机制的遗留文档均已被**彻底清理或安全替换**，目前没有任何不匹配的冗余或错误文档存在，符合《Emberois 全局项目开发文档与归档管理规范》。
