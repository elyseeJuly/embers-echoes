/**
 * 余烬回响 — Relics Module
 * ==========================
 * Displays the player's named relic inventory in the right panel.
 * Relics are collected during map exploration and combat, and are
 * consumed in the final inquiry to unlock the TRUE END.
 */
var Relics = {

    init: function () {
        var $panel = $('<div>').attr('id', 'relic-panel').addClass('ee-panel');
        $('<div>').addClass('ee-panel-title').text('文明遗物').appendTo($panel);
        $('<div>').attr('id', 'relic-list').addClass('relic-list').appendTo($panel);
        $('#ee-right').append($panel);

        // Show when map phase unlocked
        if (Engine.getPhase() >= Engine.PHASES.MAP) {
            Relics.show();
        }

        // Subscribe to phase and state changes
        $.Dispatch('phaseChange').subscribe(Relics.handlePhaseChange);
        $.Dispatch('stateUpdate').subscribe(Relics.handleStateUpdates);

        Relics.updateView();
    },

    show: function () {
        $('#relic-panel').addClass('visible');
    },

    /**
     * Rebuild the relic list UI from the inventory array.
     */
    updateView: function () {
        var $list = $('#relic-list');
        $list.empty();

        var inv = $SM.get('relicInventory') || [];
        if (inv.length === 0) {
            $('<div>').addClass('relic-empty').text('尚未发现任何文明遗迹。').appendTo($list);
            return;
        }

        // Count occurrences of each relic id
        var counts = {};
        for (var i = 0; i < inv.length; i++) {
            counts[inv[i]] = (counts[inv[i]] || 0) + 1;
        }

        // Build lookup from id -> relic definition
        var relicDefs = (typeof Narrative !== 'undefined' && Narrative.dict && Narrative.dict.relics)
            ? Narrative.dict.relics : {};

        var relicById = {};
        for (var key in relicDefs) {
            relicById[relicDefs[key].id] = relicDefs[key];
        }

        // Render each unique relic
        var seenIds = {};
        for (var i = 0; i < inv.length; i++) {
            var id = inv[i];
            if (seenIds[id]) continue;
            seenIds[id] = true;

            var def = relicById[id];
            if (!def) continue;

            var $row = $('<div>').addClass('relic-row fade-in');

            var $header = $('<div>').addClass('relic-row-header');
            $('<span>').addClass('relic-name').text(def.name).appendTo($header);
            if (counts[id] > 1) {
                $('<span>').addClass('relic-count').text('×' + counts[id]).appendTo($header);
            }
            $header.appendTo($row);

            $('<div>').addClass('relic-origin').text('— ' + def.origin).appendTo($row);
            $('<div>').addClass('relic-desc').text(def.desc).appendTo($row);

            // Type badge
            var typeLabel = { 'common': '常规', 'special': '特殊', 'anchor': '碳基锚点' }[def.type] || def.type;
            var typeCls = { 'common': 'relic-type-common', 'special': 'relic-type-special', 'anchor': 'relic-type-anchor' }[def.type] || '';
            $('<span>').addClass('relic-type-badge ' + typeCls).text(typeLabel).appendTo($row);

            $list.append($row);
        }
    },

    handlePhaseChange: function (e) {
        if (e.to >= Engine.PHASES.MAP) {
            Relics.show();
            Relics.updateView();
        }
    },

    handleStateUpdates: function (e) {
        if (e && e.path && e.path === 'relicInventory') {
            Relics.updateView();
        }
    }
};
