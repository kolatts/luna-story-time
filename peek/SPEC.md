# The Great Present Peek — SPEC

A gentle stealth game for Luna's Story Time. Night before the twins' birthday, **Princess Moon and Baby Lady sneak down through the castle to peek at the party and the presents**. You control BOTH of them at the same time with one set of controls. Endless procedurally generated floors. Ages 4–8: nobody is ever hurt, nothing is scary, there is no fail state (bible rule 8 applies: "the scary things are masks, silence, and doors").

## Files (mirrors Castle Life conventions — page at repo root, root-relative fetch paths)

- `peek.html` — page (loads `css/site.css`, `css/peek.css`, `js/vendor/phaser.min.js` (deferred), `js/peek.js`)
- `css/peek.css` — HUD/overlay styles (dark night palette, same family as `css/game.css`)
- `js/peek.js` — the whole engine (Phaser 3 map render + DOM HUD, like `js/game.js`)
- `peek/SPEC.md` — this file
- `peek/assets/manifest.json` + `peek/assets/<group>/*.webp` — sprites (contract below)
- `peek/voices/manifest.json` + `peek/voices/<speaker>/*.mp3` — voice clips (contract below)
- `peek/voice-lines.json` — the spoken lines (input to the generator; contract below)
- `scripts/generate-peek-voices.py` — Azure TTS generator (modeled on `scripts/generate-game-voices.py`, same casting file `scripts/voice-cast.json`)
- `games/present-peek/cover.webp` — shelf cover
- Register in `games/games.json`: `{"slug":"present-peek","title":"The Great Present Peek","subtitle":"Sneak two sisters past the party — don't get spotted!","href":"peek.html","cover":"games/present-peek/cover.webp","badge":"Sneaky fun · Ages 4-8"}`

## Core mechanic — one input, two heroes

- Grid-based, top-down, tile size 256 world units, camera shows ~11 tiles across, Phaser `Scale.FIT`.
- Every movement input (arrow keys / WASD / touch stick, 4-way dominant axis) steps **both** Moon and Baby Lady one tile in that direction simultaneously (tween ~150 ms per step, hold-to-repeat).
- If a character's target tile is blocked *for her*, she stays put while the other moves — this desyncs them and is the whole puzzle.
- Passability asymmetry:
  - `wall` blocks both. `carpet`/`carpet2`/`rug`/`stairs` open to both.
  - `table` (prop): Baby Lady may enter (she scoots under — render her beneath it, slightly darkened); Moon is blocked. Standing under a table HIDES Baby Lady.
  - `curtain` (prop): Moon may enter (she slips behind — render behind curtain, slightly darkened); Baby Lady is blocked. Standing in a curtain HIDES Moon.
  - `plant` (prop): both may enter; hides whoever stands there. At most a few per floor.
  - `arch` (prop, a puppy-sized archway in a wall segment): Baby Lady only.
  - Characters never collide with each other or with guests (guests are "looking", not walls).
- Action button / Space: **Hush** — both freeze and crouch for 2.5 s (small "shh" visual). While hushed on ANY tile they cannot be spotted. Cooldown 3 s. Simple, forgiving.

## Guests (the "guards")

- Cast (all already in `scripts/voice-cast.json`): `winds`, `dirt`, `cottontail`, `cheeblest`, `evilest`, `beedlist`, `purpleshine`, `pinkshine`, and special `leeblebeest`.
- Guests patrol generated loops (back-and-forth along corridors) at a gentle pace (560 ms/tile at floor 1, ramping to 380 ms, capped — eased 2026-08-25). Facing = movement direction.
- **Vision**: a soft golden cone, straight line of tiles in facing direction, length 2 (floor 1–3) → 3 (4–9) → 4 (10+), blocked by `wall`, `curtain`, `table`, `plant`. Render it as a translucent warm glow so kids can see it.
- `leeblebeest` ("the watcher who never slept") never walks: she stands and slowly rotates her gaze 90° every ~2.5 s. Appears from floor 4.
- **Red-light-green-light rule** (added after playtest): STEPPING into a lit cone tile spots you at once, but STANDING still in the light is safe for 2 s ("hold your breath") so a sweeping cone can pass over a frozen hero — linger longer and you're seen. A 300 ms heartbeat enforces the dwell even when no guest event fires. The entrance rug is always safe (the doorway's shadow) — without this, a cone sweeping the rug re-spots freshly returned heroes forever.
- **Spotted**: freeze inputs, the guest speaks a voiced spotted-line, big friendly "Ooh!" speech bubble, gentle white fade, both heroes return to the floor's entrance rug. Nothing else is lost. This must feel funny, not punishing.

