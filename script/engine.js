/**
 * 余烬回响 (Embers Echoes) — Core Engine
 * ========================================
 * Global tick driver, phase management, save/load, UI navigation.
 * Replaces the original ADR engine.js.
 */
(function () {
  'use strict';

  var Engine = window.Engine = {

    VERSION: '0.1.0',
    SITE_URL: '',
    MAX_STORE: 99999999999999,
    SAVE_DISPLAY: 30 * 1000,
    GAME_OVER: false,

    // Global tick interval (ms)
    TICK_INTERVAL: 1000,
    // Auto-save interval (ms)
    SAVE_INTERVAL: 10 * 1000,

    // Phase enum
    PHASES: {
      NULL: 0,  // 零维 — total black
      SPARK: 1,  // 生火 — manual clicking
      CAMP: 2,  // 基建 — automation unlocked
      ABYSS: 3,  // 污染 — SAN/erosion active
      MAP: 4,  // 跃迁 — rift map unlocked
      SINK: 5,  // 奇观 — matrix sink unlocked
      END: 6   // 终局 — final sequence
    },

    // Perks (re-themed)
    Perks: {
      'spatial_fold': {
        name: '空间折叠',
        desc: '负重上限 +20',
        notify: '学会了折叠空间的技巧'
      },
      'cognitive_filter': {
        name: '认知滤网',
        desc: '移动消耗SAN降低30%',
        notify: '意识边界变得清晰'
      },
      'ember_reflux': {
        name: '余烬回流',
        desc: '余烬产出 +15%',
        notify: '余烬在指尖回旋'
      },
      'data_blade_mastery': {
        name: '数据刃精通',
        desc: '近战伤害 +50%',
        notify: '掌握了数据刃的共振频率'
      },
      'pulse_precision': {
        name: '脉冲精准',
        desc: '远程命中率 +20%',
        notify: '瞄准变得本能化'
      },
      'void_walker': {
        name: '虚空行者',
        desc: '视野范围 +2',
        notify: '学会了感知虚空的脉动'
      },
      'entropy_resist': {
        name: '熵抗',
        desc: '侵蚀度增长速度 -25%',
        notify: '身体对混乱产生了抗性'
      }
    },

    options: {
      state: null,
      debug: false,
      log: false
    },

    topics: {},

    activeModule: null,
    ticking: false,
    _tickTimer: null,
    _saveTimer: null,
    _incomeTimer: null,

    /**
     * Initialize the engine
     */
    init: function (options) {
      this.options = $.extend(this.options, options);

      // Initialize state manager
      if (this.options.state) {
        window.$SM.init(this.options);
      }

      // Try to load saved game
      if (!this.options.state) {
        Engine.loadGame();
      }

      // Initialize modules in order
      // (they self-register and show/hide based on phase)
      Terminal.init();
      Nexus.init();
      Population.init();

      // Set up autosave
      Engine._saveTimer = setInterval(function () {
        Engine.saveGame();
      }, Engine.SAVE_INTERVAL);

      // Start the global tick
      Engine.startTick();

      // Check for offline gains
      Engine.processOfflineTime();

      // Apply current phase visuals
      Engine.applyPhaseVisuals();

      // Keyboard bindings
      $(document).on('keydown', Engine.keyDown);
      $(document).on('keyup', Engine.keyUp);

      // Subscribe to state updates
      $.Dispatch('stateUpdate').subscribe(Engine.handleStateUpdates);

      Engine.log('Engine initialized. Phase: ' + Engine.getPhase());
    },

    // ── Tick System ───────────────────────────────────────────

    startTick: function () {
      if (Engine.ticking) return;
      Engine.ticking = true;
      Engine._tickTimer = setInterval(Engine.tick, Engine.TICK_INTERVAL);
    },

    stopTick: function () {
      Engine.ticking = false;
      clearInterval(Engine._tickTimer);
    },

    /**
     * Global tick — called every 1000ms
     * Drives all automation, SAN decay, erosion, etc.
     */
    tick: function () {
      if (Engine.GAME_OVER) return;

      var phase = Engine.getPhase();

      // Phase 2+: collect worker income (atomic settlement)
      if (phase >= Engine.PHASES.CAMP) {
        $SM.collectIncome();
      }

      // Phase 3+: SAN and Erosion processing
      if (phase >= Engine.PHASES.ABYSS) {
        if (typeof Sanity !== 'undefined') {
          Sanity.tick();
        }
      }

      // Phase 5: Matrix sink passive
      if (phase >= Engine.PHASES.SINK) {
        if (typeof MatrixSink !== 'undefined') {
          MatrixSink.tick();
        }
      }

      // Update stores display
      Engine.updateStoresView();

      // Fire the tick event for any listeners
      $.Dispatch('tick').publish();
    },

    // ── Phase Management ──────────────────────────────────────

    getPhase: function () {
      return $SM.get('game.phase') || Engine.PHASES.NULL;
    },

    setPhase: function (phase) {
      var oldPhase = Engine.getPhase();
      if (phase <= oldPhase) return; // can only advance
      $SM.set('game.phase', phase);
      Engine.onPhaseChange(oldPhase, phase);
    },

    onPhaseChange: function (oldPhase, newPhase) {
      Engine.log('Phase change: ' + oldPhase + ' → ' + newPhase);

      // Flash effect on phase transition
      if (newPhase > Engine.PHASES.SPARK) {
        Engine.flashPhaseTransition();
      }

      Engine.applyPhaseVisuals();

      // Notify modules of phase change
      $.Dispatch('phaseChange').publish({ from: oldPhase, to: newPhase });
    },

    /**
     * Check if a phase upgrade is available
     */
    checkPhaseUnlock: function () {
      var phase = Engine.getPhase();

      // NULL → SPARK: always available (button click)
      // SPARK → CAMP: ember >= 50
      if (phase === Engine.PHASES.SPARK) {
        var ember = $SM.get('stores.ember') || 0;
        if (ember >= 50) {
          Engine.setPhase(Engine.PHASES.CAMP);
          Notifications.notify('结构节点已激活。迷失者开始聚集。');
        }
      }
      // CAMP → ABYSS: ember >= 200 or gray matter >= 50
      else if (phase === Engine.PHASES.CAMP) {
        var ember = $SM.get('stores.ember') || 0;
        var gray = $SM.get('stores.grayMatter') || 0;
        if (ember >= 200 || gray >= 50) {
          Engine.setPhase(Engine.PHASES.ABYSS);
          Notifications.notify('深渊在低语。理智开始动摇。');
        }
      }
      // ABYSS → MAP: first rift coordinate synthesized
      else if (phase === Engine.PHASES.ABYSS) {
        if ($SM.get('game.hasRiftCoord')) {
          Engine.setPhase(Engine.PHASES.MAP);
          Notifications.notify('裂隙坐标已锁定。维度之门开启。');
        }
      }
    },

    applyPhaseVisuals: function () {
      var phase = Engine.getPhase();
      var $body = $('body');
      $body.removeClass('phase-null phase-spark phase-camp phase-abyss phase-map phase-sink phase-end');

      switch (phase) {
        case Engine.PHASES.NULL:
          $body.addClass('phase-null');
          break;
        case Engine.PHASES.SPARK:
          $body.addClass('phase-spark');
          break;
        case Engine.PHASES.CAMP:
          $body.addClass('phase-camp');
          break;
        case Engine.PHASES.ABYSS:
          $body.addClass('phase-abyss');
          break;
        case Engine.PHASES.MAP:
          $body.addClass('phase-map');
          break;
        case Engine.PHASES.SINK:
          $body.addClass('phase-sink');
          break;
        case Engine.PHASES.END:
          $body.addClass('phase-end');
          break;
      }

      // Show/hide right panel (stores)
      if (phase >= Engine.PHASES.SPARK) {
        $('#ee-right').addClass('visible');
      }
    },

    flashPhaseTransition: function () {
      var $flash = $('<div>').addClass('phase-flash').appendTo('body');
      setTimeout(function () { $flash.remove(); }, 1000);
    },

    // ── Module Navigation ─────────────────────────────────────

    travelTo: function (module) {
      if (Engine.activeModule === module) return;
      var oldModule = Engine.activeModule;
      Engine.activeModule = module;

      // Update header tabs
      $('#ee-header .tab').removeClass('active');
      if (module && module.tabId) {
        $('#' + module.tabId).addClass('active');
      }

      // Call onArrival
      if (module && module.onArrival) {
        module.onArrival();
      }
    },

    // ── Store Display ─────────────────────────────────────────

    updateStoresView: function () {
      var stores = $SM.get('stores');
      if (!stores) return;

      var $container = $('#stores-panel .ee-stores');
      if ($container.length === 0) return;

      var storeList = [
        { key: 'ember', name: '余烬', show: true },
        { key: 'grayMatter', name: '灰质', show: Engine.getPhase() >= Engine.PHASES.CAMP },
        { key: 'whispers', name: '低语值', show: Engine.getPhase() >= Engine.PHASES.ABYSS },
        { key: 'concentrate', name: '高能浓缩液', show: Engine.getPhase() >= Engine.PHASES.MAP }
      ];

      for (var i = 0; i < storeList.length; i++) {
        var s = storeList[i];
        if (!s.show) continue;

        var val = stores[s.key] || 0;
        var cap = $SM.getStorageCap(s.key);
        var $row = $('#store-' + s.key);

        if ($row.length === 0 && val > 0) {
          $row = $('<div>').attr('id', 'store-' + s.key).addClass('ee-store-row fade-in');
          $('<span>').addClass('ee-store-name').text(s.name).appendTo($row);
          $('<div>').addClass('ee-store-bar')
            .append($('<div>').addClass('ee-store-bar-fill'))
            .appendTo($row);
          $('<span>').addClass('ee-store-val').appendTo($row);

          // Dynamic tooltips for resources
          if (typeof Narrative !== 'undefined' && Narrative.dict && Narrative.dict.resourcesLore) {
            if (Narrative.dict.resourcesLore[s.key]) {
              $row.attr('title', Narrative.dict.resourcesLore[s.key]).css('cursor', 'help');
            }
          }

          $container.append($row);
        }

        if ($row.length > 0) {
          $row.find('.ee-store-val').text(Math.floor(val) + (cap < Engine.MAX_STORE ? '/' + cap : ''));
          var pct = cap > 0 ? Math.min(100, (val / cap) * 100) : 0;
          $row.find('.ee-store-bar-fill').css('width', pct + '%');
        }
      }

      // Add tooltips to existing hard-coded SAN and ERO meters in the DOM if possible
      var $sanMeter = $('#ee-san-meter');
      var $eroMeter = $('#ee-ero-meter');
      if (typeof Narrative !== 'undefined' && Narrative.dict && Narrative.dict.resourcesLore) {
        if ($sanMeter.length > 0 && !$sanMeter.parent().attr('title')) {
          $sanMeter.parent().attr('title', Narrative.dict.resourcesLore.suppression).css('cursor', 'help');
        }
        if ($eroMeter.length > 0 && !$eroMeter.parent().attr('title')) {
          $eroMeter.parent().attr('title', Narrative.dict.resourcesLore.erosion).css('cursor', 'help');
        }
      }
    },

    // ── Save / Load ───────────────────────────────────────────

    saveGame: function () {
      if (typeof Storage !== 'undefined' && localStorage) {
        try {
          var state = JSON.stringify($SM.options.state);
          localStorage.setItem('embersEchoes_save', state);
          localStorage.setItem('embersEchoes_timestamp', Date.now().toString());

          // Show save notification briefly
          var $notify = $('#saveNotify');
          $notify.addClass('visible');
          setTimeout(function () { $notify.removeClass('visible'); }, 1000);
        } catch (e) {
          Engine.log('Save failed: ' + e.message);
        }
      }
    },

    loadGame: function () {
      if (typeof Storage !== 'undefined' && localStorage) {
        try {
          var savedState = localStorage.getItem('embersEchoes_save');
          if (savedState) {
            var state = JSON.parse(savedState);
            $SM.init({ state: state });
            Engine.log('Game loaded from save');
            return true;
          }
        } catch (e) {
          Engine.log('Load failed: ' + e.message);
        }
      }
      // No save found — initialize fresh state
      $SM.init({});
      return false;
    },

    /**
     * Process offline time for resource gains
     */
    processOfflineTime: function () {
      var lastTimestamp = localStorage.getItem('embersEchoes_timestamp');
      if (!lastTimestamp) return;

      var elapsed = Date.now() - parseInt(lastTimestamp);
      if (elapsed < 5000) return; // less than 5s, ignore

      var ticks = Math.floor(elapsed / Engine.TICK_INTERVAL);
      var maxOfflineTicks = 3600; // cap at 1 hour of offline time
      ticks = Math.min(ticks, maxOfflineTicks);

      if (ticks <= 0 || Engine.getPhase() < Engine.PHASES.CAMP) return;

      Engine.log('Processing ' + ticks + ' offline ticks');

      // Simulate offline income (resources fill up to cap, no SAN/erosion degradation)
      var income = $SM.getNetIncome();
      for (var resource in income) {
        if (income[resource] > 0) {
          var amount = income[resource] * ticks;
          var current = $SM.get('stores.' + resource) || 0;
          var cap = $SM.getStorageCap(resource);
          var newVal = Math.min(current + amount, cap);
          $SM.set('stores.' + resource, newVal, true);
        }
      }

      // Notify player
      var minutesOffline = Math.floor(elapsed / 60000);
      if (minutesOffline >= 1) {
        Notifications.notify('离线 ' + minutesOffline + ' 分钟。资源已收集。');
      }
    },

    // ── Export / Import ───────────────────────────────────────

    export64: function () {
      var state = JSON.stringify($SM.options.state);
      return btoa(encodeURIComponent(state));
    },

    import64: function (string64) {
      try {
        var state = JSON.parse(decodeURIComponent(atob(string64)));
        $SM.init({ state: state });
        Engine.saveGame();
        location.reload();
      } catch (e) {
        Notifications.notify('导入失败：数据格式错误');
      }
    },

    deleteSave: function () {
      if (typeof Storage !== 'undefined' && localStorage) {
        localStorage.removeItem('embersEchoes_save');
        localStorage.removeItem('embersEchoes_timestamp');
        location.reload();
      }
    },

    // ── Keyboard ──────────────────────────────────────────────

    keyLock: false,

    keyDown: function (e) {
      if (Engine.keyLock) return;
      // Module-specific key handling
      if (Engine.activeModule && Engine.activeModule.keyDown) {
        Engine.activeModule.keyDown(e);
      }
    },

    keyUp: function (e) {
      if (Engine.keyLock) return;
      if (Engine.activeModule && Engine.activeModule.keyUp) {
        Engine.activeModule.keyUp(e);
      }
    },

    // ── Utilities ─────────────────────────────────────────────

    log: function (msg) {
      if (Engine.options.debug) {
        console.log('[Embers] ' + msg);
      }
    },

    setInterval: function (fn, interval) {
      return setInterval(fn, interval);
    },

    setTimeout: function (fn, timeout) {
      return setTimeout(fn, timeout);
    },

    getGuid: function () {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0;
        var v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },

    handleStateUpdates: function (e) {
      // Check for phase unlock on any state change
      Engine.checkPhaseUnlock();
    }
  };

})();
