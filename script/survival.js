/**
 * 余烬回响 — Survival Module
 * ===========================
 * Handles outfitting, supplies, and carry weight for map exploration.
 */
var Survival = {

    // Current carried loot (temporary inventory)
    loot: {},
    supplies: 0,
    weightLimit: 30,

    init: function () {
        var $panel = $('<div>').attr('id', 'survival-panel').addClass('ee-panel');
        $('<div>').addClass('ee-panel-title').text('战术背包').appendTo($panel);

        // Status gauges
        var $gauges = $('<div>').attr('id', 'survival-gauges').appendTo($panel);
        $('<div>').attr('id', 'hp-gauge').addClass('survival-gauge').appendTo($gauges);
        $('<div>').attr('id', 'supplies-gauge').addClass('survival-gauge').appendTo($gauges);
        $('<div>').attr('id', 'weight-gauge').addClass('survival-gauge').appendTo($gauges);

        // Loot list
        $('<div>').attr('id', 'loot-list').appendTo($panel);
        $('<div>').addClass('survival-pulse').appendTo($panel);

        $('#ee-middle').append($panel);

        if (Engine.getPhase() >= Engine.PHASES.MAP) {
            Survival.show();
        }

        $.Dispatch('phaseChange').subscribe(Survival.handlePhaseChange);
    },

    show: function () {
        $('#survival-panel').show();
        Survival.updateView();
    },

    hide: function () {
        $('#survival-panel').hide();
    },

    getWeightLimit: function () {
        var limit = 30; // base weight limit
        if ($SM.hasPerk('spatial_fold')) {
            limit += 20;
        }
        return limit;
    },

    getCurrentWeight: function () {
        var w = 0;
        // Supply weight
        w += Survival.supplies * 0.1;

        // Loot weight
        for (var k in Survival.loot) {
            if (k === 'ember') w += Survival.loot[k] * 0.05;
            else if (k === 'grayMatter') w += Survival.loot[k] * 0.2;
            else if (k === 'relics') w += Survival.loot[k] * 5.0;
            else w += Survival.loot[k] * 0.5;
        }
        return w;
    },

    consumeSupplies: function (amount) {
        if (Survival.supplies >= amount) {
            Survival.supplies -= amount;
            return true;
        }
        if (Survival.supplies > 0) {
            Survival.supplies = 0;
        }
        return false; // Out of bounds starvation
    },

    addLoot: function (item, amount) {
        if (!Survival.loot[item]) Survival.loot[item] = 0;
        Survival.loot[item] += amount;

        // Check weight limit
        if (Survival.getCurrentWeight() > Survival.getWeightLimit()) {
            Notifications.notify('背包超载。部分资源流失在裂隙中。');
            // Auto-discard logic: just cap roughly
            Survival.loot[item] -= amount;
        } else {
            Survival.updateView();
        }
    },

    depositLoot: function () {
        var deposited = false;
        for (var k in Survival.loot) {
            if (Survival.loot[k] > 0) {
                $SM.add('stores.' + k, Survival.loot[k]);
                deposited = true;
            }
        }
        if (Survival.supplies > 0) {
            $SM.add('stores.concentrate', Survival.supplies);
            Survival.supplies = 0;
            deposited = true;
        }
        if (deposited) {
            Notifications.notify('带回了裂隙中的资源与剩余补给。');
        }
        Survival.loot = {};
        Survival.updateView();
    },

    clearLoot: function () {
        Survival.loot = {};
        Survival.supplies = 0;
        Survival.updateView();
    },

    updateView: function () {
        // HP Gauge
        var hp = $SM.get('character.hp') || 10;
        var maxHp = $SM.get('character.maxHp') || 10;
        $('#hp-gauge').html('生命支撑系统: <span class="val" style="color:var(--erosion-green)">' + Math.max(0, hp).toFixed(1) + ' / ' + maxHp + '</span>');

        // Supplies Gauge
        $('#supplies-gauge').html('高能浓缩液: <span class="val" style="color:var(--glow-cyan)">' + Math.floor(Survival.supplies) + '</span>');

        // Weight Gauge
        var cw = Survival.getCurrentWeight();
        var maxW = Survival.getWeightLimit();
        var wColor = cw > maxW * 0.9 ? 'var(--blood-red)' : 'var(--ember-orange)';
        $('#weight-gauge').html('空间负重负载: <span class="val" style="color:' + wColor + '">' + cw.toFixed(1) + ' / ' + maxW + ' kg</span>');

        // Loot listing
        var $list = $('#loot-list');
        $list.empty();
        for (var k in Survival.loot) {
            if (Survival.loot[k] > 0) {
                $('<div>').addClass('loot-item').text('▪ ' + Nexus.getResourceName(k) + ': ' + Survival.loot[k]).appendTo($list);
            }
        }
    }

};
