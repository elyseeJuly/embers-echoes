/**
 * 余烬回响 — Matrix Sink (奇观模块)
 * =====================================
 * Phase 5 resource sink: "逆运算矩阵" (Inverse Computation Matrix).
 * Starts at 0.0000%, slowly builds up toward 100%.
 */
var MatrixSink = {

    name: '逆运算矩阵',
    tabId: 'tab-matrix_sink',

    // Config
    TOTAL_WORK_REQUIRED: 1000000,
    // We track progress from 0 to TOTAL_WORK_REQUIRED

    init: function () {
        var $panel = $('<div>').attr('id', 'matrix-panel').addClass('ee-panel');
        $('<div>').addClass('ee-panel-title').text('逆运算矩阵').appendTo($panel);

        var $display = $('<div>').attr('id', 'matrix-display').appendTo($panel);
        $('<div>').addClass('matrix-glitch-bg').appendTo($display);

        var $content = $('<div>').addClass('matrix-content').appendTo($display);
        $('<div>').text('反转因果的引擎。用全部的资源喂养它。').addClass('matrix-desc').appendTo($content);

        // Progress Bar
        var $barContainer = $('<div>').addClass('matrix-progress-container').appendTo($content);
        $('<div>').attr('id', 'matrix-progress-fill').addClass('matrix-progress-fill').appendTo($barContainer);
        $('<div>').attr('id', 'matrix-progress-text').addClass('matrix-progress-text').text('0.0000%').appendTo($content);

        // Submission Controls
        var $controls = $('<div>').addClass('matrix-controls').appendTo($content);

        // Submit All Base Resources Button
        var $btnSubmit = new Button.Button({
            text: '注入全部常规资源',
            click: function () { MatrixSink.submitResources(); }
        });
        $btnSubmit.addClass('ee-btn--primary matrix-btn pulse');
        $controls.append($btnSubmit);

        // Submit Relic Button
        var $btnRelic = new Button.Button({
            text: '熔毁旧世遗物 (大幅推进)',
            click: function () { MatrixSink.submitRelic(); }
        });
        $btnRelic.addClass('matrix-btn');
        $controls.append($btnRelic);

        // Stabilize Anchor Button
        var $btnStabilize = new Button.Button({
            id: 'btn-matrix-stabilize',
            text: '【稳定锚点】',
            click: function () { MatrixSink.stabilizeAnchor(); }
        });
        $btnStabilize.addClass('ee-btn--danger pulse').hide();
        $controls.append($btnStabilize);

        $('#ee-middle').append($panel);
        $panel.hide();

        $.Dispatch('phaseChange').subscribe(MatrixSink.handlePhaseChange);

        // Matrix passive drain initialization
        // The engine handles the MatrixSink.tick() call
    },

    show: function () {
        $('#matrix-panel').show();
        if ($('#tab-matrix_sink').length === 0) {
            Header.addLocation('逆运算矩阵', 'matrix_sink', MatrixSink);
        }
    },

    hide: function () {
        $('#matrix-panel').hide();
    },

    /**
     * Called every 1000ms by Engine Phase 5+
     */
    tick: function () {
        MatrixSink.updateView();
    },

    submitResources: function () {
        var phase = $SM.get('game.matrixPhase') || 0;
        var capWork = ((phase + 1) * 25 / 100) * MatrixSink.TOTAL_WORK_REQUIRED;
        var currentWork = $SM.get('game.matrixProgress') || 0;

        if (currentWork >= capWork && phase < 4) {
            Notifications.notify('当前阶段已达满负荷。需建立稳定锚点。');
            return;
        }

        // Calculate work value of all current resources
        var work = 0;

        var ember = $SM.get('stores.ember') || 0;
        work += ember * 1;
        if (ember > 0) $SM.add('stores.ember', -ember, true);

        var gray = $SM.get('stores.grayMatter') || 0;
        work += gray * 5;
        if (gray > 0) $SM.add('stores.grayMatter', -gray, true);

        var conc = $SM.get('stores.concentrate') || 0;
        work += conc * 50;
        if (conc > 0) $SM.add('stores.concentrate', -conc, true);

        var whispers = $SM.get('stores.whispers') || 0;
        work += whispers * 20;
        if (whispers > 0) $SM.add('stores.whispers', -whispers, true);

        if (work === 0) {
            Notifications.notify('没有可注入的资源。');
            return;
        }

        if (currentWork + work > capWork) {
            work = capWork - currentWork;
            Notifications.notify('部分庞大的因果算力因超载而溢散。');
        }

        $SM.set('game.matrixProgress', currentWork + work);

        $SM.fireUpdate('stores'); // trigger store UI update
        Notifications.notify('注入了等效于 ' + Math.floor(work) + ' 计算力的常规资源。');

        MatrixSink.checkCompletion();
        MatrixSink.updateView();
    },

    submitRelic: function () {
        var phase = $SM.get('game.matrixPhase') || 0;
        var capWork = ((phase + 1) * 25 / 100) * MatrixSink.TOTAL_WORK_REQUIRED;
        var currentWork = $SM.get('game.matrixProgress') || 0;

        if (currentWork >= capWork && phase < 4) {
            Notifications.notify('当前阶段已达满负荷。虚空拒绝了你的遗物。');
            return;
        }

        var relics = $SM.get('stores.relics') || 0;
        if (relics <= 0) {
            Notifications.notify('没有旧世遗物。');
            return;
        }

        $SM.add('stores.relics', -1);

        var work = 10000; // Large chunk
        if (currentWork + work > capWork) {
            work = capWork - currentWork;
        }

        $SM.set('game.matrixProgress', currentWork + work);

        Notifications.notify('遗物熔毁... 矩阵爆发出强烈的共振。');

        // CSS Shockwave effect on the whole page
        $('body').addClass('matrix-flash');
        setTimeout(function () { $('body').removeClass('matrix-flash'); }, 1000);

        MatrixSink.checkCompletion();
        MatrixSink.updateView();
    },

    checkCompletion: function () {
        var work = $SM.get('game.matrixProgress') || 0;
        if (work >= MatrixSink.TOTAL_WORK_REQUIRED) {
            Notifications.notify('因果逆转。回响已闭环。', 'milestone');
            Engine.setPhase(Engine.PHASES.END);
        }
    },

    updateView: function () {
        var work = $SM.get('game.matrixProgress') || 0;
        var phase = $SM.get('game.matrixPhase') || 0;
        var capPct = (phase + 1) * 25;
        var capWork = (capPct / 100) * MatrixSink.TOTAL_WORK_REQUIRED;

        var displayWork = Math.min(work, capWork);
        var pct = Math.min(100, (displayWork / MatrixSink.TOTAL_WORK_REQUIRED) * 100);

        $('#matrix-progress-fill').css('width', pct + '%');
        $('#matrix-progress-text').text(pct.toFixed(4) + '%');

        if (work >= capWork && phase < 4) {
            $('.matrix-btn').hide();
            var popCost = (phase + 1) * 10;
            $('#btn-matrix-stabilize').show().find('span').text('【稳定锚点 (消耗 ' + popCost + ' 人口)】');
        } else {
            $('.matrix-btn').show();
            $('#btn-matrix-stabilize').hide();
        }

        // Intensive glitch effect when nearing completion
        if (pct > 90) {
            $('#matrix-display').addClass('critical-glitch');
        }
    },

    stabilizeAnchor: function () {
        var phase = $SM.get('game.matrixPhase') || 0;
        if (phase >= 4) return;

        var popCost = (phase + 1) * 10;
        if (Population.getCurrentPopulation() < popCost) {
            Notifications.notify('人口不足，无法建立逆向锚点。需要至少 ' + popCost + ' 名先驱者。');
            return;
        }

        // Deduct population
        var removed = 0;
        var keys = ['wanderer', 'scavenger', 'lurker', 'sentinel', 'chemist'];
        while (removed < popCost) {
            var k = keys[Math.floor(Math.random() * keys.length)];
            var c = $SM.get('workers.' + k) || 0;
            if (c > 0) {
                $SM.set('workers.' + k, c - 1);
                removed++;
            }
        }

        $SM.set('game.matrixPhase', phase + 1);
        Notifications.notify('锚点稳固。' + popCost + ' 名先驱者成为了时代的基石。', 'milestone');

        MatrixSink.updateView();
        if (typeof Population !== 'undefined') Population.updateView();
    },

    handlePhaseChange: function (e) {
        if (e.to === Engine.PHASES.SINK) {
            MatrixSink.show();
            Notifications.notify('虚空裂隙中，逆运算矩阵的轮廓显现了。');
        }
    },

    onArrival: function () {
        MatrixSink.updateView();
    }
};
