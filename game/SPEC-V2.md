# Princess Moon's Castle Life v2 — Phaser port + generated sprite art

Upgrade of the working v1 game (see `game/SPEC.md` for the v1 contract and game rules — **all game
rules, data, and save format stay identical**). Two workstreams build in parallel against the shared
asset-manifest contract below:

- **Art**: generate watercolor sprites with the image-generation skill → `game/assets/` + `game/assets/manifest.json`
- **Engine**: rewrite the render layer on Phaser 3 (vendored, no build step) → `js/game.js` + `game.html` map area

The site remains plain static GitHub Pages: no bundler, no ES-module imports from CDNs at runtime.
Phaser is vendored as a single minified UMD file committed to the repo.

## Shared contract — `game/assets/manifest.json`

```jsonc
{
  "tileSize": 256,                    // px of source terrain tiles (square, opaque)
  "terrain": {                        // opaque, full-bleed square textures
    "grass":  "terrain/grass.webp",
    "grass2": "terrain/grass2.webp",  // variant; engine scatters it among grass for texture
    "path":   "terrain/path.webp",
    "dock":   "terrain/dock.webp",    // used for "path" terrain on the shore map only
    "tree":   "terrain/tree.webp",    // tree ON grass base (opaque tile)
    "rock":   "terrain/rock.webp",    // boulder on neutral ground, reads on grass/sand/cave
    "water":  "terrain/water.webp",
    "sand":   "terrain/sand.webp",
    "cavefloor": "terrain/cavefloor.webp",
    "cavewall":  "terrain/cavewall.webp",
    "floor":  "terrain/floor.webp",   // warm interior wood
    "wall":   "terrain/wall.webp",    // lavender castle stone
    "flowers":"terrain/flowers.webp", // grass with tiny flowers
    "glow":   "terrain/glow.webp",    // cave floor with glowing moss/crystals
    "castledoor": "terrain/castledoor.webp", // castle gate façade (outdoor D tile)
    "dooropen":   "terrain/dooropen.webp"    // interior wooden door (indoor D + unlocked room doors)
  },
  "characters": {                     // transparent bg, full-body, facing viewer turned slightly right
    "moon": "characters/moon.webp",   // ~1024 source; engine displays ~1.15x tile height
    "babylady": "characters/babylady.webp",
    "cottontail": "characters/cottontail.webp",
    "winds": "characters/winds.webp",
    "dirt": "characters/dirt.webp"
  },
  "nodes": {                          // transparent bg, single object, gatherable resource nodes
    "moonflower": "nodes/moonflower.webp",   // clump of glowing pink-white flowers
    "silverberry": "nodes/silverberry.webp", // bush with silvery-purple berries
    "branch": "nodes/branch.webp",           // small pile of smooth driftwood branches
    "stone": "nodes/stone.webp",             // stack of round river stones
    "pearl": "nodes/pearl.webp",             // open oyster with a glowing pearl
    "seashell": "nodes/seashell.webp",       // pretty spiral shells on sand
    "kelp": "nodes/kelp.webp",               // tuft of teal kelp/coral
    "sandcrystal": "nodes/sandcrystal.webp", // small golden crystal cluster
    "crystal": "nodes/crystal.webp",         // indigo-blue crystal outcrop
    "mushroom": "nodes/mushroom.webp",       // cluster of rosy glowing mushrooms
    "gem": "nodes/gem.webp",                 // faceted gems in rock
    "moss": "nodes/moss.webp"                // soft glowing green moss tuft
  },
  "furniture": {                      // transparent bg, single cozy object, slight 3/4 top-down view
    "bedframe": "furniture/bedframe.webp",       // Driftwood Bed
    "flowerpot": "furniture/flowerpot.webp",     // Moonflower Pot
    "pathstones": "furniture/pathstones.webp",   // Garden Stepping Stones
    "berrybasket": "furniture/berrybasket.webp", // Silverberry Basket
    "windowbox": "furniture/windowbox.webp",     // Window Flower Box
    "shellchime": "furniture/shellchime.webp",   // Seashell Wind Chime
    "nightlight": "furniture/nightlight.webp",   // Crystal Nightlight
    "mosscushion": "furniture/mosscushion.webp", // Moss Cushion
    "sandglass": "furniture/sandglass.webp",     // Sand-Crystal Hourglass
    "pearlmirror": "furniture/pearlmirror.webp", // Pearl Hand Mirror
    "gemcrown": "furniture/gemcrown.webp",       // Little Gem Crown
    "puppynook": "furniture/puppynook.webp",     // Cozy Puppy Nook (round puppy bed)
    "seedjar": "furniture/seedjar.webp",         // Seed Keeping Jar
    "shellnecklace": "furniture/shellnecklace.webp", // Shell & Claw Necklace (on a stand)
    "cloudkite": "furniture/cloudkite.webp"      // Cloud-Wind Kite
  },
  "fx": {
    "sparkle": "fx/sparkle.webp"      // single soft 4-point gold star, transparent, for particles
  }
}
```

Paths are relative to `game/assets/`. The engine must run with ANY subset missing: on 404 it
substitutes a generated fallback texture (rounded color swatch per terrain + the v1 emoji drawn as a
Phaser Text on top), so the port is fully testable before the art lands.

## Workstream A — sprite art (image-generation skill)

