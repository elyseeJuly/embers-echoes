/**
 * 余烬回响 — Terminal Module
 * ===========================
 * Handles the Null (全黑) and Spark (生火) phases.
 * The first thing the player sees and interacts with.
 */
var Terminal = {

    name: '终端',
    tabId: 'tab-terminal',

    // Typewriter text queue
    _typeQueue: [],
    _typing: false,

    // Narrative lines per phase
    _NARRATIVES: {
        restart: [
            '……',
            '黑暗中，什么都没有。',
            '只有微弱的电流声。',
            '一个按钮在闪烁。'
        ],
        spark: [
            '终端重启成功。',
            '神经接口已连接。',
            '外部传感器检测到<span class="highlight">余烬</span>信号。',
            '手动提取协议已加载。'
        ],
        campUnlock: [
            '余烬浓度超过临界值。',
            '结构节点自动组装协议启动。',
            '检测到生命信号。<span class="highlight">迷失者</span>正在接近。',
            '基础设施模块已解锁。'
        ]
    },

    init: function () {
        var phase = Engine.getPhase();

        // Create terminal panel
        var $panel = $('<div>').attr('id', 'terminal-panel').addClass('ee-panel');
        $('<div>').attr('id', 'terminal-narrative').appendTo($panel);
        $('<div>').attr('id', 'spark-controls').appendTo($panel);
        $('#ee-left').prepend($panel);

        // Subscribe to phase changes
        $.Dispatch('phaseChange').subscribe(Terminal.handlePhaseChange);

        // Set up based on current phase
        if (phase === Engine.PHASES.NULL) {
            Terminal.showNullPhase();
        } else if (phase === Engine.PHASES.SPARK) {
            Terminal.showSparkPhase(true); // true = skip animation
        } else {
            Terminal.showPostSparkPhase();
        }
    },

    // ── Null Phase ──────────────────────────────────────────

    showNullPhase: function () {
        var $controls = $('#spark-controls');
        $controls.empty();

        var $btn = new Button.Button({
            id: 'btn-restart',
            text: '【重启神经终端】',
            click: function () {
                Terminal.onRestart();
            }
        });
        $btn.addClass('ee-btn--primary pulse');
        $controls.append($btn);
    },

    onRestart: function () {
        // Transition to Spark phase
        Engine.setPhase(Engine.PHASES.SPARK);
    },

    // ── Spark Phase ─────────────────────────────────────────

    showSparkPhase: function (skipAnim) {
        var $narrative = $('#terminal-narrative');
        var $controls = $('#spark-controls');
        $controls.empty();

        if (!skipAnim) {
            // Play restart narrative first
            $narrative.empty();
            var restartSeq = Terminal._NARRATIVES.restart.slice(); // copy

            // Check if player has Echoes (Cycle 2+)
            if (typeof Echoes !== 'undefined' && Echoes.getEchoes() > 0) {
                if (typeof Narrative !== 'undefined' && Narrative.dict && Narrative.dict.deathEchoes && Narrative.dict.deathEchoes.rebirth_intro) {
                    var intros = Narrative.dict.deathEchoes.rebirth_intro;
                    var rb = intros[Math.floor(Math.random() * intros.length)];
                    restartSeq.unshift('<span style="color:var(--ash-light); font-style:italic;">' + rb + '</span>');
                }
            }

            Terminal.typeNarrative(restartSeq, function () {
                // After restart text, show spark narrative
                setTimeout(function () {
                    Terminal.typeNarrative(Terminal._NARRATIVES.spark, function () {
                        Terminal.showExtractButton();
                    });
                }, 800);
            });
        } else {
            // Already in spark phase, just show the button
            Terminal.showExtractButton();
        }
    },

    showExtractButton: function () {
        var $controls = $('#spark-controls');
        $controls.empty();

        var $btn = new Button.Button({
            id: 'btn-extract',
            text: '【提取余烬】',
            cooldown: 1.5,
            click: function () {
                Terminal.extractEmber();
            }
        });
        $btn.addClass('ee-btn--primary');
        $controls.append($btn);

        // Show ember counter
        var $counter = $('<div>').attr('id', 'ember-counter');
        $('<span>').text('余烬: ').appendTo($counter);
        $('<span>').addClass('count').text($SM.get('stores.ember') || 0).appendTo($counter);
        $controls.append($counter);

        // Make counter visible after short delay
        setTimeout(function () {
            $counter.addClass('visible');
        }, 300);
    },

    extractEmber: function () {
        var amount = 1 + Math.floor(Math.random() * 3); // 1-3
        $SM.add('stores.ember', amount);

        var currentEmber = $SM.get('stores.ember') || 0;

        // Update counter
        $('#ember-counter .count').text(Math.floor(currentEmber));

        // Flash effect
        var $flash = $('<div>').addClass('extract-flash active');
        $('#btn-extract').append($flash);
        setTimeout(function () { $flash.remove(); }, 500);

        // Notify
        Notifications.notify('+' + amount + ' 余烬');

        // Check for camp unlock (engine handles this via state update)
    },

    // ── Post-Spark (Camp unlocked) ──────────────────────────

    showPostSparkPhase: function () {
        // Terminal becomes a summary/narrative panel
        var $narrative = $('#terminal-narrative');
        $narrative.empty();

        var $p = $('<p>').text('终端运行中。余烬熔炉持续燃烧。');
        $narrative.append($p);

        // Keep the extract button available but less prominent
        Terminal.showExtractButton();
    },

    // ── Phase Change Handler ────────────────────────────────

    handlePhaseChange: function (e) {
        if (e.to === Engine.PHASES.SPARK) {
            Terminal.showSparkPhase(false);
        } else if (e.to === Engine.PHASES.CAMP) {
            // Play camp unlock narrative
            var $narrative = $('#terminal-narrative');
            Terminal.typeNarrative(Terminal._NARRATIVES.campUnlock, function () {
                Terminal.showPostSparkPhase();
            });
        }
    },

    // ── Typewriter Effect ───────────────────────────────────

    typeNarrative: function (lines, callback) {
        var $narrative = $('#terminal-narrative');
        var index = 0;

        function showNext() {
            if (index >= lines.length) {
                if (callback) callback();
                return;
            }

            var $p = $('<p>').html(lines[index]);
            $p.css('animation-delay', '0s');
            $narrative.append($p);
            index++;

            setTimeout(showNext, 600);
        }

        showNext();
    },

    onArrival: function () {
        // Nothing special needed
    }
};
