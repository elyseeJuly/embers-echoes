# 代码审计报告：《A Dark Room》与《余烬回响 (Embers Echoes)》架构对比

## 1. 概述与核心定位变更
本地项目 `Embers Echoes` (`embers-echoes`) 是基于开源文字游戏 `A Dark Room` 进行的深度二次开发与重构。项目不仅在代码级进行了大量重写与模块化封装，在主题叙事上也发生了根本性的逆转：
- **原版 (A Dark Room)**：极简主义的废土生存文字游戏。
- **重构版 (Embers Echoes)**：融合了赛博朋克、克苏鲁神话、高维科幻与“无限流”元素的“技术神秘学 (Techno-Occult)”渐进式生存游戏。

| 评估维度 | A Dark Room (Source) | Embers Echoes (Local) |
| :--- | :--- | :--- |
| **本地化架构** | 基于独立语言包 (`lang` 目录, `localization.js`) | 已移除多语言支持，深度硬编码中文与定制叙事逻辑 |
| **阶段管理** | 松散的事件触发解锁 | 引入严格的七阶段枚举控制 (`engine.js`: NULL 到 END) |
| **视觉呈现** | 黑白极简 CSS | 模块化主题化样式 (`glitch.css`, `terminal.css` 等)，引入滤镜与高对比度配色 |
| **多周目机制** | 简单的分数计算 (`scoring.js`) | 完整的轮回系统 (`echoes.js` 世界残响继承系统) |

---

## 2. 核心系统底层演进

### 2.1 状态管理模式 (State Manager)
`script/state_manager.js` 被大幅重置以支撑更复杂的资源规则。
- **加入硬存储上限机制 (Hard-cap Enforcement)**：不同于原版简单的库存数字，本地版为各类资源设计了动态的存储上限（如由“数据金库 Data Vault”增加低语值上限）。
- **原子级结算与全局系数 (Atomic Settlement & Multiplier)**：在 `collectIncome` 函数中，原本线性的资源收集现在受到 **SAN（理智值）** 的极大影响。当 SAN > 70（同化区间）时，通过引入 `productionMultiplier`，所有产出将会获得 +50% 增益。
- **道具与状态分离**：将资源（Stores）、遗存物图鉴（Relic Inventory）、残片图鉴（Fragment Inventory）从统一字段变更为解耦的独立集合维护。

### 2.2 引擎驱动控制 (Engine.js)
原本松散散落在各处的代码推进，被彻底整合进了一套强类型的阶段系统 (`Enums: PHASES`)：
1. **SPARK (生火)** -> 2. **CAMP (基建)** -> 3. **ABYSS (污染/深渊)** -> 4. **MAP (跃迁)** -> 5. **SINK (奇观)** -> 6. **END (终局)**。
- 引入了基于真实时间 (Tick) 的离线资源结算系统 (`processOfflineTime`)，最多可补偿长达 1 小时的挂机收益。
- 动态环境信息广播：基于资源情况（如余烬过高过低）和生命状态向日志自动插入环境白噪式的文学预警（Ambient Logs）。

---

## 3. 玩法与机制架构重构

### 3.1 资源隐喻替换
原有的“树木/肉/毛皮/木柴”生产链完全被异化：
- `Wood` ➡ `Ember` (余烬：低维算力残渣，维持运转的基石)
- `Fur/Meat` ➡ `Gray Matter` (灰质：高效的生物电运算材料)
- `Scales/Teeth` ➡ `Anomalies` (异常样本), `Whispers` (低语值)

### 3.2 全新的 SAN 与侵蚀度系统 (Sanity / Erosion)
这是原生系统里完全没有的设定。由新建的 `script/sanity.js` 接管。
- **理智值 (SAN)**：不仅仅作为生命值存在，它通过三段区间（同化、清醒、疯狂）直接改变 UI 层的状态文本播报，并且影响资源宏观产出能力。越发疯狂（SAN 过低）或越发被系统同化（SAN 过高），都会触发特殊的剧情事件。
- **侵蚀度 (Erosion)**：类似一种高维环境对躯体的慢性腐蚀系统（对应废土设定里的辐射等恶性累积状态），积累将带来负面 Event（`event_glitch` 等）。

### 3.3 探索与战斗模块
- **Nexus (取代 Room)**：庇护所/大本营被“Nexus”（结构节点）取代，用于容纳生产节点。
- **Rift_map (取代 World/Outside)**：重构了外部图谱模型，从传统的“森林/山脉废土”变成了诸如“高维壁障 (high_dimension_barrier)”、“主神核心 (hub_core)”的世界坐标系统。
- **Relics & Matrix_sink**：加入完整的蓝图与合成残片系统。利用特定资源（如献祭 10 名游荡者），可以合成极具科幻质感的隐藏遗物（如无内侧克莱因瓶、逆旋怀表）。这些系统代替了简单的原版贸易。

---

## 4. UI 视觉表现与叙事载体

### 4.1 叙事中心化 (Narrative.js)
原版将剧情对话散落在各自独立事件文件（如 `events.js`, `room.js`）。
当前架构剥离出了一个纯粹的数据字典 `script/narrative.js`。该文件通过 JSON 形式集中管理了所有的：
- 资源的世界观注解 (Resources Lore)
- 随机遇敌库文本 (Random Encounters)
- 各阶段死亡残响剧本 (Death Echoes)
- 用于终局裁决用的 FSM 对话树 (Final Inquiry Dialog Tree)
这种做法显著提高了文本的可维护性。

### 4.2 视觉特效组件化 (CSS)
抛弃了原版单一的样式配置。引入了：
- `glitch.css`：为游戏加载及各种异常警告实现了 CSS 故障跳帧动画（Glitch Text Effect）。
- `terminal.css`：黑客帝国式 / 终端流风格渲染方案。
增加了更详尽的 UI 控制层，如顶层环境血条（理智 / 侵蚀双轨进度条）通过原生的 CSS 线性渐变直接实现警报色系（绿转毒素绿）。

---

## 5. 总结

`Embers Echoes` 在复用了 `A Dark Room` 核心的“事件循环驱动器”与“纯文本资源增量玩法”地基的基础上，几乎推翻了原版 70% 的逻辑与 100% 的世界文本：
1. **代码层面**，以更现代的模块化拆分代替原始的大而全的文件（拆解原版 room/outside 成为 nexus/rift_map/relics 等十余个专项脚本）。
2. **机制层面**，填补了基于 SAN 值浮云变动的生产增益系数等现代养成体系思路。
3. 如果团队期望继续迭代，建议重点评估目前移除了 `localization` 系统带来的硬编码维护问题；同时新加的大量 `setInterval` (Tick/Income/Sanity等) 暂未显露出性能瓶颈，但在浏览器长时间后台休眠下可能会有微小的时序累计偏差。
