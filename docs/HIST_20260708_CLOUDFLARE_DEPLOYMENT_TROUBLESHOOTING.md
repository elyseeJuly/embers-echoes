# Cloudflare 部署问题排查与解决记录
> **Date**: 2026-07-08
> **Status**: 已解决
> **Category**: History & Development Records (`HIST_`)
> **Scope**: 余烬回响 Cloudflare Pages / Workers 部署

---

## 1. 项目背景

余烬回响 (Embers Echoes) 是一个纯 jQuery/JavaScript 的文字冒险游戏，在 PWA 化改造后需要部署到 Cloudflare。项目已配置 Vite 构建系统和 vite-plugin-static-copy 静态资源复制，但 Cloudflare 自动部署多次失败。

**审计报告来源**：`Emberois/Cloudflare部署审计报告_20260705_V2.md`

---

## 2. 问题时间线与排查过程

### 2.1 第一轮失败：yarn 解析错误

**错误日志**：
```
Detected: yarn@4.9.1
Installing project dependencies: yarn
Syntax Error: Expected ":" or blank space but "\n" found
```

**原因**：
- 项目原有 `yarn.lock`（v1 格式）与 Cloudflare 环境中的 Yarn 4（Berry 格式）不兼容
- Cloudflare 优先检测到 `yarn.lock` 并使用 yarn 安装依赖
- Yarn 4 无法解析 Yarn v1 格式的 lock 文件

**尝试的修复（无效）**：
1. 删除 `yarn.lock` → 失败（Cloudflare 依赖缓存仍记忆 yarn）
2. 移除 `packageManager` 字段 → 失败（corepack 仍按缓存选择 yarn）

**真正解决**：
- 显式设置 `packageManager: "npm"` + 重新生成 `package-lock.json`
- 新的 lockfile 哈希改变，强制 Cloudflare 重新检测包管理器

---

### 2.2 第二轮失败：.npmrc engine-strict 阻断安装

**错误日志**：
```
npm install 失败（引擎不匹配）
```

**原因**：
- `.npmrc` 中设置了 `engine-strict=true`
- `package.json` 中 `engines.node: ">=22.0.0"`
- Cloudflare 构建环境 Node 版本不满足时，npm ci 直接拒绝安装

**修复**：
1. 删除 `.npmrc` 文件
2. 移除 `engines.node` 字段
3. 移除 `packageManager` 字段（对齐成功项目 Galactic Frontier）

---

### 2.3 第三轮失败：assets.directory 不存在

**错误日志**：
```
Executing user deploy command: npx wrangler deploy
ERROR: The directory specified by the "assets.directory" field does not exist:
  /opt/buildhome/repo/dist
```

**原因**：
- Cloudflare 检测到 `wrangler.jsonc` 后，项目被识别为 **Workers** 项目
- Workers Builds 默认只执行 `npx wrangler deploy`，**不自动执行 `npm run build`**
- `wrangler.jsonc` 中只有 `assets.directory` 没有 `main` 字段 → 纯静态资源模式
- 纯静态资源模式下，wrangler **跳过 build.command**，直接读取 `dist/`
- `dist/` 目录不存在，部署失败

**尝试的修复（无效）**：
1. 删除 `wrangler.jsonc` 改用 Pages 模式 → 失败（项目已注册为 Workers，命令仍为 `npx wrangler deploy`）
2. 在 `wrangler.jsonc` 中添加 `build.command` → 失败（纯 assets 模式不执行 build）

---

### 2.4 最终解决：添加最小 Worker 入口

**修复方案**：
1. 创建 `src/worker.js` 最小 Worker 入口（透传请求）
2. 在 `wrangler.jsonc` 中添加 `"main": "src/worker.js"`
3. 保留 `build.command: "CF_PAGES=1 npm run build"`
4. wrangler 检测到 `main` 字段后，**强制执行构建**，再部署静态资源

**部署流程（修复后）**：
```
npm clean-install
→ npx wrangler deploy
   → 执行 build.command: CF_PAGES=1 npm run build（生成 dist/）
   → 读取 assets.directory: ./dist
   → 部署 Worker + 静态资源
```

---

## 3. 根因分析

### 3.1 为什么反复修不好？

| 失败轮次 | 误判原因 | 真正根因 |
|:---|:---|:---|
| 第1轮 | 以为是 yarn.lock 格式问题 | 依赖缓存记忆了 yarn 选择 |
| 第2轮 | 以为是 Node 版本问题 | `.npmrc` 的 `engine-strict=true` 是致命阻断 |
| 第3轮 | 以为是 wrangler.jsonc 配置错 | Workers Builds 纯 assets 模式不执行 build.command |

**核心教训**：
- Cloudflare 的依赖缓存非常顽固，即使删除了 lockfile 也会按缓存选择包管理器
- Workers Builds 和 Pages Builds 是两套完全不同的系统，行为差异很大
- `wrangler.jsonc` 中 `build.command` 只在有 `main` 字段（Worker 代码）时才执行

