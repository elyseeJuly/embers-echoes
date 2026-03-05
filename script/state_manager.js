/**
 * 余烬回响 — State Manager
 * =========================
 * Centralized state tree with hard-cap enforcement and atomic income settlement.
 * Extends the original ADR StateManager pattern.
 */
var StateManager = {

	MAX_STORE: 99999999999999,

	options: {},

	// Storage caps for each resource (base values, modified by buildings)
	_storageCaps: {
		'ember': 100,    // base cap, increased by Ember Furnace
		'grayMatter': 50,     // base cap, increased by Gray Synthesizer
		'whispers': 30,     // base 30; riftBeacon adds +20
		'concentrate': 10,     // base cap, increased by upgrades
		'relics': 10,     // base cap
		'anomalies': 200  // base cap, consumed by crafting
	},

	// Income sources (set by Population module)
	_income: {},

	init: function (options) {
		this.options = $.extend(this.options, options);

		if (!this.options.state) {
			this.options.state = {
				game: {
					phase: 0,
					echoes: 0,
					startTime: Date.now()
				},
				stores: {},
				buildings: {},
				workers: {},
				relicInventory: [],
				fragmentInventory: [],
				character: {
					san: 50,
					maxSan: 100,
					erosion: 0,
					godPressure: 0,
					hp: 10,
					maxHp: 10,
					buffs: {}
				},
				income: {},
				features: {}
			};
		}
	},

	// ── State Access ─────────────────────────────────────────

	/**
	 * Get a value from the state tree using dot-notation path
	 * e.g. $SM.get('stores.ember') or $SM.get('character.san')
	 */
	get: function (stateName, requestZero) {
		var parts = stateName.split('.');
		var current = this.options.state;

		for (var i = 0; i < parts.length; i++) {
			// Handle bracket notation: stores["alien alloy"]
			var part = parts[i].replace(/\["/g, '.').replace(/"]/g, '').replace(/\['/g, '.').replace(/']/g, '');
			var subParts = part.split('.');

			for (var j = 0; j < subParts.length; j++) {
				if (current === undefined || current === null) {
					return requestZero ? 0 : undefined;
				}
				current = current[subParts[j]];
			}
		}

		if (current === undefined || current === null) {
			return requestZero ? 0 : undefined;
		}
		return current;
	},

	/**
	 * Set a value in the state tree
	 */
	set: function (stateName, value, noEvent) {
		var parts = stateName.split('.');
		var current = this.options.state;

		for (var i = 0; i < parts.length - 1; i++) {
			if (current[parts[i]] === undefined) {
				current[parts[i]] = {};
			}
			current = current[parts[i]];
		}

		current[parts[parts.length - 1]] = value;

		if (!noEvent) {
			this.fireUpdate(stateName);
		}
	},

	/**
	 * Set multiple values under a parent path
	 */
	setM: function (parentName, list, noEvent) {
		for (var key in list) {
			this.set(parentName + '.' + key, list[key], true);
		}
		if (!noEvent) {
			this.fireUpdate(parentName);
		}
	},

	/**
	 * Add to a numeric value, enforcing storage hard-cap
	 * Returns 0 on success, 1 if state wasn't a number
	 */
	add: function (stateName, value, noEvent) {
		var current = this.get(stateName);

		if (current === undefined || current === null) {
			current = 0;
		}
		if (typeof current !== 'number') return 1;

		var newVal = current + value;

		// Hard-cap enforcement for stores
		if (stateName.indexOf('stores.') === 0) {
			var resourceKey = stateName.replace('stores.', '');
			var cap = this.getStorageCap(resourceKey);

			// Never go below 0
			if (newVal < 0) newVal = 0;
			// Never exceed cap
			if (newVal > cap) newVal = cap;
		}

		// SAN clamped to [0, maxSan]
		if (stateName === 'character.san') {
			var maxSan = this.get('character.maxSan') || 100;
			newVal = Math.max(0, Math.min(maxSan, newVal));
		}

		// Erosion clamped to [0, 100]
		if (stateName === 'character.erosion') {
			newVal = Math.max(0, Math.min(100, newVal));
		}

		this.set(stateName, newVal, noEvent);
		return 0;
	},

	/**
	 * Add multiple values under a parent path
	 */
	addM: function (parentName, list, noEvent) {
		var failures = 0;
		for (var key in list) {
			failures += this.add(parentName + '.' + key, list[key], true);
		}
		if (!noEvent) {
			this.fireUpdate(parentName);
		}
		return failures;
	},

	/**
	 * Remove a state path
	 */
	remove: function (stateName, noEvent) {
		var parts = stateName.split('.');
		var current = this.options.state;

		for (var i = 0; i < parts.length - 1; i++) {
			if (current[parts[i]] === undefined) return;
			current = current[parts[i]];
		}

		delete current[parts[parts.length - 1]];

		if (!noEvent) {
			this.fireUpdate(stateName);
		}
	},

	// ── Storage Caps ─────────────────────────────────────────

	/**
	 * Get the current storage cap for a resource
	 * (base + building bonuses)
	 */
	getStorageCap: function (resourceKey) {
		var base = this._storageCaps[resourceKey] || this.MAX_STORE;
		var bonus = 0;

		var buildings = this.get('buildings') || {};

		// Ember Furnace: +50 ember cap each
		if (resourceKey === 'ember') {
			bonus += (buildings['emberFurnace'] || 0) * 50;
		}
		// Gray Synthesizer: +30 gray matter cap each
		else if (resourceKey === 'grayMatter') {
			bonus += (buildings['graySynthesizer'] || 0) * 30;
		}
		// Data Vault: +10 relics cap each
		else if (resourceKey === 'relics') {
			bonus += (buildings['dataVault'] || 0) * 10;
		}
		// Rift Beacon: +20 whispers cap (once)
		else if (resourceKey === 'whispers') {
			bonus += Math.min(buildings['riftBeacon'] || 0, 1) * 20;
		}

		return base + bonus;
	},

	// ── Income System ────────────────────────────────────────

	/**
	 * Set income for a worker type
	 * options: { delay: <ticks>, stores: { resource: amount, ... } }
	 */
	setIncome: function (source, options) {
		this._income[source] = options;
	},

	getIncome: function (source) {
		return this._income[source] || null;
	},

	/**
	 * Get net income per tick (for display and offline calc)
	 */
	getNetIncome: function () {
		var net = {};
		var workers = this.get('workers') || {};

		for (var source in this._income) {
			var inc = this._income[source];
			var count = workers[source] || 0;
			if (count <= 0) continue;

			for (var resource in inc.stores) {
				if (!net[resource]) net[resource] = 0;
				net[resource] += inc.stores[resource] * count;
			}
		}
		return net;
	},

	/**
	 * Atomic income collection — the heart of the economy.
	 * In assimilation zone (SAN > 70), production outputs get a +50% multiplier.
	 */
	collectIncome: function () {
		var workers = this.get('workers') || {};
		var san = this.get('character.san') || 50;
		var maxSan = this.get('character.maxSan') || 100;
		var assimilationThreshold = maxSan - 30;
		var productionMultiplier = (san > assimilationThreshold) ? 1.5 : 1.0;

		for (var source in this._income) {
			var inc = this._income[source];
			var count = workers[source] || 0;
			if (count <= 0) continue;

			// Check: can all consumption be satisfied?
			var canProduce = true;
			for (var resource in inc.stores) {
				if (inc.stores[resource] < 0) {
					var needed = Math.abs(inc.stores[resource]) * count;
					var available = this.get('stores.' + resource) || 0;
					if (available < needed) { canProduce = false; break; }
				}
			}
			if (!canProduce) continue;

			// Apply income
			for (var resource in inc.stores) {
				var amount = inc.stores[resource] * count;
				// Assimilation zone: +50% to all production
				if (amount > 0 && productionMultiplier !== 1.0) {
					amount = Math.floor(amount * productionMultiplier);
				}
				// Ember reflux perk: +15% ember on top
				if (amount > 0 && resource === 'ember') {
					var buffs = this.get('character.buffs') || {};
					if (buffs['ember_reflux']) { amount = Math.floor(amount * 1.15); }
				}
				this.add('stores.' + resource, amount, true);
			}
		}
		this.fireUpdate('stores');
	},

	// ── Relics ───────────────────────────────────────────────


	/**
	 * Add a fragment (raw map drop) to the player's inventory by id
	 */
	addFragment: function (id) {
		var inv = this.get('fragmentInventory') || [];
		inv.push(id);
		this.set('fragmentInventory', inv);
	},

	hasFragment: function (id) {
		var inv = this.get('fragmentInventory') || [];
		return inv.indexOf(id) !== -1;
	},

	consumeFragment: function (id) {
		var inv = this.get('fragmentInventory') || [];
		var idx = inv.indexOf(id);
		if (idx !== -1) { inv.splice(idx, 1); this.set('fragmentInventory', inv); }
	},

	/**
	 * Add a relic to the player's inventory by id
	 */
	addRelic: function (id) {
		var inv = this.get('relicInventory') || [];
		inv.push(id);
		this.set('relicInventory', inv);
	},

	/**
	 * Check if the player holds at least one copy of a relic
	 */
	hasRelic: function (id) {
		var inv = this.get('relicInventory') || [];
		return inv.indexOf(id) !== -1;
	},

	/**
	 * Consume (remove) one copy of a relic from inventory
	 */
	consumeRelic: function (id) {
		var inv = this.get('relicInventory') || [];
		var idx = inv.indexOf(id);
		if (idx !== -1) {
			inv.splice(idx, 1);
			this.set('relicInventory', inv);
		}
	},

	// ── Perks ────────────────────────────────────────────────

	addPerk: function (name) {
		this.set('character.perks.' + name, true);
		var perk = Engine.Perks[name];
		if (perk) {
			Notifications.notify(perk.notify);
		}
	},

	hasPerk: function (name) {
		return !!this.get('character.perks.' + name);
	},

	// ── Events ───────────────────────────────────────────────

	fireUpdate: function (stateName, save) {
		$.Dispatch('stateUpdate').publish({ path: stateName });
	},

	handleStateUpdates: function (e) {
		// placeholder for module-specific handling
	}
};

// Alias
var $SM = StateManager;
