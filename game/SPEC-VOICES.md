# Castle Life — character voices (Azure AI Speech)

Adds spoken dialogue to the game, using the same Azure AI Speech service the books' narration uses
(`scripts/generate-narration.py`, voice `en-US-AnaNeural` = "Ana"). Two workstreams:

- **Voices**: `scripts/generate-game-voices.py` → `game/voices/**.mp3` + `game/voices/manifest.json`
- **Engine**: playback + a sound toggle in `js/game.js` / `game.html` / `css/game.css`

Credentials (same as the books' pipeline, documented in `.github/workflows/story-pick-finalize.yml`):
```
export SPEECH_KEY=$(az cognitiveservices account keys list -n imagile-speech -g imagile-organization --query key1 -o tsv)
export SPEECH_REGION=centralus
```
Never print the key. The Azure CLI is already logged in.

## Casting

Ana narrates, exactly as she does in the books. Each companion gets a voice that fits their character
sheet in `books/castle-everstair-series-bible.md` — with pitch/rate shaped in SSML so they read as
*young animals*, not adults. Dirt is the running joke: canon says he has a "deep whistling voice" and
a "wide slow smile", so a tiny jaguar cub rumbles like a bass-baritone grandfather.

| Who | Azure voice | Prosody (SSML) | Why |
|---|---|---|---|
| **Narrator** | `en-US-AnaNeural` | default | The voice of the books — the storybook thread tying game to page. |
| **Baby Lady** | `en-US-AvaNeural` | pitch `+28%`, rate `+12%` | Excitable puppy sister who says "Yip!" — squeaky and bouncing. |
| **Cottontail** | `en-US-JaneNeural` | pitch `+12%`, rate `+4%` | The older, braver cub — warm and confident, a big-sister read. |
| **Winds** | `en-US-AndrewNeural` | pitch `+22%`, rate `+15%` | Breezy, giddy, never still; a bright boyish rush of words. |
| **Dirt** | `en-US-DavisNeural` | pitch `-28%`, rate `-16%` | The joke: canon-deep, slow, unhurried. A cub with a mountain's voice. |

Princess Moon stays **silent** — she's the player, and a silent protagonist lets a kid be her.

## Lines to synthesize

**Companions** — from `game/world.json`, each companion's `dialogue[]` (4 lines) plus `revisit`
(1 line) = **20 clips**. Synthesize the raw line text only; the `"Name: "` prefix is added by the
engine at display time and must NOT be spoken.

**Narrator (Ana)** — milestone events only, never per-gather (that would nag). Exactly these 8,
written in the books' warm read-aloud voice:

| key | line |
|---|---|
| `intro` | Welcome to Castle Everstair. Walk with the arrow keys, and press the sparkle button to gather. |
| `welcome` | Welcome back, Princess Moon. Your castle has been waiting. |
| `recipe` | A new recipe! Have a look in your crafting book. |
| `crafted` | You made something lovely. |
| `room` | A new room is open. Go and see what it looks like. |
| `friend` | You made a new friend. |
| `placed` | It looks lovely right there. |
| `full` | Your satchel is getting full of sparkly things. |

## Contract — `game/voices/manifest.json`

```jsonc
{
  "narrator": { "voice": "en-US-AnaNeural",
    "lines": { "intro": "narrator/intro.mp3", "welcome": "narrator/welcome.mp3", "...": "..." } },
  "companions": {
    "babylady": { "voice": "en-US-AvaNeural",
      "lines": ["babylady/01.mp3", "babylady/02.mp3", "babylady/03.mp3", "babylady/04.mp3"],
      "revisit": "babylady/revisit.mp3" },
    "cottontail": { "...": "..." }, "winds": { "...": "..." }, "dirt": { "...": "..." }
  }
}
```
Paths are relative to `game/voices/`. `lines[]` is index-aligned with that companion's
`dialogue[]` in `world.json` — index N of one is index N of the other.

## Workstream A — `scripts/generate-game-voices.py`

Follow the house style of `scripts/generate-narration.py`: module docstring with usage + env,
`azure-cognitiveservices-speech`, `Audio24Khz48KBitRateMonoMp3`, run via
`uv run --with azure-cognitiveservices-speech python scripts/generate-game-voices.py`.

- Reads `game/world.json` for companion dialogue (single source of truth — no copy-pasted lines) and
  carries the narrator lines + the casting table above as constants at the top of the file.
- Speaks SSML so per-character `<prosody pitch rate>` applies; `html.escape` every line.
- Skips clips that already exist unless `--force` (regeneration is cheap but not free).
- Writes `game/voices/manifest.json` last, listing only files that exist on disk.
- Prints a per-clip summary; exits non-zero if any synthesis fails.

Verify after running: every manifest path exists, every MP3 is non-trivial (> 4 KB), duration is
sane, and the 4 companions are audibly *different voices* (check the reported voice/prosody per clip;
spot-listen is not possible here, so at minimum assert the SSML sent per character differs).

## Workstream B — engine playback

- **Loading**: `fetch('game/voices/manifest.json')` during boot alongside the art manifest. If it
  404s or a clip fails, the game runs silently — never a broken experience, same defensive rule as art.
- **Companion dialogue**: when a dialogue line is displayed, play its clip; advancing a line or
  closing the dialogue stops the current clip immediately (no overlap, ever). First visit plays
  `lines[i]`; a revisit plays `revisit`.
- **Narrator**: play the matching clip on these events — `intro` (first ever run), `welcome` (a
  returning save loads), `recipe` (a recipe unlocks), `crafted` (first craft only, not every craft),
  `room` (a room unlocks), `friend` (first meeting — after that companion's own line finishes, not
  over it), `placed` (first furniture placement only), `full` (first time 40+ total resources held).
  Narrator clips never interrupt a companion; queue or skip rather than overlap.
- **Autoplay**: browsers block audio before a user gesture. Hold the `intro`/`welcome` clip until the
  first keypress/tap, then play. Never let a rejected `play()` promise throw an unhandled rejection.
- **Sound toggle**: a `#btnSound` chip button in `.top-actions` (left of "Start over"), 🔊/🔇, with
  `aria-pressed` and a real `aria-label`. Persist in localStorage key `pm-castle-life-sound` ("on"/
  "off"); default on. Muting stops any playing clip immediately.
- Single shared `Audio` element (or one per channel: companion + narrator) — no unbounded object churn.
- Volume ~0.9; preload none (fetch on demand) so the page stays light.

Keep the existing save format untouched. `node --check` must pass; verify in a browser that dialogue
audio actually fires (spy on `Audio.prototype.play` or check `currentSrc`/`paused`), that muting
silences it, that the toggle persists across reload, and that a missing manifest degrades silently.