### 3.2 Workers vs Pages 模式对比

| 特性 | Workers Builds | Pages Builds |
|:---|:---|:---|
| 触发条件 | 检测到 `wrangler.jsonc` | 检测到框架预设或 Pages 项目 |
| 默认命令 | `npx wrangler deploy` | build command + Pages deploy |
| 是否自动构建 | ❌ 否（需 main 字段触发） | ✅ 是 |
| 静态资源 | `assets.directory` | Build output directory |
| 自定义 build | `build.command`（需 main） | Build command 字段 |

---

## 4. 最终文件配置

### 4.1 wrangler.jsonc

```jsonc
{
  "name": "embers-echoes",
  "compatibility_date": "2026-07-06",
  "main": "src/worker.js",
  "build": {
    "command": "CF_PAGES=1 npm run build",
    "cwd": "."
  },
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  }
}
```

### 4.2 src/worker.js

```javascript
export default {
  async fetch(request) {
    return fetch(request);
  }
};
```

### 4.3 package.json（关键字段）

```json
{
  "scripts": {
    "build": "vite build",
    "deploy:cf": "CF_PAGES=1 npm run build && wrangler deploy"
  },
  "devDependencies": {
    "vite": "^8.1.3",
    "vite-plugin-pwa": "^1.3.0",
    "vite-plugin-static-copy": "^4.1.1",
    "wrangler": "^4.10.0"
  },
  "packageManager": "npm"
}
```

---

## 5. 关键文件清单

| 文件 | 职责 | 状态 |
|:---|:---|:---|
| [wrangler.jsonc](../wrangler.jsonc) | Workers 部署配置（含 build 命令） | ✅ |
| [src/worker.js](../src/worker.js) | 最小 Worker 入口（触发 build） | ✅ |
| [vite.config.ts](../vite.config.ts) | Vite 构建 + 静态资源复制 | ✅ |
| [package.json](../package.json) | 构建脚本 + 依赖 + packageManager | ✅ |
| [.nvmrc](../.nvmrc) | Node.js 版本指定（22） | ✅ |
| [.github/workflows/static.yml](../.github/workflows/static.yml) | GitHub Pages 部署（Node 22） | ✅ |

---

## 6. 经验总结

### 6.1 Cloudflare 部署踩坑清单

1. **包管理器检测**：Cloudflare 优先检测 lockfile → 依赖缓存记忆 → `packageManager` 字段
   - 要切换包管理器，必须同时修改 lockfile 和 `packageManager`
   - 依赖缓存会保留旧选择，需改变 lockfile 哈希触发重新检测

2. **engine-strict 是隐形杀手**：`.npmrc` 中的 `engine-strict=true` + `engines.node` 约束会让 npm ci 在 Node 版本不满足时直接崩溃
   - 部署环境版本不确定时，不要设置 engine-strict

3. **Workers vs Pages 模式差异**：
   - Workers 模式：`wrangler deploy`，纯 assets 不构建，需 `main` 字段触发 build
   - Pages 模式：`wrangler pages deploy`，自动执行 build command

4. **wrangler build.command 触发条件**：必须有 `main` 字段（Worker 入口文件），纯静态资源模式会跳过 build

### 6.2 推荐部署方案

对于纯静态站点 + 需要构建的项目，推荐以下两种方案：

**方案 A：Workers 模式（当前方案）**
- 优点：支持 Worker 逻辑 + 静态资源一体化
- 要点：必须有 `main` 字段，`build.command` 才会执行

**方案 B：Pages 模式**
- 优点：自动构建，配置简单
- 要点：删除 `wrangler.jsonc`，在 Cloudflare 控制台设置 build command 和 output directory

---

## 7. 与 Galactic Frontier（成功项目）的对比

| 配置项 | Galactic Frontier（成功） | 余烬回响（修复前） | 余烬回响（修复后） |
|:---|:---|:---|:---|
| `.npmrc` | 无 | engine-strict=true | 已删除 |
| `engines.node` | 无 | >=22.0.0 | 已移除 |
| `packageManager` | 无 | 有（npm） | 有（npm） |
| `wrangler.jsonc` | 无 | 有（纯 assets） | 有（main + assets） |
| `wrangler` 依赖 | 无 | 无 | 有（devDeps） |
| 部署模式 | Pages（推测） | Workers | Workers |

---

## 8. 验证状态

| 验证项 | 状态 | 说明 |
|:---|:---|:---|
| 本地 `npm run build` | ✅ 通过 | dist/ 包含完整静态资源 |
| 本地 `wrangler deploy` | ⏳ 待验证 | 需 Cloudflare 凭据 |
| Cloudflare 自动构建 | ⏳ 待验证 | 推送后观察构建日志 |
| 页面可访问 | ⏳ 待验证 | 构建成功后访问 URL |
