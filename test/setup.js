/**
 * 余烬回响 — 测试环境 setup
 * ============================
 * 将 script/ 下的 ES5 jQuery IIFE 模块按 index.html 中的顺序注入 jsdom 全局环境，
 * 让测试代码能够像浏览器那样访问全局对象：$SM, Engine, Sanity, RiftMap, Combat ...
 *
 * 关键设计：
 *   1. jQuery + Dispatch 必须先加载（其他模块依赖 $.Dispatch / $.extend）。
 *   2. 模块通过 `vm.runInContext` 在共享 global 中执行，保留 var 顶层声明。
 *   3. setup 提供工厂函数 `loadGameScripts()` 让每个测试用例获得干净状态。
 *   4. 由于不少模块访问 `localStorage`、`AudioContext`、`IndexedDB`，setup 统一提供 mock。
 */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { JSDOM } from 'jsdom'
import { beforeEach, vi } from 'vitest'

const SCRIPT_DIR = path.resolve(process.cwd(), 'script')

// 文件加载顺序需与 index.html 中的 <script> 标签一致
const SCRIPT_LOAD_ORDER = [
  // jQuery 是通过 CDN 加载的，setup 直接提供本地 jquery.min.js
  // Dispatch 依赖 jQuery，需先加载
  'dispatch.js',
  // 核心系统
  'Button.js',
  'state_manager.js',
  'notifications.js',
  'header.js',
  'engine.js',
  // 游戏模块
  'narrative.js',
  'terminal.js',
  'nexus.js',
  'population.js',
  'merchant.js',
  'sanity.js',
  'events_embers.js',
  // Phase 4
  'rift_map.js',
  'combat.js',
  'survival.js',
  // Phase 5
  'matrix_sink.js',
  'endgame.js',
  'ship.js',
  'space.js',
  'echoes.js',
  'gallery.js',
  'relics.js'
]

/**
 * 创建一个完整的 jsdom + 注入脚本的环境
 * 返回的 sandbox 中包含所有全局对象（$SM, Engine, Sanity, ...）
 */
