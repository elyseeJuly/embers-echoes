/**
 * 余烬回响 — God Space Transit (神明空间穿梭)
 * ============================================
 * Alternate endgame phase minigame. Re-themes original space.js.
 * Dodge data-anomalies while transiting to the singularity.
 */
var Space = {

	SPEED: 30, // ms per tick
	ASTEROID_CHANCE: 0.1,
	SCORE_TARGET: 1000,

	_timer: null,
	score: 0,
	shipY: 10,
	asteroids: [], // {x, y, char, speed}
	active: false,

	init: function () {
		// Space view takes over the entire screen
		var $overlay = $('<div>').attr('id', 'space-overlay').appendTo('body');
		$overlay.hide();
	},

	start: function () {
		Space.active = true;
		Space.score = 0;
		Space.shipY = 10;
		Space.asteroids = [];

		var $overlay = $('#space-overlay');
		$overlay.empty().show();

		$('<div>').addClass('space-header').text('神明空间穿梭').appendTo($overlay);
		$('<div>').attr('id', 'space-score').text('进度: 0%').appendTo($overlay);
		$('<div>').attr('id', 'space-view').appendTo($overlay);

		// Bind keyboard directly to space view
		Engine.keyLock = true; // Stop regular engine key handling
		$(document).on('keydown.space', Space.keyDown);

		Space._timer = setInterval(Space.tick, Space.SPEED);
	},

	tick: function () {
		if (!Space.active) return;

		Space.score += 1;
		$('#space-score').text('进度: ' + Math.min(100, Math.floor((Space.score / Space.SCORE_TARGET) * 100)) + '%');

		if (Space.score >= Space.SCORE_TARGET) {
			Space.win();
			return;
		}

		// Spawn
		if (Math.random() < Space.ASTEROID_CHANCE + (Space.score / 15000)) {
			Space.asteroids.push({
				x: 80,
				y: Math.floor(Math.random() * 20),
				char: ['%', '&', '*', '#', '@'][Math.floor(Math.random() * 5)],
				speed: 1 + Math.floor(Math.random() * 2)
			});
		}

		// Move anomalies
		for (var i = Space.asteroids.length - 1; i >= 0; i--) {
			var a = Space.asteroids[i];
			a.x -= a.speed;

			// Collision check
			if (Math.abs(a.x - 5) <= 1 && a.y === Space.shipY) {
				Space.crash();
				return;
			}

			if (a.x < 0) {
				Space.asteroids.splice(i, 1);
			}
		}

		Space.draw();
	},

	draw: function () {
		var $view = $('#space-view');
		var html = '';

		for (var y = 0; y < 20; y++) {
			var row = '';
			for (var x = 0; x < 80; x++) {
				if (x === 5 && y === Space.shipY) {
					row += '<span style="color:var(--glow-cyan)">▶</span>';
				} else {
					var found = false;
					for (var i = 0; i < Space.asteroids.length; i++) {
						var a = Space.asteroids[i];
						if (Math.floor(a.x) === x && a.y === y) {
							row += '<span style="color:var(--blood-red)">' + a.char + '</span>';
							found = true;
							break;
						}
					}
					if (!found) row += ' ';
				}
			}
			html += row + '<br>';
		}

		$view.html(html);
	},

	keyDown: function (e) {
		if (!Space.active) return;
		if (e.which === 38 || e.which === 87) { // Up
			Space.shipY = Math.max(0, Space.shipY - 1);
		} else if (e.which === 40 || e.which === 83) { // Down
			Space.shipY = Math.min(19, Space.shipY + 1);
		}
		Space.draw();
	},

	crash: function () {
		Space.active = false;
		clearInterval(Space._timer);
		$(document).off('keydown.space');
		Engine.keyLock = false;

		$('#space-overlay').addClass('space-flash');
		setTimeout(function () {
			var $overlay = $('#space-overlay');
			$overlay.removeClass('space-flash');
			$overlay.empty();

			var $text = $('<div>').addClass('endgame-text').text('结构崩溃。数据风暴将你吞没。');
			$overlay.append($text);

			setTimeout(function () {
				$overlay.hide();
				$SM.set('character.hp', 1);
				Engine.setPhase(Engine.PHASES.MAP); // Fallback to map
				RiftMap.die('方舟在跃迁时解体。');
			}, 3000);
		}, 500);
	},

	win: function () {
		Space.active = false;
		clearInterval(Space._timer);
		$(document).off('keydown.space');
		Engine.keyLock = false;

		var $overlay = $('#space-overlay');
		if (typeof Gallery !== 'undefined') Gallery.recordEnding('END_ARK', '超越界限', '次元方舟成功跃迁，突破了无尽三维空间的束缚。');
		var $text = $('<div>').addClass('endgame-title').text('超越界限');
		$overlay.append($text);

		// Hand off to the endgame narrative
		setTimeout(function () {
			$overlay.fadeOut(2000, function () {
				Endgame.startSequence();
			});
		}, 3000);
	}
};
