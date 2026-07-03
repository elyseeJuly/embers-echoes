# PWA 实现经验记录
> **Date**: 2026-07-03
> **Status**: Implemented
> **Category**: History & Development Records (`HIST_`)
> **Scope**: 余烬回响 PWA 化改造

## 1. 项目背景

余烬回响 (Embers Echoes) 是一个基于纯 jQuery/JavaScript 的渐进式文字冒险游戏，原项目使用 Express 开发服务器，无构建工具。本次改造需将其升级为完整的 PWA（Progressive Web App），遵循 emberois-dev-standards 中的 [PWA 开发指南](../emberois-dev-standards/specifications/SPEC_20260622_PWA_DEVELOPMENT_GUIDE.md)。

---

## 2. 与标准指南的差异及解决方案

### 2.1 技术栈差异

| 项目 | 标准指南 | 余烬回响 | 解决方案 |
|:---|:---|:---|:---|
| UI 框架 | React 19 | 纯 jQuery/JavaScript | 使用原生 JS 实现所有 PWA 组件 |
| 构建工具 | Vite + TypeScript | Express (无构建) | 引入 Vite 作为构建工具 |
| SW 注册 | `virtual:pwa-register/react` | 无 React | 手动实现 SW 注册逻辑 |
| 更新提示 | React 组件 | 纯 DOM 操作 | 使用 jQuery 创建更新提示弹窗 |

### 2.2 Service Worker 注册方式

**标准方案**（React）：
```tsx
import { useRegisterSW } from 'virtual:pwa-register/react';
```

**实际实现**（原生 JS）：
```javascript
navigator.serviceWorker.register('./sw.js')
  .then(function (reg) {
    reg.addEventListener('updatefound', function () {
      var newWorker = reg.installing;
      newWorker.addEventListener('statechange', function () {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            PWAUpdater._showUpdatePrompt();
          }
        }
      });
    });
  });
```

### 2.3 更新提示组件实现

**标准方案**（React 组件）：
```tsx
export const UpdatePrompt: React.FC = () => {
  const { needRefresh, updateServiceWorker } = useRegisterSW();
  // ...
};
```

**实际实现**（jQuery DOM 操作）：
```javascript
_showUpdatePrompt: function () {
  var $prompt = $('<div>')
    .attr('id', 'pwa-update-prompt')
    .addClass('pwa-update-prompt')
    .appendTo('body');
  
  $('<div>').addClass('pwa-update-message').text('发现新版本').appendTo($prompt);
  // 添加按钮和事件处理...
}
```

### 2.4 存档系统迁移

**原实现**：仅使用 localStorage
```javascript
localStorage.setItem('embersEchoes_save', state);
```

**新实现**：IndexedDB 主存储 + localStorage 双写
```javascript
// 写入 IndexedDB（主存储）
IndexedDBStorage.setSlot('autosave', state);

// 写入 localStorage（兼容/索引）
localStorage.setItem('embersEchoes_save', state);
```

---

## 3. 关键实现文件

| 文件 | 职责 |
|:---|:---|
| [vite.config.ts](../vite.config.ts) | Vite 配置、PWA 插件、缓存策略 |
| [script/pwa_updater.js](../script/pwa_updater.js) | Service Worker 注册与更新提示 |
| [script/indexed_db.js](../script/indexed_db.js) | IndexedDB 存储引擎 |
| [script/engine.js](../script/engine.js) | 存档逻辑迁移（双写） |
| [index.html](../index.html) | PWA Meta 标签、脚本引入顺序 |
| [css/core.css](../css/core.css) | Safe Area 适配、更新提示样式 |

---

## 4. 构建验证结果

```
✓ built in 690ms

PWA v1.3.0
mode      generateSW
precache  4 entries (35.89 KiB)
files generated
  dist/sw.js
  dist/workbox-91385d99.js
  dist/manifest.webmanifest
  dist/registerSW.js
```

---

## 5. 测试验证清单

| 编号 | 测试场景 | 预期结果 | 状态 |
|:---|:---|:---|:---|
| T1 | npm run build | 构建成功，生成 sw.js 和 manifest | ✅ |
| T2 | npm run dev | 开发服务器启动正常 | ✅ |
| T3 | 页面加载 | Service Worker 注册成功 | ⏳ |
| T4 | 离线启动 | 飞行模式下可进入主界面 | ⏳ |
| T5 | iPhone Safari | 分享 → 添加到主屏幕 | ⏳ |
| T6 | Android Chrome | 菜单 → 安装应用 | ⏳ |
| T7 | 存档功能 | IndexedDB 写入/读取正常 | ⏳ |
| T8 | 更新提示 | 新版本检测并提示更新 | ⏳ |

---

## 6. 注意事项

1. **脚本引入顺序**：`indexed_db.js` 和 `pwa_updater.js` 必须在 `dispatch.js` 之后、`engine.js` 之前引入
2. **jQuery 依赖**：所有脚本都依赖全局 jQuery，需确保 CDN 加载失败时有本地 fallback
3. **base 路径**：开发环境使用 `./` 相对路径，GitHub Pages 使用 `/embers-echoes/`，Cloudflare Pages 使用 `/`
4. **图标尺寸**：必须提供 192×192、512×512 和 180×180（iOS）三种尺寸
5. **Safe Area**：使用 `env(safe-area-inset-*)` CSS 变量适配 iPhone 刘海屏和底部指示条

---

## 7. 与 Beyond-the-Light-Cone 的对比

| 特性 | Beyond-the-Light-Cone | 余烬回响 |
|:---|:---|:---|
| 技术栈 | React 19 + TypeScript | jQuery + Vite |
| 响应式 | useBreakpoint Hook | CSS Media Query |
| 布局 | 三栏响应式布局 | 简单响应式 |
| 图标生成 | 自动脚本生成 | sips 命令行工具 |
| 构建 | tsc + vite build | vite build |
