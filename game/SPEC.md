# Princess Moon's Castle Life — build spec

A cozy no-fail gather/craft/decorate game added to the Luna's Story Time static site
(GitHub Pages, **no build step, no frameworks** — plain HTML/CSS/JS, ES2020+, no modules-from-CDN).

## Files

- `game.html` — page shell (root of repo, sibling of `reader.html`)
- `css/game.css` — all game styles (page also loads `css/site.css` first for shared vars)
- `js/game.js` — the whole engine, single file (like `js/reader.js`)
- `game/world.json` — ALL game data (maps, resources, recipes, companions, rooms), one fetch

## Visual language (match the site)

Fonts already loaded via Google Fonts in the page: **Andika** (body), **Berkshire Swash** (headings).
Palette (defined in `css/site.css` `:root`, reuse the vars):
`--night:#1b1b3a --night-deep:#12122a --stone:#b7a7d4 --gold:#e8c46a --gold-soft:#f3dda6 --pink:#f2a9c4 --scale:#d7e3f0 --ink:#2a2140 --paper:#fdf9f0 --paper-edge:#ecdfc8 --radius:22px`.
Dark indigo page, gold accents, pill gold CTA buttons (`linear-gradient(180deg,var(--gold-soft),var(--gold))`, ink text),
cards as dark gradient panels `linear-gradient(180deg,#262150,#1d1a3e)` with `border-radius:var(--radius)`.
Art in this pass is emoji + CSS-gradient tiles (storybook-cute placeholders), NOT images.

## Game rules

- Top-down 2D tile grid rendered as **DOM divs** (no canvas). One `div.tile` per map cell in a CSS grid.
- Player (Princess Moon 👸 styled sprite, emoji 🧜‍♀️ acceptable → use 👑 over a pink-haired emoji? — final: use emoji "🧚" for Moon) is a separate absolutely-positioned element over the grid, moved with a CSS transform transition (~120ms) per tile step.
- Move: arrow keys + WASD. Interact: Space or Enter (also an on-screen D-pad + action button for touch).
- Interact targets the tile the player faces (last move direction); if that tile is empty, also check the player's own tile.
- No fail states, no timers visible to the player. Resource nodes deplete on gather and respawn ~35 seconds later.
- Three outdoor maps connected by edge exits + a house with up to 3 rooms. Castle door tile in Castle Grounds enters the house.
- In the house: player can still walk; clicking is used for decorating (see below).

## Data schema — `game/world.json`

