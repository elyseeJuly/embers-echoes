/**
 * 余烬回响 — Population Module
 * ==============================
 * Worker assignment, idle population, auto-arrival of lost ones.
 * Replaces the original ADR outside.js.
 */
var Population = {

    name: '人口',
    tabId: 'tab-nexus',

    // Worker type definitions
    _WORKERS: {
        'scavenger': {
            name: '拾荒者',
            desc: '在废墟中搜寻余烬',
            delay: 10,
            stores: {
                'ember': 1
            }
        },
        'lurker': {
            name: '窥探者',
            desc: '消耗余烬，合成灰质',
            delay: 10,
            stores: {
                'ember': -2,
                'grayMatter': 1
            },
            availablePhase: Engine.PHASES.CAMP,
            requires: function () {
                return ($SM.get('buildings.graySynthesizer') || 0) >= 1;
            }
        },
        'sentinel': {
            name: '守卫',
            desc: '消耗灰质，降低侵蚀度',
            delay: 15,
            stores: {
                'grayMatter': -1
            },
            special: function () {
                // Reduce erosion by 0.5 per sentinel per tick
                var sentinels = $SM.get('workers.sentinel') || 0;
                if (sentinels > 0) {
                    $SM.add('character.erosion', -0.5 * sentinels, true);
                }
            },
            availablePhase: Engine.PHASES.ABYSS
        },
        'chemist': {
            name: '炼药师',
            desc: '消耗余烬和灰质，生产浓缩液',
            delay: 15,
            stores: {
                'ember': -3,
                'grayMatter': -1,
                'concentrate': 1
            },
            availablePhase: Engine.PHASES.MAP,
            requires: function () {
                return Engine.getPhase() >= Engine.PHASES.MAP;
            }
        }
    },

    // Auto-arrival timer
    _popTimer: null,
    _POP_DELAY_MIN: 30, // seconds
    _POP_DELAY_MAX: 90, // seconds

    init: function () {
        // Create worker panel
        var $panel = $('<div>').attr('id', 'worker-panel').addClass('ee-panel');
        $('<div>').addClass('ee-panel-title').text('人口调度').appendTo($panel);
        $('<div>').addClass('worker-summary').appendTo($panel);
        $('<div>').attr('id', 'worker-list').appendTo($panel);
        $('<div>').addClass('income-display').appendTo($panel);
        $('#ee-left').append($panel);

        // Register incomes with state manager
        for (var key in Population._WORKERS) {
            var w = Population._WORKERS[key];
            $SM.setIncome(key, {
                delay: w.delay,
                stores: w.stores
            });
        }

        // Show if phase is CAMP or higher
        if (Engine.getPhase() >= Engine.PHASES.CAMP) {
            Population.show();
            Population.startPopGrowth();
        }

        // Subscribe to events
        $.Dispatch('phaseChange').subscribe(Population.handlePhaseChange);
        $.Dispatch('tick').subscribe(Population.onTick);
        $.Dispatch('stateUpdate').subscribe(Population.handleStateUpdates);

        // Initial render
        Population.updateView();
    },

    show: function () {
        $('#worker-panel').addClass('visible');
    },

    // ── Population ──────────────────────────────────────────

    getMaxPopulation: function () {
        var towers = $SM.get('buildings.signalTower') || 0;
        return towers * 5;
    },

    getCurrentPopulation: function () {
        var workers = $SM.get('workers') || {};
        var total = 0;
        for (var key in workers) {
            total += workers[key] || 0;
        }
        return total;
    },

    getFreePopulation: function () {
        return this.getMaxPopulation() - this.getCurrentPopulation();
    },

    /**
     * Start auto-arrival of lost ones
     */
    startPopGrowth: function () {
        if (Population._popTimer) return;
        Population.scheduleNextArrival();
    },

    scheduleNextArrival: function () {
        var delay = (Population._POP_DELAY_MIN +
            Math.random() * (Population._POP_DELAY_MAX - Population._POP_DELAY_MIN)) * 1000;

        Population._popTimer = setTimeout(function () {
            Population.arrivedLostOne();
            Population.scheduleNextArrival();
        }, delay);
    },

    arrivedLostOne: function () {
        if (Population.getCurrentPopulation() >= Population.getMaxPopulation()) return;

        // New arrival becomes an idle wanderer (we track as free population)
        // They're automatically available for assignment
        // We add them as a "wanderer" which is the idle pool
        var wanderers = $SM.get('workers.wanderer') || 0;
        $SM.set('workers.wanderer', wanderers + 1);

        Notifications.notify('一个迷失者从废墟中摸索而来。');
        Population.updateView();
    },

    // ── Worker Assignment ───────────────────────────────────

    assignWorker: function (type) {
        var wanderers = $SM.get('workers.wanderer') || 0;
        if (wanderers <= 0) return;

        $SM.set('workers.wanderer', wanderers - 1);
        var current = $SM.get('workers.' + type) || 0;
        $SM.set('workers.' + type, current + 1);

        // Subtext notifications
        if (typeof Narrative !== 'undefined' && Narrative.dict && Narrative.dict.infrastructureLogs) {
            if (type === 'scavenger' && Math.random() < 0.3) {
                Notifications.notify(Narrative.dict.infrastructureLogs.assign_scavenger);
            } else if (type === 'lurker' && Math.random() < 0.3) {
                Notifications.notify(Narrative.dict.infrastructureLogs.assign_snoop);
            }
        }

        Population.updateView();
    },

    unassignWorker: function (type) {
        var current = $SM.get('workers.' + type) || 0;
        if (current <= 0) return;

        $SM.set('workers.' + type, current - 1);
        var wanderers = $SM.get('workers.wanderer') || 0;
        $SM.set('workers.wanderer', wanderers + 1);

        Population.updateView();
    },

    // ── Tick Handler ────────────────────────────────────────

    onTick: function () {
        // Run special effects for workers
        for (var key in Population._WORKERS) {
            var w = Population._WORKERS[key];
            if (w.special) {
                w.special();
            }
        }
    },

    // ── View Rendering ──────────────────────────────────────

    updateView: function () {
        var phase = Engine.getPhase();
        if (phase < Engine.PHASES.CAMP) return;

        var maxPop = Population.getMaxPopulation();
        var currentPop = Population.getCurrentPopulation();
        var wanderers = $SM.get('workers.wanderer') || 0;

        // Update summary
        var $summary = $('#worker-panel .worker-summary');
        $summary.html(
            '<span class="pop-label">人口: </span>' +
            '<span class="pop-count">' + currentPop + '/' + maxPop + '</span>' +
            '<span class="pop-label" style="margin-left:12px">游荡者: </span>' +
            '<span class="pop-count">' + wanderers + '</span>'
        );

        // Update worker rows
        var $list = $('#worker-list');

        for (var key in Population._WORKERS) {
            var w = Population._WORKERS[key];

            // Check availability
            if (w.availablePhase && phase < w.availablePhase) continue;
            if (w.requires && !w.requires()) continue;

            var count = $SM.get('workers.' + key) || 0;
            var $row = $('#worker-' + key);

            if ($row.length === 0) {
                $row = $('<div>').attr('id', 'worker-' + key).addClass('ee-worker-row fade-in');
                $('<span>').addClass('ee-worker-name').text(w.name).attr('title', w.desc).appendTo($row);
                $('<span>').addClass('ee-worker-count').text(count).appendTo($row);

                var $controls = $('<div>').addClass('ee-worker-controls');

                // Decrease button
                (function (workerKey) {
                    $('<button>').addClass('ee-worker-btn').text('−')
                        .on('click', function () { Population.unassignWorker(workerKey); })
                        .appendTo($controls);
                })(key);

                // Increase button
                (function (workerKey) {
                    $('<button>').addClass('ee-worker-btn').text('+')
                        .on('click', function () { Population.assignWorker(workerKey); })
                        .appendTo($controls);
                })(key);

                $row.append($controls);
                $list.append($row);
            } else {
                $row.find('.ee-worker-count').text(count);
            }
        }

        // Update income display
        Population.updateIncomeDisplay();
    },

    updateIncomeDisplay: function () {
        var $income = $('#worker-panel .income-display');
        $income.empty();

        var net = $SM.getNetIncome();
        var hasIncome = false;

        for (var resource in net) {
            if (net[resource] === 0) continue;
            hasIncome = true;

            var name = Nexus.getResourceName(resource);
            var val = net[resource];
            var sign = val > 0 ? '+' : '';
            var cls = val > 0 ? 'positive' : 'negative';

            var $row = $('<div>').addClass('income-row');
            $('<span>').addClass('income-name').text(name).appendTo($row);
            $('<span>').addClass('income-val ' + cls).text(sign + val.toFixed(1) + '/s').appendTo($row);
            $income.append($row);
        }

        if (!hasIncome) {
            $('<div>').addClass('income-row')
                .append($('<span>').addClass('income-name').text('无产出'))
                .appendTo($income);
        }
    },

    // ── Event Handlers ──────────────────────────────────────

    handlePhaseChange: function (e) {
        if (e.to >= Engine.PHASES.CAMP) {
            Population.show();
            Population.startPopGrowth();
            Population.updateView();
        }
    },

    handleStateUpdates: function (e) {
        if (e && e.path && (e.path.indexOf('workers') === 0 || e.path.indexOf('buildings') === 0)) {
            Population.updateView();
        }
    }
};
