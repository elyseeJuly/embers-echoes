# 余烬回响 (Embers Echoes)

*“在热寂的绝对零度中，寻找最后一丝理智的火花。”*

《余烬回响》(Embers Echoes) 是一款基于增量/放置机制的纯前端生存游戏。它在极简的文字与 UI 界面下，隐藏着深度的资源管理、基地建设、大地图探索以及严酷的 Rouge-lite 死亡轮回系统。

你可以直接在这里体验游戏：**[▶ 立即试玩[ Embers Echoes (https://elyseejuly.github.io/embers-echoes/)](#)]** 
*(请将链接替换为你部署后的实际网页地址)*

---

## 🌌 游戏设计理念 (Design Philosophy)

本游戏脱胎于经典的文字放置游戏，但我们在主题、氛围和系统深度上进行了彻底的赛博朋克/科幻废土化重构。

**1. 极简主义下的深海恐惧 (Minimalist Dread)**  
抛弃了所有繁复的图形堆砌，游戏画面的主要构成是不安的黑色、冰冷的系统代码色以及随着理智（SAN）崩溃而产生的视觉故障（Glitch）。所有的恐怖和压迫感都来源于左侧冰冷的终端播报，以及右侧逐渐见底的资源数字。

**2. 资源管理与理智的博弈 (Resource & Sanity)**  
除了常规的物质资源（余烬、灰质），玩家还必须时刻关注角色的精神状态。
- **理智值 (SAN)** 过高意味着你正在被这个冰冷的维度所同化，你的效率会变高，但你在失去人性；
- **理智值 (SAN)** 过低意味着你陷入了疯狂，你会产生幻觉，系统侵蚀度会飙升。
玩家必须在“彻底发疯”和“失去自我”之间寻找那条危险的平衡线。

**3. 无法逃避的热寂 (Inevitable Death & Meta-Progression)**  
死亡在《余烬回响》中不是一次微小的失误，而是世界维度的抹杀。
无论是资源耗尽（冻结在热寂中），还是理智崩溃（被虚空同化），亦或是在大地图的异常点战死，玩家都会面临真实的彻底删档（Permadeath）。
但死亡并非终结，每一次破灭都会将你携带的残渣转化为跨维度的**【回响 (Echoes)】**资源，用于在下一次轮回前解锁永久的天赋（Perks）。

---

## ⚙️ 核心系统特色 (Features)

*   **五大轮回阶段**：从在无尽黑暗中“生火(Spark)”，到建立拾荒者营地(Camp)，再到抵御深渊凝视(Abyss)，最终打造跃迁信标开启多维地图(Map)探索。
*   **氛围化 UI 表现**：界面颜色和文字呈现会随着你的 SAN 值完全改变。低理智时，界面会充斥着乱码、红色的警告和剧烈的屏幕抖动。
*   **网格化大地图探索**：解锁裂隙之后，可以消耗浓缩液在文字构成的网格（`#`废墟、`*`异常点）中进行探索，搜刮旧世界遗物。
*   **ATB 文字战斗**：在异常点遭遇“腐化的逻辑实体”等高维怪物，使用数据刃和电磁脉冲进行半即时制的决死战斗。
*   **庞大的碎片化叙事**：超过上万字的剧情切片，散落在资源解释、建筑反馈、随机奇遇以及不同死法的系统日志中，拼凑出一个关于高维注视和轮回囚徒的冰冷宇宙。

---

## 🛠️ 本地运行与开发 (Development)

本项目采用纯前端技术栈写成，**没有任何服务端依赖或构建工具**。

1. 克隆或下载本仓库到本地：
   ```bash
   git clone https://github.com/elyseeJuly/adarkroom.git
   ```
2. 直接在浏览器中双击打开 `index.html` 即可运行游戏。
3. （可选）如果你需要使用本地保存等功能，推荐使用一个轻量级的本地 HTTP 服务器启动，例如：
   ```bash
   python -m http.server 8080
   # 然后在浏览器访问 http://localhost:8080
   ```

**技术栈结构：**
- **HTML/CSS**：纯手工编写的语义化标签和 Vanilla CSS（使用了大量的 CSS 变量和 Keyframe 动画来实现氛围感）。
- **JavaScript**：采用了模块化的原生 JS 开发（包括 `engine.js`, `narrative.js`, `state_manager.js`, `rift_map.js` 等），并通过 jQuery 辅以简便的 DOM 操作。
- **数据存储**：完全依赖浏览器的 `localStorage` 实现存档以及跨轮回的 Meta 进度存储。

---

## 🙏 致谢 (Acknowledgements)

《余烬回响 (Embers Echoes)》的底层框架和代码灵感深度脱胎于开源游戏神作 **[A Dark Room (暗室)](https://github.com/doublespeakgames/adarkroom)**。

我们要向 A Dark Room 的原作者 **[Michael Townsend (@Continuities)](https://twitter.com/continuities)** 和后期的开源维护者 **[Amir Rajan (@amirrajan)](https://twitter.com/amirrajan)** 致以最崇高的敬意。

是他们创造的极简文字放置游戏范式、精妙的事件调度($SM)逻辑，为《余烬回响》的诞生提供了最坚实的土壤。如果你喜欢本作，请务必去体验原汁原味的 [A Dark Room 网页版](http://adarkroom.doublespeakgames.com/) 或在 iOS/Android 上支持他们的官方应用！

---
*版权所有 (C) 2026. Embers Echoes Project.*
