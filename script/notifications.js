/**
 * 余烬回响 — Notifications
 * ========================
 * Cascading text notifications in the terminal style.
 */
var Notifications = {

	_queue: [],
	_maxVisible: 5,
	_fadeDelay: 4000,

	init: function () {
		// Container is in the HTML
	},

	/**
	 * Show a notification message
	 */
	notify: function (text, type) {
		if (!text) return;

		if (typeof Terminal !== 'undefined' && Terminal.pushLog) {
			Terminal.pushLog(text, type);
		}

		var isCritical = (type === 'warning' || type === 'glitch' || type === 'critical' || type === 'milestone');
		if (!isCritical) return; // Hide standard popups, only use terminal log

		var $container = $('#ee-notifications');
		if ($container.length === 0) return;

		var $msg = $('<div>').addClass('ee-notify').text(text);
		if (type) $msg.addClass('notify-' + type);

		$container.append($msg);

		// Remove old notifications if too many
		var $all = $container.children('.ee-notify');
		if ($all.length > Notifications._maxVisible) {
			$all.first().remove();
		}

		// Auto-fade after delay
		setTimeout(function () {
			$msg.addClass('fading');
			setTimeout(function () {
				$msg.remove();
			}, 1000);
		}, Notifications._fadeDelay);
	}
};
