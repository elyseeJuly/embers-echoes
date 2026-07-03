/**
 * 余烬回响 — IndexedDB Storage
 * =============================
 * 存档主存储引擎，提供 IndexedDB 持久化存储
 * 符合 Save-1 规范：使用 IndexedDB 而非 localStorage 存整个存档
 */
(function () {
  'use strict';

  var IndexedDBStorage = window.IndexedDBStorage = {

    DB_NAME: 'EmbersEchoesDB',
    DB_VERSION: 1,
    STORE_NAME: 'saveSlots',

    _db: null,
    _ready: null,

    init: function () {
      if (this._ready) return this._ready;

      this._ready = new Promise(function (resolve, reject) {
        var request = indexedDB.open(IndexedDBStorage.DB_NAME, IndexedDBStorage.DB_VERSION);

        request.onerror = function () {
          console.error('[IndexedDB] Failed to open database');
          reject(request.error);
        };

        request.onsuccess = function (event) {
          IndexedDBStorage._db = event.target.result;
          console.log('[IndexedDB] Database opened successfully');
          resolve();
        };

        request.onupgradeneeded = function (event) {
          var db = event.target.result;
          if (!db.objectStoreNames.contains(IndexedDBStorage.STORE_NAME)) {
            var store = db.createObjectStore(IndexedDBStorage.STORE_NAME, { keyPath: 'slotId' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            console.log('[IndexedDB] Object store created');
          }
        };
      });

      return this._ready;
    },

    setSlot: function (slotId, data) {
      return this.init().then(function () {
        return new Promise(function (resolve, reject) {
          var transaction = IndexedDBStorage._db.transaction([IndexedDBStorage.STORE_NAME], 'readwrite');
          var store = transaction.objectStore(IndexedDBStorage.STORE_NAME);
          var request = store.put({ slotId: slotId, data: data, timestamp: Date.now() });

          request.onsuccess = function () {
            resolve();
          };

          request.onerror = function () {
            reject(request.error);
          };
        });
      });
    },

    getSlot: function (slotId) {
      return this.init().then(function () {
        return new Promise(function (resolve, reject) {
          var transaction = IndexedDBStorage._db.transaction([IndexedDBStorage.STORE_NAME], 'readonly');
          var store = transaction.objectStore(IndexedDBStorage.STORE_NAME);
          var request = store.get(slotId);

          request.onsuccess = function (event) {
            var result = event.target.result;
            resolve(result ? result.data : null);
          };

          request.onerror = function () {
            reject(request.error);
          };
        });
      });
    },

    deleteSlot: function (slotId) {
      return this.init().then(function () {
        return new Promise(function (resolve, reject) {
          var transaction = IndexedDBStorage._db.transaction([IndexedDBStorage.STORE_NAME], 'readwrite');
          var store = transaction.objectStore(IndexedDBStorage.STORE_NAME);
          var request = store.delete(slotId);

          request.onsuccess = function () {
            resolve();
          };

          request.onerror = function () {
            reject(request.error);
          };
        });
      });
    },

    listSlots: function () {
      return this.init().then(function () {
        return new Promise(function (resolve, reject) {
          var transaction = IndexedDBStorage._db.transaction([IndexedDBStorage.STORE_NAME], 'readonly');
          var store = transaction.objectStore(IndexedDBStorage.STORE_NAME);
          var request = store.getAll();

          request.onsuccess = function (event) {
            var slots = event.target.result || [];
            var result = slots.map(function (item) {
              return { slotId: item.slotId, timestamp: item.timestamp };
            });
            resolve(result);
          };

          request.onerror = function () {
            reject(request.error);
          };
        });
      });
    },

    setMeta: function (key, value) {
      return this.init().then(function () {
        return new Promise(function (resolve, reject) {
          var transaction = IndexedDBStorage._db.transaction([IndexedDBStorage.STORE_NAME], 'readwrite');
          var store = transaction.objectStore(IndexedDBStorage.STORE_NAME);
          var request = store.put({
            slotId: '__meta__' + key,
            data: value,
            timestamp: Date.now()
          });

          request.onsuccess = function () {
            resolve();
          };

          request.onerror = function () {
            reject(request.error);
          };
        });
      });
    },

    getMeta: function (key) {
      return this.init().then(function () {
        return new Promise(function (resolve, reject) {
          var transaction = IndexedDBStorage._db.transaction([IndexedDBStorage.STORE_NAME], 'readonly');
          var store = transaction.objectStore(IndexedDBStorage.STORE_NAME);
          var request = store.get('__meta__' + key);

          request.onsuccess = function (event) {
            var result = event.target.result;
            resolve(result ? result.data : null);
          };

          request.onerror = function () {
            reject(request.error);
          };
        });
      });
    },

    deleteMeta: function (key) {
      return this.init().then(function () {
        return new Promise(function (resolve, reject) {
          var transaction = IndexedDBStorage._db.transaction([IndexedDBStorage.STORE_NAME], 'readwrite');
          var store = transaction.objectStore(IndexedDBStorage.STORE_NAME);
          var request = store.delete('__meta__' + key);

          request.onsuccess = function () {
            resolve();
          };

          request.onerror = function () {
            reject(request.error);
          };
        });
      });
    }
  };

})();