## Floors — endless

- Floor N is generated from a seeded RNG (mulberry32; seed = `runSeed * 1000 + N`) so a run is reproducible; `runSeed` is random per new run.
- Generator: a bordered grid ~ 16×11 (grow to 20×13 by floor 8), carve 3–5 rooms joined by corridors; place entrance `rug` on one edge, `stairs` on the far side, **presents** (2 on floor 1 → up to 5) inside rooms, tables/curtains/plants/archways so both heroes always have a route (validate with per-character BFS from rug to every present and the stairs; regenerate on failure, max 20 tries then fall back to a handcrafted floor).
- Walking either hero onto a present tile "peeks" it: sparkle burst, present opens slightly, +1 score, Baby Lady yip or narrator quip sometimes.
- Stairs unlock (glow) once all presents on the floor are peeked; both heroes must reach the stairs tile (either order; first one waits with a small bounce) → floor transition.
- **Every 5th floor is the Party Landing**: no guests, a long table with `cake`, balloons, presents everywhere, guests dancing harmlessly as decoration, narrator line plays, one giant present to peek → stairs. A safe breather that makes "endless" feel like a celebration, not a treadmill.
- Guest count: floor 1 = 1, +1 every 3 floors, cap 5 (eased 2026-08-25).
- **Progress persists** (added 2026-08-25): the save carries `run: {seed, floor, score, peeked[]}` — the seed plus floor number regenerate the map exactly, so only the current floor's peeked present indices need listing. On boot a valid run resumes in place (HUD, score, unlocked stairs and all), the intro overlay gains a "Welcome back! You left off on floor N" note, and a **Start a brand-new sneak** button rerolls the seed. A malformed/absent `run` is dropped by `sanitizeRun` and the game starts fresh while keeping `bestFloor`/`bestScore`. Snapshot points: every peek, every floor change, and pagehide/visibilitychange (capture-then-flush).
- **Floors & progress panel** (added 2026-08-25): a 🗺️ HUD button (also `Esc`/`M`) opens a modal listing every floor from 1 to `bestFloor` — party floors marked 🎂, the current floor highlighted. Tapping one jumps there **keeping the run's seed**, so it is the same castle the player already knows (score carries over; that floor's presents regenerate unpeeked). The panel freezes input while open (`busy()` includes `menuOpen`), closes on `Esc`/backdrop tap/"Keep sneaking", and grants a 1 s grace on close. **Clear all progress** is a two-tap arm-then-confirm inside the panel (never a browser `confirm()`): it removes the save key, resets bests, and starts a fresh seeded run. The panel is `position: fixed` — `.stage-wrap` extends past the viewport on phones and clipped an absolutely-positioned card.
- HUD: floor number, presents peeked (score), best floor + best score from localStorage `pm-present-peek-v1` (shape: `{bestFloor, bestScore, sound, run}`; debounced writes + pagehide flush — test seeds must be planted from another page, e.g. index.html, exactly like Castle Life).

## Voices

`peek/voice-lines.json` (the single input; every speaker id must exist in `scripts/voice-cast.json`):

```json
{
  "narrator": {
    "intro": "It was the night before the birthday, and two small shadows were not asleep...",
    "floor": "...", "party": "...", "spotted": "...", "best": "..."
  },
  "speakers": {
    "winds":   { "spotted": ["...", "..."], "hmm": ["..."] },
    "babylady": { "yip": ["Yip!", "Yip yip!"], "peek": ["..."] }
  }
}
```

