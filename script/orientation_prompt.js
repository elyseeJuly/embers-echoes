/**
 * 余烬回响 — Orientation Prompt
 * ===============================
 * 横屏提示组件
 * 在竖屏手机上提示用户旋转设备以获得最佳体验
 */
(function () {
  'use strict';

  var OrientationPrompt = window.OrientationPrompt = {

    _visible: false,
    _dismissed: false,

    init: function () {
      if (typeof Responsive === 'undefined') return;

      this._checkAndShow();
      Responsive.subscribe(function () {
        OrientationPrompt._checkAndShow();
      });
    },

    _checkAndShow: function () {
      if (this._dismissed) return;

      if (Responsive.isPortraitMobile()) {
        this._show();
      } else {
        this._hide();
      }
    },

    _show: function () {
      if (this._visible) return;
      this._visible = true;

      var $prompt = $('<div>')
        .attr('id', 'orientation-prompt')
        .addClass('orientation-prompt')
        .appendTo('body');

      var $content = $('<div>')
        .addClass('orientation-prompt-content')
        .appendTo($prompt);

      $('<div>')
        .addClass('orientation-prompt-icon')
        .html('&#128241;')
        .appendTo($content);

      $('<h2>')
        .addClass('orientation-prompt-title')
        .text('请将设备横屏使用')
        .appendTo($content);

      $('<p>')
        .addClass('orientation-prompt-desc')
        .text('为获得最佳游戏体验，请旋转手机至横屏模式')
        .appendTo($content);

      $('<button>')
        .addClass('orientation-prompt-btn')
        .text('我知道了')
        .on('click', function () {
          OrientationPrompt._dismiss();
        })
        .appendTo($content);
    },

    _hide: function () {
      if (!this._visible) return;
      this._visible = false;
      $('#orientation-prompt').remove();
    },

    _dismiss: function () {
      this._dismissed = true;
      this._hide();
    },

    isVisible: function () {
      return this._visible;
    }
  };

})();
