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
        ],
        extract: [
            '余烬被收集。终端温度微升。',
            '能量脉冲稳定。低维算力积累中。',
            '热残留捕获完成。防御矩阵持续运转。',
            '余烬在指尖凝聚，驱散了一寸黑暗。',
            '信号增强。主神的探针暂时偏转。',
            '// 余烬收集协议执行完毕。',
            '微弱的光。总比没有要好。',
            '每一粒余烬都是对热寂的一次抵抗。',
            '系统温度：临界值以上。终端继续运行。',
            '收集完成。黑暗尚未吞噬这里。'
        ]
    },

    init: function () {
        var phase = Engine.getPhase();

        // Create terminal panel
        var $panel = $('<div>').attr('id', 'terminal-panel').addClass('ee-panel');
        $('<div>').attr('id', 'terminal-narrative').appendTo($panel);
        $('<div>').attr('id', 'spark-controls').appendTo($panel);
        $('#ee-right').prepend($panel);

        // Subscribe to phase and state changes
        $.Dispatch('phaseChange').subscribe(Terminal.handlePhaseChange);
        $.Dispatch('stateUpdate').subscribe(Terminal.handleStateUpdates);

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
        var $controls = $('#spark-controls');

        // Lock the layout so it doesn't collapse when the class changes
        $('body').addClass('phase-transitioning');

        // Fade out the content smoothly before switching phases
        $controls.fadeOut(500, function () {
            // Important: Change the phase while it's hidden
            Engine.setPhase(Engine.PHASES.SPARK);

            // Remove the layout lock and reset display on controls (as it will be re-used)
            $('body').removeClass('phase-transitioning');
            $controls.css('display', '');
        });
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
            if (typeof Echoes !== 'undefined' && ($SM.get('game.echoes') || 0) > 0) {
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
                }, 400);
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

        // Show ember counter (guard against duplicate)
        var $counter = $('#ember-counter');
        if ($counter.length === 0) {
            $counter = $('<div>').attr('id', 'ember-counter');
            $('<span>').text('余烬: ').appendTo($counter);
            $('<span>').addClass('count').text($SM.get('stores.ember') || 0).appendTo($counter);
            $controls.append($counter);

            // Make counter visible after short delay
            setTimeout(function () {
                $counter.addClass('visible');
            }, 300);
        } else {
            // Re-attach to controls if needed
            $controls.append($counter);
        }
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

        // Show a random extract narrative line in the terminal
        var lines = Terminal._NARRATIVES.extract;
        var line = lines[Math.floor(Math.random() * lines.length)];
        var $narrative = $('#terminal-narrative');
        // rAF + forced reflow ensures fadeInUp animation fires reliably
        requestAnimationFrame(function () {
            var $p = $('<p>').html(line);
            $p.css({ 'animation': 'none', 'opacity': '0' });
            $narrative.append($p);
            void $p[0].offsetWidth;
            $p.css({ 'animation': '', 'opacity': '' });
            // Keep narrative area clean — max 4 lines visible
            var $all = $narrative.find('p');
            if ($all.length > 4) {
                $all.first().fadeOut(300, function () { $(this).remove(); });
            }
        });

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

    // ── State Change Handler ────────────────────────────────

    handleStateUpdates: function (e) {
        if (e && e.path && e.path.indexOf('stores') === 0) {
            var $counter = $('#ember-counter .count');
            if ($counter.length > 0) {
                var currentEmber = $SM.get('stores.ember') || 0;
                $counter.text(Math.floor(currentEmber));
            }
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

            var lineHtml = lines[index];
            index++;

            // Insert element and force reflow to ensure CSS animation triggers
            var $p = $('<p>').html(lineHtml);
            $p.css({ 'animation': 'none', 'opacity': '0' });
            $narrative.append($p);

            // Allow browser to process the append before animating
            setTimeout(function () {
                $p.css({ 'animation': '', 'opacity': '' });
                setTimeout(showNext, 600);
            }, 50);
        }

        showNext();
    },

    onArrival: function () {
        // Nothing special needed
    }
};
