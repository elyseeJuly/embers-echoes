/**
 * 余烬回响 — Events System
 * ==========================
 * Random event FSM with two-choice dilemmas.
 */
var Events = {

    _EVENT_TIME_RANGE: [120, 360], // 2-6 minutes in seconds
    _eventTimer: null,
    _activeEvent: null,

    // Event pool
    _EVENTS: [
        {
            title: '低语者的馈赠',
            text: '一阵奇异的频率冲击了终端。一个声音说：献祭余烬，获得真知。',
            minPhase: Engine.PHASES.ABYSS,
            condition: function () {
                return ($SM.get('stores.ember') || 0) >= 50;
            },
            choices: [
                {
                    text: '献祭 50 余烬',
                    effect: function () {
                        $SM.add('stores.ember', -50);
                        $SM.add('stores.whispers', 3);
                        $SM.add('character.san', -5);
                        Notifications.notify('低语值涌入意识。理智轻微动摇。');
                    }
                },
                {
                    text: '拒绝',
                    effect: function () {
                        $SM.add('character.san', 2);
                        Notifications.notify('声音消散了。理智稍有恢复。');
                    }
                }
            ]
        },
        {
            title: '迷失者的恳求',
            text: '一个重伤的迷失者出现在结构边缘，请求庇护。',
            minPhase: Engine.PHASES.CAMP,
            condition: function () {
                return Population.getCurrentPopulation() < Population.getMaxPopulation();
            },
            choices: [
                {
                    text: '收留（消耗 20 灰质治疗）',
                    effect: function () {
                        if (($SM.get('stores.grayMatter') || 0) >= 20) {
                            $SM.add('stores.grayMatter', -20);
                            var wanderers = $SM.get('workers.wanderer') || 0;
                            $SM.set('workers.wanderer', wanderers + 2);
                            Notifications.notify('两个迷失者加入了据点。');
                        } else {
                            Notifications.notify('灰质不足，无法治疗。迷失者蹒跚离去。');
                        }
                    }
                },
                {
                    text: '驱逐',
                    effect: function () {
                        $SM.add('character.erosion', 2);
                        Notifications.notify('冷酷的选择。侵蚀度轻微上升。');
                    }
                }
            ]
        },
        {
            title: '数据风暴',
            text: '一场突如其来的信息洪流席卷了终端。数据在崩溃与重组之间振荡。',
            minPhase: Engine.PHASES.CAMP,
            condition: function () { return true; },
            choices: [
                {
                    text: '尝试解码（冒险）',
                    effect: function () {
                        if (Math.random() < 0.5) {
                            var emberGain = 30 + Math.floor(Math.random() * 30);
                            $SM.add('stores.ember', emberGain);
                            Notifications.notify('成功提取了 ' + emberGain + ' 余烬！');
                        } else {
                            $SM.add('character.san', -8);
                            $SM.add('character.erosion', 3);
                            Notifications.notify('解码失败。神经接口过载。理智和侵蚀度恶化。');
                        }
                    }
                },
                {
                    text: '关闭屏蔽（安全）',
                    effect: function () {
                        $SM.add('stores.ember', 5);
                        Notifications.notify('风暴过去了。残余余烬被收集。');
                    }
                }
            ]
        },
        {
            title: '主神的凝视',
            text: '一道来自更高维度的压力骤然降临。主神压制值开始上升。',
            minPhase: Engine.PHASES.ABYSS,
            condition: function () { return true; },
            choices: [
                {
                    text: '正面对抗（消耗 30 灰质）',
                    effect: function () {
                        if (($SM.get('stores.grayMatter') || 0) >= 30) {
                            $SM.add('stores.grayMatter', -30);
                            $SM.add('character.godPressure', -5);
                            Notifications.notify('压力被暂时压退。');
                        } else {
                            $SM.add('character.godPressure', 5);
                            Notifications.notify('资源不足。压制值继续攀升。');
                        }
                    }
                },
                {
                    text: '屈从（降低理智）',
                    effect: function () {
                        $SM.add('character.san', -10);
                        $SM.add('character.godPressure', 2);
                        Notifications.notify('意识在主神面前弯曲。理智大幅下降。');
                    }
                }
            ]
        },
        {
            title: '旧世界的回声',
            text: '终端屏幕闪烁，显示出一段旧世界的记忆碎片。温暖的，模糊的。',
            minPhase: Engine.PHASES.CAMP,
            condition: function () { return true; },
            choices: [
                {
                    text: '沉浸其中',
                    effect: function () {
                        $SM.add('character.san', 5);
                        $SM.add('character.erosion', 1);
                        Notifications.notify('理智恢复了一些。但侵蚀的边界也在扩大。');
                    }
                },
                {
                    text: '切断连接',
                    effect: function () {
                        $SM.add('stores.ember', 10);
                        Notifications.notify('记忆碎片转化为余烬。冷酷但高效。');
                    }
                }
            ]
        }
    ],

    init: function () {
        Events.scheduleNextEvent();

        $.Dispatch('phaseChange').subscribe(function () {
            // Reschedule events when phase changes
        });
    },

    scheduleNextEvent: function () {
        var delay = (Events._EVENT_TIME_RANGE[0] +
            Math.random() * (Events._EVENT_TIME_RANGE[1] - Events._EVENT_TIME_RANGE[0])) * 1000;

        Events._eventTimer = setTimeout(function () {
            Events.triggerRandomEvent();
            Events.scheduleNextEvent();
        }, delay);
    },

    triggerRandomEvent: function () {
        var phase = Engine.getPhase();
        if (phase < Engine.PHASES.CAMP) return;
        if (Events._activeEvent) return;

        // Load events from Narrative dict
        if (typeof Narrative === 'undefined' || !Narrative.dict || !Narrative.dict.events) return;
        var pool = Narrative.dict.events;

        // Filter eligible events based on string conditions
        var eligible = pool.filter(function (evt) {
            var conditionMet = true;
            if (evt.condition.indexOf('ember') !== -1) {
                var val = parseInt(evt.condition.split('>')[1]);
                if (($SM.get('stores.ember') || 0) <= val) conditionMet = false;
            }
            if (evt.condition.indexOf('erosion') !== -1) {
                var val = parseInt(evt.condition.split('>')[1]);
                if (($SM.get('game.erosion') || 0) <= val) conditionMet = false;
            }
            if (evt.condition.indexOf('whispers') !== -1) {
                var val = parseInt(evt.condition.split('>')[1]);
                if (($SM.get('stores.whispers') || 0) <= val) conditionMet = false;
            }
            return conditionMet;
        });

        if (eligible.length === 0) return;

        var selected = eligible[Math.floor(Math.random() * eligible.length)];

        // Map Narrative Event to UI Event format
        var uiEvent = {
            title: selected.title,
            text: selected.text,
            choices: selected.choices.map(function (c) {
                return {
                    text: c.label,
                    effect: function () {
                        Notifications.notify(c.outcome);
                        // Very simple condition parsing for rewards (demo purposes)
                        if (c.outcome.indexOf('SAN -') !== -1) $SM.add('character.san', -10);
                        if (c.outcome.indexOf('SAN +') !== -1) $SM.add('character.san', 10);
                        if (c.outcome.indexOf('侵蚀度 +') !== -1) $SM.add('character.erosion', 10);
                        if (c.outcome.indexOf('侵蚀度 -') !== -1) $SM.add('character.erosion', -10);
                    }
                };
            })
        };

        Events.showEvent(uiEvent);
    },

    showEvent: function (event) {
        Events._activeEvent = event;

        // Create event overlay
        var $overlay = $('<div>').attr('id', 'event-overlay')
            .css({
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(10, 10, 15, 0.9)',
                zIndex: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0
            });

        var $panel = $('<div>').css({
            background: 'var(--surface-2)',
            border: '1px solid var(--ember-orange)',
            borderRadius: '4px',
            padding: '24px',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 0 30px rgba(255, 106, 0, 0.1)'
        });

        $('<div>').css({
            fontFamily: 'var(--font-terminal)',
            fontSize: '0.9rem',
            color: 'var(--ember-orange)',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            marginBottom: '16px'
        }).text(event.title).appendTo($panel);

        $('<div>').css({
            fontFamily: 'var(--font-terminal)',
            fontSize: '0.8rem',
            color: 'var(--ash-light)',
            lineHeight: '1.8',
            marginBottom: '20px'
        }).text(event.text).appendTo($panel);

        var $choices = $('<div>').css({
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        });

        for (var i = 0; i < event.choices.length; i++) {
            (function (choice) {
                var $btn = new Button.Button({
                    text: choice.text,
                    click: function () {
                        choice.effect();
                        Events.closeEvent();
                    }
                });
                $choices.append($btn);
            })(event.choices[i]);
        }

        $panel.append($choices);
        $overlay.append($panel);
        $('body').append($overlay);

        // Fade in
        setTimeout(function () {
            $overlay.css({ opacity: 1, transition: 'opacity 0.3s' });
        }, 10);
    },

    closeEvent: function () {
        Events._activeEvent = null;
        $('#event-overlay').css({ opacity: 0 });
        setTimeout(function () {
            $('#event-overlay').remove();
        }, 300);
    }
};
