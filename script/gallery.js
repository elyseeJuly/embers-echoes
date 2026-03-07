/**
 * 余烬回响 — Observer Gallery
 * =====================================
 * Records discovered endings and deaths across dimensions.
 */
var Gallery = {

    name: '观察者长廊',
    tabId: 'tab-gallery',

    init: function () {
        var $panel = $('<div>').attr('id', 'gallery-panel').addClass('ee-panel');
        $('<div>').addClass('ee-panel-title').text('记录长廊').appendTo($panel);

        var $desc = $('<div>').addClass('merchant-item').css('margin-bottom', '20px').appendTo($panel);
        $('<div>').text('刻录在系统底层的终结档案。').appendTo($desc);

        $('<div>').attr('id', 'gallery-list').addClass('ee-build-list').appendTo($panel);

        $('#ee-middle').append($panel);
        $panel.hide();

        Gallery.loadGallery();
    },

    show: function () {
        $('#gallery-panel').show();
        if ($('#tab-gallery').length === 0) {
            Header.addLocation('长廊', 'gallery', Gallery);
        }
        Gallery.updateView();
    },

    hide: function () {
        $('#gallery-panel').hide();
    },

    loadGallery: function () {
        if (typeof Storage !== 'undefined' && localStorage) {
            var raw = localStorage.getItem('embers_meta_gallery');
            if (raw) {
                try {
                    Gallery.records = JSON.parse(raw);
                } catch (e) {
                    Gallery.records = [];
                }
            } else {
                Gallery.records = [];
            }
        }
    },

    saveGallery: function () {
        if (typeof Storage !== 'undefined' && localStorage) {
            localStorage.setItem('embers_meta_gallery', JSON.stringify(Gallery.records));
        }
    },

    recordEnding: function (id, name, desc) {
        Gallery.loadGallery();
        var exists = false;
        for (var i = 0; i < Gallery.records.length; i++) {
            if (Gallery.records[i].id === id) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            Gallery.records.push({ id: id, name: name, desc: desc, date: Date.now() });
            Gallery.saveGallery();
        }
    },

    updateView: function () {
        var $list = $('#gallery-list');
        $list.empty();

        if (!Gallery.records || Gallery.records.length === 0) {
            $('<div>').text('没有可用的记录。').css({
                'color': 'var(--ash-dim)', 'padding': '20px', 'text-align': 'center'
            }).appendTo($list);
            return;
        }

        for (var i = 0; i < Gallery.records.length; i++) {
            var rec = Gallery.records[i];
            var dateStr = new Date(rec.date).toLocaleString('zh-CN');

            var $item = $('<div>').addClass('merchant-item');
            var $info = $('<div>');
            $('<div>').addClass('merchant-item-name').css('color', 'var(--glow-purple)').text('[' + rec.id + '] ' + rec.name).appendTo($info);
            $('<div>').addClass('merchant-item-desc').text(rec.desc).appendTo($info);
            $('<div>').addClass('merchant-item-cost').text('记录时间: ' + dateStr).appendTo($info);

            $item.append($info);
            $list.append($item);
        }
    },

    onArrival: function () {
        Gallery.updateView();
    }
};
