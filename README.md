# 余烬回响 (Embers Echoes)

*“在热寂的绝对零度中，寻找最后一丝理智的火花。”*

《余烬回响》(Embers Echoes) 是一款基于增量/放置机制的纯前端生存游戏。它在极简的文字与 UI 界面下，隐藏着深度的资源管理、基地建设、大地图探索以及严酷的 Rouge-lite 死亡轮回系统。

你可以直接在这里体验游戏：**[▶ 立即试玩（https://elyseejuly.github.io/embers-echoes/）** 

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

本项目基于纯前端技术栈，使用 Vite 作为构建工具，已升级为完整的 PWA 应用。

### 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/elyseeJuly/embers-echoes.git
cd embers-echoes

# 2. 安装依赖（要求 Node.js ≥ 22）
npm ci

# 3. 启动开发服务器（http://localhost:8080）
npm start          # 等价于 node dev-server.js

# 或使用 Vite dev 模式（HMR）
npm run dev
```

### 构建与部署

```bash
# 生产构建（输出至 dist/，含 Service Worker 与 manifest）
GITHUB_ACTIONS=true npm run build

# 本地预览构建产物
npm run preview
```

部署通道：
- **GitHub Pages**：push 到 `main` 自动触发 `.github/workflows/static.yml`
- **Cloudflare Pages**：`npm run deploy:cf`（需配置 wrangler）

**技术栈结构：**
- **HTML/CSS**：纯手工编写的语义化标签和 Vanilla CSS（大量 CSS 变量与 Keyframe 动画营造氛围感）。
- **JavaScript**：模块化的原生 ES5 + jQuery 1.10（`engine.js` / `narrative.js` / `state_manager.js` / `rift_map.js` 等 26 个脚本）。
- **构建工具**：Vite 8 + `vite-plugin-pwa` + `vite-plugin-static-copy`。
- **数据存储**：IndexedDB 主存储 + localStorage 双写，支持离线启动与跨轮回 Meta 进度。
- **PWA**：Service Worker 两层缓存策略（pre-cache + runtime cache），支持「添加到主屏幕」与离线游玩。

---

## 🧪 测试体系 (Testing)

本项目参照 [Beyond-the-Light-Cone](https://github.com/elyseeJuly/Beyond-the-Light-Cone) 的 `TEST_20260517_HEADLESS_AUTOPLAY_STANDARD` 建立六层测试架构：

| 层次 | 名称 | 工具 | 用例数 | 用途 |
|:---|:---|:---|:---|:---|
| T0 | 静态与数据契约 | Vitest | 4 | 项目结构与配置完整性 |
| T1 | 单元测试 | Vitest + jsdom | 118 | 单模块隔离验证 |
| T2 | 集成测试 | Vitest + jsdom | 77 | 跨模块链路协作 |
| T3 | Headless 模拟 | 自研 Adapter + SeededRng | 12 (+3) | 长周期策略 AI 推进 |
| T4 | 浏览器 E2E | Playwright | 105 | 5 浏览器矩阵真实交互 |
| T5 | 体验审计 | 人工评审 | — | 视觉/叙事/音频/性能 |

### 常用测试命令

```bash
npm test                    # T0–T3 全量回归（约 4s）
npm run test:coverage       # 含覆盖率报告
npm run test:sim:smoke      # T3 烟囱门禁
npm run test:sim:regression # T3 登记 seed 回归
npm run test:e2e            # T4 全浏览器矩阵（需先 npx playwright install）
npm run test:e2e:smoke      # T4 仅 @smoke 标签
```

详见 [docs/TEST_20260726_TESTING_SYSTEM_STANDARD.md](docs/TEST_20260726_TESTING_SYSTEM_STANDARD.md)。

---

## 🤖 持续集成 (CI/CD)

| Workflow | 触发 | 内容 |
|:---|:---|:---|
| [ci.yml](.github/workflows/ci.yml) | `pull_request` / `push` | T0–T2 覆盖率 + T3 门禁 + Build + T4 E2E |
| [simulation-nightly.yml](.github/workflows/simulation-nightly.yml) | cron `30 18 * * *` | T3 回归 + 平衡性 + soak 长周期审计 |
| [static.yml](.github/workflows/static.yml) | `push` to main | 构建 dist/ 并部署至 GitHub Pages |

---

## 🙏 致谢 (Acknowledgements)

《余烬回响 (Embers Echoes)》的底层框架和代码灵感深度脱胎于开源游戏神作 **[A Dark Room (暗室)](https://github.com/doublespeakgames/adarkroom)**。

我们要向 A Dark Room 的原作者 **[Michael Townsend (@Continuities)](https://twitter.com/continuities)** 和后期的开源维护者 **[Amir Rajan (@amirrajan)](https://twitter.com/amirrajan)** 致以最崇高的敬意。

是他们创造的极简文字放置游戏范式、精妙的事件调度($SM)逻辑，为《余烬回响》的诞生提供了最坚实的土壤。如果你喜欢本作，请务必去体验原汁原味的 [A Dark Room 网页版](http://adarkroom.doublespeakgames.com/) 或在 iOS/Android 上支持他们的官方应用！

---
*版权所有 (C) 2026. Embers Echoes Project.*
