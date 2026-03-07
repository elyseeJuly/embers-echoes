/**
 * 余烬回响 — Rift Map
 * ========================
 * 2D grid-based exploration mapping infinite dimensions
 * Replaces the original ADR world.js.
 */
var RiftMap = {
    name: '裂隙',
    tabId: 'tab-rift_map',
    RADIUS: 10,

    TILE: {
        CAMP: 'H',     // Home base
        VOID: '.',     // Empty space
        RUIN: '#',     // Destroyed structure
        DEBRIS: ',',   // Minor obstacle
        ANOMALY: '*',  // Combat node
        CACHE: 'C',    // Resource node
        SIGNAL: '?',   // Text event node (no combat)
        DUNGEON: 'D',  // Deep ruin dungeon (multi-wave)
        PORTAL: '@',   // Return portal
        FOG: ' '       // Unknown
    },

    // Map state
    pos: [0, 0],   // [x, y]
    grid: {},      // 'x,y' -> tile string
    visited: {},   // 'x,y' -> boolean
    active: false,

    init: function () {
        var $panel = $('<div>').attr('id', 'map-panel').addClass('ee-panel');
        var $mapContainer = $('<div>').attr('id', 'map-viewport').appendTo($panel);
        $('#map-events').appendTo($panel);

        $('#ee-middle').append($panel);
        $panel.hide();

        // Event listenersetTile(0, 0, RiftMap.TILE.CAMP);
        RiftMap.setTile(0, 0, RiftMap.TILE.CAMP);
        RiftMap.visited['0,0'] = true;

        // Generate surrounding initial tiles
        RiftMap.generateSurroundings(0, 0);

        // Keyboard WASD
        $(document).on('keydown', function (e) {
            if (!RiftMap.active || Engine.GAME_OVER) return;
            switch (e.key.toLowerCase()) {
                case 'w': RiftMap.move(0, -1); break;
                case 'a': RiftMap.move(-1, 0); break;
                case 's': RiftMap.move(0, 1); break;
                case 'd': RiftMap.move(1, 0); break;
            }
        });

        // Evacuate Button
        var $btnEvacuate = new Button.Button({
            id: 'btn-evacuate',
            text: '【紧急撤离】',
            click: function () {
                if (RiftMap.pos[0] === 0 && RiftMap.pos[1] === 0) {
                    Notifications.notify('已返回营地。');
                    Survival.depositLoot();
                    if ($('#tab-nexus').length > 0) $('#tab-nexus').click();
                } else {
                    if (confirm('警告：在非入口处撤离将损失50%已获取物资并受到20点精神损伤。确认撤离？')) {
                        for (var k in Survival.loot) {
                            Survival.loot[k] = Math.floor(Survival.loot[k] * 0.5);
                        }
                        $SM.add('character.san', -20);
                        Survival.depositLoot();
                        if ($('#tab-nexus').length > 0) $('#tab-nexus').click();
                        Notifications.notify('强行切断连结，损失了部分物资与理智。', 'warning');
                    }
                }
            }
        });
        $btnEvacuate.css({ 'position': 'absolute', 'top': '20px', 'right': '20px', 'zIndex': 100 }).addClass('ee-btn--danger');
        $panel.append($btnEvacuate);

        // ASCII D-Pad
        var $dpad = $('<div>').addClass('map-dpad');
        var $row1 = $('<div>');
        var $row2 = $('<div>');
        var $btnW = $('<button>').text('W').on('click', function () { RiftMap.move(0, -1) });
        var $btnA = $('<button>').text('A').on('click', function () { RiftMap.move(-1, 0) });
        var $btnS = $('<button>').text('S').on('click', function () { RiftMap.move(0, 1) });
        var $btnD = $('<button>').text('D').on('click', function () { RiftMap.move(1, 0) });
        $row1.append($btnW);
        $row2.append($btnA, $btnS, $btnD);
        $dpad.append($row1, $row2);
        $panel.append($dpad);

        $panel.css('position', 'relative');

        // Hide initially
        $panel.hide();

        $.Dispatch('phaseChange').subscribe(RiftMap.handlePhaseChange);
    },

    show: function () {
        $('#map-panel').show();
        RiftMap.active = true;
        RiftMap.drawMap();
        Survival.show();

        // Map requires header tab explicitly if not added yet
        if ($('#tab-rift_map').length === 0) {
            Header.addLocation('裂隙网络', 'rift_map', RiftMap);
        }
    },

    hide: function () {
        $('#map-panel').hide();
        RiftMap.active = false;
    },

    setTile: function (x, y, type) {
        RiftMap.grid[x + ',' + y] = type;
    },

    getTile: function (x, y) {
        return RiftMap.grid[x + ',' + y] || null;
    },

    generateSurroundings: function (cx, cy) {
        var types = [
            RiftMap.TILE.VOID, RiftMap.TILE.VOID, RiftMap.TILE.VOID,
            RiftMap.TILE.DEBRIS, RiftMap.TILE.DEBRIS,
            RiftMap.TILE.RUIN,
            RiftMap.TILE.SIGNAL,
            RiftMap.TILE.ANOMALY,
            RiftMap.TILE.CACHE
        ];

        for (var dx = -1; dx <= 1; dx++) {
            for (var dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                var nx = cx + dx;
                var ny = cy + dy;
                var key = nx + ',' + ny;

                if (!RiftMap.grid[key]) {
                    var dist = Math.abs(nx) + Math.abs(ny);

                    if (Math.random() < 0.05 && dist > 10) {
                        // Rare portal spawn far out
                        RiftMap.setTile(nx, ny, RiftMap.TILE.PORTAL);
                    } else if (Math.random() < 0.05 && dist > 8) {
                        // Dungeon spawn at medium-far distance
                        RiftMap.setTile(nx, ny, RiftMap.TILE.DUNGEON);
                    } else {
                        var randTile = types[Math.floor(Math.random() * types.length)];
                        RiftMap.setTile(nx, ny, randTile);
                    }
                }
            }
        }
    },

    drawMap: function () {
        if (!RiftMap.active) return;

        var $vp = $('#map-viewport');
        $vp.empty();

        var cx = RiftMap.pos[0];
        var cy = RiftMap.pos[1];

        var table = $('<table>').addClass('map-grid');

        for (var y = cy - RiftMap.RADIUS; y <= cy + RiftMap.RADIUS; y++) {
            var tr = $('<tr>');
            for (var x = cx - RiftMap.RADIUS; x <= cx + RiftMap.RADIUS; x++) {
                var td = $('<td>');
                var key = x + ',' + y;

                if (x === cx && y === cy) {
                    td.addClass('map-player').text('@');
                } else if (RiftMap.visited[key]) {
                    var tile = RiftMap.grid[key];
                    td.addClass('map-tile-' + tile).text(tile);
                } else if (Math.abs(x - cx) <= 1 && Math.abs(y - cy) <= 1) {
                    // Adjacent tiles seen but not visited
                    var tile = RiftMap.grid[key];
                    td.addClass('map-tile-' + tile + ' map-dim').text(tile);
                } else {
                    td.addClass('map-fog').text(RiftMap.TILE.FOG);
                }

                // Tap to move handlers (adjacent only)
                if (Math.abs(x - cx) + Math.abs(y - cy) === 1) {
                    (function (dx, dy) {
                        td.on('click', function () { RiftMap.move(dx, dy); });
                        td.addClass('map-moveable');
                    })(x - cx, y - cy);
                }

                tr.append(td);
            }
            table.append(tr);
        }
        $vp.append(table);
    },

    move: function (dx, dy) {
        if (!RiftMap.active || Engine.GAME_OVER) return;

        // Check survival supplies
        var moveCost = 1;

        // Cognitive Filter perk reduces SAN cost if moving into anomaly/ruin
        var sanCost = 0;

        var nx = RiftMap.pos[0] + dx;
        var ny = RiftMap.pos[1] + dy;
        var nxtTile = RiftMap.getTile(nx, ny);

        if (!nxtTile) return;

        // Attempt to consume concentrate
        if (!Survival.consumeSupplies(moveCost)) {
            // Starving/Suffocating — take direct damage and massive SAN hit
            $SM.add('character.hp', -2);
            sanCost += 5;
            Notifications.notify('浓缩液耗尽。维度压力正在撕裂身体。');
            if ($SM.get('character.hp') <= 0) {
                RiftMap.die('耗尽补给，迷失在裂隙中。');
                return;
            }
        }

        if (nxtTile === RiftMap.TILE.ANOMALY) {
            sanCost += 2;
        } else if (nxtTile === RiftMap.TILE.RUIN) {
            sanCost += 1;
        }

        if (sanCost > 0 && $SM.hasPerk('cognitive_filter')) {
            sanCost = Math.max(0, sanCost - sanCost * 0.30);
        }

        if (sanCost > 0) {
            $SM.add('character.san', -sanCost);
        }


        // Perform move
        RiftMap.pos[0] = nx;
        RiftMap.pos[1] = ny;
        RiftMap.visited[nx + ',' + ny] = true;

        // Generate further out
        RiftMap.generateSurroundings(nx, ny);

        // Update UI
        RiftMap.drawMap();
        Survival.updateView();

        // Resolve tile events
        RiftMap.resolveTileEvent(nx, ny, nxtTile);
    },

    resolveTileEvent: function (x, y, tile) {
        switch (tile) {
            case RiftMap.TILE.VOID:
                // 20% chance to trigger a narrative exploration event
                if (Math.random() < 0.20 && typeof Narrative !== 'undefined' && Narrative.dict && Narrative.dict.events) {
                    var evPool = Narrative.dict.events.filter(function (ev) {
                        // Simple condition parsing: 'ember > N', 'erosion > N', 'whispers > N'
                        if (!ev.condition) return true;
                        var parts = ev.condition.split(' ');
                        if (parts.length === 3) {
                            var val = $SM.get('stores.' + parts[0]) || $SM.get('character.' + parts[0]) || 0;
                            return val > parseInt(parts[2], 10);
                        }
                        return true;
                    });
                    if (evPool.length > 0) {
                        var ev = evPool[Math.floor(Math.random() * evPool.length)];
                        RiftMap.showExploreEvent(ev);
                        break;
                    }
                }
                // Ambient flavour text
                if (Math.random() < 0.15 && typeof Narrative !== 'undefined' && Narrative.dict && Narrative.dict.mapNodes) {
                    var wl = Narrative.dict.mapNodes.wasteland;
                    Notifications.notify(wl[Math.floor(Math.random() * wl.length)]);
                }
                break;

            case RiftMap.TILE.CACHE:
                var emberAmt = 15 + Math.floor(Math.random() * 20);
                // Also drops some anomaly samples
                var anomalyAmt = 5 + Math.floor(Math.random() * 10);
                Survival.addLoot('ember', emberAmt);
                $SM.add('stores.anomalies', anomalyAmt);
                Notifications.notify('发现资源节点：+' + emberAmt + ' 余烬，+' + anomalyAmt + ' 异常样本。');
                // 5% chance for a bonus common fragment
                if (Math.random() < 0.05 && typeof Narrative !== 'undefined' && Narrative.dict.fragments) {
                    var bonusFrag = RiftMap.pickRandomFragment(['frag_recorder', 'frag_biotech']);
                    if (bonusFrag) {
                        $SM.addFragment(bonusFrag.id);
                        Notifications.notify('节点深处藏有一块加密残片——【' + bonusFrag.name + '】(重 ' + bonusFrag.weight + 'kg)');
                    }
                }
                RiftMap.setTile(x, y, RiftMap.TILE.VOID); // Deplete
                break;

            case RiftMap.TILE.ANOMALY:
                // 50% combat, 50% anomaly narrative + erosion
                if (Math.random() > 0.5) {
                    Combat.startRandomEncounter();
                } else {
                    if (typeof Narrative !== 'undefined' && Narrative.dict && Narrative.dict.mapNodes) {
                        var hdb = Narrative.dict.mapNodes.high_dimension_barrier;
                        Notifications.notify(hdb[Math.floor(Math.random() * hdb.length)]);
                    } else {
                        Notifications.notify('异常点能量失控。');
                    }
                    $SM.add('character.erosion', 2);
                }
                RiftMap.setTile(x, y, RiftMap.TILE.VOID); // Deplete
                break;

            case RiftMap.TILE.RUIN:
                // 25% chance to find a fragment
                if (Math.random() < 0.25 && typeof Narrative !== 'undefined' && Narrative.dict.fragments) {
                    var frag = RiftMap.pickRandomFragment(['frag_biotech', 'frag_scroll']);
                    if (frag) {
                        $SM.addFragment(frag.id);
                        Notifications.notify('在废墟深处发现了加密残片——【' + frag.name + '】\n来源：' + frag.origin + '（重 ' + frag.weight + 'kg，将在概念解译器中合成）');
                    }
                } else {
                    // Anomaly sample drop
                    var sampleAmt = 3 + Math.floor(Math.random() * 8);
                    $SM.add('stores.anomalies', sampleAmt);
                    if (typeof Narrative !== 'undefined' && Narrative.dict && Narrative.dict.mapNodes) {
                        var rc = Narrative.dict.mapNodes.ruins_city;
                        Notifications.notify(rc[Math.floor(Math.random() * rc.length)] + '（+' + sampleAmt + ' 异常样本）');
                    } else {
                        Notifications.notify('这里只有破碎的晶体。+' + sampleAmt + ' 异常样本。');
                    }
                }
                RiftMap.setTile(x, y, RiftMap.TILE.VOID);
                break;

            case RiftMap.TILE.SIGNAL:
                // Pure text event node — no combat, choices may yield anomalies/whispers/fragments
                RiftMap.setTile(x, y, RiftMap.TILE.VOID);
                if (typeof Narrative !== 'undefined' && Narrative.dict && Narrative.dict.events) {
                    var evPool = Narrative.dict.events.filter(function (ev) {
                        if (!ev.condition) return true;
                        var parts = ev.condition.split(' ');
                        if (parts.length === 3) {
                            var val = $SM.get('stores.' + parts[0]) || $SM.get('character.' + parts[0]) || 0;
                            return val > parseInt(parts[2], 10);
                        }
                        return true;
                    });
                    if (evPool.length > 0) {
                        var sigEv = evPool[Math.floor(Math.random() * evPool.length)];
                        RiftMap.showExploreEvent(sigEv);
                        break;
                    }
                }
                Notifications.notify('信号源已衰竭。只剩下一段无意义的噪音。');
                break;

            case RiftMap.TILE.DUNGEON:
                // Launch dungeon crawl (multi-wave + boss)
                RiftMap.setTile(x, y, RiftMap.TILE.VOID);
                if (typeof Combat !== 'undefined' && Combat.Dungeon) {
                    Combat.Dungeon.start();
                } else {
                    Notifications.notify('遗迹副本入口坍塌。只找到了一些残骸。');
                    $SM.add('stores.anomalies', 20);
                }
                break;

            case RiftMap.TILE.PORTAL:
            case RiftMap.TILE.CAMP:
                if (x === 0 && y === 0) {
                    Notifications.notify('回到了结构节点。');
                    Survival.depositLoot();
                    $SM.set('character.hp', $SM.get('character.maxHp')); // Heal fully at camp
                } else {
                    Notifications.notify('发现回城光门。已将坐标锁定回营地。');
                    RiftMap.pos = [0, 0];
                    Survival.depositLoot();
                    $SM.set('character.hp', $SM.get('character.maxHp')); // Heal
                    RiftMap.drawMap();
                }
                break;
        }
        RiftMap.drawMap(); // redraw in case tile depleted
    },

    /**
     * Pick a random fragment from Narrative.dict.fragments filtered by allowed IDs.
     * If allowedIds is empty or undefined, picks from all fragments.
     */
    pickRandomFragment: function (allowedIds) {
        if (!Narrative.dict || !Narrative.dict.fragments) return null;
        var pool = [];
        var frags = Narrative.dict.fragments;
        for (var key in frags) {
            if (!allowedIds || allowedIds.length === 0 || allowedIds.indexOf(frags[key].id) !== -1) {
                pool.push(frags[key]);
            }
        }
        if (pool.length === 0) return null;
        return pool[Math.floor(Math.random() * pool.length)];
    },

    // Legacy helper still used by combat — picks named relic info for display
    pickRandomRelic: function (type) {
        var relics = Narrative.dict.relics;
        var pool = [];
        for (var key in relics) {
            if (!type || relics[key].type === type) pool.push(relics[key]);
        }
        if (pool.length === 0) { for (var key in relics) pool.push(relics[key]); }
        return pool[Math.floor(Math.random() * pool.length)];
    },

    /**
     * Show an in-map exploration event overlay with choice buttons.
     */
    showExploreEvent: function (evData) {
        // Disable map movement while event is active
        RiftMap.active = false;

        var $overlay = $('<div>').attr('id', 'map-event-overlay').addClass('map-event-overlay');
        $('<div>').addClass('map-event-title').text(evData.title).appendTo($overlay);
        $('<div>').addClass('map-event-text').text(evData.text).appendTo($overlay);

        var $choices = $('<div>').addClass('map-event-choices').appendTo($overlay);

        evData.choices.forEach(function (choice) {
            (function (c) {
                var $btn = new Button.Button({
                    text: c.label,
                    click: function () {
                        // Parse and apply outcome: look for resource patterns [+N x] or SAN patterns
                        RiftMap._applyEventOutcome(c.outcome);
                        // Show outcome text then close
                        $overlay.find('.map-event-choices').remove();
                        $('<div>').addClass('map-event-outcome').text(c.outcome).appendTo($overlay);
                        setTimeout(function () {
                            $overlay.remove();
                            RiftMap.active = true;
                            RiftMap.drawMap();
                        }, 3000);
                    }
                });
                $choices.append($btn);
            })(choice);
        });

        $('#map-panel').append($overlay);
    },

    /**
     * Parse simple bracketed effects in outcome strings.
     * Patterns: [获得 N 余烬], [SAN +N], [SAN -N], [侵蚀度 +N], [获得 N 低语值], [获得 N 灰质]
     */
    _applyEventOutcome: function (outcomeText) {
        // SAN changes
        var sanMatch = outcomeText.match(/SAN ([+-]\d+)/);
        if (sanMatch) { $SM.add('character.san', parseInt(sanMatch[1], 10)); }

        // Erosion changes
        var eroMatch = outcomeText.match(/侵蚀度 ([+-]\d+)/);
        if (eroMatch) { $SM.add('character.erosion', parseInt(eroMatch[1], 10)); }

        // Ember gain
        var emberGain = outcomeText.match(/获得 (\d+) 余烬/);
        if (emberGain) { Survival.addLoot('ember', parseInt(emberGain[1], 10)); }

        // Gray matter gain
        var grayGain = outcomeText.match(/获得 (\d+) 灰质/);
        if (grayGain) { Survival.addLoot('grayMatter', parseInt(grayGain[1], 10)); }

        // Whispers gain
        var whispersGain = outcomeText.match(/获得 (\d+) 低语值/);
        if (whispersGain) { $SM.add('stores.whispers', parseInt(whispersGain[1], 10)); }

        // Ember cost
        var emberCost = outcomeText.match(/消耗 (\d+) 余烬/);
        if (emberCost) { $SM.add('stores.ember', -parseInt(emberCost[1], 10)); }
    },

    die: function (reason) {
        Notifications.notify('警告：生命体征消失。' + reason);

        // Lose all carried inventory items
        Survival.clearLoot();

        // Respawn at home
        RiftMap.pos = [0, 0];
        $SM.set('character.hp', 1); // Barely alive

        Engine.travelTo(Nexus);
        Notifications.notify('理智核心在营地重聚。所有收集的资源已遗失。');
    },

    keyDown: function (e) {
        if (!RiftMap.active) return;

        switch (e.which) {
            case 38: // Up
            case 87: // W
                RiftMap.move(0, -1);
                break;
            case 40: // Down
            case 83: // S
                RiftMap.move(0, 1);
                break;
            case 37: // Left
            case 65: // A
                RiftMap.move(-1, 0);
                break;
            case 39: // Right
            case 68: // D
                RiftMap.move(1, 0);
                break;
        }
    },

    handlePhaseChange: function (e) {
        if (e.to === Engine.PHASES.MAP) {
            RiftMap.show();
        }
    },

    onArrival: function () {
        RiftMap.active = true;
        RiftMap.drawMap();
        Survival.show();
    }
};
