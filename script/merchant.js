/**
 * 余烬回响 — Glitch Merchant
 * ============================
 * Random wandering trader that appears periodically.
 * Sells permanent passive buffs for large resource costs.
 */
var Merchant = {

    // Config
    _CHECK_INTERVAL: 600 * 1000,  // 10 minutes
    _SPAWN_CHANCE: 0.30,          // 30%
    _STAY_DURATION: 60 * 1000,    // 60 seconds
    _timer: null,
    _stayTimer: null,
    _countdownTimer: null,
    _active: false,

    // Buff pool
    _BUFFS: {
        'spatial_fold': {
            name: '空间折叠',
            desc: '负重上限 +20',
            cost: { 'ember': 500 },
            perk: 'spatial_fold'
        },
        'cognitive_filter': {
            name: '认知滤网',
            desc: '移动消耗SAN -30%',
            cost: { 'grayMatter': 200 },
            perk: 'cognitive_filter'
        },
        'ember_reflux': {
            name: '余烬回流',
            desc: '余烬产出 +15%',
            cost: { 'ember': 300, 'grayMatter': 100 },
            perk: 'ember_reflux'
        },
        'entropy_resist': {
            name: '熵抗',
            desc: '侵蚀度增长 -25%',
            cost: { 'grayMatter': 150, 'whispers': 5 },
            perk: 'entropy_resist'
        },
        'void_walker': {
            name: '虚空行者',
            desc: '地图视野 +2',
            cost: { 'ember': 400, 'whispers': 8 },
            perk: 'void_walker'
        },
        'data_blade_mastery': {
            name: '数据刃精通',
            desc: '近战伤害 +50%',
            cost: { 'ember': 250, 'grayMatter': 80 },
            perk: 'data_blade_mastery'
        }
    },

    init: function () {
        // Create merchant overlay (hidden)
        var $overlay = $('<div>').attr('id', 'merchant-overlay');
        var $panel = $('<div>').addClass('merchant-panel');
        $('<div>').addClass('merchant-title').text('游荡走私者').appendTo($panel);
        $('<div>').addClass('merchant-timer').appendTo($panel);
        $('<div>').attr('id', 'merchant-items').appendTo($panel);

        var $closeBtn = new Button.Button({
            id: 'merchant-close',
            text: '离开',
            click: function () { Merchant.dismiss(); }
        });
        $panel.append($closeBtn);
        $overlay.append($panel);
        $('body').append($overlay);

        // Start the spawn timer if phase is high enough
        if (Engine.getPhase() >= Engine.PHASES.CAMP) {
            Merchant.startTimer();
        }

        $.Dispatch('phaseChange').subscribe(function (e) {
            if (e.to >= Engine.PHASES.CAMP) {
                Merchant.startTimer();
            }
        });
    },

    startTimer: function () {
        if (Merchant._timer) return;
        Merchant._timer = setInterval(function () {
            Merchant.trySpawn();
        }, Merchant._CHECK_INTERVAL);
    },

    trySpawn: function () {
        if (Merchant._active) return;
        if (Math.random() > Merchant._SPAWN_CHANCE) return;
        Merchant.spawn();
    },

    spawn: function () {
        Merchant._active = true;

        Notifications.notify('走私者的信号出现在边缘频段...');

        // Pick 3-4 random buffs that player doesn't have yet
        var available = [];
        for (var key in Merchant._BUFFS) {
            if (!$SM.hasPerk(Merchant._BUFFS[key].perk)) {
                available.push(key);
            }
        }

        // Shuffle and pick up to 4
        available.sort(function () { return Math.random() - 0.5; });
        var offerings = available.slice(0, Math.min(4, available.length));

        if (offerings.length === 0) {
            Merchant._active = false;
            return;
        }

        // Render items
        var $items = $('#merchant-items');
        $items.empty();

        for (var i = 0; i < offerings.length; i++) {
            var buffKey = offerings[i];
            var buff = Merchant._BUFFS[buffKey];

            var $item = $('<div>').addClass('merchant-item');
            var $info = $('<div>');
            $('<div>').addClass('merchant-item-name').text(buff.name).appendTo($info);
            $('<div>').addClass('merchant-item-desc').text(buff.desc).appendTo($info);

            var costText = Object.keys(buff.cost).map(function (r) {
                return Nexus.getResourceName(r) + ': ' + buff.cost[r];
            }).join(', ');
            $('<div>').addClass('merchant-item-cost').text(costText).appendTo($info);

            $item.append($info);

            // Buy button
            (function (bk, bf) {
                var $btn = new Button.Button({
                    id: 'merchant-buy-' + bk,
                    text: '交易',
                    click: function () {
                        Merchant.buy(bk, bf);
                    }
                });
                $btn.addClass('merchant-buy-btn');
                $item.append($btn);
            })(buffKey, buff);

            $items.append($item);
        }

        // Show overlay
        $('#merchant-overlay').addClass('active');

        // Start countdown
        var remaining = Merchant._STAY_DURATION / 1000;
        Merchant.updateTimer(remaining);
        Merchant._countdownTimer = setInterval(function () {
            remaining--;
            Merchant.updateTimer(remaining);
            if (remaining <= 0) {
                Merchant.dismiss();
            }
        }, 1000);

        // Auto-dismiss after stay duration
        Merchant._stayTimer = setTimeout(function () {
            Merchant.dismiss();
        }, Merchant._STAY_DURATION);
    },

    updateTimer: function (seconds) {
        $('.merchant-timer').html('驻留时间: <span class="time">' + seconds + '秒</span>');
    },

    buy: function (buffKey, buff) {
        // Check cost
        for (var resource in buff.cost) {
            var available = $SM.get('stores.' + resource) || 0;
            if (available < buff.cost[resource]) {
                Notifications.notify('资源不足。');
                return;
            }
        }

        // Deduct cost
        for (var resource in buff.cost) {
            $SM.add('stores.' + resource, -buff.cost[resource]);
        }

        // Grant perk
        $SM.addPerk(buff.perk);
        Notifications.notify('获得永久增益: ' + buff.name);

        // Disable the buy button
        Button.setDisabled($('#merchant-buy-' + buffKey), true);
    },

    dismiss: function () {
        Merchant._active = false;
        clearTimeout(Merchant._stayTimer);
        clearInterval(Merchant._countdownTimer);
        $('#merchant-overlay').removeClass('active');

        Notifications.notify('走私者的信号消失了。');
    }
};
