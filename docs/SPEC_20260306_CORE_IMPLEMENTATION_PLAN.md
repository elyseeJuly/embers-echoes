# 余烬回响 (Embers Echoes) — Implementation Plan

A cyberpunk/sci-fi incremental game built by transforming the A Dark Room (ADR) codebase. The game follows a strict progressive-unlock flow from total darkness through base-building, risk management, map exploration, to an existential endgame.

## User Review Required

> [!IMPORTANT]
> **Scope**: This is a full overhaul of the ADR codebase (~8000 lines across 19 JS files, 9 CSS files). The existing ADR game logic (fire-stoking, wood gathering, fur trade, etc.) will be **completely replaced** with new systems. The jQuery + vanilla JS architecture and the `$SM` state manager pattern are **retained**.

> [!WARNING]
> **Phased delivery**: Given the massive scope, I propose implementing **Phase 1 + Phase 2** first (Foundation + Economy), delivering a playable incremental core. Subsequent phases can be built iteratively. Implementing all 7 GDD modules in one shot would risk an unwieldy, hard-to-debug codebase.

> [!CAUTION]
> **No existing tests**: The ADR codebase has zero automated tests. Verification will rely on browser-based manual testing after each phase. I can add a lightweight test harness if desired.

---

## Proposed Changes — Phase 1: Foundation

### Core Engine & Theme

#### [MODIFY] [index.html](file:///Users/quantumrose/Documents/Emberois/embers-echoes/index.html)
- Rename title to "余烬回响 — Embers Echoes"
- Update meta description & OG tags
- Replace all `<script>` tags to point to new scripts
- Replace all `<link>` CSS tags to point to new stylesheets
- Add Google Fonts link (Inter + Fira Code)
- Update DOM structure: `#wrapper` → `#ee-wrapper`, add `#terminal-panel`, `#nexus-panel`, `#map-panel`

