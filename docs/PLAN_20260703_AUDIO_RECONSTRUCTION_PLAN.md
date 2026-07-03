# 余烬回响 (Embers' Echoes) — 音频系统重构与音效还原方案

> **文档分类**: 计划与重构方案 (`PLAN`)  
> **生效日期**: 2026-07-03  
> **版本号**: V1.0.0  
> **当前状态**: 草案中（等待开发者核实补充）  
> **适用对象**: 所有项目开发、AI 协同智能体、独立工程师  
> **文档命名**: `PLAN_20260703_AUDIO_RECONSTRUCTION_PLAN.md`

---

## 📖 一、 背景与目的

根据 [AUDIT_20260422_COMPREHENSIVE_SYSTEM_AUDIT.md](file:///Users/quantumrose/Documents/Emberois/embers-echoes/docs/AUDIT_20260422_COMPREHENSIVE_SYSTEM_AUDIT.md) 审计指出，当前《余烬回响》的底层视听沉浸感由于音效引擎的完全剥离出现了致命缺失。
本项目目录下完好保留了 86 个原版《小黑屋 (ADR)》的音效资源（`.flac`），但在重构中丢失了播放逻辑（`audio.js` 与 `audioLibrary.js` 被物理删除，`index.html` 亦无调用）。

本方案旨在为《余烬回响》量身定制一套轻量、现代的**音频管理引擎 (Audio Manager)**，并在此基础上还原环境音、事件音，以及引入和配置**游戏主题曲 (Theme Song)**。

---

## 🤖 二、 智能体能力边界声明

*   **无法直接调用 Lyria**：作为 AI 编码助手，我**不具备**直接调用 Google DeepMind Lyria 或其他外部音频/音乐生成模型生成新音频文件的工具接口。
*   **重构角色**：我可以通过编写高水平的原生 JavaScript（基于 HTML5 Web Audio API）重建游戏的声音调度引擎，实现静音切换、淡入淡出、音轨叠加及事件挂接，并对您准备好的音频资产进行配置绑定。

---

## 🎵 三、 游戏主题曲 (Theme Song) 与现有音频审查

### 1. 游戏主题曲已就位
*   **主题曲信息**：这首名为**《Ragnarök [cache Memoriae]》**的主题曲（源自下载文件夹中的视频文件 `Frozen_on_Silent_Stairs.mp4`）已成功提取并转换为高音质 MP3 格式，且物理复制到了项目资产目录：
    *   **路径**：[audio/Ragnarök [cache Memoriae].mp3](file:///Users/quantumrose/Documents/Emberois/embers-echoes/audio/Ragnar%C3%B6k%20%5Bcache%20Memoriae%5D.mp3)
*   **现有 `audio/` 目录**：拥有 `ending.flac` (120KB)、`world.flac` (143KB)、`space.flac` (42KB) 等原版 ADR 背景氛围音轨。因为体积均低于 200KB（音量小且时长短），它们将作为基础的环境或事件音效使用，而《Ragnarök [cache Memoriae]》将作为本游戏真正的全局主干主题曲 (Theme BGM)。
*   **兄弟项目中的音乐资源**：在邻近的 Emberois 项目中，我们亦发现了其他可参考的主题音乐（如《超越光锥》的 `ending_fate_beyond_the_light_cone.mp3`），有需要时也可以进行交叉引用或混音。

---

## 🛠️ 四、 音频引擎重构架构规划

我们将不依赖外部复杂库，而是使用原生的 **HTML5 Web Audio API** 构建一个高内聚、易维护的 `audio_manager.js`：

### 1. 核心模块设计 (`script/audio_manager.js`)
提供以下全局方法供其他游戏模块（`nexus.js`、`combat.js`、`sanity.js`）触发：
```javascript
const AudioManager = {
  ctx: null,          // AudioContext
  musicNode: null,    // 音乐播放节点 (淡入淡出支持)
  sfxNodes: {},       // 音效缓存
  
  init() { ... },     // 初始化并解决浏览器 Autoplay 限制
  playBGM(trackName, fadeMs) { ... }, // 播放背景音乐/主题曲，带淡入淡出
  stopBGM(fadeMs) { ... },            // 停止背景音乐
  playSFX(sfxName) { ... },           // 播放单次音效（支持重叠播放）
  setVolume(type, val) { ... },       // 独立调节音乐 (BGM) 与音效 (SFX) 的音量
  mute() { ... },     // 全局静音
  unmute() { ... }    // 全局取消静音
};
```

### 2. 音频场景触发映射 (Audio Cues Mapping)
结合《余烬回响》的特有阶段，我们设计如下声音场景：

| 触发场景 (State / Event) | 对应音频资源文件名 | 声音表现与设计意图 |
| :--- | :--- | :--- |
| **Null (重启终端界面)** | 无 / 或微弱的耳鸣低频声 | 绝对冷寂，配合 glitch 效果 |
| **Spark (提取余烬/篝火燃起)** | `fire-burning.flac` / `fire-flickering.flac` | 从无到有的生命温度暗示，作为营地主 BGM |
| **Erosion (侵蚀度激增 / SAN 崩溃)** | 新增高频刺耳低语或故障颤音 | 配合红屏抖动，营造错乱恐惧感 |
| **Rift Map (裂隙大地图探索)** | `world.flac` (原版 ADR) 或导入废土风 BGM | 表现旷野的空旷与危险 |
| **Combat (ATB 战斗模块)** | `encounter-tier-1~3.flac` | 半即时制战斗节奏感，急促的打击声 |
| **Endgame (终局矩阵与跃迁)** | `ending.flac` 或引入**独立主题曲** | 壮烈的文明回响，伴随质询揭晓 |

---

## 📋 五、 实施路线图 (Roadmap)

### 阶段 1：框架搭建与加载链还原
1. 在 index.html 中引入 `script/audio_manager.js`。
2. 还原静音与音量调节的 UI 选项面板，解决 iOS/Safari 等移动端浏览器的 `AudioContext` 必须通过用户交互解锁的 Autoplay 限制。

### 阶段 2：环境音轨与音效埋点
1. 在 `state_manager.js` 状态转换时添加 `AudioManager.playBGM` 调用。
2. 在大地图移动、受击、合成、点击按钮时添加 `AudioManager.playSFX` 埋点。

### 阶段 3：主题曲植入与发布
1. 确定游戏主题曲的物理资源（放入 `audio/theme_song.mp3` 或直接使用 `audio/ending.flac`）。
2. 在终局和主界面配置主题曲的循环淡入。
