# 余烬回响 (Embers' Echoes) — ADR 遗留清理与品牌重构历史编年史

> **文档分类**: `HIST` (Histories - 历史编年史与归档)  
> **版本号**: V1.0.0  
> **生效日期**: 2026-05-27  
> **基于会话**: 2026-03-04 清理与品牌转换重构会话  
> **适用对象**: 所有项目开发、AI 协同智能体、独立工程师与版本归档  
> **全局规范参考**: [SPEC_20260520_GLOBAL_DEVELOPMENT_STANDARDS.md](file:///Users/quantumrose/Documents/Emberois/SPEC_20260520_GLOBAL_DEVELOPMENT_STANDARDS.md)

---

## 📖 一、 概述与核心目的

本文件作为《余烬回响 (Embers' Echoes)》项目的历史性归档文档，记录了 **2026-03-04** 进行的大规模 codebase 清理与品牌转换重构会话。

本重构的核心目的在于：
1. **彻底摆脱 ADR 依赖**：将项目与原版《小黑屋 (A Dark Room)》的代码完全解耦，清除死代码与冲突脚本。
2. **规范化品牌定位**：确保全部 UI 交互、警告页面、本地化元数据及配置等，统一转换为中文独立新品牌——**《余烬回响》**。
3. **提供干净的交接现场**：为后续 AI 协同及多智能体开发建立纯净的代码目录，避免历史死代码产生“模型理解幻觉”。

---

## 📅 二、 重构与品牌清理大事记 (2026-03-04)

以下大事记时间完全提取自系统会话真实执行日志及 Git Commit 记录，采用 **北京时间 (UTC+8)** 与 **标准时间 (UTC)** 双重记录锚定。

| 序号 | 真实时间 (Beijing Time, UTC+8) | 真实时间 (UTC) | 重构活动与执行大事件 | 执行人 / 智能体 |
| :--- | :--- | :--- | :--- | :--- |
| **01** | `2026-03-04 13:06:04` | `2026-03-04 05:06:04` | **初始状态检测与自动化验证**<br>通过 Headless 模拟器对游戏初始包进行构建跑测，确认原始游戏的启动状态和文件依赖图谱。 | `QA Bot` |
| **02** | `2026-03-04 15:48:56` | `2026-03-04 07:48:56` | **制定清理方案与实施计划**<br>编写实施方案 `PLAN` 并输出原子任务清单 `TASK`，锁定要删除的 A Dark Room 遗留文件映射范围。 | `Planner` |
| **03** | `2026-03-04 16:05:58` | `2026-03-04 08:05:58` | **元数据与配置更新**<br>修改 [package.json](file:///Users/quantumrose/Documents/Emberois/embers-echoes/package.json)，更新项目名称、仓库地址；修正 [README.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/README.md) 克隆地址。 | `Builder` |
| **04** | `2026-03-04 16:12:00` | `2026-03-04 08:12:00` | **品牌内容汉化与警告页面重构**<br>重构并汉化 [browserWarning.html](file:///Users/quantumrose/Documents/Emberois/embers-echoes/browserWarning.html) 和 [mobileWarning.html](file:///Users/quantumrose/Documents/Emberois/embers-echoes/mobileWarning.html)，完全清除 ADR 品牌与链接。 | `Builder` |
| **05** | `2026-03-04 16:16:00` | `2026-03-04 08:16:00` | **剔除多国语言冗余包**<br>清理 `lang/` 目录下除简体中文（`zh_cn`）以外的 20+ 个语言文件夹，解决本作汉化版特有数据与旧多语言翻译错配问题。 | `Builder` |
| **06** | `2026-03-04 16:18:56` | `2026-03-04 08:18:56` | **大规模死代码物理清除 (40+ 文件)**<br>物理删除 ADR 冲突脚本（包括旧 `room.js`, `events/` 下全部随机事件等 98,231 行无用代码）。 | `Builder` |
| **07** | `2026-03-04 16:23:19` | `2026-03-04 08:23:19` | **测试端口自动化回归跑测**<br>使用 Puppeteer 启动本地 `dev-server`（8001端口），盲审确认页面加载与逻辑无报错，并生成 Walkthrough 交付。 | `QA Bot` |
| **08** | `2026-03-04 16:27:55` | `2026-03-04 08:27:55` | **固化代码库提交 (Commit: `7a673f7`)**<br>提交清理变动，向 Git 代码库推送并完成同步。 | `量子玫瑰` |
| **09** | `2026-03-04 16:29:00` | `2026-03-04 08:29:00` | **GitHub 远程同步推送**<br>完成 Git Rebase 及 Remote Push，向 `git@github.com:elyseeJuly/embers-echoes.git` 实现最终同步。 | `量子玫瑰` |

---

## 🛠️ 三、 品牌与元数据重构明细

> [!NOTE]
> 在修改底层数值/核心公式之前，必须先将外部元数据及警告视图与核心新游戏名称完全解耦，以形成清晰的项目标识。

### 1. ⚙️ 项目基础元数据 ([package.json](file:///Users/quantumrose/Documents/Emberois/embers-echoes/package.json))
- **名称升级**：由 `adarkroom` 升格为 `embers-echoes`。
- **仓库修正**：将 repository 指向全新的独立 GitHub 地址 `git@github.com:elyseeJuly/embers-echoes.git`。
- **依赖净化**：锁死当前开发及测试所需的最小依赖包版本。

### 2. 📖 项目主文档与版权声明 ([README.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/README.md) & [LICENSE.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/LICENSE.md))
- **克隆与环境构建引导**：修正 clone 命令与 dev 启动命令。
- **版权声明清晰化**：在尊重并保留原作者（Michael Townsend 与 ADR 团队）贡献及 MIT 开源协议的前提下，在 `README.md` 中增加声明，明确指出本作是由 `elyseeJuly` 深度定制开发的独立版本。

### 3. 🚨 浏览器与移动端警告视图 ([browserWarning.html](file:///Users/quantumrose/Documents/Emberois/embers-echoes/browserWarning.html) & [mobileWarning.html](file:///Users/quantumrose/Documents/Emberois/embers-echoes/mobileWarning.html))
- **内容汉化与品牌剥离**：将原始 ADR 的英文提示完全翻译为典雅的简体中文警告。
- **引流链接剥离**：彻底删除了原版指向 iOS App Store、Android Play Store 等小黑屋原生移动端应用的跳转链接，防止用户在本作中产生体验偏差。

---

## 🗑️ 四、 冗余死代码清理明细

> [!IMPORTANT]
> 《余烬回响》基于一套全新的有限状态机（FSM）事件引擎（即 [engine.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/engine.js) 与 [events_embers.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/events_embers.js)）运行。  
> 经依赖调用树分析，ADR 继承的大量历史脚本均为“死代码”，必须全部剔除，共计删除 40+ 文件，物理精简代码 **98,231** 行。

### 1. 脚本与核心逻辑层删除文件列表：
- **`script/room.js` (旧)** & **`script/outside.js` (旧)** & **`script/world.js`**：已被全新的核心模块（Nexus, Sanity, RiftMap）完整替代，旧版场景模块已无任何引用。
- **`script/path.js`** & **`script/fabricator.js`**：与《余烬回响》自研遗物制造系统与多阶段解密结构冲突，予以物理清除。
- **`script/audio.js`** & **`script/audioLibrary.js`**：原 ADR 自带的简易音频逻辑包，不适配《余烬回响》的动态环境氛围音效，物理删除。
- **`script/localization.js`** & **`script/dropbox.js`**：原 ADR 的多语言动态加载及老旧 Dropbox 存储同步逻辑，因不兼容新版 API 被整体精简。

### 2. 历史随机事件层删除列表 (`script/events/`)：
物理删除了该目录下的全部旧事件文件（包含 `script/events/room.js`, `script/events/outside.js`, `script/events/encounters.js`, `script/events/global.js`, `script/events/marketing.js`, `script/events/setpieces.js` 等）。  
《余烬回响》的阶段性主线及随机事件流改由新开发的 [events_embers.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/events_embers.js) 进行统一声明与调度，防止冲突。

### 3. 多国语言包清理列表 (`lang/`)：
为了彻底杜绝旧翻译键值对对新游戏叙事内容的污染，排查删除了除了简体中文 `zh_cn` 文件夹之外的全部多国语言翻译（包括 `lang/en`, `lang/fr`, `lang/de`, `lang/it`, `lang/ja` 等 20+ 个外语包），使翻译模块保持极致清爽。

---

## 🧪 五、 验证结论与保障机制

### 1. 自动化集成验证
重构会话完成后，由 QA Bot 启动本地无头跑测环境，经 Puppeteer 页面静态及动态检测：
- 确认控制台 **0 Missing Module 报错**（删除的所有脚本均为零引用死代码）。
- 确认游戏启动时能够流畅进入 Null（虚无阶段），UI 组件刷新逻辑正常。

### 2. 视觉与文本规范审计
- 控制台与页面中不再含有任何 "A Dark Room" / "adarkroom" 的显式或隐式字符串。
- 最终验证截图均已安全保存于归档存储目录中，完成了对开发成果的 1:1 物理固化。

---

> [!TIP]
> 此次清理与重构是《余烬回响》摆脱历史包袱、迈向正规化与高质量演进的关键一步，它完美契合了 Emberois 的“产物驱动、拒绝黑盒”的开发宪法。
