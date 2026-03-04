/**
 * 余烬回响 — Rift Ark (跃迁方舟)
 * =====================================
 * Alternate Phase 5 endgame route. Re-themes original ship.js.
 * Build a dimensional transit vehicle.
 */
var Ship = {
	name: "跃迁方舟",
	tabId: "tab-ship",

	MAX_HULL: 30, // 船体装甲
	MAX_ENGINE: 25, // 虚空引擎

	init: function () {
		var $panel = $('<div>').attr('id', 'ship-panel').addClass('ee-panel');
		$('<div>').addClass('ee-panel-title').text('跃迁方舟').appendTo($panel);

		$('<div>').attr('id', 'ship-build-list').addClass('ee-build-list').appendTo($panel);

		$('#ee-left').append($panel);
		$panel.hide();

		$.Dispatch('phaseChange').subscribe(Ship.handlePhaseChange);
		$.Dispatch('stateUpdate').subscribe(Ship.handleStateUpdates);
	},

	show: function () {
		$('#ship-panel').show();
		if ($('#tab-ship').length === 0) {
			Header.addLocation('方舟建造', 'ship', Ship);
		}
		Ship.updateBuildList();
	},

	hide: function () {
		$('#ship-panel').hide();
	},

	updateBuildList: function () {
		var hullCount = $SM.get('ship.hull') || 0;
		var engineCount = $SM.get('ship.engine') || 0;

		var $list = $('#ship-build-list');
		$list.empty(); // Simple clear and redraw for now

		// Ship info display
		var $info = $('<div>').addClass('merchant-item').css('margin-bottom', '20px');
		var $statusText = $('<div>');
		$('<div>').text('装甲完整度: ' + Math.floor((hullCount / Ship.MAX_HULL) * 100) + '%').appendTo($statusText);
		$('<div>').text('引擎推进力: ' + Math.floor((engineCount / Ship.MAX_ENGINE) * 100) + '%').appendTo($statusText);

		var readiness = (hullCount + engineCount) / (Ship.MAX_HULL + Ship.MAX_ENGINE);
		$('<div>').text('总体跃迁准备度: ' + Math.floor(readiness * 100) + '%').css('color', readiness >= 1 ? 'var(--glow-cyan)' : 'var(--ember-orange)').appendTo($statusText);
		$info.append($statusText);
		$list.append($info);

		// Hull Upgrade
		if (hullCount < Ship.MAX_HULL) {
			Ship.renderUpgradeBox('装甲板', '强化维度航行的抗压能力', { 'grayMatter': 100 }, function () {
				$SM.add('ship.hull', 1);
				Notifications.notify('方舟装甲得到强化。');
				if (($SM.get('ship.hull') + $SM.get('ship.engine')) === (Ship.MAX_HULL + Ship.MAX_ENGINE)) {
					Notifications.notify('跃迁方舟已准备就绪。');
				}
			});
		}

		// Engine Upgrade
		if (engineCount < Ship.MAX_ENGINE) {
			Ship.renderUpgradeBox('虚空引擎', '驱动逆向重力场', { 'concentrate': 20, 'whispers': 5 }, function () {
				$SM.add('ship.engine', 1);
				Notifications.notify('虚空引擎组装完成。');
				if (($SM.get('ship.hull') + $SM.get('ship.engine')) === (Ship.MAX_HULL + Ship.MAX_ENGINE)) {
					Notifications.notify('跃迁方舟已准备就绪。');
				}
			});
		}

		// Launch Button
		if (hullCount === Ship.MAX_HULL && engineCount === Ship.MAX_ENGINE) {
			var $launchBox = $('<div>').addClass('merchant-item');
			var $lInfo = $('<div>');
			$('<div>').addClass('merchant-item-name').css('color', 'var(--glow-purple)').text('启动跃迁').appendTo($lInfo);
			$('<div>').addClass('merchant-item-desc').text('冲破三维壁垒，直面神明空间。').appendTo($lInfo);
			$launchBox.append($lInfo);

			var $lBtn = new Button.Button({
				text: '【启航】',
				click: function () {
					Ship.launch();
				}
			});
			$lBtn.addClass('ee-btn--primary pulse');
			$launchBox.append($lBtn);
			$list.append($launchBox);
		}
	},

	renderUpgradeBox: function (name, desc, cost, onBuy) {
		var $list = $('#ship-build-list');
		var $row = $('<div>').addClass('merchant-item');

		var $info = $('<div>');
		$('<div>').addClass('merchant-item-name').text(name).appendTo($info);
		$('<div>').addClass('merchant-item-desc').text(desc).appendTo($info);

		var costText = Object.keys(cost).map(function (r) { return Nexus.getResourceName(r) + ': ' + cost[r]; }).join(', ');
		$('<div>').addClass('merchant-item-cost').text(costText).appendTo($info);
		$row.append($info);

		var canAfford = true;
		for (var k in cost) {
			if (($SM.get('stores.' + k) || 0) < cost[k]) canAfford = false;
		}

		var $btn = new Button.Button({
			text: '集成',
			click: function () {
				for (var k in cost) {
					if (($SM.get('stores.' + k) || 0) < cost[k]) {
						Notifications.notify('资源不足。');
						return;
					}
				}
				for (var k in cost) {
					$SM.add('stores.' + k, -cost[k]);
				}
				onBuy();
				Ship.updateBuildList();
			}
		});
		if (!canAfford) Button.setDisabled($btn, true);

		$row.append($btn);
		$list.append($row);
	},

	launch: function () {
		Notifications.notify('引擎点火。现实维度正在被撕裂。');
		$('body').addClass('matrix-flash'); // Reuse flash effect

		setTimeout(function () {
			$('body').removeClass('matrix-flash');
			Engine.setPhase(Engine.PHASES.END);

			// Transit to Space minigame
			Space.start();
		}, 3000);
	},

	handlePhaseChange: function (e) {
		// Unlock Ship building in Map/Sink phase if player finds an event (simplified: just unlock at Map phase)
		if (e.to === Engine.PHASES.MAP) {
			Ship.show();
			Notifications.notify('识别到古代方舟蓝图。可以在据点组装跃迁器了。');
		}
	},

	handleStateUpdates: function (e) {
		if (e && e.path && e.path.indexOf('stores') === 0 && Ship.tabId === $('.tab.active').attr('id')) {
			Ship.updateBuildList();
		}
	},

	onArrival: function () {
		Ship.updateBuildList();
	}
};
