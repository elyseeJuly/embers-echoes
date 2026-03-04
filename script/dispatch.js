/**
 * 余烬回响 — jQuery Dispatch (Pub/Sub)
 * ======================================
 * Lightweight event dispatch system using jQuery.
 * Allows modules to publish and subscribe to events.
 */
(function ($) {
    var topics = {};

    $.Dispatch = function (id) {
        var callbacks,
            method,
            topic = id && topics[id];

        if (!topic) {
            callbacks = $.Callbacks();
            topic = {
                publish: callbacks.fire,
                subscribe: callbacks.add,
                unsubscribe: callbacks.remove
            };
            if (id) {
                topics[id] = topic;
            }
        }

        return topic;
    };
})(jQuery);
