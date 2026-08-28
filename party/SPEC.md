# The Birthday Party Patrol — SPEC

The third game on Luna's Story Time and the first **multiplayer** one: a gentle tower-defense
for 1–4 players (ages 4–8) with room codes. It is the twins' birthday party at Castle Everstair.
The sneaky side wants the presents and the food — they will do whatever it takes — and the
Party Patrol stands in their way. Players choose a side: **Party Patrol** (heroes) or
**Sneaky Snackers** (villains). Any side with no players is played by the castle itself (AI),
so one kid alone still gets a full game.

Bedtime-safe (bible rule 8): nobody is hurt. Booped snackers pop into a puff of stars and
scamper home. Stolen goodies are "carried off to the tower for a midnight feast." Whatever the
score, the end screen says everyone came back for cake — because at Castle Everstair even
storms get a bowl of soup.

## Files (mirrors Present Peek conventions — page at repo root, root-relative fetch paths)

- `party.html` — page (loads `css/site.css`, `css/party.css`, `js/vendor/phaser.min.js` deferred, `js/party.js`)
- `css/party.css` — lobby/HUD/overlay styles (sunlit garden-party palette on the site's indigo frame)
- `js/party.js` — everything: net client, lobby, host simulation, render, input
- `party/SPEC.md` — this file
- `party/assets/` — only the genuinely NEW sprites; the sprite map lives inline in `js/party.js`
  (`SPRITES`) with **site-root-relative** paths so the game reuses Present Peek + Castle Life art
  (`peek/assets/...`, `game/assets/...`) directly
- `games/birthday-party-patrol/cover.webp` — shelf cover
- `api/Luna.StoryTime.Functions/Functions/PartyRoomFunctions.cs` (+ models) — the multiplayer backend
- Register in `games/games.json`:
  `{"slug":"birthday-party-patrol","title":"The Birthday Party Patrol","subtitle":"Team up — or team mischief! Guard the birthday goodies with up to 4 friends.","href":"party.html","cover":"games/birthday-party-patrol/cover.webp","badge":"Multiplayer · Ages 4-8"}`

## Multiplayer architecture — polling + Azure Functions mailbox

No websockets. The existing Function App (`luna-storytime-functions`, .NET 10 isolated) gains a
"mailbox" API over a new Azure Table `PartyRooms`. **The host's browser is the game server**:
the creator of the room runs the authoritative simulation, posts state snapshots, and consumes
guest commands. Guests post commands and poll snapshots. Latency-tolerant by design — every
player action is a *command* (place a tower, send a snacker), never twitch steering.

- `POST api/party/rooms` → create → `{ code, playerId, secret }` (code: 4 letters, no I/O/L/U)
- `POST api/party/rooms/{code}/join` → `{ playerId, secret, room }` (409 when full: 4 players; 404 unknown; 410 already started)
- `POST api/party/rooms/{code}/player` `{ playerId, secret, side?, character?, ready? }` → room — lobby prefs + heartbeat (`lastSeen`)
- `POST api/party/rooms/{code}/start` (host only) → phase `playing`
- `GET  api/party/rooms/{code}?after={rk}` → `{ phase, players, snapshot, snapshotVersion, result, commands[] (rk > after) }`
- `POST api/party/rooms/{code}/command` `{ playerId, secret, cmd }` → `{ rk }` — appended as its own entity (PK=code, RK=`{utcTicks:D19}-{rand}` so ordering is a string compare and there is no counter contention)
- `POST api/party/rooms/{code}/snapshot` (host only) `{ snapshot, phase?, result? }` — last-write-wins; also prunes consumed command entities (best-effort)

Room entity: PK `ROOM`, RK code, `HostId`, `Phase` (lobby|playing|done), `PlayersJson`,
`SnapshotJson`, `SnapshotVersion`, `ResultJson`, `CreatedAt`. Player mutations use the
ETag-retry pattern from `SubmitSuggestionFunction.TryCountTowardDailyCapAsync`. Best-effort
cleanup: room creation deletes rooms older than 24 h (top 25). Secrets are per-player GUIDs;
every write requires the right one — this only prevents accidents/spoofing, nothing more.

Polling cadence: lobby 1500 ms; playing — guests GET every 700 ms, host GETs commands + POSTs
snapshot every 600 ms. Commands POST immediately. All timers pause when the tab is hidden;
a player missing heartbeats for 15 s shows as "snoozing" (host keeps simulating; their side's
AI does NOT take over mid-game). If the **host** disappears for 10 s guests see a friendly
"the party host fell asleep" overlay with a Leave button (no host migration in v1).

Local dev: `js/party.js` targets `http://localhost:7071/api` when hostname is localhost
(same rule as `js/suggest.js`). Backend runs under `func start` with Azurite
(`AzureWebJobsStorage=UseDevelopmentStorage=true`, CORS `*` in local.settings.json).

## The match

One handcrafted map, grid 18×11, tile 256 world units, Phaser `Scale.FIT` (~12 tiles across).
A sunlit castle garden: the **party table** (right edge, 2×3 tiles) piled with **10 goodies**
(6 presents, 3 cupcakes, 1 birthday cake). Two **gates** on the left edge (the tower path and
the cave path) whose walking routes converge mid-map then split to the table. ~12 **tower pads**
flank the routes.

**Snackers** spawn at a gate, walk their route to the table, grab one goodie (cake needs the
Big Snacker), then walk back the way they came. Escaping with a goodie = stolen. Booped on the
way = puff of stars, the goodie floats back to the table.

**The party countdown is 5:00.** When the guests arrive: heroes win if ≥ 5 goodies remain,
snackers win if they stole ≥ 6. Stealing all 10 ends the match early. End overlay: big warm
banner, per-player "party trick" stat (goodies saved / goodies snuck), then "…and then everyone
had cake anyway. Even the sneaky ones. **Especially** the sneaky ones." Play-again returns the
room to the lobby (same code, same crew).

### Party Patrol (heroes) — characters: `moon`, `babylady`, `cottontail`, `winds`

- Shared **sparkles** pool: +2/s, +4 per boop, starts at 60.
- Tap a pad → picker: **Twinkle Lantern** (30✨, slows snackers in radius 2.5 to 55%),
  **Bubble Fountain** (45✨, every 2.5 s bubbles the strongest snacker in radius 2.5: held 1.2 s),
  **Sparkle Cannon** (60✨, boops 1 sneak-point off a snacker in radius 3 every 1.1 s).
- Each hero player also has their **champion** on the field: tap anywhere → they walk there
  (3.5 tiles/s) and auto-boop adjacent snackers every 0.9 s. A mobile tower you can *be*.
- AI Patrol (no hero players): places a scripted tower build-out on a budget from the same
  sparkle economy and parks two champions at the fork.

### Sneaky Snackers (villains) — characters: `shock`, `elysian`, `unicorn`, `leeblebeest`

- Shared **mischief** pool: +3/s, +6 per goodie stolen, starts at 40.
- Send buttons (pick gate by tapping it, default alternates):
  **Storm Puff** (15😈, fast, 2 sneak points — Shock's little storm-lings),
  **Ink Blot** (35😈, slow, 7 sneak points — Elysian's spilled ink),
  **Hum Note** (25😈, medium, 4 sneak points, hums: nearby towers fire 30% slower — the unicorn's bad note).
- **Champion march** (per villain player, free, 45 s cooldown): your own character strides the
  route — 14 sneak points, carries up to 3 goodies (only the champion can lift the cake).
  Booped champions ALSO just puff home; the mask never comes off (bible rule 4).
- AI Snackers (no villain players): scheduled waves every ~20 s, composition ramping, champion
  march at 1:30 and 3:30.

Snacker speeds (tiles/s): puff 2.2, note 1.6, blot 1.0, champion 1.2; carrying = ×0.8.

## Host simulation & guest rendering

- Host simulates at requestAnimationFrame with fixed 100 ms logic steps; snapshot = full state
  (phase, clock, pools, towers, snackers `{id,type,x,y,hp,carry,gate,dir}`, champions, goodies,
  events ring-buffer for one-shot fx/sfx). A few KB of JSON — far under the 64 KB property cap.
- Guests lerp entities from snapshot N-1 → N over the poll interval keyed by entity id; new ids
  fade/pop in, missing ids get their `pop` event fx. Guests never simulate.
- All clients render identically from state; the host just also *writes* state.

## Presentation

- Phaser 3 (already vendored). Daylight palette — this is the series' only sunny-day scene, per
  Book Five's birthday ending; the site frame stays indigo.
- Art reuse: heroes + leeblebeest from `peek/assets/characters/`; `shock`, terrain
  (`grass`,`grass2`,`path`,`tree`,`flowers`), `fx/sparkle` from `game/assets/`; presents + cake +
  balloons + table from `peek/assets/props/`. NEW sprites (transparent, API route,
  1024×1024): `elysian`, `unicorn`, minions `stormpuff`/`inkblot`/`humnote`, towers
  `lantern`/`fountain`/`cannon`, `cupcake`, and the opaque cover. Character sheets verbatim from
  book.json / bible (rule 10); unicorn: the nameless black unicorn of Book Five.
- **Must boot and be fully playable with zero assets on disk** — canvas swatches + emoji
  fallbacks (🎁🧁🎂😈🌩️🫧🏮✨), exactly like Castle Life's `buildFallbackTextures`.
- Sfx: tiny WebAudio synth chimes (boop / place / steal / fanfare / tick), no audio files,
  gated behind first gesture, toggle persisted. Voices are a follow-up (`party/voices/` would
  mirror the peek generator) — not in v1.
- Touch per `game/SPEC-TOUCH.md` where applicable: tap-first UI, ≥44 px targets, no drag needed.

## Lobby

- Landing overlay: **Start a party** (creates room, shows big room code) / **Join a party**
  (4-letter code entry, big friendly keyboard-free letter buttons + native input).
- Lobby screen: crew list (character portrait, side badge, ready check), side toggle
  (Patrol / Snackers), character picker (taken characters grayed), big READY button; host gets
  START once everyone is ready (1 player = instantly startable). Empty side shows
  "the castle will play this side" with a little 🏰 chip.
- Save `pm-party-patrol-v1`: `{ sound, playerName?, lastRoom: {code, playerId, secret, ts} }` —
  rejoin-on-reload within 2 h goes straight back into the room (server tolerates rejoin GETs).

## Test hook

`window.__partyPatrol` (read-only + test-only actions): `{ version, getPhase(), getRoom(),
getPlayers(), getSnapshot(), getRole(), isHost(), act(cmd) /* same shape as net commands */,
setApiBase(url) /* before create/join */, netStats() }`. The 4-session reliability test drives
four browser contexts: create + 3 joins via UI, side/character picks, start, scripted tower
placements + snacker sends via `act()`, then asserts all four sessions converge on the same
stolen/saved counts and the same `done` result. Plus a solo run against AI Snackers.

## Tone guardrails (canon)

- Bible rules 4/5 (Shock's mask), 7 (never gone forever), 8 (bedtime-safe) apply.
- Villainy is *mischief*: snackers giggle, the steal line is "off to a midnight feast!".
- Moon and Baby Lady never argue (rule 1) — victory quips are team-wide, never at a sister.
- Leeblebeest on the snacker side is the watcher playing pretend — her end-screen line when she
  wins: "Somebody had to count the cupcakes."