```jsonc
{
  "tileTypes": {
    ".": { "terrain": "grass",  "walkable": true  },
    ",": { "terrain": "path",   "walkable": true  },
    "T": { "terrain": "tree",   "walkable": false },
    "#": { "terrain": "rock",   "walkable": false },
    "~": { "terrain": "water",  "walkable": false },
    "s": { "terrain": "sand",   "walkable": true  },
    "d": { "terrain": "cavefloor", "walkable": true },
    "c": { "terrain": "cavewall",  "walkable": false },
    "f": { "terrain": "floor",  "walkable": true  },
    "w": { "terrain": "wall",   "walkable": false },
    "D": { "terrain": "castledoor", "walkable": true },
    "o": { "terrain": "flowers","walkable": true  },
    "*": { "terrain": "glow",   "walkable": true  }
  },
  "maps": {
    "grounds": {
      "name": "Castle Grounds",
      "outdoor": true,
      "tiles": ["18-char strings...", "... 12 rows"],
      "exits": [ { "x": 0, "y": 6, "to": "shore", "tx": 16, "ty": 6 } ],
      "door":  { "x": 9, "y": 3, "toRoom": "hall" },        // only on grounds
      "resources": [ { "x": 3, "y": 4, "type": "moonflower" } ],
      "npcs": [ "babylady" ]                                  // ids; coords live on companion
    },
    "shore": { ... }, "cave": { ... }
  },
  "resources": {
    "moonflower":  { "name": "Moonflower",   "emoji": "🌸", "node": "🌸", "biome": "grounds" },
    "silverberry": { "name": "Silver Berry", "emoji": "🫐", "node": "🫐", "biome": "grounds" },
    "branch":      { "name": "Branch",       "emoji": "🪵", "node": "🌿", "biome": "grounds" },
    "stone":       { "name": "Stone",        "emoji": "🪨", "node": "🪨", "biome": "grounds" },
    "pearl":       { "name": "Sea-Pearl",    "emoji": "🫧", "node": "🦪", "biome": "shore" },
    "seashell":    { "name": "Seashell",     "emoji": "🐚", "node": "🐚", "biome": "shore" },
    "kelp":        { "name": "Kelp",         "emoji": "🌿", "node": "🪸", "biome": "shore" },
    "sandcrystal": { "name": "Sand-Crystal", "emoji": "✨", "node": "✨", "biome": "shore" },
    "crystal":     { "name": "Crystal Shard","emoji": "🔮", "node": "💠", "biome": "cave" },
    "mushroom":    { "name": "Mushroom",     "emoji": "🍄", "node": "🍄", "biome": "cave" },
    "gem":         { "name": "Gem",          "emoji": "💎", "node": "💎", "biome": "cave" },
    "moss":        { "name": "Moss",         "emoji": "🍀", "node": "🍀", "biome": "cave" }
  },
  "recipes": [
    { "id": "bedframe", "name": "Driftwood Bed", "emoji": "🛏️",
      "needs": { "branch": 4, "stone": 2 },
      "unlock": { "type": "start" },
      "flavor": "A snug bed built from branches the sea polished smooth." }
    // unlock types: {"type":"start"} | {"type":"gathered","count":N} (total resources ever gathered)
    //               {"type":"crafted","count":N} (total items ever crafted) | {"type":"companion","id":"babylady"}
  ],
  "companions": {
    "babylady":   { "name": "Baby Lady",  "emoji": "🐶", "map": "grounds", "x": 5, "y": 8,
                    "dialogue": ["line 1", "line 2", "line 3"],
                    "unlocksRecipe": "flowerpot",
                    "revisit": "one short line for later visits" },
    "cottontail": { ... "map": "cave" }, "winds": { ... "map": "cave" }, "dirt": { ... "map": "grounds" }
  },
  "rooms": [
    { "id": "hall",    "name": "The Great Hall", "tiles": ["12-char strings...", "... 9 rows"],
      "unlock": { "type": "start" },
      "exits": []  },
    { "id": "bedroom", "name": "Moonlit Bedroom", "unlock": { "type": "crafted", "count": 3 }, ... },
    { "id": "searoom", "name": "The Sea Window",  "unlock": { "type": "crafted", "count": 8 }, ... }
  ]
}
```

Room `tiles` use `w` walls, `f` floor, `D` on the hall's bottom edge = exit back outside; rooms connect to each
other via `exits` entries (same shape as map exits, `to` = room id). Locked rooms' doorways render as a sparkly
locked door (engine handles; put a `*` tile where a locked room's doorway is and list the connection in `exits`
with `"room": true`).

Exact content requirements: 12 resources as above; **15 recipes** (5 start, 3 at gathered≥15, 3 at crafted≥3,
4 from companions — one each); recipes must only use resources, counts 1-5, themed names/flavor in the storybook
voice (see the series bible `books/castle-everstair-series-bible.md` for tone). 4 companions with 3-4 dialogue
lines each, warm and in-character (Baby Lady: Moon's puppy sister, pearl wings, mermaid tail instead of back legs;
Cottontail: yellow jaguar cub with black spots and pink hair tuft; Winds: sky-blue-grey jaguar cub, cloud-white
spots, Cottontail's best friend, loves wind; Dirt: soil-brown jaguar cub, green hair tuft, deep slow voice,
things grow where Dirt sleeps). Maps: grounds 18x12 (garden/courtyard/orchard, castle door at top center),
shore 18x12 (beach + sea + dock), cave 18x12 (dark, crystals). Grounds' west edge ↔ shore's east edge;
grounds' east edge ↔ cave's west edge. Each map has 8-10 resource nodes spread across its 4 types.
Every exit/door/NPC/resource must sit on a walkable tile and be reachable from the player start
(grounds, near the door). Player start: grounds x=9 y=5.

