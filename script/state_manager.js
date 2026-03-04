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
		'whispers': 20,     // base cap
		'concentrate': 10,     // base cap, increased by upgrades
		'relics': 10      // base cap
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
				character: {
					san: 50,
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

		// SAN clamped to [0, 100]
		if (stateName === 'character.san') {
			newVal = Math.max(0, Math.min(100, newVal));
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
	 * Atomic income collection — the heart of the economy
	 * For each worker type, validate that ALL consumption can be satisfied.
	 * If not, that worker type skips this tick entirely.
	 */
	collectIncome: function () {
		var workers = this.get('workers') || {};

		for (var source in this._income) {
			var inc = this._income[source];
			var count = workers[source] || 0;
			if (count <= 0) continue;

			// Check: can all consumption be satisfied?
			var canProduce = true;
			for (var resource in inc.stores) {
				if (inc.stores[resource] < 0) {
					// This is consumption
					var needed = Math.abs(inc.stores[resource]) * count;
					var available = this.get('stores.' + resource) || 0;
					if (available < needed) {
						canProduce = false;
						break;
					}
				}
			}

			// If resources insufficient, this worker type stops for this tick
			if (!canProduce) continue;

			// Apply production and consumption
			for (var resource in inc.stores) {
				var amount = inc.stores[resource] * count;

				// Apply buffs
				if (amount > 0 && resource === 'ember') {
					var buffs = this.get('character.buffs') || {};
					if (buffs['ember_reflux']) {
						amount *= 1.15;
					}
				}

				this.add('stores.' + resource, amount, true);
			}
		}

		this.fireUpdate('stores');
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
