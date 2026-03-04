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
        CAMP: 'H', // Home base
        VOID: '.', // Empty space
        RUIN: '#', // Destroyed structure
        DEBRIS: ',', // Minor obstacle
        ANOMALY: '*', // Event/combat node
        CACHE: 'C', // Resource node
        PORTAL: '@', // Return portal
        FOG: ' '  // Unknown
    },

    // Map state
    pos: [0, 0],   // [x, y]
    grid: {},      // 'x,y' -> tile string
    visited: {},   // 'x,y' -> boolean
    active: false,

    init: function () {
        var $panel = $('<div>').attr('id', 'map-panel').addClass('ee-panel');
        var $mapContainer = $('<div>').attr('id', 'map-viewport').appendTo($panel);
        $('#ee-left').append($panel);

        // Initial grid point
        RiftMap.setTile(0, 0, RiftMap.TILE.CAMP);
        RiftMap.visited['0,0'] = true;

        // Generate surrounding initial tiles
        RiftMap.generateSurroundings(0, 0);

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
                    // Check distance from origin for scaling difficulty/rewards (simplified)
                    var dist = Math.abs(nx) + Math.abs(ny);

                    if (Math.random() < 0.05 && dist > 10) {
                        // Rare portal spawn far out
                        RiftMap.setTile(nx, ny, RiftMap.TILE.PORTAL);
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
                if (Math.random() < 0.1 && typeof Narrative !== 'undefined' && Narrative.dict && Narrative.dict.mapNodes) {
                    var wl = Narrative.dict.mapNodes.wasteland;
                    Notifications.notify(wl[Math.floor(Math.random() * wl.length)]);
                }
                break;
            case RiftMap.TILE.CACHE:
                var emberAmt = 15 + Math.floor(Math.random() * 20);
                Survival.addLoot('ember', emberAmt);
                Notifications.notify('发现资源节点：+' + emberAmt + ' 余烬。');
                RiftMap.setTile(x, y, RiftMap.TILE.VOID); // Deplete
                break;
            case RiftMap.TILE.ANOMALY:
                // Trigger Combat
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
                if (Math.random() > 0.7) {
                    Survival.addLoot('relics', 1);
                    Notifications.notify('在废墟中发现了一个旧世界遗物。');
                } else {
                    if (typeof Narrative !== 'undefined' && Narrative.dict && Narrative.dict.mapNodes) {
                        var rc = Narrative.dict.mapNodes.ruins_city;
                        Notifications.notify(rc[Math.floor(Math.random() * rc.length)]);
                    } else {
                        Notifications.notify('这里只有破碎的晶体。');
                    }
                }
                RiftMap.setTile(x, y, RiftMap.TILE.VOID);
                break;
            case RiftMap.TILE.PORTAL:
            case RiftMap.TILE.CAMP:
                if (x === 0 && y === 0) {
                    // At home camp
                    Notifications.notify('回到了结构节点。');
                    Survival.depositLoot();
                    $SM.set('character.hp', $SM.get('character.maxHp')); // Heal fully at camp
                } else {
                    // Remote portal
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
