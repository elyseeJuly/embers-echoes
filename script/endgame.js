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
        // BRANCH: determine which ending the player is on
        var ending = Endgame.evaluateEndings();

        if (ending === 'bad') {
            Endgame.executeBadEnd($container);
        } else if (ending === 'normal') {
            Endgame.executeNormalEnd($container);
        } else {
            // 'true' — player has all required relics including relic_carbon
            if (typeof Narrative !== 'undefined' && Narrative.dict && Narrative.dict.finalInquiry) {
                Endgame.runInquiry($container, Narrative.dict.finalInquiry);
            } else {
                Endgame.executeClimax('loop');
            }
        }
    },

    /**
     * Evaluate which ending the player qualifies for.
     * Returns 'bad', 'normal', or 'true'.
     */
    evaluateEndings: function () {
        if (!Narrative.dict || !Narrative.dict.finalInquiry) return 'bad';
        var questions = Narrative.dict.finalInquiry.questions || [];
        var hasAnyValidRelic = false;
        var hasCarbon = $SM.hasRelic('relic_carbon');

        for (var i = 0; i < questions.length; i++) {
            var q = questions[i];
            for (var j = 0; j < q.validRelics.length; j++) {
                if ($SM.hasRelic(q.validRelics[j])) { hasAnyValidRelic = true; break; }
            }
        }

        if (hasCarbon && hasAnyValidRelic) return 'true';
        if (hasAnyValidRelic) return 'normal';
        return 'bad';
    },

    /**
     * BAD END: player has no valid relics.
     * UI wipes — only the lone ember button remains.
     */
    executeBadEnd: function ($container) {
        var badLines = [
            "主神扫视了你贫瘠的内存。",
            "'无效变量。逻辑无法闭环。'",
            "你的记忆被瞬间清空。",
            "大地图破碎成像素。所有数据化为虚无。",
            "只剩下一个按钮。"
        ];
        Endgame.playSequence($container, badLines, 0, function () {
            if (typeof Gallery !== 'undefined') {
                Gallery.recordEnding('END_BAD', '永恒的抽水机', '没有收集到足够的遗物。再次成为主神空间的干电池。');
            }
            // Wipe the entire UI back to scratch
            setTimeout(function () {
                document.body.innerHTML = '<div id="bad-end-terminal" style="' +
                    'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
                    'height:100vh;background:#000;font-family:monospace;gap:40px;">' +
                    '<div style="color:#333;font-size:0.85rem;letter-spacing:3px;">[ 系统记录 — 格式化完成 ]</div>' +
                    '<button id="bad-end-btn" style="' +
                    'background:none;border:1px solid #444;color:#555;padding:15px 40px;' +
                    'font-family:monospace;font-size:1rem;cursor:pointer;letter-spacing:2px;' +
                    'transition:all 0.5s;"' +
                    ' onmouseover="this.style.color=\'#fff\';this.style.borderColor=\'#fff\'"' +
                    ' onmouseout="this.style.color=\'#555\';this.style.borderColor=\'#444\'"' +
                    ' onclick="location.reload()">提取余烬</button>' +
                    '</div>';
                // Preserve echoes but wipe run save
                if (typeof Echoes !== 'undefined') Echoes.addEchoes(50);
                Engine.deleteSave();
            }, 3000);
        });
    },

    /**
     * NORMAL END: player has some relics but missing relic_carbon.
     * Preserved as a specimen at (0,0). No escape, no death.
     */
    executeNormalEnd: function ($container) {
        var normalLines = [
            "主神的防火墙出现了一丝裂缝，",
            "但它立刻用一种你无法理解的代码将裂缝修补。",
            "'你收集了很好的标本，轮回者。'",
            "'你证明了万物的衰亡。'",
            "你没有被抹杀。",
            "你被永久地保存在了 (0,0) 的虚空中，",
            "与那些陨落的文明一起，成为了观察样本。"
        ];
        Endgame.playSequence($container, normalLines, 0, function () {
            if (typeof Gallery !== 'undefined') {
                Gallery.recordEnding('END_NORMAL', '高维博物馆的藏品', '收集了部分遗物但缺少碳基锚点。被永久保存为观察样本。');
            }
            $container.empty();
            var $specimen = $('<div>').addClass('endgame-specimen');
            $('<div>').addClass('endgame-specimen-coord').text('[ 坐标 (0, 0) — 已锁定 ]').appendTo($specimen);
            $('<div>').addClass('endgame-specimen-label').text('标本编号 #' + Math.floor(Math.random() * 9999).toString().padStart(4, '0')).appendTo($specimen);
            $('<div>').addClass('endgame-specimen-text').html(
                '状态：<span style="color:var(--glow-cyan)">永久保存</span><br>' +
                '与陨落文明并列展示于主神观察舱。<br>' +
                '缺失变量：<span style="color:var(--ember-orange)">碳基心跳频段</span>'
            ).appendTo($specimen);
            $('<div>').addClass('endgame-trapped-hint').text('（或许下一次轮回中，你能找到那段最残破的杂音。）').appendTo($specimen);
            $container.append($specimen);
            // Save echoes, delete run save, reload after 10s
            if (typeof Echoes !== 'undefined') Echoes.addEchoes(150);
            setTimeout(function () { Engine.deleteSave(); location.reload(); }, 12000);
        });
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
