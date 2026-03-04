/**
 * 余烬回响 — Sanity System
 * ==========================
 * SAN dynamic gating, Whispers production, Erosion events.
 */
var Sanity = {

    // SAN thresholds
    MADNESS_THRESHOLD: 30,
    ASSIMILATION_THRESHOLD: 70,

    // Last known SAN zone for detecting transitions
    _lastZone: null,

    init: function () {
        // Subscribe to phase changes
        $.Dispatch('phaseChange').subscribe(function (e) {
            if (e.to >= Engine.PHASES.ABYSS) {
                Sanity.updateVisuals();
            }
        });
    },

    /**
     * Called every tick by the engine (Phase 3+)
     */
    tick: function () {
        var san = $SM.get('character.san') || 50;
        var erosion = $SM.get('character.erosion') || 0;
        var zone = Sanity.getZone(san);

        // Zone-specific effects
        if (zone === 'madness') {
            // Produce Whispers
            $SM.add('stores.whispers', 0.1, true);
            // Erosion increases faster
            var erosionRate = 0.5;
            if ($SM.hasPerk('entropy_resist')) {
                erosionRate *= 0.75;
            }
            $SM.add('character.erosion', erosionRate, true);
            // SAN drifts slightly toward 0
            $SM.add('character.san', -0.1, true);
        } else if (zone === 'assimilation') {
            // Safe but constricted — ember bleeds away
            $SM.add('stores.ember', -1, true);
            // SAN drifts toward 100
            $SM.add('character.san', 0.05, true);
        } else {
            // Awakened zone — stable, slight natural SAN drift toward 50
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
        if (erosion > 0) {
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

    getZone: function (san) {
        if (san === undefined) san = $SM.get('character.san') || 50;
        if (san < Sanity.MADNESS_THRESHOLD) return 'madness';
        if (san > Sanity.ASSIMILATION_THRESHOLD) return 'assimilation';
        return 'awakened';
    },

    onZoneChange: function (from, to) {
        if (to === 'madness') {
            Notifications.notify('意识在崩塌。低语声充满了一切。');
        } else if (to === 'assimilation') {
            Notifications.notify('理智过载。思维被规训化。余烬开始流失。');
        } else if (to === 'awakened') {
            Notifications.notify('意识回到了边缘地带。清醒，但脆弱。');
        }
    },

    /**
     * Update body class based on SAN zone
     */
    updateVisuals: function () {
        var $body = $('body');
        var san = $SM.get('character.san') || 50;
        var zone = Sanity.getZone(san);

        $body.removeClass('glitch-blood rigid-code');

        if (zone === 'madness') {
            $body.addClass('glitch-blood');
        } else if (zone === 'assimilation') {
            $body.addClass('rigid-code');
        }

        // Update SAN display in stores
        Sanity.updateSanDisplay(san);
    },

    /**
     * SAN display: fuzzy text if < 70, numeric if >= 70
     */
    updateSanDisplay: function (san) {
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

        if (san >= 70) {
            $val.text(Math.floor(san));
            $val.css('color', 'var(--ice-blue)');
        } else if (san >= 50) {
            $val.text('稳定');
            $val.css('color', 'var(--ash-gray)');
        } else if (san >= 30) {
            $val.text('动摇');
            $val.css('color', 'var(--ember-orange)');
        } else if (san >= 15) {
            $val.text('边缘崩溃');
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
                // Lose some ember
                var loss = Math.floor(($SM.get('stores.ember') || 0) * 0.1);
                $SM.add('stores.ember', -loss);
                Notifications.notify('侵蚀波动。' + loss + ' 余烬被吞噬。');
                break;

            case 'high':
                // Lose a worker
                var workers = $SM.get('workers') || {};
                var workerTypes = Object.keys(workers).filter(function (k) {
                    return workers[k] > 0 && k !== 'wanderer';
                });
                if (workerTypes.length > 0) {
                    var type = workerTypes[Math.floor(Math.random() * workerTypes.length)];
                    $SM.add('workers.' + type, -1);
                    var name = Population._WORKERS[type] ? Population._WORKERS[type].name : type;
                    Notifications.notify('一个' + name + '被侵蚀吞没了。');
                }
                break;

            case 'critical':
                // Building damage
                var buildings = $SM.get('buildings') || {};
                var bldTypes = Object.keys(buildings).filter(function (k) {
                    return buildings[k] > 0;
                });
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
