/**
 * 余烬回响 — PWA Updater
 * =======================
 * Service Worker 注册与更新提示系统
 * 基于 vite-plugin-pwa 的 prompt 模式实现
 */
(function () {
  'use strict';

  var PWAUpdater = window.PWAUpdater = {

    _registration: null,
    _needRefresh: false,
    _offlineReady: false,
    _updateTimer: null,

    init: function () {
      if ('serviceWorker' in navigator) {
        this._registerSW();
      }
    },

    _registerSW: function () {
      navigator.serviceWorker.register('./sw.js')
        .then(function (reg) {
          PWAUpdater._registration = reg;
          console.log('[PWA] Service Worker registered:', reg);

          reg.addEventListener('updatefound', function () {
            var newWorker = reg.installing;
            console.log('[PWA] New SW found, installing...');

            newWorker.addEventListener('statechange', function () {
              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  PWAUpdater._needRefresh = true;
                  PWAUpdater._showUpdatePrompt();
                } else {
                  PWAUpdater._offlineReady = true;
                  console.log('[PWA] App ready for offline use');
                }
              }
            });
          });

          reg.addEventListener('controllerchange', function () {
            console.log('[PWA] SW controller changed');
          });
        })
        .catch(function (err) {
          console.error('[PWA] SW registration failed:', err);
        });
    },

    _showUpdatePrompt: function () {
      if (document.getElementById('pwa-update-prompt')) return;

      var $prompt = $('<div>')
        .attr('id', 'pwa-update-prompt')
        .addClass('pwa-update-prompt')
        .appendTo('body');

      $('<div>').addClass('pwa-update-message').text('发现新版本').appendTo($prompt);
      $('<div>').addClass('pwa-update-desc').text('应用已更新，请刷新以使用最新版本').appendTo($prompt);

      var $buttons = $('<div>').addClass('pwa-update-buttons').appendTo($prompt);

      $('<button>')
        .addClass('pwa-update-btn pwa-update-btn-primary')
        .text('立即更新')
        .on('click', function () {
          PWAUpdater._updateNow();
        })
        .appendTo($buttons);

      $('<button>')
        .addClass('pwa-update-btn pwa-update-btn-secondary')
        .text('稍后提醒')
        .on('click', function () {
          $prompt.remove();
        })
        .appendTo($buttons);
    },

    _updateNow: function () {
      if (PWAUpdater._registration && PWAUpdater._registration.waiting) {
        PWAUpdater._registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    },

    checkForUpdates: function () {
      if (PWAUpdater._registration) {
        PWAUpdater._registration.update();
      }
    },

    getState: function () {
      return {
        needRefresh: PWAUpdater._needRefresh,
        offlineReady: PWAUpdater._offlineReady,
        hasSW: !!PWAUpdater._registration
      };
    }
  };

  navigator.serviceWorker.addEventListener('controllerchange', function () {
    window.location.reload();
  });

})();