## DOM contract — `game.html`

Structure (ids/classes the engine depends on):

```html
<header class="game-top">
  <a class="home-link" href="index.html">🌙 Home</a>
  <h1 class="game-title">Princess Moon's Castle Life</h1>
  <div class="top-actions"><button id="btnReset" class="chip-btn">Start over</button></div>
</header>
<main class="game-main">
  <section class="stage-wrap">
    <div class="location-banner" id="locationName"></div>
    <div id="mapView" class="map-view"></div>   <!-- engine fills: div.tile children + #player -->
    <div id="dialogueBox" class="dialogue-box" hidden>
      <div class="dialogue-portrait" id="dialoguePortrait"></div>
      <div class="dialogue-text" id="dialogueText"></div>
      <button id="dialogueNext" class="cta small">Next ✨</button>
    </div>
    <div id="toast" class="toast" hidden></div>
    <div class="touch-controls">
      <div class="dpad">
        <button data-dir="up">▲</button><button data-dir="left">◀</button>
        <button data-dir="down">▼</button><button data-dir="right">▶</button>
      </div>
      <button id="btnAction" class="action-btn">✨</button>
    </div>
  </section>
  <aside class="hud">
    <section class="hud-panel" id="inventoryPanel"><h2>Satchel</h2><div class="inv-grid" id="invGrid"></div></section>
    <section class="hud-panel" id="craftPanel"><h2>Crafting</h2><div id="recipeList"></div></section>
    <section class="hud-panel" id="furniturePanel"><h2>Furniture</h2><div id="furnList"></div>
      <p class="hint" id="decorHint" hidden>Tap a furniture piece, then tap a floor tile to place it 💫</p></section>
  </aside>
</main>
<div id="confirmModal" class="modal" hidden> ... generic confirm with #confirmText, #confirmYes, #confirmNo ... </div>
```

Engine-generated markup:
- tiles: `<div class="tile t-grass" style="...">` (class `t-<terrain>`); resource nodes get extra
  class `res` + emoji as textContent, `depleted` when gathered; door tiles `t-castledoor` show 🏰🚪 emoji;
  NPCs are tiles with class `npc` + emoji; placed furniture: class `furn` + emoji; locked doorway: class `locked` ✨🔒.
- player: `<div id="player" class="player face-down">🧚</div>` absolutely positioned,
  `transform: translate(Xpx, Ypx)` using a `--tile` px size, CSS `transition: transform 120ms`.
- `#mapView` gets `style.gridTemplateColumns = repeat(W, var(--tile))` and a `data-map` attribute.
- Recipe rows: `<button class="recipe [craftable|locked-hidden]">` with name, emoji, needs as
  `<span class="need [have]">2🪨</span>` chips, click = craft (engine).
- Furniture rows: `<button class="furn-item" data-item="bedframe">` emoji + name + count; click = select for placement.
- HUD craft/furniture buttons must have `aria-label`s; dialogue box uses `role="dialog"`.

## Engine — `js/game.js`

Plain script (no ES modules), IIFE, `fetch('game/world.json')` then init. Responsibilities:

