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
	notify: function (text, source) {
		if (!text) return;

		var $container = $('#ee-notifications');
		if ($container.length === 0) return;

		var $msg = $('<div>').addClass('ee-notify').text(text);
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
