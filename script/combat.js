/**
 * 余烬回响 — Combat System
 * ==========================
 * ATB-style active combat encountering anomaly manifestations.
 */
var Combat = {

    active: false,
    enemyHp: 0,
    enemyMaxHp: 0,
    enemyName: '',
    enemyAtb: 0,
    playerAtb: 0,
    tickTimer: null,
    ATB_MAX: 100,

    ENEMIES: [
        { name: '游荡的代码碎屑', hp: 15, dmg: 2, speed: 10 },
        { name: '腐化的逻辑实体', hp: 30, dmg: 5, speed: 15 },
        { name: '维度裂口看门人', hp: 50, dmg: 8, speed: 8 },
    ],

    WEAPONS: {
        'EMP Blast': { name: '电磁脉冲 (EMP)', dmg: 3, speed: 25 },
        'Data Blade': { name: '数据刃', dmg: 8, speed: 15, perkScale: 'data_blade_mastery' },
        'Logic Bomb': { name: '逻辑炸弹', dmg: 20, speed: 5, cost: { 'concentrate': 1 } }
    },

    init: function () {
        var $panel = $('<div>').attr('id', 'combat-panel').addClass('ee-panel');
        var $display = $('<div>').attr('id', 'combat-display').appendTo($panel);

        // Player side
        var $player = $('<div>').addClass('combat-fighter player-side').appendTo($display);
        $('<div>').addClass('fighter-name').text('神经漫游者').appendTo($player);
        $('<div>').attr('id', 'combat-hp').addClass('fighter-hp').appendTo($player);
        $('<div>').attr('id', 'combat-atb').addClass('atb-bar').append($('<div>').addClass('atb-fill')).appendTo($player);

        // Enemy side
        var $enemy = $('<div>').addClass('combat-fighter enemy-side').appendTo($display);
        $('<div>').attr('id', 'enemy-name').addClass('fighter-name').appendTo($enemy);
        $('<div>').attr('id', 'enemy-hp').addClass('fighter-hp').appendTo($enemy);
        $('<div>').attr('id', 'enemy-atb').addClass('atb-bar').append($('<div>').addClass('atb-fill')).appendTo($enemy);

        // Controls
        var $controls = $('<div>').attr('id', 'combat-controls').appendTo($panel);
        for (var w in Combat.WEAPONS) {
            var weapon = Combat.WEAPONS[w];
            (function (wpn) {
                var btn = new Button.Button({
                    text: wpn.name,
                    click: function () { Combat.playerAttack(wpn); }
                });
                btn.addClass('atk-btn-' + wpn.name.replace(/\s+/g, ''));
                $controls.append(btn);
            })(weapon);
        }

        $('#ee-left').append($panel);
        $panel.hide();
    },

    startRandomEncounter: function () {
        var baseEnemy = Combat.ENEMIES[Math.floor(Math.random() * Combat.ENEMIES.length)];

        // God-Pressure scaling
        var godPressure = $SM.get('character.godPressure') || 0;
        var multiplier = 1.0 + (godPressure / 100.0);

        Combat.enemyName = baseEnemy.name;
        Combat.enemyMaxHp = Math.floor(baseEnemy.hp * multiplier);
        Combat.enemyHp = Combat.enemyMaxHp;
        Combat.enemyDmg = Math.max(1, Math.floor(baseEnemy.dmg * multiplier));
        Combat.enemySpeed = baseEnemy.speed;

        Combat.playerAtb = 0;
        Combat.enemyAtb = 0;

        $('#map-panel').hide();
        $('#combat-panel').show();

        Notifications.notify('遭遇敌对实体：' + Combat.enemyName);

        Combat.active = true;
        Combat.updateView();

        Combat.tickTimer = setInterval(Combat.tick, 100); // 100ms combat ticks
    },

    tick: function () {
        if (!Combat.active) return;

        // Advance ATBs
        Combat.enemyAtb += Combat.enemySpeed;
        // Player speed is fixed logically here, could link to a stat later
        Combat.playerAtb += 15;

        if (Combat.enemyAtb >= Combat.ATB_MAX) {
            Combat.enemyAttack();
        }

        if (Combat.playerAtb >= Combat.ATB_MAX) {
            Combat.playerAtb = Combat.ATB_MAX;
            // Enable buttons
            $('#combat-controls .ee-btn').removeClass('disabled');
        } else {
            // Disable buttons while charging
            $('#combat-controls .ee-btn').addClass('disabled');
        }

        Combat.updateView();
    },

    playerAttack: function (weapon) {
        if (Combat.playerAtb < Combat.ATB_MAX) return;

        // Check cost
        if (weapon.cost) {
            for (var c in weapon.cost) {
                if (($SM.get('stores.' + c) || 0) < weapon.cost[c]) {
                    Notifications.notify('发动 ' + weapon.name + ' 需要 ' + c);
                    return;
                }
            }
            for (var c in weapon.cost) {
                $SM.add('stores.' + c, -weapon.cost[c]);
            }
        }

        var dmg = weapon.dmg;
        if (weapon.perkScale && $SM.hasPerk(weapon.perkScale)) {
            dmg *= 1.5;
        }

        // CSS Feedback
        $('.enemy-side').addClass('combat-shake');
        setTimeout(function () { $('.enemy-side').removeClass('combat-shake'); }, 200);

        Combat.enemyHp -= dmg;
        Notifications.notify('你造成了 ' + dmg + ' 伤害。');

        Combat.playerAtb = 0;
        Combat.checkVictory();
        Combat.updateView();
    },

    enemyAttack: function () {
        Combat.enemyAtb = 0;
        var dmg = Combat.enemyDmg;

        $SM.add('character.hp', -dmg);

        // CSS Feedback
        $('.player-side').addClass('combat-shake');
        $('body').addClass('glitch-blood');
        setTimeout(function () {
            $('.player-side').removeClass('combat-shake');
            if (Sanity.getZone() !== 'madness') {
                $('body').removeClass('glitch-blood');
            }
        }, 300);

        Notifications.notify(Combat.enemyName + ' 造成了 ' + dmg + ' 伤害。');

        if ($SM.get('character.hp') <= 0) {
            Combat.endEncounter(false);
            if (typeof Narrative !== 'undefined' && Narrative.dict && Narrative.dict.deathEchoes) {
                Engine.triggerDeathSequence(Narrative.dict.deathEchoes.death_by_combat, 'DEATH_COMBAT', '物理湮灭', '被敌对实体完全抹杀。');
            } else {
                Engine.GAME_OVER = true;
                if (typeof Gallery !== 'undefined') {
                    Gallery.recordEnding('DEATH_COMBAT', '物理湮灭', '被敌对实体完全抹杀。');
                }
                Notifications.notify('警告：生命体征消失。被实体抹杀。');
                setTimeout(function () {
                    Engine.deleteSave();
                    location.reload();
                }, 3000);
            }
        }
    },

    checkVictory: function () {
        if (Combat.enemyHp <= 0) {
            // Rewards
            var emberVal = 50 + Math.floor(Math.random() * 50);
            Survival.addLoot('ember', emberVal);
            Notifications.notify('实体已溃散。发现了 ' + emberVal + ' 余烬。');
            Combat.endEncounter(true);
        }
    },

    endEncounter: function (victory) {
        Combat.active = false;
        clearInterval(Combat.tickTimer);

        $('#combat-panel').hide();

        if (victory) {
            $('#map-panel').show();
            RiftMap.drawMap();
        }
    },

    updateView: function () {
        // HP Bars
        var hp = $SM.get('character.hp') || 0;
        var maxHp = $SM.get('character.maxHp') || 10;
        $('#combat-hp').text(Math.max(0, hp).toFixed(0) + ' / ' + maxHp);
        $('#enemy-name').text(Combat.enemyName);
        $('#enemy-hp').text(Math.max(0, Combat.enemyHp).toFixed(0) + ' / ' + Combat.enemyMaxHp);

        // ATB Bars
        $('#combat-atb .atb-fill').css('width', Math.min(100, (Combat.playerAtb / Combat.ATB_MAX) * 100) + '%');
        $('#enemy-atb .atb-fill').css('width', Math.min(100, (Combat.enemyAtb / Combat.ATB_MAX) * 100) + '%');
    }

};