- `scripts/generate-peek-voices.py`: same env (`SPEECH_KEY`, `SPEECH_REGION` default centralus, key via `az cognitiveservices account keys list -n imagile-speech -g imagile-organization --query key1 -o tsv`), same SSML prosody shaping from voice-cast.json, output `peek/voices/<speaker>/<key>-<nn>.mp3`, `peek/voices/narrator/<key>.mp3`, writes `peek/voices/manifest.json` listing only files actually on disk. Skip-existing unless `--force`. Format Audio24Khz48KBitRateMonoMp3.
- Engine playback mirrors `js/game.js:1447-1553`: one shared lazy `Audio`, volume 0.9, stop-then-play, swallow rejections, sound toggle `#btnSound` persisted in the save, autoplay gated behind first user gesture, boot survives a missing manifest (silent game).
- Moon never speaks (she's the player; canon). Baby Lady yips on peeks. Guests speak their `spotted` line when they spot you and occasionally a `hmm` line when a hero passes one tile behind them (rate-limited, ≥8 s apart). Narrator: intro once per run, party floors, new-best moments.

## Art

- Same pipeline as Castle Life: gpt-image-2 via `imagile-dev-tools:image-generation` skill, global `.claude/image-generation/style.md` auto-applied, 1024×1024 for sprites; convert preserving ALPHA for characters/props (do NOT use `to-webp.py` for these — it flattens to RGB; use an RGBA-preserving Pillow call). Terrain tiles are opaque squares.
- `peek/assets/manifest.json`: `{"tileSize":256, "terrain":{id:"terrain/x.webp"}, "props":{...}, "characters":{...}, "fx":{...}}`.
- Required ids — terrain: `carpet`, `carpet2`, `wall`, `stairs`, `rug`; props: `curtain`, `table`, `plant`, `arch`, `present1`, `present2`, `present3`, `present-giant`, `cake`, `balloons`; characters: `moon`, `babylady`, `winds`, `dirt`, `cottontail`, `cheeblest`, `evilest`, `beedlist`, `purpleshine`, `pinkshine`, `leeblebeest`; fx: `sparkle`.
- Character sheets are read VERBATIM from the newest book.json that has them (bible rule 10); bible rule 11 invariants apply (full round sky moon only, crescents as motif only, Baby Lady has NO back legs, all sisters are children, no text/signature squiggles).
- **The engine must boot and be fully playable with zero assets on disk**: painted canvas swatches per terrain id + emoji labels for characters/props (🎁🛋️🪴🕯️👧🐶 etc.), exactly like Castle Life's `buildFallbackTextures`.

## Touch (iPad)

Implement `game/SPEC-TOUCH.md` verbatim: floating thumbstick lower-left 45%, ~22% dead zone, hold-to-repeat, dominant axis; round Hush button bottom-right ≥88 px; per-control pointerId; overlay `pointer-events:none` except live controls; gate on `(pointer: coarse)` + `maxTouchPoints>0`; viewport-fit=cover etc.; 44 px hit targets.

## Test hook

`window.__presentPeek` (read-only): `{version, getState(), getFloor(), getPositions() /* {moon:{x,y}, babylady:{x,y}, guests:[{id,x,y,facing}]} */, getSeed(), setSeed(runSeed) /* before start */, getSavedRun(), resumedFrom() /* 0 = fresh */, tick()}`. Seeding a save for a test must be done from ANOTHER page (index.html) then navigating — the engine's pagehide flush clobbers a same-page seed. Movement is tween-paced — paced synthetic keydown/keyup on `document.body`, never burst-dispatch.

## Tone guardrails (canon)

- Moon and Baby Lady NEVER argue (bible rule 1). Being spotted is warm and funny: "Back to bed, you two!" — the guests are family, not enemies.
- No darkness-as-threat, no chase music sting; ambience stays cozy. Night palette: indigo/lavender/gold per style.md.
