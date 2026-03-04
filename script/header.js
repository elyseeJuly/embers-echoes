/**
 * 余烬回响 — Header Navigation
 * ==============================
 * Tab bar for navigating between modules (Terminal, Map, Ship, etc.)
 */
var Header = {

	init: function () {
		// Header tabs are added dynamically as modules unlock
	},

	addLocation: function (name, id, module) {
		var $tab = $('<div>')
			.addClass('tab')
			.attr('id', 'tab-' + id)
			.text(name)
			.on('click', function () {
				Engine.travelTo(module);
			});

		$('#ee-header').append($tab);
		return $tab;
	},

	removeLocation: function (id) {
		$('#tab-' + id).remove();
	}
};
