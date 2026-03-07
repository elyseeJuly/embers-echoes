/**
 * 余烬回响 — Echoes (Meta-Progression)
 * =====================================
 * Handles cross-run progression via "Echoes" currency earned upon death or victory.
 */
var Echoes = {

    name: '残响',
    tabId: 'tab-echoes',

    init: function () {
        var $panel = $('<div>').attr('id', 'echoes-panel').addClass('ee-panel');
        $('<div>').addClass('ee-panel-title').text('轮回残响').appendTo($panel);

        var $desc = $('<div>').addClass('merchant-item').css('margin-bottom', '20px').appendTo($panel);
        $('<div>').text('在虚无中回荡的记忆碎片。可用于重塑下一次轮回。').appendTo($desc);
        $('<div>').attr('id', 'echoes-count').css({
            'font-family': 'var(--font-terminal)',
            'font-size': '1.5rem',
            'color': 'var(--glow-cyan)',
            'margin-top': '10px'
        }).text('游离残响: 0').appendTo($desc);

        $('<div>').attr('id', 'echoes-list').addClass('ee-build-list').appendTo($panel);

        $('#ee-middle').append($panel);
        $panel.hide();

        // Meta-currency is loaded manually
        Echoes.loadMeta();
    },

    show: function () {
        $('#echoes-panel').show();
        if ($('#tab-echoes').length === 0) {
            Header.addLocation('残响', 'echoes', Echoes);
        }
        Echoes.updateView();
    },

    hide: function () {
        $('#echoes-panel').hide();
    },

    loadMeta: function () {
        if (typeof Storage !== 'undefined' && localStorage) {
            var savedMeta = localStorage.getItem('embers_meta_state');
            if (savedMeta) {
                try {
                    var state = JSON.parse(savedMeta);
                    $SM.set('game.echoes', state.echoes || 0);
                    if (state.perks) {
                        for (var p in state.perks) {
                            $SM.addPerk(p); // Apply meta perks immediately on boot
                        }
                    }
                } catch (e) { }
            }
        }
    },

    saveMeta: function () {
        if (typeof Storage !== 'undefined' && localStorage) {
            var state = {
                echoes: $SM.get('game.echoes') || 0,
                perks: {} // Save permanent meta perks
            };
            // Find any bought meta-perks 
            // (For now, we simplify: all normal perks bought via Merchant are NOT meta,
            //  unless we strictly track which ones were meta-bought.
            //  We'll implement specific Meta Perks later if necessary)
            localStorage.setItem('embers_meta_state', JSON.stringify(state));
        }
    },

    addEchoes: function (amount) {
        $SM.add('game.echoes', amount);
        Echoes.saveMeta();
        Echoes.updateView();
    },

    updateView: function () {
        var echoes = $SM.get('game.echoes') || 0;
        $('#echoes-count').text('游离残响: ' + echoes);
    },

    onArrival: function () {
        Echoes.updateView();
    }
};
