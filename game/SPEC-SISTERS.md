# Castle Life — the tower sisters arrive

Cheeblest joins the game as a **friend** (a fifth companion). The other tower sisters — Evilest,
Beedlist, Shock — **drop in for a short cutscene and leave**, which is how Cheeblest ends up staying.
Leeblebeest may appear too if it fits the scene.

Tone: this is a cozy no-fail game for 4-8 year olds. The sisters are *storybook* spooky — dramatic,
a little haughty, never actually frightening, never threatening the player. Nobody is in danger. The
scene should read as funny and a bit grand, ending warm. Canon lives in
`books/castle-everstair-series-bible.md` and the `characters` sheets in any book's `book.json`
(Shock's mask **never** comes off, on any page, ever).

## Data contract — additions to `game/world.json`

**1. Cheeblest as a companion** (same shape as the existing four), placed on a walkable tile that is
reachable and doesn't collide with a resource, exit, door or another NPC. Give her 4 dialogue lines
plus a `revisit`, a warm and slightly shy read, and `unlocksRecipe` pointing at a new 16th recipe
that fits her (something from the tower: a lantern, a quilt, a little bell — your call, themed to the
resources that already exist, counts 1-5, same flavor-text voice as the rest). Add:

```jsonc
"appearsAfter": "tower-sisters"   // engine hides her until that cutscene has played
```

**2. A `cutscenes` array**, new top-level key:

```jsonc
"cutscenes": [
  {
    "id": "tower-sisters",
    "trigger": { "type": "crafted", "count": 5 },   // same condition vocabulary as recipe unlocks
    "map": "grounds",                                // only fires while the player is on this map
    "steps": [
      { "speaker": "evilest",  "text": "...", "at": { "dx": 0,  "dy": -2 } },
      { "speaker": "beedlist", "text": "...", "at": { "dx": -2, "dy": -2 } },
      { "speaker": "shock",    "text": "...", "at": { "dx": 2,  "dy": -2 } },
      { "speaker": "cheeblest","text": "...", "at": { "dx": 1,  "dy": -1 } },
      { "speaker": "narrator", "text": "..." }       // no `at`: nobody appears, Ana speaks
    ]
  }
]
```

- `at.dx/dy` is an offset from the player's tile; the engine clamps it to somewhere sensible on
  screen. A speaker keeps standing where they first appeared for the rest of the scene.
- 5-7 steps total. Each line short enough for a 4-year-old's patience (one or two sentences).
- The last step should land the emotional beat: the three sisters sweep off, Cheeblest stays.

## Art

Generate sprites in the established style for **cheeblest, evilest, beedlist, shock** (and
leeblebeest if you use her) into `game/assets/characters/<id>.webp`, and add them to
`game/assets/manifest.json` under `characters`. Match the existing character sprites exactly in
treatment: chibi full-body game sprite, standing, facing the viewer turned slightly right,
transparent background, whole body visible, trimmed to content with ~6% padding, longest side 768px,
webp with alpha. Use each character's sheet from `book.json` **verbatim** in the prompt plus the
global style string from `.claude/image-generation/style.md`. Look at an existing sprite
(`game/assets/characters/cottontail.webp`) first and match its scale and framing.

QC every image before accepting it: correct canon (Shock fully masked, no face; Beedlist entirely
black with no colour; Leeblebeest blue all over), no text in the image, real transparency, and
consistent with the other five sprites.

## Voices

Casting is already fixed in `scripts/voice-cast.json` — read it, don't invent voices. Extend
`scripts/generate-game-voices.py` to (a) read the cast from that file instead of its hardcoded table
(keeping the existing five sounding **byte-identically the same** — same voice, pitch and rate), and
(b) generate clips for Cheeblest's dialogue plus every cutscene line, writing them into
`game/voices/` and `game/voices/manifest.json`.

Manifest additions:

```jsonc
"companions": { "cheeblest": { "voice": "...", "lines": [...], "revisit": "..." } },
"cutscenes": { "tower-sisters": ["cutscenes/tower-sisters/01.mp3", "..."] }   // index-aligned with steps[]
```

Credentials, exactly as the repo's CI does it (never print the key):
```
export SPEECH_KEY=$(az cognitiveservices account keys list -n imagile-speech -g imagile-organization --query key1 -o tsv)
export SPEECH_REGION=centralus
```
Run with `uv run --with azure-cognitiveservices-speech python scripts/generate-game-voices.py`.

## Verify

- `game/world.json` still passes a structural check: every companion/resource/exit/door coordinate in
  bounds, walkable, non-overlapping, and reachable from the player start; every `unlocksRecipe`
  resolves to a recipe whose unlock is `{type:"companion", id:"cheeblest"}`; recipe needs reference
  real resources.
- Every new sprite and voice path in the two manifests exists on disk and is non-trivial.
- Cutscene `speaker` ids all resolve to a companion or `narrator`, and each has a voice clip.
- Report clip count, voices used, sprite sizes, and anything you could not deliver.