1. **State**: `{ mapId | roomId, x, y, facing, inv:{res:count}, furniture:{item:count}, placed:{roomId:[{x,y,item}]}, met:[companionIds], totals:{gathered, crafted}, nodesDepleted:{ "map:x:y": timestampWhenRespawns } }`.
2. **Save/load**: localStorage key `pm-castle-life-v1`, save (debounced ok) after every mutation; load on boot; corrupt/missing → fresh start. "Start over" button → confirm modal → wipe + reload.
3. **Rendering**: render current map/room grid once per map entry; update individual tiles on change (don't re-render the whole grid every step). Player element moves via transform. Camera: the map fits the stage (18 cols) — size `--tile` responsively via CSS (`min()` math), no scrolling camera needed.
4. **Movement**: keydown (arrows/WASD, ignore when dialogue/modal open, `preventDefault` so page doesn't scroll), hold-to-repeat ok via keydown auto-repeat; collision per tileTypes.walkable + NPC tiles + placed furniture blocked; edge exits & doors teleport with a short fade (class on mapView).
5. **Interact** (Space/Enter/action button): facing tile → resource node (gather: inv++, totals.gathered++, node depletes, sparkle burst animation, toast "+1 🌸 Moonflower"), NPC (dialogue sequence; first time: mark met, then if unlocksRecipe show toast "New recipe: ..." + un-hide it), castle door (enter hall), house exit door (back to grounds), locked room doorway (toast: what's needed to unlock, e.g. "Craft 3 more treasures to open this room ✨").
6. **Respawn**: depleted nodes store respawn timestamps; a 1s interval revives due nodes (only visible effect if on that map). Persisted timestamps ok to drop on reload (treat all as respawned) — simpler, acceptable.
7. **Crafting**: recipe unlocked if condition met (recompute after every gather/craft/meet). Locked-but-known tier recipes show as "???" rows with a hint ("Keep exploring…"); companion recipes hidden entirely until met. Craft click: check counts, subtract, furniture[item]++, totals.crafted++, toast + sparkle, re-render panels, check room unlocks (toast "The Moonlit Bedroom is open! 🎉").
8. **Decorating** (house only): click `.furn-item` → placement mode (selected class, `#decorHint` shown, cursor hint); click empty floor tile → place (furniture--, placed[] push); click placed furniture → small inline menu (Move / Put away) — Move re-enters placement with that item removed from the grid; Put away returns it to furniture inventory. Esc cancels placement. Placed furniture blocks walking.
9. **Room unlocks**: recompute on craft; locked doorway tiles become open doors with a celebration toast.
10. **First-run**: tiny intro toast/overlay ("Walk with arrow keys · ✨ to gather · Craft cozy things for your castle").
11. Everything defensive: unknown items in save ignored; JSON validated loosely.

Keep it readable and commented lightly — a future session swaps emoji for art. ~600-900 lines expected.

## CSS — `css/game.css`

- Loads after site.css. Page background `var(--night)` with the site's starfield feel (reuse simple
  `.star`-like twinkle or a subtle radial gradient glow — cheap, no JS needed beyond what engine adds).
- `--tile: clamp(26px, min(4.5vw, 5.5vh), 44px)` (tune so 18x12 fits without page scroll on a laptop).
- Terrain looks (CSS gradients, no images): grass = soft indigo-green, path = warm sand,
  water = animated-ish deep blue w/ subtle shimmer gradient, sand = pale gold, cave floor = deep plum,
  cave wall = darker w/ faint crystal speckle, house floor = warm paper/wood tone, walls = lavender stone.
  Emoji in tiles centered, sized ~70% of tile.
- Player: slightly larger than a tile, drop-shadow glow (gold), gentle idle bob animation; `.face-left { transform ... scaleX(-1) }` on the inner span if needed.
- HUD panels: dark gradient cards like `.book-card`; headings Berkshire Swash gold-soft.
- Recipe rows: craftable = gold-tinged + hover lift; uncraftable = dimmed; need chips: small pills, `.have` = gold, missing = grey.
- Dialogue box: paper (`var(--paper)`, ink text) rounded panel over the map bottom, portrait emoji big on the left — storybook feel.
- Toast: pill bottom-center, indigo glass w/ gold border, fade in/out.
- Sparkle burst: engine adds `.sparkle-burst` element with ✦ ✧ children; CSS animates outward + fade.
- Touch controls: hidden on wide+hover devices (`@media (hover:hover) and (min-width: 900px)`), shown otherwise; big rounded translucent buttons.
- Responsive: below 900px HUD stacks under the map; map stays fully visible.
- `@media (prefers-reduced-motion: reduce)`: kill bob/shimmer/burst animations.
