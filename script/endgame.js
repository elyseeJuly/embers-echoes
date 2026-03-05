/**
 * 余烬回响 — Endgame Module
 * ===========================
 * The final philosophical narrative sequence when the Matrix reaches 100%.
 */
var Endgame = {

    init: function () {
        // Create endgame overlay container
        var $overlay = $('<div>').attr('id', 'endgame-overlay').appendTo('body');
        $overlay.hide();

        $.Dispatch('phaseChange').subscribe(Endgame.handlePhaseChange);
    },

    handlePhaseChange: function (e) {
        if (e.to === Engine.PHASES.END) {
            Endgame.startSequence();
        }
    },

    startSequence: function () {
        // Fade out background to pure black
        $('body').css('background', '#000');
        $('#ee-wrapper').fadeOut(3000, function () {
            var $overlay = $('#endgame-overlay').show();
            $overlay.empty();

            // Narrative Sequence Array
            var sequence = [
                "矩阵运算完毕。",
                "坐标 (0, 0, 0) 已锁定。时间与空间的奇点。",
                "主神的意志正在迅速坍缩。",
                "你走入了这片纯白的虚无。",
                "终端闪烁着最后一个问题："
            ];

            Endgame.playSequence($overlay, sequence, 0, function () {
                Endgame.showFinalChoice($overlay);
            });
        });
    },

    playSequence: function ($container, lines, index, callback) {
        if (index >= lines.length) {
            if (callback) callback();
            return;
        }

        var $line = $('<div>').addClass('endgame-text fade-in').text(lines[index]);
        $container.append($line);

        setTimeout(function () {
            Endgame.playSequence($container, lines, index + 1, callback);
        }, 3000); // 3 seconds per narrative line
    },

    showFinalChoice: function ($container) {
        if (typeof Narrative !== 'undefined' && Narrative.dict && Narrative.dict.finalInquiry) {
            Endgame.runInquiry($container, Narrative.dict.finalInquiry);
        } else {
            // Fallback if dict missing
            var $question = $('<div>').addClass('endgame-question fade-in').text("『是否重启循环？保留觉知，还是归于数据海洋？』");
            $container.append($question);

            var $choices = $('<div>').addClass('endgame-choices fade-in').css('animation-delay', '2s');

            var $btnLoop = new Button.Button({
                text: '【携忆重启】（开启下一轮回响）',
                click: function () { Endgame.executeClimax('loop'); }
            });
            $btnLoop.addClass('ee-btn--primary');

            var $btnSink = new Button.Button({
                text: '【融入海洋】（真正的终结）',
                click: function () { Endgame.executeClimax('sink'); }
            });

            $choices.append($btnLoop).append($btnSink);
            $container.append($choices);
        }
    },

    runInquiry: function ($container, inquiryData) {
        var $intro = $('<div>').addClass('endgame-text fade-in').css('color', 'var(--ember-orange)').text(inquiryData.intro);
        $container.append($intro);

        setTimeout(function () {
            Endgame.askQuestion($container, inquiryData.questions, 0);
        }, 3000);
    },

    askQuestion: function ($container, questions, index) {
        if (index >= questions.length) {
            // Passed all questions
            $('.endgame-question, .endgame-choices, .endgame-text').remove();
            var $final = $('<div>').addClass('endgame-title fade-in').css('color', 'var(--glow-cyan)').text("TRUE END");
            $container.append($final);
            setTimeout(function () {
                if (typeof Gallery !== 'undefined') {
                    Gallery.recordEnding('END_TRUE', '碳基火种', '打破了高维计算域，保留了最脆弱但也最不可解析的变量。');
                }
                if (typeof Echoes !== 'undefined') {
                    Echoes.addEchoes(500);
                }
                Engine.deleteSave();
                location.reload();
            }, 5000);
            return;
        }

        var q = questions[index];
        var $question = $('<div>').addClass('endgame-question fade-in').text(q.text);
        $container.append($question);

        var $choices = $('<div>').addClass('endgame-choices fade-in');

        // 1. Only show relic buttons the player ACTUALLY holds
        var hasAnyValidRelic = false;
        for (var i = 0; i < q.validRelics.length; i++) {
            var relicId = q.validRelics[i];
            if (!$SM.hasRelic(relicId)) continue; // player doesn't own it — skip

            hasAnyValidRelic = true;
            var relicInfo = null;
            for (var key in Narrative.dict.relics) {
                if (Narrative.dict.relics[key].id === relicId) relicInfo = Narrative.dict.relics[key];
            }
            if (relicInfo) {
                (function (rInfo) {
                    var $btnRight = new Button.Button({
                        text: '【提交遗物: ' + rInfo.name + '】',
                        click: function () {
                            $SM.consumeRelic(rInfo.id); // consume the relic on use
                            $('.endgame-choices').remove();
                            $container.append($('<div>').addClass('endgame-text fade-in').css('color', 'var(--glow-cyan)').text(q.successText));
                            setTimeout(function () {
                                $('.endgame-question, .endgame-text').fadeOut(500, function () { $(this).remove(); });
                                Endgame.askQuestion($container, questions, index + 1);
                            }, 4000);
                        }
                    });
                    $btnRight.addClass('ee-btn--primary');
                    $choices.append($btnRight);
                })(relicInfo);
            }
        }

        // 2. Fallback: loop or trapped
        var $btnLoop = new Button.Button({
            text: hasAnyValidRelic ? '放弃（进入【携忆重启】）' : '无法回答（进入【携忆重启】）',
            click: function () { Endgame.executeClimax('loop'); }
        });
        var $btnTrapped = new Button.Button({
            text: hasAnyValidRelic ? '沉默以对（永久困锁）' : '沉默以对，接受现实（永久困锁）',
            click: function () { Endgame.executeClimax('trapped'); }
        });

        $choices.append($btnLoop).append($btnTrapped);
        $container.append($choices);
    },

    executeClimax: function (choice) {
        $('.endgame-choices').remove();
        var $container = $('#endgame-overlay');

        if (choice === 'loop') {
            if (typeof Gallery !== 'undefined') {
                Gallery.recordEnding('END_LOOP', '携忆重启', '在无尽的虚无中刻下了此刻的残响，开启了新的轮回。');
            }
            var $line = $('<div>').addClass('endgame-text fade-in').text("你在虚无中刻下了此刻的残响。");
            $container.append($line);
            setTimeout(function () {
                $container.append($('<div>').addClass('endgame-text fade-in').css('color', 'var(--glow-cyan)').text("系统重启中..."));
                setTimeout(function () {
                    Engine.deleteSave();
                    if (typeof Echoes !== 'undefined') Echoes.addEchoes(100);
                    location.reload();
                }, 4000);
            }, 3000);

        } else if (choice === 'trapped') {
            // Trapped ending — do NOT clear save, player is locked in the god's domain forever
            if (typeof Gallery !== 'undefined') {
                Gallery.recordEnding('END_TRAPPED', '永久困锁', '无法提交正确的答案。意识被永久封存，继续在主神空间的轮转中提取余烬。');
            }
            var trappedLines = [
                "沉默。",
                "主神的防火墙没有下达抹杀指令。",
                "它只是...将你送回了原点。",
                "终端重新亮起。",
                "下一个提取周期，即将开始。"
            ];
            Endgame.playSequence($container, trappedLines, 0, function () {
                $container.empty();
                var $trapped = $('<div>').addClass('endgame-trapped');
                $('<div>').addClass('endgame-trapped-label').text(
                    '[ 系统记录 — 有机体 #' + Math.floor(Math.random() * 99999).toString().padStart(5, '0') + ' ]'
                ).appendTo($trapped);
                $('<div>').addClass('endgame-trapped-text').html(
                    '当前任务：<span style="color:var(--ember-orange)">余烬提取 · 无限期</span><br>' +
                    '逃脱进度：<span style="color:var(--blood-red)">0.00%</span><br>' +
                    '下次质询时间：<span style="color:var(--ash-gray)">未知</span>'
                ).appendTo($trapped);
                $('<div>').addClass('endgame-trapped-hint').text(
                    '（提示：下一次轮回中，或许可以寻找不同的遗物...）'
                ).appendTo($trapped);
                var $returnBtn = new Button.Button({
                    text: '【接受现实，继续提取】',
                    click: function () {
                        $('#endgame-overlay').hide();
                        $('#ee-wrapper').fadeIn(1500);
                        Engine.GAME_OVER = false;
                    }
                });
                $trapped.append($returnBtn);
                $container.append($trapped);
            });

        } else {
            // 'sink' — permanent true end
            if (typeof Gallery !== 'undefined') {
                Gallery.recordEnding('END_SINK', '融入海洋', '你放开了握紧的双手，让数据风暴将自己温暖地粉碎、解构。');
            }
            var $line = $('<div>').addClass('endgame-text fade-in').text("你放开了握紧的双手。数据风暴将你温柔地粉碎。");
            $container.append($line);
            setTimeout(function () {
                $container.append($('<div>').addClass('endgame-title fade-in').text("THE END"));
                Engine.deleteSave();
            }, 4000);
        }
    }

};
