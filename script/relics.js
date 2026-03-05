/**
 * 余烬回响 — Relics Module (GDD v2)
 * ==================================
 * Displays:
 *   1. Fragment inventory (raw map drops)
 *   2. Completed relic inventory
 *   3. Crafting panel (conceptDecrypter required)
 */
var Relics = {

    init: function () {
        var $panel = $('<div>').attr('id', 'relic-panel').addClass('ee-panel');
        $('<div>').addClass('ee-panel-title').text('文明遗物').appendTo($panel);

        // Fragment sub-panel
        $('<div>').addClass('relic-sub-title').text('▸ 加密残片').appendTo($panel);
        $('<div>').attr('id', 'fragment-list').addClass('relic-list').appendTo($panel);

        // Crafting sub-panel (hidden until conceptDecrypter built)
        var $forge = $('<div>').attr('id', 'forge-panel').hide();
        $('<div>').addClass('relic-sub-title crafting-title').text('▸ 概念解译器').appendTo($forge);
        $('<div>').attr('id', 'crafting-list').addClass('crafting-list').appendTo($forge);
        $forge.appendTo($panel);

        // Completed relic sub-panel
        $('<div>').addClass('relic-sub-title').text('▸ 已解译遗物').appendTo($panel);
        $('<div>').attr('id', 'relic-list').addClass('relic-list').appendTo($panel);

        $('#ee-right').append($panel);

        if (Engine.getPhase() >= Engine.PHASES.MAP) Relics.show();

        $.Dispatch('phaseChange').subscribe(Relics.handlePhaseChange);
        $.Dispatch('stateUpdate').subscribe(Relics.handleStateUpdates);

        Relics.updateView();
    },

    show: function () { $('#relic-panel').addClass('visible'); },

    updateView: function () {
        Relics._renderFragments();
        Relics._renderRelics();
        Relics._renderForge();
    },

    _renderFragments: function () {
        var $list = $('#fragment-list');
        $list.empty();
        var inv = $SM.get('fragmentInventory') || [];
        if (inv.length === 0) {
            $('<div>').addClass('relic-empty').text('尚未发现任何加密残片。在地图中探索废墟和副本可获得。').appendTo($list);
            return;
        }
        var counts = {};
        inv.forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });
        var frags = (Narrative.dict && Narrative.dict.fragments) ? Narrative.dict.fragments : {};
        var seen = {};
        inv.forEach(function (id) {
            if (seen[id]) return;
            seen[id] = true;
            var def = frags[id];
            if (!def) return;
            var $row = $('<div>').addClass('relic-row fragment-row fade-in');
            var $h = $('<div>').addClass('relic-row-header');
            $('<span>').addClass('relic-name').text(def.name).appendTo($h);
            if (counts[id] > 1) $('<span>').addClass('relic-count').text('×' + counts[id]).appendTo($h);
            $('<span>').addClass('fragment-weight').text(def.weight + 'kg').appendTo($h);
            $h.appendTo($row);
            $('<div>').addClass('relic-origin').text('— ' + def.origin).appendTo($row);
            $('<div>').addClass('relic-desc').text(def.desc).appendTo($row);
            $('<span>').addClass('relic-type-badge relic-type-fragment').text('加密残片').appendTo($row);
            $list.append($row);
        });
    },

    _renderRelics: function () {
        var $list = $('#relic-list');
        $list.empty();
        var inv = $SM.get('relicInventory') || [];
        if (inv.length === 0) {
            $('<div>').addClass('relic-empty').text('尚未合成任何遗物。').appendTo($list);
            return;
        }
        var counts = {};
        inv.forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });
        var relics = (Narrative.dict && Narrative.dict.relics) ? Narrative.dict.relics : {};
        var relicById = {};
        for (var k in relics) relicById[relics[k].id] = relics[k];
        var seen = {};
        inv.forEach(function (id) {
            if (seen[id]) return;
            seen[id] = true;
            var def = relicById[id];
            if (!def) return;
            var $row = $('<div>').addClass('relic-row fade-in');
            var $h = $('<div>').addClass('relic-row-header');
            $('<span>').addClass('relic-name').text(def.name).appendTo($h);
            if (counts[id] > 1) $('<span>').addClass('relic-count').text('×' + counts[id]).appendTo($h);
            $h.appendTo($row);
            $('<div>').addClass('relic-origin').text('— ' + def.origin).appendTo($row);
            $('<div>').addClass('relic-desc').text(def.desc).appendTo($row);
            var typeLabel = { common: '常规', special: '特殊', anchor: '碳基锚点' }[def.type] || def.type;
            var typeCls = { common: 'relic-type-common', special: 'relic-type-special', anchor: 'relic-type-anchor' }[def.type] || '';
            $('<span>').addClass('relic-type-badge ' + typeCls).text(typeLabel).appendTo($row);
            $list.append($row);
        });
    },

    _renderForge: function () {
        var hasForge = ($SM.get('buildings.conceptDecrypter') || 0) >= 1;
        if (!hasForge) { $('#forge-panel').hide(); return; }
        $('#forge-panel').show();

        var $list = $('#crafting-list');
        $list.empty();
        var recipes = (Narrative.dict && Narrative.dict.craftingRecipes) ? Narrative.dict.craftingRecipes : [];

        recipes.forEach(function (recipe) {
            (function (r) {
                // Check if already crafted (relicInventory has it)
                var alreadyCrafted = $SM.hasRelic(r.relicId);
                // Check if player has all required fragments
                var hasFrags = r.fragments.every(function (fid) { return $SM.hasFragment(fid); });
                // Check resources
                var hasResources = true;
                for (var res in r.costs) {
                    if (($SM.get('stores.' + res) || 0) < r.costs[res]) { hasResources = false; break; }
                }
                // Check wanderers for sacrifice recipe
                var needsSacrifice = r.sacrificeWanderers && r.sacrificeWanderers > 0;
                var hasWanderers = !needsSacrifice || ($SM.get('workers.wanderer') || 0) >= r.sacrificeWanderers;
                var canCraft = hasFrags && hasResources && hasWanderers && !alreadyCrafted;

                var $row = $('<div>').addClass('crafting-row' + (alreadyCrafted ? ' crafted' : ''));
                $('<div>').addClass('crafting-name').text('【' + r.name + '】').appendTo($row);

                // Requirements
                var $reqs = $('<div>').addClass('crafting-reqs');
                r.fragments.forEach(function (fid) {
                    var fd = Narrative.dict.fragments && Narrative.dict.fragments[fid];
                    var has = $SM.hasFragment(fid);
                    $('<span>').addClass('crafting-req' + (has ? ' met' : ' unmet')).text((fd ? fd.name : fid)).appendTo($reqs);
                });
                for (var res in r.costs) {
                    var cur = Math.floor($SM.get('stores.' + res) || 0);
                    var need = r.costs[res];
                    $('<span>').addClass('crafting-req' + (cur >= need ? ' met' : ' unmet'))
                        .text(res + ' ' + cur + '/' + need).appendTo($reqs);
                }
                if (needsSacrifice) {
                    var curW = $SM.get('workers.wanderer') || 0;
                    $('<span>').addClass('crafting-req sacrifice' + (curW >= r.sacrificeWanderers ? ' met' : ' unmet'))
                        .text('献祭游荡者 ' + curW + '/' + r.sacrificeWanderers).appendTo($reqs);
                }
                $reqs.appendTo($row);

                if (alreadyCrafted) {
                    $('<div>').addClass('crafting-done').text('✓ 已合成').appendTo($row);
                } else {
                    var $btn = $('<button>').addClass('ee-btn crafting-btn' + (canCraft ? '' : ' disabled'))
                        .text(needsSacrifice ? '【献祭合成】' : '【解译】')
                        .prop('disabled', !canCraft);
                    if (canCraft) {
                        $btn.on('click', function () { Relics.craftRelic(r); });
                    }
                    $row.append($btn);
                }
                $list.append($row);
            })(recipe);
        });
    },

    craftRelic: function (recipe) {
        // Sacrifice wanderers if needed
        if (recipe.sacrificeWanderers && recipe.sacrificeWanderers > 0) {
            if (!confirm(recipe.sacrificeText + '\n\n确认献祭 ' + recipe.sacrificeWanderers + ' 名游荡者？')) return;
            $SM.add('workers.wanderer', -recipe.sacrificeWanderers);
        }
        // Consume fragments
        recipe.fragments.forEach(function (fid) { $SM.consumeFragment(fid); });
        // Consume resources
        for (var res in recipe.costs) {
            $SM.add('stores.' + res, -recipe.costs[res]);
        }
        // Grant relic
        $SM.addRelic(recipe.relicId);
        Notifications.notify('【' + recipe.name + '】合成完成。' + recipe.craftText);
        Relics.updateView();
    },

    handlePhaseChange: function (e) {
        if (e.to >= Engine.PHASES.MAP) { Relics.show(); Relics.updateView(); }
    },

    handleStateUpdates: function (e) {
        if (e && e.path && (e.path === 'relicInventory' || e.path === 'fragmentInventory' || e.path === 'buildings')) {
            Relics.updateView();
        }
    }
};
