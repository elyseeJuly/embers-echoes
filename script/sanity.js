/**
 * 余烬回响 — Sanity System
 * ==========================
 * SAN dynamic gating, Whispers production, Erosion events.
 * Featuring: 
 *  - Gaze into the Abyss (active sanity drain for whispers)
 *  - Inject Inhibitor (emergency erosion relief)
 *  - Dynamic thresholds based on maxSan
 */
var Sanity = {

    // Thresholds
    MADNESS_THRESHOLD: 30, // Absolute value

    // Action cooldowns
    _gazeCooldown: 0,
    _injectCooldown: 0,

    // Last known SAN zone for detecting transitions
    _lastZone: null,

    init: function () {
        // Subscribe to phase changes
        $.Dispatch('phaseChange').subscribe(function (e) {
            if (e.to >= Engine.PHASES.ABYSS) {
                Sanity.updateVisuals();
                Sanity.initActionButtons();
            }
        });

        // If loading late game
        if (Engine.getPhase() >= Engine.PHASES.ABYSS) {
            Sanity.initActionButtons();
        }
    },

    /**
     * Set up the 'Gaze into the Abyss' and 'Inject Inhibitor' buttons in the Action panel
     */
    initActionButtons: function () {
        if ($('#action-gaze').length > 0) return; // already initialized

        var $storesPanel = $('#stores-panel');
        if ($storesPanel.length === 0) return;

        var $actionsOuter = $('#sanity-actions-container');
        if ($actionsOuter.length === 0) {
            $actionsOuter = $('<div>').attr('id', 'sanity-actions-container').css({
                'margin-top': '20px',
                'border-top': '1px dotted var(--border-dim)',
                'padding-top': '15px'
            }).appendTo($storesPanel);
            $('<div>').addClass('ee-panel-title').text('战术动作').appendTo($actionsOuter);
        }

        // Action 1: Gaze into the Abyss
        var $btnGaze = new Button.Button({
            id: 'action-gaze',
            text: '【直视深渊】',
            click: function () { Sanity.actionGaze(); }
        });
        $btnGaze.addClass('ee-btn--primary');
        $('<div>').addClass('ee-tooltip').text('主动降低理智以窥探高维。\n耗费: 余烬x10, 理智x5\n产出: 低语值x1').appendTo($btnGaze);
        $actionsOuter.append($btnGaze);

        // Action 2: Inject Inhibitor (If MAP phase or later)
        if (Engine.getPhase() >= Engine.PHASES.MAP) {
            var $btnInject = new Button.Button({
                id: 'action-inject',
                text: '【注射抑制剂】',
                click: function () { Sanity.actionInject(); }
            });
            $btnInject.css('margin-left', '10px');
            $('<div>').addClass('ee-tooltip').text('强制重装心智防火墙。\n耗费: 浓缩液x2, 灰质x20\n效果: 理智重置为50, 侵蚀度-30').appendTo($btnInject);
            $actionsOuter.append($btnInject);
        }

        // Action 3: Force Sedation (Only during Mind Break)
        var $btnSedate = new Button.Button({
            id: 'action-sedate',
            text: '【强行镇静】',
            click: function () { Sanity.actionSedate(); }
        });
        $btnSedate.addClass('ee-btn--danger pulse').hide();
        $('<div>').addClass('ee-tooltip').text('【警告级别：极端】\n将理智强行拉回10以停止侵蚀爆发。\n代价：清空所有常规资源储备。').appendTo($btnSedate);
        $actionsOuter.append($btnSedate);

        // Action UI update tick
        setInterval(Sanity.updateActionButtons, 1000);
    },

    actionGaze: function () {
        if (Sanity._gazeCooldown > 0) return;
        var ember = $SM.get('stores.ember') || 0;
        var san = $SM.get('character.san') || 50;

        if (ember < 10) { Notifications.notify('余烬不足以支撑观察屏障。'); return; }
        if (san < 5) { Notifications.notify('理智已无法承受更多高维画面。'); return; }

        // Execute action
        $SM.add('stores.ember', -10);
        $SM.add('character.san', -5);
        $SM.add('stores.whispers', 1);
        Notifications.notify('深渊向你回眸。低语声在脑海中炸开。');

        Sanity._gazeCooldown = 3;
        Sanity.updateActionButtons();
    },

    actionInject: function () {
        if (Sanity._injectCooldown > 0) return;
        var conc = $SM.get('stores.concentrate') || 0;
        var gray = $SM.get('stores.grayMatter') || 0;

        if (conc < 2 || gray < 20) { Notifications.notify('抑制剂合成材料不足 (需 浓缩液x2, 灰质x20)。'); return; }

        // Execute action
        $SM.add('stores.concentrate', -2);
        $SM.add('stores.grayMatter', -20);
        $SM.set('character.san', 50);
        $SM.add('character.erosion', -30);
        Notifications.notify('抑制剂注入。冰冷的逻辑重新接管了大脑。');

        // White Flash CSS
        var $overlay = $('<div>').css({
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'white', zIndex: 9999, pointerEvents: 'none',
            opacity: 1, transition: 'opacity 0.8s ease-out'
        }).appendTo('body');

        setTimeout(function () { $overlay.css('opacity', 0); }, 50);
        setTimeout(function () { $overlay.remove(); }, 1000);

        Sanity._injectCooldown = 120;
        Sanity.updateActionButtons();
    },

    actionSedate: function () {
        var san = $SM.get('character.san') || 0;
        if (san > 0) return; // Only allow if SAN is 0 or less

        // Huge cost implementation
        $SM.set('stores.ember', 0);
        $SM.set('stores.grayMatter', 0);
        $SM.set('stores.concentrate', 0);

        $SM.set('character.san', 10); // Reset SAN to 10

        Notifications.notify('强行镇静生效。心智的防线被勉强拼凑，但你失去了所有的常规物资产出。', 'critical');

        var $overlay = $('<div>').css({
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'black', zIndex: 9999, pointerEvents: 'none',
            opacity: 1, transition: 'opacity 3.0s ease-out'
        }).appendTo('body');

        setTimeout(function () { $overlay.css('opacity', 0); }, 50);
        setTimeout(function () { $overlay.remove(); }, 3000);

        Sanity.updateVisuals();
        Sanity.updateActionButtons();
    },

    updateActionButtons: function () {
        var zone = Sanity.getZone();
        var $btnGaze = $('#action-gaze');
        var $btnInject = $('#action-inject');
        var $btnSedate = $('#action-sedate');

        if (zone === 'mindbreak') {
            if ($btnGaze.length > 0) $btnGaze.hide();
            if ($btnInject.length > 0) $btnInject.hide();
            if ($btnSedate.length > 0) $btnSedate.show();
        } else {
            if ($btnSedate.length > 0) $btnSedate.hide();
            if ($btnGaze.length > 0) {
                $btnGaze.show();
                if (Sanity._gazeCooldown > 0) {
                    Sanity._gazeCooldown--;
                    Button.setDisabled($btnGaze, true);
                    $btnGaze.find('span').text('【冷却中 ' + Sanity._gazeCooldown + 's】');
                } else {
                    var san = $SM.get('character.san') || 50;
                    if (san < 5) {
                        Button.setDisabled($btnGaze, true);
                        $btnGaze.find('span').text('【无法承受深渊】');
                    } else {
                        Button.setDisabled($btnGaze, false);
                        $btnGaze.find('span').text('【直视深渊】');
                    }
                }
            }

            if ($btnInject.length > 0) {
                $btnInject.show();
                if (Sanity._injectCooldown > 0) {
                    Sanity._injectCooldown--;
                    Button.setDisabled($btnInject, true);
                    $btnInject.find('span').text('【冷却中 ' + Sanity._injectCooldown + 's】');
                } else {
                    Button.setDisabled($btnInject, false);
                    $btnInject.find('span').text('【注射抑制剂】');
                }
            }
        }
    },

    /**
     * Called every tick by the engine (Phase 3+)
     */
    tick: function () {
        var san = $SM.get('character.san') || 50;
        var maxSan = $SM.get('character.maxSan') || 100;
        var erosion = $SM.get('character.erosion') || 0;
        var zone = Sanity.getZone(san, maxSan);

        // Zone-specific effects
        if (zone === 'madness') {
            // MADNESS (SAN < 30) - high risk, high reward
            $SM.add('stores.whispers', 0.5, true);
            var erosionRate = 0.5;
            if ($SM.hasPerk('entropy_resist')) { erosionRate *= 0.75; }
            $SM.add('character.erosion', erosionRate, true);

        } else if (zone === 'mindbreak') {
            // MINDBREAK (SAN 0) - severe punishment
            $SM.add('character.erosion', 5, true);
            if (Math.random() < 0.2) Notifications.notify('【理智崩溃】侵蚀正在暴走！立即使用强制镇静！', 'glitch');

        } else if (zone === 'assimilation') {
            // ASSIMILATION (SAN > maxSan - 30) - super productivity (handled in state_manager collectIncome)
            // But costs extra 2 ember per tick due to system heat
            $SM.add('stores.ember', -2, true);

        } else {
            // AWAKENED - Safe, drifts toward 50
            var drift = (50 - san) * 0.01;
            $SM.add('character.san', drift, true);
        }

        // Erosion threshold events
        if (erosion >= 100) {
            Sanity.erosionDeath();
        } else if (erosion >= 75 && Math.random() < 0.01) {
            Sanity.erosionEvent('critical');
        } else if (erosion >= 50 && Math.random() < 0.005) {
            Sanity.erosionEvent('high');
        } else if (erosion >= 25 && Math.random() < 0.002) {
            Sanity.erosionEvent('moderate');
        }

        // Natural erosion decay (very slow)
        if (zone !== 'madness' && erosion > 0) {
            $SM.add('character.erosion', -0.05, true);
        }

        // Update visuals
        Sanity.updateVisuals();

        // Zone transition notifications
        if (zone !== Sanity._lastZone && Sanity._lastZone !== null) {
            Sanity.onZoneChange(Sanity._lastZone, zone);
        }
        Sanity._lastZone = zone;
    },

    getZone: function (san, maxSan) {
        if (san === undefined) san = $SM.get('character.san') || 50;
        if (maxSan === undefined) maxSan = $SM.get('character.maxSan') || 100;

        if (san <= 0) return 'mindbreak';
        if (san < Sanity.MADNESS_THRESHOLD) return 'madness';
        if (san > (maxSan - 30)) return 'assimilation';
        return 'awakened';
    },

    onZoneChange: function (from, to) {
        if (to === 'madness') {
            Notifications.notify('意识在崩塌。低语声充满了一切。');
        } else if (to === 'assimilation') {
            Notifications.notify('理智过载。系统进入超频状态，但能量急剧消耗。');
        } else if (to === 'awakened') {
            Notifications.notify('意识回到了边缘地带。清醒，但脆弱。');
        } else if (to === 'mindbreak') {
            Notifications.notify('【理智崩溃】心智防线彻底瓦解！侵蚀正在暴走！', 'critical');
        }
    },

    /**
     * Update body class based on SAN zone
     */
    updateVisuals: function () {
        var $body = $('body');
        var san = $SM.get('character.san') || 50;
        var maxSan = $SM.get('character.maxSan') || 100;
        var zone = Sanity.getZone(san, maxSan);

        $body.removeClass('glitch-blood rigid-code mind-break-active');
        $('#ee-middle').removeClass('mind-break-lock');

        if (zone === 'mindbreak') {
            $body.addClass('mind-break-active');
            $('#ee-middle').addClass('mind-break-lock');
        } else if (zone === 'madness') {
            $body.addClass('glitch-blood');
        } else if (zone === 'assimilation') {
            $body.addClass('rigid-code');
        }

        // Update SAN display in stores
        Sanity.updateSanDisplay(san, maxSan);
    },

    /**
     * SAN display
     */
    updateSanDisplay: function (san, maxSan) {
        var $sanRow = $('#san-display');

        if ($sanRow.length === 0) {
            $sanRow = $('<div>').attr('id', 'san-display').addClass('ee-store-row fade-in');
            $('<span>').addClass('ee-store-name').text('理智').appendTo($sanRow);
            $('<span>').addClass('ee-store-val san-val').appendTo($sanRow);
            var $storesPanel = $('#stores-panel .ee-stores');
            if ($storesPanel.length > 0) {
                $storesPanel.prepend($sanRow);
            }
        }

        var $val = $sanRow.find('.san-val');
        var threshold = maxSan - 30;

        if (san > threshold) {
            $val.text(Math.floor(san) + ' / ' + maxSan);
            $val.css('color', 'var(--ice-blue)');
        } else if (san >= 50) {
            $val.text('稳定 (' + Math.floor(san) + ')');
            $val.css('color', 'var(--ash-gray)');
        } else if (san >= 30) {
            $val.text('动摇 (' + Math.floor(san) + ')');
            $val.css('color', 'var(--ember-orange)');
        } else if (san >= 15) {
            $val.text('边缘崩溃 (' + Math.floor(san) + ')');
            $val.css('color', 'var(--blood-red)');
        } else {
            $val.text('█̷̢̛̤̪ↂ̶̧̛ↂ̴̛̤̪');
            $val.css('color', 'var(--blood-red)');
        }
    },

    // ── Erosion Events ──────────────────────────────────────

    erosionEvent: function (severity) {
        switch (severity) {
            case 'moderate':
                var loss = Math.floor(($SM.get('stores.ember') || 0) * 0.1);
                $SM.add('stores.ember', -loss);
                Notifications.notify('侵蚀波动。' + loss + ' 余烬被吞噬。');
                break;
            case 'high':
                var workers = $SM.get('workers') || {};
                var workerTypes = Object.keys(workers).filter(function (k) { return workers[k] > 0 && k !== 'wanderer'; });
                if (workerTypes.length > 0) {
                    var type = workerTypes[Math.floor(Math.random() * workerTypes.length)];
                    $SM.add('workers.' + type, -1);
                    var name = Population._WORKERS[type] ? Population._WORKERS[type].name : type;
                    Notifications.notify('一个' + name + '被侵蚀吞没了。');
                }
                break;
            case 'critical':
                var buildings = $SM.get('buildings') || {};
                var bldTypes = Object.keys(buildings).filter(function (k) { return buildings[k] > 0; });
                if (bldTypes.length > 0) {
                    var bld = bldTypes[Math.floor(Math.random() * bldTypes.length)];
                    $SM.add('buildings.' + bld, -1);
                    var bldName = Nexus.Buildings[bld] ? Nexus.Buildings[bld].name : bld;
                    Notifications.notify('侵蚀风暴摧毁了一座' + bldName + '！');
                }
                break;
        }
    },

    erosionDeath: function () {
        if (typeof Narrative !== 'undefined' && Narrative.dict && Narrative.dict.deathEchoes) {
            Engine.triggerDeathSequence(Narrative.dict.deathEchoes.death_by_sanity, 'DEATH_EROSION', '理智溶解', '侵蚀度达到了临界值，被虚空宇宙完全同化。');
        } else {
            Engine.GAME_OVER = true;
            Notifications.notify('侵蚀已达临界值。意识完全溶解。');
            if (typeof Gallery !== 'undefined') Gallery.recordEnding('DEATH_EROSION', '理智溶解', '侵蚀度达到了临界值，被虚空宇宙完全同化。');
        }
    }
};
