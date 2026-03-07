/**
 * 余烬回响 — Nexus Module (Base Building)
 * =========================================
 * Structure nodes (buildings) that expand capacity and unlock features.
 * Replaces the original ADR room.js.
 */
var Nexus = {

    name: '节点',
    tabId: 'tab-nexus',

    // Building definitions
    Buildings: {
        'signalTower': {
            name: '信号塔',
            desc: '扩展人口容纳上限',
            effect: '人口上限 +5',
            maximum: 20,
            cost: function (count) {
                return {
                    'ember': 10 + count * 10
                };
            },
            availablePhase: Engine.PHASES.CAMP,
            onBuild: function () {
                if (typeof Narrative !== 'undefined' && Narrative.dict && Narrative.dict.infrastructureLogs) {
                    Notifications.notify(Narrative.dict.infrastructureLogs.build_node);
                } else {
                    Notifications.notify('信号塔竖起。更多迷失者将寻踪而来。');
                }
            }
        },
        'emberFurnace': {
            name: '余烬熔炉',
            desc: '增加余烬存储上限',
            effect: '余烬上限 +50',
            maximum: 10,
            cost: function (count) {
                return {
                    'ember': 30 + count * 20
                };
            },
            availablePhase: Engine.PHASES.CAMP,
            onBuild: function () {
                Notifications.notify('熔炉的火焰更旺了。');
            }
        },
        'graySynthesizer': {
            name: '灰质合成器',
            desc: '解锁灰质生产 / 增加灰质上限',
            effect: '灰质上限 +30',
            maximum: 5,
            cost: function (count) {
                return {
                    'ember': 50 + count * 30
                };
            },
            availablePhase: Engine.PHASES.CAMP,
            onBuild: function () {
                Notifications.notify('灰质合成器嗡鸣着启动。新的可能性出现了。');
            }
        },
        'cognitiveBarrier': {
            name: '认知屏障',
            desc: '增强理智防线',
            effect: '最大SAN +10',
            maximum: 5,
            cost: function (count) {
                return {
                    'ember': 40 + count * 25,
                    'grayMatter': 10 + count * 10
                };
            },
            availablePhase: Engine.PHASES.ABYSS,
            onBuild: function () {
                $SM.add('character.maxSan', 10);
                var newMax = $SM.get('character.maxSan') || 110;
                Notifications.notify('认知屏障构筑完成。理智上限提升至 ' + newMax + '。混沌的低语变得遥远了。');
            }
        },
        'riftBeacon': {
            name: '裂隙信标',
            desc: '合成裂隙坐标的基础设施',
            effect: '解锁坐标合成',
            maximum: 1,
            cost: function () {
                return {
                    'ember': 200,
                    'grayMatter': 50,
                    'whispers': 10
                };
            },
            availablePhase: Engine.PHASES.ABYSS,
            onBuild: function () {
                Notifications.notify('裂隙信标发出刺眼的光芒。维度的边界在颤抖。');
                $SM.set('game.hasRiftCoord', true);
            }
        },
        'dataVault': {
            name: '数据金库',
            desc: '存储旧世界遗物',
            effect: '遗物上限 +10',
            maximum: 3,
            cost: function (count) {
                return {
                    'ember': 60 + count * 40,
                    'grayMatter': 20 + count * 15
                };
            },
            availablePhase: Engine.PHASES.MAP,
            onBuild: function () {
                Notifications.notify('数据金库的量子锁闪烁着微光。');
            }
        },
        'conceptDecrypter': {
            name: '概念解译器',
            desc: '解译并重构陨落文明的加密残片，合成完整的文明遗物',
            effect: '解锁遗物合成系统',
            maximum: 1,
            cost: function () {
                return { 'ember': 500, 'grayMatter': 100, 'whispers': 20 };
            },
            availablePhase: Engine.PHASES.MAP,
            onBuild: function () {
                Notifications.notify('概念解译器的晶格阵列缓缓亮起。深层逻辑开始运转。');
                Notifications.notify('遗物合成系统已解锁。在遗物面板中查看你的加密残片。');
                if (typeof Relics !== 'undefined') Relics.updateView();
            }
        }
    },

    init: function () {
        // Create nexus panel
        var $panel = $('<div>').attr('id', 'nexus-panel').addClass('ee-panel');
        $('<div>').addClass('ee-panel-title').text('结构节点').appendTo($panel);
        $('<div>').attr('id', 'nexus-build-list').addClass('ee-build-list').appendTo($panel);

        // Deploy Button
        var $btnDeploy = new Button.Button({
            id: 'action-deploy',
            text: '【解析坐标 (Deploy)】',
            click: function () {
                var phase = Engine.getPhase();
                if (phase < Engine.PHASES.MAP) {
                    Notifications.notify('裂隙网络尚未全面开启，无法部署。');
                    return;
                }
                var baseConc = $SM.get('stores.concentrate') || 0;
                if (baseConc <= 0) {
                    Notifications.notify('缺乏高能浓缩液，无法维持裂隙潜行的生命特征。');
                    return;
                }

                var input = prompt('输入携带的高能浓缩液数量 (最大储备: ' + Math.floor(baseConc) + '):', Math.min(10, Math.floor(baseConc)));
                if (input === null) return; // cancelled

                var amount = parseInt(input, 10);
                if (isNaN(amount) || amount <= 0) return;
                if (amount > baseConc) amount = baseConc;

                // Execute deploy
                $SM.add('stores.concentrate', -amount);
                Survival.supplies = amount;

                // Go to Map Panel
                if ($('#tab-rift_map').length > 0) {
                    $('#tab-rift_map').click();
                } else {
                    Engine.switchTab('rift_map');
                }
                Notifications.notify('坐标锁定，裂隙潜行开始。携带浓缩液: ' + amount);
            }
        });
        $btnDeploy.addClass('ee-btn--primary').css({ 'width': '100%', 'marginTop': '15px' });
        $panel.append($btnDeploy);

        $('#ee-middle').append($panel);
        $panel.hide();

        // Show if phase is CAMP or higher
        if (Engine.getPhase() >= Engine.PHASES.CAMP) {
            Nexus.show();
        }

        // Subscribe to phase changes
        $.Dispatch('phaseChange').subscribe(Nexus.handlePhaseChange);
        $.Dispatch('stateUpdate').subscribe(Nexus.handleStateUpdates);

        // Initial render of available buildings
        Nexus.updateBuildList();
    },

    show: function () {
        $('#nexus-panel').addClass('visible');
    },

    hide: function () {
        $('#nexus-panel').removeClass('visible');
    },

    /**
     * Update the list of available buildings
     */
    updateBuildList: function () {
        var $list = $('#nexus-build-list');
        var phase = Engine.getPhase();
        var buildings = $SM.get('buildings') || {};

        for (var key in Nexus.Buildings) {
            var bld = Nexus.Buildings[key];
            if (phase < bld.availablePhase) continue;

            var count = buildings[key] || 0;
            if (count >= bld.maximum) {
                // Max reached, show but disable
                Nexus.renderBuildRow(key, bld, count, true);
            } else {
                Nexus.renderBuildRow(key, bld, count, false);
            }
        }
    },

    renderBuildRow: function (key, bld, count, maxed) {
        var $existing = $('#build-' + key);

        if ($existing.length > 0) {
            // Update count
            $existing.find('.nexus-build-count').text(count + '/' + bld.maximum);
            // Update cost
            var cost = bld.cost(count);
            var costText = Object.keys(cost).map(function (r) {
                var name = Nexus.getResourceName(r);
                return name + ': ' + cost[r];
            }).join(', ');
            $existing.find('.ee-build-cost').text(costText);

            // Update button state
            if (maxed) {
                Button.setDisabled($existing.find('.ee-btn'), true);
            }
            return;
        }

        var $row = $('<div>').attr('id', 'build-' + key).addClass('nexus-build-row fade-in');

        // Info
        var $info = $('<div>').addClass('nexus-build-info');
        $('<div>').addClass('nexus-build-name').text(bld.name).appendTo($info);
        $('<div>').addClass('nexus-build-desc').text(bld.desc + ' (' + bld.effect + ')').appendTo($info);

        // Cost display
        var cost = bld.cost(count);
        var costText = Object.keys(cost).map(function (r) {
            var name = Nexus.getResourceName(r);
            return name + ': ' + cost[r];
        }).join(', ');
        $('<div>').addClass('ee-build-cost').text(costText).appendTo($info);

        $row.append($info);

        // Count
        $('<div>').addClass('nexus-build-count').text(count + '/' + bld.maximum).appendTo($row);

        // Build button
        var $btn = new Button.Button({
            id: 'btn-build-' + key,
            text: '建造',
            click: function () {
                Nexus.build(key);
            }
        });
        $btn.addClass('nexus-build-btn');
        if (maxed) Button.setDisabled($btn, true);
        $row.append($btn);

        $('#nexus-build-list').append($row);
    },

    /**
     * Build a structure
     */
    build: function (key) {
        var bld = Nexus.Buildings[key];
        if (!bld) return;

        var buildings = $SM.get('buildings') || {};
        var count = buildings[key] || 0;
        if (count >= bld.maximum) return;

        // Check cost
        var cost = bld.cost(count);
        for (var resource in cost) {
            var available = $SM.get('stores.' + resource) || 0;
            if (available < cost[resource]) {
                Notifications.notify('资源不足。');
                return;
            }
        }

        // Deduct cost
        for (var resource in cost) {
            $SM.add('stores.' + resource, -cost[resource]);
        }

        // Build it
        $SM.set('buildings.' + key, count + 1);

        // Callback
        if (bld.onBuild) bld.onBuild();

        // Refresh the list
        Nexus.updateBuildList();
    },

    getResourceName: function (key) {
        var names = {
            'ember': '余烬',
            'grayMatter': '灰质',
            'whispers': '低语值',
            'concentrate': '浓缩液',
            'relics': '遗物'
        };
        return names[key] || key;
    },

    handlePhaseChange: function (e) {
        if (e.to >= Engine.PHASES.CAMP) {
            Nexus.show();
            Nexus.updateBuildList();
        }
    },

    handleStateUpdates: function (e) {
        // Refresh build list on state changes
        if (e && e.path && (e.path.indexOf('buildings') === 0 || e.path.indexOf('stores') === 0)) {
            Nexus.updateBuildList();
        }
    },

    onArrival: function () {
        Nexus.updateBuildList();
    }
};