#### [NEW] [css/core.css](file:///Users/quantumrose/Documents/Emberois/embers-echoes/css/core.css)
- CSS custom properties: `--ember-orange`, `--void-black`, `--ash-gray`, `--blood-red`, `--ice-blue`, `--glow-cyan`
- Dark cyberpunk base: `#0a0a0f` background, monospace terminal aesthetic
- Typography: Inter for UI, Fira Code for terminal text
- Layout: 3-column responsive grid (left: terminal/nexus, center: narrative, right: stores/map)
- Button system: glowing borders, pulse on hover, depress on click
- Notification system: fade-in text cascade (preserving ADR's iconic text reveal)

#### [NEW] [css/glitch.css](file:///Users/quantumrose/Documents/Emberois/embers-echoes/css/glitch.css)
- `.glitch-blood` class: red tint, text-shadow flicker, random character displacement via CSS animation
- `.rigid-code` class: ice-blue tint, rigid grid alignment, mechanical feel
- `.phase-transition` class: screen-tear animation for phase unlocks
- `.combat-shake` / `.combat-depress`: button pain feedback

#### [MODIFY] [script/engine.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/engine.js)
Complete rewrite as `Embers` namespace:
- **Global Tick**: `setInterval` at 1000ms driving all automation
- **Phase Manager**: enum `PHASES = { NULL, SPARK, CAMP, ABYSS, MAP, SINK, END }` with `currentPhase` tracked in state. Each phase has an `unlock()` method that reveals new UI panels
- **Phase Gating**: `canUnlock(phase)` checks resource thresholds (e.g., ember ≥ 50 → CAMP)
- Save/load via `localStorage` (retain existing approach)
- Export/import via Base64 (retain existing approach)
- Remove: all ADR-specific perks, app-store refs, share functionality

#### [MODIFY] [script/state_manager.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/state_manager.js)
Extend existing `$SM` with:
- **Hard-cap enforcement**: [add()](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/state_manager.js#118-140) method clamps to `getStorageCap(resourceName)`. Overflow silently discarded
- **Atomic settlement**: new `settleIncome()` that validates `totalConsumption <= currentStock` before applying. If insufficient, that worker type skips this tick
- **New state paths**: `stores.ember`, `stores.grayMatter`, `stores.whispers`, `character.san`, `character.erosion`, `character.godPressure`, `game.phase`, `game.echoes`

---

## Proposed Changes — Phase 2: Economy & Progressive Unlock

### Terminal Module (Null → Spark)

#### [NEW] [script/terminal.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/terminal.js)
- **Null Phase**:全黑屏幕, single button `【重启神经终端】` with typewriter text reveal
- On click → transition to Spark Phase
- **Spark Phase**: button `【提取余烬】` with cooldown. Each click produces ember (1-3). Narrative text drips in
- When ember ≥ 50: auto-trigger Camp Phase unlock (flash animation, new panel slides in)

### Nexus Module (Camp Phase — Base Building)

#### [NEW] [script/nexus.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/nexus.js)
Replaces [room.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/room.js). Provides:
- **Structure Nodes** (buildings): each has a name, cost, max count, and effect
  - `信号塔 (Signal Tower)`: +5 population cap per tower, max 20
  - `余烬熔炉 (Ember Furnace)`: +50 ember storage cap, max 10
  - `灰质合成器 (Gray Synthesizer)`: unlocks gray matter production, max 3
  - `认知屏障 (Cognitive Barrier)`: +10 max SAN, max 5
  - etc.
- Build buttons appear progressively as resources/buildings unlock
- Each building construction triggers a narrative notification

#### [NEW] [script/population.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/population.js)
Replaces [outside.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/outside.js). Provides:
- **Population cap** = `信号塔 count × 5`
- **Auto-arrival**: Lost ones (`迷失者`) join every 30-90s when pop < cap
- **Worker assignment** (adjustable with +/- buttons):
  - `拾荒者 (Scavenger)`: produces ember (delay: 10s, +1 ember)
  - `窥探者 (Lurker)`: consumes ember, produces gray matter (delay: 10s, -2 ember, +1 gray matter)
  - `守卫 (Sentinel)`: consumes gray matter, reduces erosion (delay: 15s, -1 gray matter, -0.5 erosion)
  - Idle workers assigned as `游荡者 (Wanderer)` — no production
- **Atomic income**: each tick, validate consumption vs. stock. Skip workers whose resources are insufficient

### Glitch Merchant

#### [NEW] [script/merchant.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/merchant.js)
- Timer: every 600s, 30% probability → spawn merchant popup
- Stays for 60s then vanishes
- Offers 3-4 random permanent buffs from a pool:
  - `空间折叠 (Space Fold)`: +20 carry weight (cost: 500 ember)
  - `认知滤网 (Cognitive Filter)`: -30% SAN cost per move (cost: 200 gray matter)
  - `余烬回流 (Ember Reflux)`: +15% ember production (cost: 300 ember + 100 gray matter)
  - etc.
- Purchased buffs stored in `$SM.get('character.buffs')`

#### [NEW] [css/terminal.css](file:///Users/quantumrose/Documents/Emberois/embers-echoes/css/terminal.css)
- Terminal panel styling: monospace text, blinking cursor, typewriter animation
- Button glow effects for `【重启神经终端】` and `【提取余烬】`

#### [NEW] [css/nexus.css](file:///Users/quantumrose/Documents/Emberois/embers-echoes/css/nexus.css)
- Building panel grid layout, resource bars, worker assignment UI

---

## Proposed Changes — Phase 3: Risk & Sanity (Abyss Phase)

#### [NEW] [script/sanity.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/sanity.js)
- SAN starts at 50, range [0, 100]
- **Dynamic gating**:
  - `30-70` (Awakened): normal gameplay, golden zone
  - `< 30` (Madness): apply `glitch-blood` CSS, produce Whispers resource, erosion +2/tick
  - `> 70` (Assimilation): apply `rigid-code` CSS, block high-tier exploration, ember bleeds -1/tick
- SAN display: if `SAN < 70`, show vague text (`"意识模糊..."`, `"边缘在瓦解"`); if `SAN ≥ 70`, show exact number
- Erosion: 0-100 scale. At thresholds 25/50/75/100 trigger mutation events (building destroyed, workers go mad, etc.)

#### [NEW] [script/events_embers.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/events_embers.js)
Replaces [events.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/events.js) event pools. New event structure:
- Events fire based on resource levels + erosion + SAN
- Each event presents 2 choices (dilemma): cost SAN for resources, or cost resources to stabilize
- Example: "一个声音在低语... 献祭50余烬换取10低语值? 或消耗30灰质维持理智?"

---

## Proposed Changes — Phase 4: Map & Survival (Leap Phase)

#### [NEW] [script/rift_map.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/rift_map.js)
Replaces [world.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/world.js):
- **Sparse matrix**: only visited/adjacent tiles stored, infinite potential space
- **Viewport**: 21×21 grid rendered around player, fog-of-war for unvisited
- **Controls**: WASD keyboard + tap-to-move on adjacent cells (mobile)
- **Tile types**: void, debris, ruin, anomaly, cache, exit
- **Rift coordinate synthesis**: spend Whispers to unlock new map regions
- **UI reveal**: first coordinate synthesized → right panel violently tears open (CSS animation)

#### [NEW] [script/survival.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/survival.js)
- **Supply axis**: movement costs `高能浓缩液 (Concentrate)`. If depleted → each move costs HP & SAN directly
- **Weight axis**: fixed carry limit (base 30, upgradeable). Loot has weight. Over-weight → must drop items
- **Death**: lose all backpack items, respawn at camp with narrative text

#### [NEW] [script/combat.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/combat.js)
Replaces combat in [events.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/events.js):
- **ATB (Active Time Battle)**: action bar fills over time, attack when full
- **God-Pressure scaling**: enemies gain `+godPressure%` to stats
- **Button feedback**: CSS `.combat-shake` on hit, `.combat-depress` on click
- Weapons: `数据刃 (Data Blade)`, `脉冲枪 (Pulse Gun)`, `逻辑炸弹 (Logic Bomb)`

#### [NEW] [css/map.css](file:///Users/quantumrose/Documents/Emberois/embers-echoes/css/map.css)
- Grid-based map renderer, fog effect, tile styling
- Mobile-responsive tap targets

#### [NEW] [css/combat.css](file:///Users/quantumrose/Documents/Emberois/embers-echoes/css/combat.css)
- ATB bar, fighter display, shake/depress animations

---

## Proposed Changes — Phase 5: Endgame

#### [NEW] [script/matrix_sink.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/matrix_sink.js)
- Unlocked after exploring enough of the map
- Player pours ember into the matrix. Progress: `0.0000%` → `100.0000%`
- Scaling cost: each 0.0001% costs more ember than the last (logarithmic curve)
- At 100%: unlock coordinate (0,0) on the map

#### [NEW] [script/endgame.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/endgame.js)
- Enter (0,0) → full-screen red flash, erosion +10/s
- Three philosophy questions displayed sequentially
- Player must drag/click the correct artifact (`携带杂音的心跳频段`) from a pile of items before erosion hits 100
- Correct submission → logic deadlock animation → true ending sequence
- Wrong submission or timeout → death ending → recorded in gallery

#### [MODIFY] [ship.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/ship.js)
- Re-theme as `裂隙方舟 (Rift Ark)` — a recovered vessel that can pierce into God Space
- Upgrade resources changed: `alien alloy` → `灰质 (Gray Matter)` + `低语值 (Whispers)`
- Hull/thruster upgrades → `维度护盾 (Dimensional Shield)` / `裂隙引擎 (Rift Engine)`
- Liftoff triggers entry into God Space (Space module) as an **alternate route** to (0,0)

#### [MODIFY] [space.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/space.js)
- Re-theme as `神域穿越 (God Space Transit)` — asteroid field becomes `数据碎片流 (Data Fragment Stream)`
- Ship dodges corruption fragments; hull damage = erosion increase
- Successful transit → arrives at the same endgame FSM as (0,0) coordinate
- Crash → death ending with unique narrative (different from map death)
- Retains keyboard controls and visual animation framework

---

## Proposed Changes — Phase 6: Meta-Progression

#### [MODIFY] [script/engine.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/engine.js)
- 10s silent autosave via `localStorage`
- Base64 export/import (retain from ADR)

#### [NEW] [script/echoes.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/echoes.js)
- On death/completion: calculate `残响 (Echoes)` from survival time + exploration %
- Next cycle: echoes unlock hidden starting bonuses (extra initial ember, pre-built structures, etc.)

#### [NEW] [script/gallery.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/gallery.js)
- Main menu overlay showing all achieved endings
- Each ending has a name, description, and unlock condition
- Stored in `localStorage` separately from active save

---

## Files to Remove/Deprecate

The following ADR files will be **deleted or emptied** as their functionality is fully replaced:

| Original File | Replaced By | Reason |
|---|---|---|
| [script/room.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/room.js) | `script/nexus.js` | Buildings completely redesigned |
| [script/outside.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/outside.js) | `script/population.js` | Workers/income redesigned |
| [script/world.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/world.js) | `script/rift_map.js` | Map system redesigned |
| [script/path.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/path.js) | `script/survival.js` | Outfitting/supplies redesigned |
| [script/ship.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/ship.js) | *(modified in place)* | Re-themed as Rift Ark, alternate God Space route |
| [script/space.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/space.js) | *(modified in place)* | Re-themed as God Space Transit minigame |
| [script/fabricator.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/fabricator.js) | `script/nexus.js` | Absorbed into nexus |
| [script/scoring.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/scoring.js) | `script/echoes.js` | Replaced by echoes system |
| [script/prestige.js](file:///Users/quantumrose/Documents/Emberois/embers-echoes/script/prestige.js) | `script/echoes.js` | Replaced by echoes system |
| `script/events/` dir | `script/events_embers.js` | All event pools redesigned |
| `css/room.css` | `css/terminal.css` | Reskinned |
| `css/outside.css` | `css/nexus.css` | Reskinned |
| `css/world.css` | `css/map.css` | Reskinned |
| `css/path.css` | `css/combat.css` | Reskinned |
| `css/ship.css` | *(removed)* | Not needed |
| `css/space.css` | *(removed)* | Not needed |
| `css/fabricator.css` | *(removed)* | Absorbed into nexus |

---

## Architecture Diagram

```mermaid
graph TD
    A["index.html"] --> B["engine.js (Embers)"]
    B --> C["state_manager.js ($SM)"]
    B --> D["terminal.js"]
    B --> E["nexus.js"]
    B --> F["population.js"]
    B --> G["sanity.js"]
    B --> H["rift_map.js"]
    B --> I["combat.js"]
    B --> J["matrix_sink.js"]
    B --> K["endgame.js"]
    B --> L["echoes.js"]
    B --> M["gallery.js"]
    B --> N["merchant.js"]
    B --> O["events_embers.js"]
    B --> P["survival.js"]
    
    C --> Q["localStorage"]
    
    subgraph "Phase Gating"
        D -->|"ember ≥ 50"| E
        E -->|"threshold"| G
        G -->|"whispers → coords"| H
        H -->|"explore enough"| J
        J -->|"100%"| K
    end
    
    style A fill:#1a1a2e,stroke:#e94560,color:#eee
    style B fill:#16213e,stroke:#0f3460,color:#eee
    style C fill:#0f3460,stroke:#53354a,color:#eee
```

---

## Verification Plan

Since the ADR codebase has zero existing tests, verification will be **browser-based**:

### Phase 1+2 Verification (Initial Delivery)

1. **Start dev server**: `cd /Users/quantumrose/Documents/Emberois/embers-echoes && npm start`
2. **Browser check — Null Phase**:
   - Open `http://localhost:8080` (or assigned port)
   - Screen should be fully black with only `【重启神经终端】` button
   - No other UI elements visible
3. **Browser check — Spark Phase**:
   - Click `【重启神经终端】` → typewriter text appears, `【提取余烬】` button unlocks
   - Click `【提取余烬】` repeatedly → ember counter increases
   - Verify ember cannot exceed storage cap
4. **Browser check — Camp Phase**:
   - Accumulate ember ≥ 50 → Camp UI slides in with build options
   - Build `信号塔` → population cap increases
   - Workers arrive automatically → assign to scavenger/lurker roles
   - Verify atomic income: if ember hits 0, lurkers stop producing gray matter (no negative ember)
5. **Browser check — Glitch Merchant**:
   - Wait or trigger manually (debug command) → merchant popup appears
   - Purchase a buff → verify it persists after page reload
6. **Save/Load check**:
   - Play for a few minutes → refresh page → verify state is restored
   - Test Base64 export → import in new incognito window

### Subsequent Phase Verification
- Each phase will include similar browser-based verification
- SAN visual effects can be tested by manually setting SAN via browser console: `$SM.set('character.san', 20)` → verify glitch-blood CSS activates
- Map rendering tested by navigating with WASD and verifying fog-of-war

### User Manual Testing
- After Phase 1+2 delivery, I'll ask you to play through the Null→Spark→Camp flow and provide feedback on pacing, aesthetics, and feel