Every prompt MUST embed the global style (from `.claude/image-generation/style.md`):
"Painterly children's storybook illustration, soft watercolor and colored-pencil texture, visible
brushwork, warm golden lamplight against deep indigo night, lavender and pearl-grey stone, gentle
rounded shapes, no harsh lines, no photorealism, no text, no words, no letters" + the palette hexes
(#1B1B3A indigo, #B7A7D4 lavender, #E8C46A gold, #F2A9C4 rose pink, #D7E3F0 pearl, #2A2140 plum).
It is a NIGHT world: outdoor tiles read as moonlit (cool indigo-tinted greens/sands), interiors warm
lamplit.

- **Terrain tiles**: prompt for "a single seamless top-down ground texture filling the entire square
  frame, game tile, soft even lighting, no border, no vignette". Opaque. Source 512-1024px, delivered
  at 256px webp. `tree`/`rock`/`castledoor`/`dooropen` are object-on-ground tiles viewed top-down-3/4.
- **Characters**: use the book character sheets VERBATIM in the prompt (they are canon — from
  `books/dirt-and-the-blue-sisters-pot/book.json`): Princess Moon, Baby Lady (NO back legs — puppy
  body ends in mermaid tail, front paws only), Cottontail, Winds, Dirt. "chibi full-body game sprite,
  standing, facing the viewer turned slightly to the right, transparent background, single character,
  whole body visible". One pose each (engine flips horizontally for left-facing and adds a bob).
- **Nodes & furniture**: "single small object, game item sprite, transparent background, centered,
  whole object visible" + the per-asset description in the manifest comments above.
- Transparent-background assets may be batched 2x2 per generation and auto-sliced by connected
  alpha regions if that speeds things up — but every delivered file is one asset, trimmed to content
  with ~6% padding, longest side 512px (characters 768px), webp with alpha.
- Write `game/assets/manifest.json` exactly as above (only include files that really exist).
- Validate with a script: every manifest path exists, terrain files are square+opaque, transparent
  classes have alpha, none smaller than 128px. Spot-check visual consistency; regenerate outliers
  (wrong style, white background, text in image, wrong character anatomy — especially Baby Lady's
  missing back legs rule).

## Workstream B — Phaser 3 port (`js/game.js` rewrite)

- Vendor Phaser: download the current Phaser 3 minified UMD build (e.g. from the npm registry
  tarball or jsdelivr) to `js/vendor/phaser.min.js` and commit it. `game.html` loads it before
  `js/game.js`. Record the version in a comment at the top of `js/game.js`.
- **Hybrid architecture — keep the DOM HUD.** Phaser owns ONLY the map stage: the canvas mounts in
  `#mapView` (Phaser `parent`), scaling with `Phaser.Scale.FIT` to the container. Everything else
  stays DOM exactly as v1: header, satchel/crafting/furniture panels, dialogue box, toasts, confirm
  modal, touch d-pad (bridge its events into the scene). Reuse the existing HUD-rendering/dialogue/
  save/unlock logic from v1's `js/game.js` (port the functions over; do not re-derive the rules).
  HUD panels upgrade their emoji to `<img>` sprites from the manifest where available (fall back to
  the emoji when missing).
- **Scenes**: `BootScene` (fetch world.json + manifest.json, load textures, build fallback textures
  for missing assets) → `WorldScene` (one scene re-populated per map/room change).
- **World rendering**: one Image per tile (18x12 or room size) from the terrain textures; scatter
  `grass2` pseudo-randomly (seeded by x,y so it's stable); shore `path` uses `dock`. Nodes,
  furniture, NPCs, and the player are sprites above the ground layer, y-sorted. Locked room
  doorways: `wall` texture + a pulsing gold sparkle overlay; they swap to `dooropen` when unlocked.
- **Save/data compat**: `game/world.json` unchanged; localStorage key `pm-castle-life-v1` unchanged
  and byte-compatible with v1 saves (same sanitizer behavior).
- **Movement & feel**: grid-locked, tweened ~150ms per step with a tiny hop arc; hold-to-repeat
  (keyboard auto-repeat + d-pad hold, single-pointer rule from v1); facing flips the sprite.
  Camera is static (whole map fits) — add a soft 250ms fade through black on map/room transitions
  and a gentle zoom-settle (1.03→1.0) on arrival.
- **Juice** (all gated behind `prefers-reduced-motion`):
  - gather/craft/place → gold star particle burst (fx/sparkle) at the tile,
  - water: slow alpha-shimmer overlay tween; glow tiles: soft pulsing light halo,
  - cave: dark vignette overlay + light halos around glow tiles and the player,
  - trees/flowers: sub-pixel sway on random phase; NPCs: soft idle bob; player: idle bob when still,
  - footstep dust puff every step outdoors.
- **Interactions**: pointer/tap on canvas tiles for decorating (place/select) — convert pointer to
  tile coords through the scale manager; the Move/Put-away menu stays the DOM `.inline-menu`,
  positioned from canvas-space→page-space conversion, closed on resize (v1 fix). Keyboard interact,
  dialogue flow, unlock toasts: identical behavior to v1.
- **Testability hook** (canvas is opaque to DOM inspection — this is required): expose
  `window.__castleLife = { version: 2, getState: () => <deep-copy of save-shape state>,
  getMapId: () => current map/room id, tick: () => undefined }` — read-only accessors only.
- `css/game.css`: keep HUD/dialogue/toast/modal styles; `#mapView` becomes the canvas host
  (aspect-ratio box, rounded corners, same framing); delete tile/terrain/player DOM styles that no
  longer apply. Touch controls/media queries unchanged.
- Same acceptance bar as v1: full loop (walk, gather, talk, craft, place, room unlock, save/reload,
  reset) works with arrow keys, d-pad, and pointer; no console errors; `node --check` passes.
