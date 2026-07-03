/**
 * 余烬回响 — Responsive System
 * =============================
 * 响应式断点检测与布局管理
 * 参考 Beyond-the-Light-Cone 的 useBreakpoint Hook 实现
 */
(function () {
  'use strict';

  var Responsive = window.Responsive = {

    _listeners: [],
    _currentInfo: null,
    _ticking: false,

    BREAKPOINTS: {
      MOBILE: 'mobile',
      TABLET: 'tablet',
      DESKTOP: 'desktop',
      WIDE: 'wide'
    },

    init: function () {
      if (this._currentInfo) return;

      this._currentInfo = this._getBreakpointInfo();
      this._bindEvents();
      this._applyBodyClasses();
    },

    _getBreakpointInfo: function () {
      var width = window.innerWidth;
      var height = window.innerHeight;
      var isLandscape = width > height;
      var isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      var isMobileDevice = (width < 768) || (isTouchDevice && isLandscape && height <= 500);

      var breakpoint;
      if (isMobileDevice) {
        breakpoint = this.BREAKPOINTS.MOBILE;
      } else if (width < 1024) {
        breakpoint = this.BREAKPOINTS.TABLET;
      } else if (width < 1536) {
        breakpoint = this.BREAKPOINTS.DESKTOP;
      } else {
        breakpoint = this.BREAKPOINTS.WIDE;
      }

      return {
        breakpoint: breakpoint,
        isMobile: breakpoint === this.BREAKPOINTS.MOBILE,
        isTablet: breakpoint === this.BREAKPOINTS.TABLET,
        isDesktop: breakpoint === this.BREAKPOINTS.DESKTOP || breakpoint === this.BREAKPOINTS.WIDE,
        width: width,
        height: height,
        isLandscape: isLandscape,
        isTouchDevice: isTouchDevice,
        isPortraitMobile: breakpoint === this.BREAKPOINTS.MOBILE && !isLandscape,
        isMobileLandscape: breakpoint === this.BREAKPOINTS.MOBILE && isLandscape
      };
    },

    _bindEvents: function () {
      var self = this;

      var handleResize = function () {
        if (!self._ticking) {
          window.requestAnimationFrame(function () {
            self._update();
            self._ticking = false;
          });
          self._ticking = true;
        }
      };

      var handleOrientation = function () {
        self._update();
      };

      window.addEventListener('resize', handleResize);

      if (screen.orientation && screen.orientation.addEventListener) {
        screen.orientation.addEventListener('change', handleOrientation);
      }
    },

    _update: function () {
      var oldInfo = this._currentInfo;
      var newInfo = this._getBreakpointInfo();

      this._currentInfo = newInfo;
      this._applyBodyClasses();

      if (oldInfo && oldInfo.breakpoint !== newInfo.breakpoint) {
        this._notifyListeners(newInfo);
      }
    },

    _applyBodyClasses: function () {
      var info = this._currentInfo;
      var $body = $('body');

      $body.removeClass('bp-mobile bp-tablet bp-desktop bp-wide');
      $body.addClass('bp-' + info.breakpoint);

      $body.toggleClass('is-landscape', info.isLandscape);
      $body.toggleClass('is-portrait', !info.isLandscape);
      $body.toggleClass('is-touch', info.isTouchDevice);
      $body.toggleClass('is-mobile-landscape', info.isMobileLandscape);
    },

    _notifyListeners: function (info) {
      for (var i = 0; i < this._listeners.length; i++) {
        try {
          this._listeners[i](info);
        } catch (e) {
          console.error('[Responsive] Listener error:', e);
        }
      }
    },

    subscribe: function (callback) {
      if (typeof callback === 'function') {
        this._listeners.push(callback);
      }
    },

    unsubscribe: function (callback) {
      var idx = this._listeners.indexOf(callback);
      if (idx !== -1) {
        this._listeners.splice(idx, 1);
      }
    },

    getInfo: function () {
      return this._currentInfo;
    },

    isMobile: function () {
      return this._currentInfo ? this._currentInfo.isMobile : false;
    },

    isTablet: function () {
      return this._currentInfo ? this._currentInfo.isTablet : false;
    },

    isDesktop: function () {
      return this._currentInfo ? this._currentInfo.isDesktop : false;
    },

    isPortraitMobile: function () {
      return this._currentInfo ? this._currentInfo.isPortraitMobile : false;
    }
  };

})();