export function createGameEnvironment(options = {}) {
  const dom = new JSDOM(
    `<!DOCTYPE html><html><body>
       <div id="ee-wrapper">
         <div id="ee-header"></div>
         <div id="ee-content">
           <div id="ee-main">
             <div id="ee-left">
               <div id="stores-panel" class="ee-panel">
                 <div class="ee-panel-title">资源</div>
                 <div class="ee-stores"></div>
               </div>
             </div>
             <div id="ee-middle"></div>
             <div id="ee-right"></div>
           </div>
         </div>
       </div>
       <div id="ee-notifications"></div>
       <div id="saveNotify">已保存</div>
     </body></html>`,
    {
      url: 'http://localhost/',
      pretendToBeVisual: true,
      runScripts: 'outside-only'
    }
  )

  const { window } = dom

  // 加载本地 jQuery，并把它放到 window 上
  const jqueryPath = path.resolve(process.cwd(), 'lib/jquery.min.js')
  const jquerySrc = fs.readFileSync(jqueryPath, 'utf8')
  const jqueryColorSrc = fs.readFileSync(path.resolve(process.cwd(), 'lib/jquery.color-2.1.2.min.js'), 'utf8')

  // 在 window 上下文执行 jQuery
  const script = new vm.Script(jquerySrc)
  const fakeContext = {
    window,
    document: window.document,
    navigator: window.navigator,
    location: window.location
  }
  // 把 window 自身暴露到 vm 上下文，使 jQuery 内部 `var jQuery = ...` 能挂到 window
  // jQuery 1.x 会检测 module.exports，需要禁用，让它走 window 分支
  const oldModule = window.module
  delete window.module
  window.eval(jquerySrc)
  window.eval(jqueryColorSrc)
  if (oldModule !== undefined) window.module = oldModule

  // 显式补全 jQuery + $（防止某些路径下未挂上）
  if (!window.jQuery) {
    window.eval(jquerySrc)
  }
  window.$ = window.jQuery

  // 添加 jQuery.Callbacks（dispatch.js 依赖）
  // jQuery 1.10 已内置，无需补丁；如果缺失，做最小 mock
  if (!window.jQuery.Callbacks) {
    window.jQuery.Callbacks = function () {
      const list = []
      return {
        add: function (fn) { list.push(fn) },
        remove: function (fn) {
          const i = list.indexOf(fn)
          if (i >= 0) list.splice(i, 1)
        },
        fire: function (arg) { for (const fn of [...list]) fn(arg) },
        fireWith: function (ctx, args) {
          for (const fn of [...list]) fn.apply(ctx, args || [])
        }
      }
    }
  }

  // 让 Node.js 全局也能用 $（兼容脚本中 `var $SM = StateManager` 顶层声明）
  // 先保存原始 timer 引用，避免后续覆盖时形成递归
  const _origSetInterval = global.setInterval
  const _origClearInterval = global.clearInterval
  const _origSetTimeout = global.setTimeout
  const _origClearTimeout = global.clearTimeout
  global.window = window
  global.document = window.document
  global.$ = window.jQuery
  global.jQuery = window.jQuery
  global.navigator = window.navigator
  // 关键：让 window.Math 与 global.Math 共享同一对象。
  // 否则 vi.spyOn(Math, 'random') 作用于 Node 全局 Math，
  // 而 game 脚本在 window 上下文中访问 window.Math，mock 不生效。
  // JSDOM 默认的 window.Math 是独立实例，需要显式别名。
  try {
    Object.defineProperty(window, 'Math', {
      value: Math,
      writable: true,
      configurable: true,
      enumerable: true
    })
  } catch (_e) {
    // 某些 JSDOM 版本不允许直接 defineProperty Math，回退到直接赋值
    window.Math = Math
  }
  global.localStorage = createLocalStorageMock()
  global.AudioContext = function () { return createAudioContextMock() }
  global.fetch = global.fetch || (() => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }))
  global.setInterval = (fn, t) => _origSetInterval(fn, t)
  global.clearInterval = (id) => _origClearInterval(id)
  global.setTimeout = (fn, t) => _origSetTimeout(fn, t)
  global.clearTimeout = (id) => _origClearTimeout(id)
  global.btoa = (s) => Buffer.from(s, 'binary').toString('base64')
  global.atob = (s) => Buffer.from(s, 'base64').toString('binary')
  global.encodeURIComponent = encodeURIComponent
  global.decodeURIComponent = decodeURIComponent
  global.location = window.location
  global.confirm = () => true
  global.alert = () => {}

  // 把 window 上的属性同步到 vm 上下文：使用 vm.runInContext 加载 script 文件
  const sandbox = window
  sandbox.global = window
  sandbox.console = console
  sandbox.process = process
  sandbox.Buffer = Buffer
  sandbox.require = undefined // 阻止脚本意外 require
  sandbox.module = undefined
  sandbox.exports = undefined
  sandbox.setInterval = global.setInterval
  sandbox.clearInterval = global.clearInterval
  sandbox.setTimeout = global.setTimeout
  sandbox.clearTimeout = global.clearTimeout
  sandbox.localStorage = global.localStorage
  sandbox.btoa = global.btoa
  sandbox.atob = global.atob
  sandbox.encodeURIComponent = global.encodeURIComponent
  sandbox.decodeURIComponent = global.decodeURIComponent
  sandbox.AudioContext = global.AudioContext
  sandbox.fetch = global.fetch
  sandbox.confirm = global.confirm

  // 加载游戏脚本
  for (const fname of SCRIPT_LOAD_ORDER) {
    const filePath = path.join(SCRIPT_DIR, fname)
    if (!fs.existsSync(filePath)) {
      // 跳过缺失的（如 gallery.js 可能未实现完整）
      continue
    }
    const src = fs.readFileSync(filePath, 'utf8')
    try {
      // 在 window 上下文执行；保留 var 顶层声明挂到 window
      window.eval(src)
    } catch (e) {
      // 模块加载失败不应阻塞整个 setup，但要让测试能看到
      console.error(`[setup] 加载 ${fname} 失败:`, e.message)
      throw e
    }
  }

  // 关键：让 Node 全局也能直接访问各模块
  global.$SM = window.$SM
  global.StateManager = window.StateManager
  global.Engine = window.Engine
  global.Sanity = window.Sanity
  global.Narrative = window.Narrative
  global.Events = window.Events
  global.Nexus = window.Nexus
  global.Population = window.Population
  global.Merchant = window.Merchant
  global.RiftMap = window.RiftMap
  global.Combat = window.Combat
  global.Survival = window.Survival
  global.MatrixSink = window.MatrixSink
  global.Endgame = window.Endgame
  global.Ship = window.Ship
  global.Space = window.Space
  global.Echoes = window.Echoes
  global.Gallery = window.Gallery
  global.Relics = window.Relics
  global.Button = window.Button
  global.Header = window.Header
  global.Terminal = window.Terminal
  global.Notifications = window.Notifications
  global.AudioManager = window.AudioManager
  global.IndexedDBStorage = window.IndexedDBStorage

  // 重置状态：让每个测试都从干净状态树开始
  // $SM.init 在 Engine.init 中被首次调用，但 setup 中不调用 Engine.init
  // 我们显式调用 $SM.init({}) 重置 state 树
  window.$SM.init({ state: null }) // 强制重置
  window.$SM.init({})

  return {
    dom,
    window,
    $SM: window.$SM,
    Engine: window.Engine,
    Sanity: window.Sanity,
    Narrative: window.Narrative,
    Events: window.Events,
    Nexus: window.Nexus,
    Population: window.Population,
    Merchant: window.Merchant,
    RiftMap: window.RiftMap,
    Combat: window.Combat,
    Survival: window.Survival,
    MatrixSink: window.MatrixSink,
    Endgame: window.Endgame,
    Ship: window.Ship,
    Space: window.Space,
    Echoes: window.Echoes,
    Gallery: window.Gallery,
    Relics: window.Relics,
    Button: window.Button,
    Header: window.Header,
    Terminal: window.Terminal,
    Notifications: window.Notifications,
    AudioManager: window.AudioManager
  }
}

function createLocalStorageMock() {
  const store = {}
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: (k) => { delete store[k] },
    clear: () => { for (const k of Object.keys(store)) delete store[k] },
    key: (i) => Object.keys(store)[i] || null,
    get length() { return Object.keys(store).length }
  }
}

function createAudioContextMock() {
  return {
    state: 'suspended',
    destination: { channelCount: 2 },
    currentTime: 0,
    decodeAudioData: (_buf) => Promise.resolve({ duration: 0 }),
    createBuffer: () => ({ getChannelData: () => new Float32Array(0) }),
    createBufferSource: () => ({
      buffer: null,
      connect: () => {},
      start: () => {},
      stop: () => {},
      onended: null
    }),
    createGain: () => ({
      gain: { value: 1, linearRampToValueAtTime: () => {}, setValueAtTime: () => {} },
      connect: () => {},
      disconnect: () => {}
    }),
    resume: () => Promise.resolve(),
    close: () => Promise.resolve()
  }
}

// Vitest 全局 beforeEach：默认每个测试开始前重置环境
// 由于环境构造相对昂贵，仅在确实需要时显式调用
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
