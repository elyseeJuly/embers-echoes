/**
 * 余烬回响 — Button System
 * =========================
 * Reusable button with cooldown, cost display, and disable state.
 */
var Button = {

	Button: function (options) {
		var $btn = $('<div>')
			.attr('id', options.id || '')
			.addClass('ee-btn')
			.text(options.text || '')
			.css('width', options.width || 'auto');

		if (options.cooldown) {
			$btn.data('cooldown', options.cooldown);
		}
		if (options.cost) {
			$btn.data('cost', options.cost);
		}

		// Click handler with cooldown
		$btn.on('click', function () {
			if (Button.isDisabled($btn) || $btn.data('onCooldown')) return;

			// Play contextual button SFX
			if (typeof AudioManager !== 'undefined') {
				var txt = options.text || '';
				if (txt.indexOf('制造') !== -1 || txt.indexOf('解译') !== -1 || txt.indexOf('合成') !== -1) {
					AudioManager.playSFX('CRAFT');
				} else if (txt.indexOf('建造') !== -1 || txt.indexOf('构筑') !== -1 || txt.indexOf('升级') !== -1) {
					AudioManager.playSFX('BUILD');
				} else if (txt.indexOf('交易') !== -1 || txt.indexOf('兑换') !== -1 || txt.indexOf('购买') !== -1) {
					AudioManager.playSFX('BUY');
				} else {
					AudioManager.playSFX('BUY'); // default click BGM/SFX
				}
			}

			// Check cost
			var cost = $btn.data('cost');
			if (cost) {
				for (var resource in cost) {
					var available = $SM.get('stores.' + resource) || 0;
					if (available < cost[resource]) {
						// Can't afford
						$btn.addClass('combat-shake');
						setTimeout(function () { $btn.removeClass('combat-shake'); }, 200);
						return;
					}
				}
				// Deduct cost
				for (var resource in cost) {
					$SM.add('stores.' + resource, -cost[resource]);
				}
			}

			// Fire click handler
			if (options.click) {
				options.click($btn);
			}

			// Start cooldown
			if (options.cooldown) {
				Button.cooldown($btn, options.cooldown);
			}
		});

		return $btn;
	},

	/**
	 * Start cooldown on a button
	 */
	cooldown: function ($btn, duration) {
		if (!duration) duration = $btn.data('cooldown') || 0;
		if (duration <= 0) return;

		$btn.data('onCooldown', true);

		// Remove existing cooldown bar
		$btn.find('.cooldown-bar').remove();

		var $bar = $('<div>').addClass('cooldown-bar').css('width', '100%');
		$btn.append($bar);

		// Animate the bar shrinking
		$bar.animate({ width: '0%' }, duration * 1000, 'linear', function () {
			$btn.data('onCooldown', false);
			$(this).remove();
		});
	},

	/**
	 * Clear cooldown
	 */
	clearCooldown: function ($btn) {
		$btn.data('onCooldown', false);
		$btn.find('.cooldown-bar').stop(true, true).remove();
	},

	/**
	 * Set button disabled state
	 */
	setDisabled: function ($btn, disabled) {
		if (disabled) {
			$btn.addClass('disabled');
		} else {
			$btn.removeClass('disabled');
		}
	},

	isDisabled: function ($btn) {
		return $btn.hasClass('disabled');
	}
};
