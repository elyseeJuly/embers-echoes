# 余烬回响 (Embers Echoes) — 叙事重塑与品牌重构历史编年史
> **文档类别**: 历史编年史与归档 (Histories)  
> **版本号 (Version)**: V1.0.0  
> **基于**: 本地开发会话记录与历史提交归档 (Session ID: 439a7ece-595c-4f4b-b49c-9a7b10a4b5c4)  
> **生成日期 (Date)**: 2026-03-04  

---

## 📖 一、 概述与重构背景

《余烬回响 (Embers Echoes)》从最初源自极简文字生存游戏《A Dark Room》的框架，成功蜕变为一款带有深邃赛博朋克与低维算力侵蚀科幻色彩的克苏鲁式文字增量生存游戏。

在 2026 年 3 月 4 日的开发会话中，我们全面重构了底层的剧情文本表达、新增了核心资源图鉴的幽灵悬浮（Hover）浮现机制、深度打通了各项生存指标所引发的死亡判定，并将项目的代码库与 Git 远程源正式更名并迁移为 `embers-echoes`。

本篇历史编年史严格遵循 [SPEC_20260520_GLOBAL_DEVELOPMENT_STANDARDS.md](file:///Users/quantumrose/Documents/Emberois/SPEC_20260520_GLOBAL_DEVELOPMENT_STANDARDS.md)，以结构化的形式真实复刻 2026-03-04 这一天的重构事件时间线与设计成果。

---

## 🏷️ 二、 2026-03-04 核心开发编年史

### ⏱️ 01:47:29 - 01:48:05 | 阶段一：深层叙事重塑与死亡机制打通

> [!IMPORTANT]
> **设计思想的核心升级**：
> 将原有的生存机制重塑为“算力侵蚀”与“神经终端霜冻”的硬科幻写照。将死亡不仅视为数值归零，更是系统防火墙被多维高阶凝视击穿、意识融化与热寂的终局。

#### 1. 全局状态播报系统 (`NARRATIVE_DICT`)
我们在前端状态分发器中全面接入了 ambient logs 的自动推送。系统会依据以下状态区间触发幽灵一般的神经日志：
*   **余烬 (Ember) 高存量**：“终端温度稳定。微弱的光阻挡了高维的凝视。”
*   **余烬 (Ember) 低存量**：“警告：热寂正在逼近。神经终端边缘开始结霜。你感觉到某种没有眼睛的东西正在看着你。”
*   **理智 (SAN) 唤醒区间 (30-70)**：“指腹的痛觉非常清晰。你还活着。”
*   **侵蚀突变 (Erosion High)**：系统防火墙的崩溃倒计时播报。

#### 2. 资源与概念幽灵图鉴 (`NARRATIVE_EXPANSION`)
当玩家鼠标悬浮在 UI 的资源名词上时，系统将动态调用浮现解释文本，深化冷酷世界的沉浸感：
*   **余烬 (Ember)**：维持终端运转的低维算力残渣。它没有温度，但它是你在这片绝对零度的多维空间里唯一的防线。
*   **灰质 (Gray Matter)**：上一任轮回者脑组织的凝结物。剥离了痛苦与记忆后，只剩下这团高效的、带有微弱生物电的运算材料。
*   **低语 (Whispers)**：无法用三维解析的音频数据。如果你长时间盯着这个数字看，你会觉得它其实是在倒数你的死期。
*   **侵蚀度 (Erosion)**：系统防火墙的溃散百分比。就像一张正在从四个角同时燃烧的白纸。

#### 3. 极值死亡与彻底删档（Permadeath）系统硬接线
*   **RiftMap 越界修正**：修复了地图文件中的核心 `switch(tile)` 逻辑断层，保证 Void（虚空）格能正确阻断行动。
*   **战斗与地图极值死锁**：在 [combat.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/combat.js) 中，当玩家血量 `hp` 归零时，拦截原有的单纯重置逻辑，正式接入 `Engine.triggerDeathSequence(death_by_combat)` 机制，触发全屏幕黑客帝国般的数据坍塌，实现真正的永久抹除与游戏重开。

---

### ⏱/ 03:00:38 - 03:49:15 | 阶段二：试玩分享规划与 GitHub Sync

> [!TIP]
> **免费拖拽部署最佳实践**：
> 针对纯前端静态游戏属性，规划了通过 Netlify 进行一键文件夹拖拽极速分享试玩的方案，解决了开发者在外网测试过程中的网络配置与成本壁垒。

*   **本地 Git 归档提报**：将包含全新叙事扩展的代码版本在本地进行固化提交。
*   **GitHub Pages 自动同步**：将当时本地在主干分支 `main` 下的全部重构代码，同步推送至 GitHub 仓库（当时为 `elyseeJuly/adarkroom`）。为后续开启 GitHub Pages 静态自动化部署奠定坚实的代码版本基础。

---

### ⏱️ 03:58:00 - 03:59:35 | 阶段三：项目品牌重命名与 Origin 重新定向

为了彻底告别旧版《A Dark Room》的品牌烙印，使代码库物理结构能够完全服务于全新世界观，在此阶段启动了**大重命名与远程仓迁移行动**：

1.  **本地物理路径重命名**：将底层目录名由 `adarkroom` 重命名为 `embers-echoes`。
2.  **Git 远程源重定义**：将 Git 远程仓库的 Origin 指向从原 `adarkroom.git` 正式变更重新绑定为：
    `https://github.com/elyseeJuly/embers-echoes.git`
    
> [!WARNING]
> 本次重命名导致原有的部分底层会话记录在 Antigravity 系统的核心本地数据库中成了“孤立对话（outside-of-project）”，为后续开发阶段的 IDE 识别埋下了因历史路径丢失导致无法移动同步的技术隐患。

---

### ⏱️ 04:05:25 - 04:19:14 | 阶段四：概念设计文档 README.md 深度重写

在此时间段，我们重写了作为项目主规格声明与历史编年核心的 [README.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/README.md)：

*   **系统设计理念规范化**：详细阐述了余烬回响的克苏鲁-赛博朋克设定、独特的理智值系统、热寂环境的模拟生存哲学。
*   **正式的开发者致谢**：在文档中郑重保留并撰写了对《A Dark Room》原开发者（Michael Townsend 与 Doublespeak Games 开源社区）的真挚敬意，遵循了现代开源工程道德规范。
*   **同步上云**：强制推送（Force Push）同步至 GitHub `main` 分支，完成了官方 README 产物的替代。

---

## 🏗️ 三、 终极物理架构与文件合并 (04:22:19 - 04:26:04)

在当天会话的收尾阶段，我们成功完成了两个本地文件夹的最终物理合并，形成了以 `embers-echoes` 为唯一主目录的全新架构体。

### 📦 核心物理映射字典
通过对原项目的归类和清理，核心功能模块文件已在此次合并中完全明确：

*   **UI 主框架与侵蚀终端**：[index.html](file:///Users/quantumrose/Documents/Emberois/embers-echoes/index.html) (前端总入口，移除了原有广告和非必要配置)
*   **叙事状态机制**：[matrix_sink.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/matrix_sink.js)
*   **探险与战利品掉落**：[rift_map.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/rift_map.js) (处理虚空与永久死锁)
*   **资源收集与消耗状态**：[survival.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/survival.js) (热寂冻结状态注入)
*   **系统底层逻辑与测试脚本**：[test_sanity.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/test_sanity.js) (理智值临界状态覆盖)

> [!NOTE]
> 经过上述合并，本地及 remote 端均已达成高度的一致性。《余烬回响》的底层代码与上层叙事设定已完全完成了 1:1 的脱胎换骨，以极高的规范性交付给玩家试玩和后续功能的迭代开发。
