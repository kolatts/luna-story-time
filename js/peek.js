/* The Great Present Peek — game engine
 *
 * Phaser 3 (vendored js/vendor/phaser.min.js, loaded by peek.html first).
 * Mirrors the Castle Life engine's proven patterns (js/game.js): Phaser owns
 * only the map stage inside #mapView (Scale.FIT), everything else is DOM.
 *
 * One set of controls steps BOTH Princess Moon and Baby Lady one tile at a
 * time. Passability is asymmetric (tables are puppy-sized, curtains are
 * princess-sized) which desyncs them — that is the whole puzzle.
 *
 * Fully playable with zero assets and zero voices on disk: every terrain
 * gets a painted canvas swatch and every prop/character an emoji stand-in,
 * exactly like Castle Life's buildFallbackTextures.
 */
(function () {
  "use strict";

  /* ================= Constants ================= */

  var SAVE_KEY = "pm-present-peek-v1";     // {bestFloor, bestScore, sound, run}
                                           // run: {seed, floor, score, peeked[]} — resume where you stopped
  var SAVE_DEBOUNCE = 150;
  var STEP_MS = 150;                       // one tweened hero step
  var HOP_PX = 10;
  var FADE_MS = 250;
  var HUSH_MS = 2500;                      // immunity window
  var HUSH_COOLDOWN_MS = 3000;
  var HMM_GAP_MS = 8000;                   // guest "hmm" rate limit
  var GRACE_MS = 2500;                     // can't be re-spotted right after returning to the rug
  var SPOTTED_HOLD_MS = 1500;              // bubble time before the white fade

  var TILE = 256;                          // world units per tile (SPEC)
  var GAME_W = 1152, GAME_H = 768;         // internal stage; Scale.FIT letterboxes it
  var VIEW_TILES_X = 11;                   // camera shows ~11 tiles across
  var ZOOM = GAME_W / (VIEW_TILES_X * TILE);
  var VIS_W = Math.ceil(GAME_W / ZOOM);    // visible world box at that zoom
  var VIS_H = Math.ceil(GAME_H / ZOOM);
  var CAM_LERP = 0.14;

  var ASSET_BASE = "peek/assets/";
  var VOICE_BASE = "peek/voices/";
  var EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';

  var DIRS = {
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 }
  };
  var DIR_KEYS = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    w: "up", s: "down", a: "left", d: "right"
  };
  var FACING_ORDER = ["up", "right", "down", "left"];   // leeblebeest's slow sweep

  var TERRAIN_LIST = ["carpet", "carpet2", "wall", "stairs", "rug"];
  var PROP_EMOJI = {
    curtain: "🎪",       // 🎪 draped fabric
    table: "🪑",         // 🪑
    plant: "🪴",         // 🪴
    arch: "⛩️",          // ⛩️ puppy-sized archway
    present1: "🎁",      // 🎁
    present2: "🎁",
    present3: "🎁",
    "present-giant": "🎁",
    cake: "🎂",          // 🎂
    balloons: "🎈"       // 🎈
  };
  var CHAR_EMOJI = {
    moon: "🧚",          // 🧚 (same stand-in Castle Life uses)
    babylady: "🐶",      // 🐶
    winds: "🍃",         // 🍃
    dirt: "🪨",          // 🪨
    cottontail: "🐰",    // 🐰
    cheeblest: "🎀",     // 🎀
    evilest: "🌑",       // 🌑
    beedlist: "📓",      // 📓
    purpleshine: "🐱",   // 🐱
    pinkshine: "🐕",     // 🐕
    leeblebeest: "💙"    // 💙
  };
  var GUEST_NAMES = {
    winds: "Winds", dirt: "Dirt", cottontail: "Cottontail", cheeblest: "Cheeblest",
    evilest: "Evilest", beedlist: "Beedlist", purpleshine: "Purpleshine",
    pinkshine: "Pinkshine", leeblebeest: "Leeblebeest"
  };
  var PATROL_IDS = ["winds", "dirt", "cottontail", "cheeblest", "evilest",
    "beedlist", "purpleshine", "pinkshine"];

  /* Friendly fallback spotted lines when there is no voice clip to hear. */
  var SPOTTED_TEXT = [
    "Ooh! Back to bed, you two!",
    "Ooh! I see two little peekers!",
    "Ooh! No peeking before morning!",
    "Ooh! Off you pop, sleepyheads!"
  ];

  /* Depth bands: ground 0, vision cones 5, y-sorted objects 100+py, fx 9000+. */
  var DEPTH_OBJ = 100;
  var DEPTH_CONE = 5;

  /* ================= DOM ================= */

  function $(id) { return document.getElementById(id); }

  var mapView = $("mapView");
  var hudFloor = $("hudFloor");
  var hudScore = $("hudScore");
  var hudBest = $("hudBest");
  var btnSound = $("btnSound");
  var btnHush = $("btnHush");
  var touchControls = $("touchControls");
  var stickEl = $("touchStick");
  var stickNub = $("touchStickNub");
  var introOverlay = $("introOverlay");
  var introClose = $("introClose");
  var bubbleEl = $("speechBubble");
  var btnHelp = $("btnHelp");
  var btnMenu = $("btnMenu");
  var menuOverlay = $("menuOverlay");
  var menuHint = $("menuHint");
  var floorGrid = $("floorGrid");
  var btnCloseMenu = $("btnCloseMenu");
  var btnClear = $("btnClear");

  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ================= Small helpers ================= */

  function intOr(v, def) { var n = parseInt(v, 10); return isNaN(n) ? def : n; }
  function keyOf(x, y) { return x + ":" + y; }
  function clampN(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /* Seeded RNG (SPEC): floor N of a run replays identically. */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Stable pseudo-random per tile, so carpet variants never shuffle. */
  function hash2(x, y) {
    var h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >> 13)) | 0;
    h = Math.imul(h, 1274126177) | 0;
    return ((h ^ (h >> 16)) >>> 0) / 4294967296;
  }

  /* ================= Save (pm-present-peek-v1) ================= */

  var save = { bestFloor: 1, bestScore: 0, sound: true, run: null };
  var saveTimer = null;

  function loadSave() {
    var raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { raw = null; }
    if (!raw) return;
    var p = null;
    try { p = JSON.parse(raw); } catch (e) { return; }
    if (!p || typeof p !== "object") return;
    save.bestFloor = Math.max(1, intOr(p.bestFloor, 1));
    save.bestScore = Math.max(0, intOr(p.bestScore, 0));
    save.sound = p.sound !== false;
    save.run = sanitizeRun(p.run);
  }
  /* A run is only resumable if the seed still regenerates the same floors. */
  function sanitizeRun(r) {
    if (!r || typeof r !== "object") return null;
    var seed = intOr(r.seed, 0), fl = intOr(r.floor, 0);
    if (seed <= 0 || fl < 1) return null;
    var peeked = [];
    if (Object.prototype.toString.call(r.peeked) === "[object Array]") {
      for (var i = 0; i < r.peeked.length; i++) {
        var idx = intOr(r.peeked[i], -1);
        if (idx >= 0) peeked.push(idx);
      }
    }
    return { seed: seed, floor: fl, score: Math.max(0, intOr(r.score, 0)), peeked: peeked };
  }
  /* Snapshot the run in progress: seed + floor regenerate the map exactly,
     so only the peeked presents on THIS floor need listing. */
  function captureRun() {
    var peeked = [];
    if (floor && floor.presents) {
      for (var i = 0; i < floor.presents.length; i++) {
        if (floor.presents[i].peeked) peeked.push(i);
      }
    }
    save.run = { seed: runSeed, floor: floorNum, score: score, peeked: peeked };
    scheduleSave();
  }
  function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(flushSave, SAVE_DEBOUNCE);
  }
  function flushSave() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* private mode: play on */ }
  }

  /* ================= Voices =================
     peek/voices/manifest.json is entirely optional; without it the game is
     simply silent. One shared lazy <audio>, stop-then-play, rejections
     swallowed (autoplay policy), narrator intro held until first gesture. */

  var voices = null;           // parsed manifest, or null
  var audioEl = null;
  var soundOn = true;
  var pendingIntro = false;    // narrator intro waits for the first gesture
  var lastHmm = 0;
  var saidBest = false;        // "new best" narration once per run
  var resumedFloor = 0;        // >0 when this session picked up a saved run

  function setSound(on) {
    soundOn = !!on;
    save.sound = soundOn;
    scheduleSave();
    if (!soundOn) stopVoice();
    syncSoundButton();
  }
  function syncSoundButton() {
    if (!btnSound) return;
    btnSound.textContent = soundOn ? "🔊" : "🔇";
    btnSound.setAttribute("aria-pressed", soundOn ? "true" : "false");
    btnSound.setAttribute("aria-label", soundOn ? "Turn voices off" : "Turn voices on");
    btnSound.setAttribute("title", soundOn ? "Voices are on" : "Voices are off");
  }
  function stopVoice() {
    if (!audioEl) return;
    try { audioEl.pause(); audioEl.currentTime = 0; } catch (e) { /* ignore */ }
  }
  function playClip(rel) {
    if (!rel || !soundOn || !voices) return false;
    if (!audioEl) {
      audioEl = new Audio();
      audioEl.volume = 0.9;
      audioEl.preload = "none";
    }
    stopVoice();
    try {
      audioEl.src = VOICE_BASE + rel;
      var pr = audioEl.play();
      if (pr && typeof pr.catch === "function") pr.catch(function () {});
    } catch (e) { return false; }
    return true;
  }
  /* A manifest value may be a single path or a list of takes; pick among
     whatever it actually lists (only files on disk are listed). */
  function pickClip(v) {
    if (typeof v === "string") return v;
    if (Object.prototype.toString.call(v) === "[object Array]" && v.length) {
      return v[Math.floor(Math.random() * v.length)];
    }
    return null;
  }
  function narrate(key) {
    if (!voices || !voices.narrator) return;
    playClip(pickClip(voices.narrator[key]));
  }
  function speak(speakerId, key) {
    if (!voices) return;
    var table = (voices.speakers && typeof voices.speakers === "object") ? voices.speakers : voices;
    var entry = table[speakerId];
    if (!entry || typeof entry !== "object") return;
    playClip(pickClip(entry[key]));
  }
  function releaseIntro() {
    if (!pendingIntro) return;
    pendingIntro = false;
    narrate("intro");
  }

  /* ================= Floor model =================
     A floor is:
       grid[y][x]  — "wall" | "carpet" | "carpet2" | "rug" | "stairs"
       props       — "x:y" -> {type}  (curtain/table/plant/arch/cake/balloons)
       presents    — [{x, y, variant, peeked}]  (variant: present1..3 / giant)
       guests      — [{id, x, y, facing, path, stationary, dancer, stepMs}]
       rug {x,y}, stairs {x,y}, w, h, party
  */

  var runSeed = Math.floor(Math.random() * 1000000) + 1;
  var floorNum = 1;
  var score = 0;
  var floor = null;            // the current floor object

  function floorDims(n) {
    if (n >= 8) return { w: 20, h: 13 };
    if (n >= 4) return { w: 18, h: 12 };
    return { w: 16, h: 11 };
  }
  function presentCount(n) { return Math.min(5, 2 + Math.floor((n - 1) / 3)); }
  function guestCount(n) { return Math.min(5, 1 + Math.floor((n - 1) / 3)); }
  function coneLength(n) { return n <= 3 ? 2 : (n <= 9 ? 3 : 4); }
  function guestStepMs(n) { return Math.max(380, 560 - (n - 1) * 15); }

  function terrainAt(f, x, y) {
    if (!f || y < 0 || y >= f.h || x < 0 || x >= f.w) return null;
    return f.grid[y][x];
  }
  function propAt(f, x, y) { return f.props[keyOf(x, y)] || null; }
  function presentAt(f, x, y) {
    for (var i = 0; i < f.presents.length; i++) {
      if (f.presents[i].x === x && f.presents[i].y === y) return f.presents[i];
    }
    return null;
  }

  /* Per-character passability — the heart of the game.
     who: "moon" | "babylady".  Guests/heroes are never obstacles. */
  function passable(f, who, x, y) {
    var t = terrainAt(f, x, y);
    if (t === null || t === "wall") return false;
    var p = propAt(f, x, y);
    if (!p) return true;
    if (p.type === "table") return who === "babylady";   // she scoots under
    if (p.type === "curtain") return who === "moon";     // she slips behind
    if (p.type === "arch") return who === "babylady";    // puppy-sized archway
    if (p.type === "cake" || p.type === "balloons") return false;  // party decor
    return true;   // plant, presents
  }
  /* Standing here hides that hero from every cone. */
  function hides(f, who, x, y) {
    var p = propAt(f, x, y);
    if (!p) return false;
    if (p.type === "plant") return true;
    if (p.type === "table") return who === "babylady";
    if (p.type === "curtain") return who === "moon";
    return false;
  }
  /* Cone-of-sight blockers (soft furniture soaks up the glow). */
  function blocksSight(f, x, y) {
    var t = terrainAt(f, x, y);
    if (t === null || t === "wall") return true;
    var p = propAt(f, x, y);
    return !!(p && (p.type === "curtain" || p.type === "table" || p.type === "plant"));
  }

  /* BFS for one character from the rug; returns the set of reachable keys. */
  function reachableFrom(f, who) {
    var seen = {};
    var q = [{ x: f.rug.x, y: f.rug.y }];
    seen[keyOf(f.rug.x, f.rug.y)] = true;
    while (q.length) {
      var c = q.shift();
      for (var d in DIRS) {
        var nx = c.x + DIRS[d].dx, ny = c.y + DIRS[d].dy;
        var k = keyOf(nx, ny);
        if (seen[k] || !passable(f, who, nx, ny)) continue;
        seen[k] = true;
        q.push({ x: nx, y: ny });
      }
    }
    return seen;
  }
  /* BOTH heroes must be able to reach every present and the stairs. */
  function floorIsFair(f) {
    var who = ["moon", "babylady"];
    for (var i = 0; i < who.length; i++) {
      var seen = reachableFrom(f, who[i]);
      if (!seen[keyOf(f.stairs.x, f.stairs.y)]) return false;
      for (var j = 0; j < f.presents.length; j++) {
        if (!seen[keyOf(f.presents[j].x, f.presents[j].y)]) return false;
      }
    }
    return true;
  }

  /* ---------- Handcrafted fallback floor (used after 20 failed tries) ----------
     Deliberately wide open: props sit off the paths so it is trivially fair. */
  var FALLBACK_ROWS = [
    "################",
    "#r.............#",
    "#..T....P......#",
    "#......1.1.....#",
    "#..C........2..#",
    "#....P.........#",
    "#..............#",
    "#.....T........#",
    "#...C......s...#",
    "#..............#",
    "################"
  ];

  function fallbackFloor(n) {
    var f = { w: 16, h: 11, grid: [], props: {}, presents: [], guests: [],
      rug: null, stairs: null, party: false, num: n };
    var variants = ["present1", "present2", "present3"];
    var vi = 0;
    for (var y = 0; y < f.h; y++) {
      var row = [];
      for (var x = 0; x < f.w; x++) {
        var ch = FALLBACK_ROWS[y].charAt(x);
        var t = "carpet";
        if (ch === "#") t = "wall";
        else if (ch === "r") { t = "rug"; f.rug = { x: x, y: y }; }
        else if (ch === "s") { t = "stairs"; f.stairs = { x: x, y: y }; }
        else if (hash2(x, y) < 0.25) t = "carpet2";
        row.push(t);
        if (ch === "T") f.props[keyOf(x, y)] = { type: "table" };
        else if (ch === "C") f.props[keyOf(x, y)] = { type: "curtain" };
        else if (ch === "P") f.props[keyOf(x, y)] = { type: "plant" };
        else if (ch === "1" || ch === "2" || ch === "3") {
          f.presents.push({ x: x, y: y, variant: variants[vi++ % 3], peeked: false });
        }
      }
      f.grid.push(row);
    }
    // One gentle patroller pacing the bottom hallway, well away from the rug.
    f.guests.push({
      id: "cottontail", stationary: false, dancer: false,
      path: [{ x: 5, y: 9 }, { x: 6, y: 9 }, { x: 7, y: 9 }, { x: 8, y: 9 }, { x: 9, y: 9 }, { x: 10, y: 9 }],
      x: 5, y: 9, facing: "right", stepMs: guestStepMs(n)
    });
    return f;
  }

  /* ---------- Party Landing (every 5th floor) ---------- */
  function partyFloor(n, rnd) {
    var w = 16, h = 11;
    var f = { w: w, h: h, grid: [], props: {}, presents: [], guests: [],
      rug: { x: Math.floor(w / 2), y: h - 2 }, stairs: { x: Math.floor(w / 2), y: 1 },
      party: true, num: n };
    for (var y = 0; y < h; y++) {
      var row = [];
      for (var x = 0; x < w; x++) {
        var t = (x === 0 || y === 0 || x === w - 1 || y === h - 1) ? "wall" : "carpet";
        if (t === "carpet" && hash2(x, y) < 0.25) t = "carpet2";
        row.push(t);
      }
      f.grid.push(row);
    }
    f.grid[f.rug.y][f.rug.x] = "rug";
    f.grid[f.stairs.y][f.stairs.x] = "stairs";
    // The long party table: cake in the middle, balloons at the ends.
    var ty = 3;
    for (var tx = 4; tx <= w - 5; tx++) {
      var type = (tx === Math.floor(w / 2)) ? "cake" : ((tx === 4 || tx === w - 5) ? "balloons" : "cake");
      if (tx > 4 && tx < w - 5 && tx !== Math.floor(w / 2)) type = (tx % 2 === 0) ? "balloons" : "cake";
      if (tx === f.stairs.x) continue;                    // keep the aisle to the stairs open
      f.props[keyOf(tx, ty)] = { type: type };
    }
    // Little presents everywhere as decoration (not peekable), one GIANT one.
    var gx = Math.floor(w / 2), gy = 6;
    f.presents.push({ x: gx, y: gy, variant: "present-giant", peeked: false });
    for (var i = 0; i < 6; i++) {
      var px = 2 + Math.floor(rnd() * (w - 4));
      var py = 5 + Math.floor(rnd() * (h - 7));
      var k = keyOf(px, py);
      if (f.props[k] || (px === gx && py === gy) || (px === f.rug.x && py === f.rug.y)) continue;
      if (terrainAt(f, px, py) !== "carpet" && terrainAt(f, px, py) !== "carpet2") continue;
      f.props[k] = { type: "present" + (1 + Math.floor(rnd() * 3)) };   // pure decor: walk-through
    }
    // Guests dancing harmlessly along the table — decoration, no cones.
    var dancers = ["winds", "dirt", "purpleshine", "pinkshine"];
    for (var di = 0; di < dancers.length; di++) {
      f.guests.push({
        id: dancers[di], stationary: true, dancer: true,
        x: 3 + di * 3, y: 2, facing: "down", path: null, stepMs: 0
      });
    }
    return f;
  }

  /* Decorative presents on party floors never block or peek. */
  function isDecorPresent(p) { return p && p.type && p.type.indexOf("present") === 0; }

  /* ---------- Seeded generator ---------- */
  function genFloor(n) {
    var rnd = mulberry32(runSeed * 1000 + n);
    if (n % 5 === 0) return partyFloor(n, rnd);

    for (var attempt = 0; attempt < 20; attempt++) {
      var f = tryGenFloor(n, rnd);
      if (f && floorIsFair(f)) return f;
    }
    return fallbackFloor(n);
  }

  function tryGenFloor(n, rnd) {
    var dims = floorDims(n);
    var w = dims.w, h = dims.h;
    var f = { w: w, h: h, grid: [], props: {}, presents: [], guests: [],
      rug: null, stairs: null, party: false, num: n };
    var x, y, i;
    for (y = 0; y < h; y++) {
      var row = [];
      for (x = 0; x < w; x++) row.push("wall");
      f.grid.push(row);
    }
    function carve(cx, cy) {
      if (cx < 1 || cy < 1 || cx > w - 2 || cy > h - 2) return;
      if (f.grid[cy][cx] === "wall") f.grid[cy][cx] = hash2(cx, cy) < 0.25 ? "carpet2" : "carpet";
    }

    // 3–5 rooms
    var roomN = 3 + Math.floor(rnd() * 3);
    var rooms = [];
    for (i = 0; i < roomN; i++) {
      var rw = 3 + Math.floor(rnd() * 4);           // 3–6
      var rh = 3 + Math.floor(rnd() * 2);           // 3–4
      var rx = 1 + Math.floor(rnd() * Math.max(1, w - rw - 2));
      var ry = 1 + Math.floor(rnd() * Math.max(1, h - rh - 2));
      rooms.push({ x: rx, y: ry, w: rw, h: rh, cx: rx + (rw >> 1), cy: ry + (rh >> 1) });
      for (y = ry; y < ry + rh; y++) for (x = rx; x < rx + rw; x++) carve(x, y);
    }
    // L-corridors between consecutive room centres
    for (i = 0; i < rooms.length - 1; i++) {
      var a = rooms[i], b = rooms[i + 1];
      var cx = a.cx, cy = a.cy;
      while (cx !== b.cx) { cx += (b.cx > cx) ? 1 : -1; carve(cx, cy); }
      while (cy !== b.cy) { cy += (b.cy > cy) ? 1 : -1; carve(cx, cy); }
    }

    var open = [];
    for (y = 1; y < h - 1; y++) for (x = 1; x < w - 1; x++) {
      if (f.grid[y][x] !== "wall") open.push({ x: x, y: y });
    }
    if (open.length < 20) return null;

    // Entrance rug: hallway carved to the left edge from the leftmost open tile.
    var leftmost = open[0];
    for (i = 1; i < open.length; i++) if (open[i].x < leftmost.x) leftmost = open[i];
    for (x = 1; x <= leftmost.x; x++) carve(x, leftmost.y);
    f.rug = { x: 1, y: leftmost.y };
    f.grid[f.rug.y][f.rug.x] = "rug";

    // Stairs: carved to the right edge from the rightmost open tile.
    var rightmost = open[0];
    for (i = 1; i < open.length; i++) if (open[i].x > rightmost.x) rightmost = open[i];
    for (x = rightmost.x; x <= w - 2; x++) carve(x, rightmost.y);
    f.stairs = { x: w - 2, y: rightmost.y };
    f.grid[f.stairs.y][f.stairs.x] = "stairs";

    function dist(ax, ay, bx, by) { return Math.abs(ax - bx) + Math.abs(ay - by); }
    function openTile() { return open[Math.floor(rnd() * open.length)]; }
    function plainAt(px, py) {
      var t = terrainAt(f, px, py);
      return (t === "carpet" || t === "carpet2") && !f.props[keyOf(px, py)] && !presentAt(f, px, py);
    }

    // Presents, spread out and away from the entrance
    var wanted = presentCount(n);
    var variants = ["present1", "present2", "present3"];
    for (i = 0; i < 200 && f.presents.length < wanted; i++) {
      var pt = openTile();
      if (!plainAt(pt.x, pt.y)) continue;
      if (dist(pt.x, pt.y, f.rug.x, f.rug.y) < 3) continue;
      if (dist(pt.x, pt.y, f.stairs.x, f.stairs.y) < 2) continue;
      var tooClose = false;
      for (var pj = 0; pj < f.presents.length; pj++) {
        if (dist(pt.x, pt.y, f.presents[pj].x, f.presents[pj].y) < 3) { tooClose = true; break; }
      }
      if (tooClose) continue;
      f.presents.push({ x: pt.x, y: pt.y, variant: variants[f.presents.length % 3], peeked: false });
    }
    if (f.presents.length < 2) return null;

    // Props. Tables + curtains create the asymmetric routes; plants are the
    // universal hidey-holes (at most a few); an occasional arch in a wall is
    // a puppy shortcut. BFS validation rejects anything that walls someone off.
    function placeProp(type, tries) {
      for (var t = 0; t < tries; t++) {
        var p = openTile();
        if (!plainAt(p.x, p.y)) continue;
        if (dist(p.x, p.y, f.rug.x, f.rug.y) < 2) continue;
        if (dist(p.x, p.y, f.stairs.x, f.stairs.y) < 2) continue;
        f.props[keyOf(p.x, p.y)] = { type: type };
        return true;
      }
      return false;
    }
    var tableN = 1 + Math.floor(rnd() * 2) + (n >= 5 ? 1 : 0);
    var curtainN = 1 + Math.floor(rnd() * 2) + (n >= 5 ? 1 : 0);
    var plantN = 1 + Math.floor(rnd() * 3);                     // "at most a few"
    for (i = 0; i < tableN; i++) placeProp("table", 25);
    for (i = 0; i < curtainN; i++) placeProp("curtain", 25);
    for (i = 0; i < Math.min(3, plantN); i++) placeProp("plant", 25);
    if (n >= 3 && rnd() < 0.7) {
      // An arch: a wall cell with open tiles either side becomes a puppy door.
      for (i = 0; i < 60; i++) {
        var ax = 1 + Math.floor(rnd() * (w - 2));
        var ay = 1 + Math.floor(rnd() * (h - 2));
        if (f.grid[ay][ax] !== "wall") continue;
        var lr = terrainAt(f, ax - 1, ay) !== "wall" && terrainAt(f, ax + 1, ay) !== "wall" &&
                 terrainAt(f, ax - 1, ay) !== null && terrainAt(f, ax + 1, ay) !== null;
        var ud = terrainAt(f, ax, ay - 1) !== "wall" && terrainAt(f, ax, ay + 1) !== "wall" &&
                 terrainAt(f, ax, ay - 1) !== null && terrainAt(f, ax, ay + 1) !== null;
        if (!lr && !ud) continue;
        f.grid[ay][ax] = "carpet";
        f.props[keyOf(ax, ay)] = { type: "arch" };
        break;
      }
    }

    // Guests. leeblebeest — the watcher who never slept — may appear from
    // floor 4; the rest walk gentle back-and-forth corridor loops.
    var count = guestCount(n);
    var pool = PATROL_IDS.slice();
    for (i = pool.length - 1; i > 0; i--) {
      var si = Math.floor(rnd() * (i + 1));
      var tmp = pool[i]; pool[i] = pool[si]; pool[si] = tmp;
    }
    var wantWatcher = n >= 4 && rnd() < 0.6;
    for (var g = 0; g < count; g++) {
      var isWatcher = wantWatcher && g === 0;
      var id = isWatcher ? "leeblebeest" : pool[g % pool.length];
      var placed = false;
      for (var t2 = 0; t2 < 40 && !placed; t2++) {
        var s = openTile();
        if (!plainAt(s.x, s.y)) continue;
        if (dist(s.x, s.y, f.rug.x, f.rug.y) < 4) continue;      // never camp the entrance
        if (isWatcher) {
          f.guests.push({ id: id, stationary: true, dancer: false, x: s.x, y: s.y,
            facing: FACING_ORDER[Math.floor(rnd() * 4)], path: null, stepMs: 0 });
          placed = true;
          break;
        }
        // Longest straight open run through this tile, horizontal or vertical.
        var horiz = rnd() < 0.5;
        var dx = horiz ? 1 : 0, dy = horiz ? 0 : 1;
        var path = [{ x: s.x, y: s.y }];
        var px2 = s.x - dx, py2 = s.y - dy;
        while (plainAt(px2, py2) && path.length < 8 && dist(px2, py2, f.rug.x, f.rug.y) >= 3) {
          path.unshift({ x: px2, y: py2 }); px2 -= dx; py2 -= dy;
        }
        px2 = s.x + dx; py2 = s.y + dy;
        while (plainAt(px2, py2) && path.length < 9 && dist(px2, py2, f.rug.x, f.rug.y) >= 3) {
          path.push({ x: px2, y: py2 }); px2 += dx; py2 += dy;
        }
        if (path.length < 3) continue;
        f.guests.push({ id: id, stationary: false, dancer: false,
          x: path[0].x, y: path[0].y, facing: horiz ? "right" : "down",
          path: path, stepMs: guestStepMs(n) });
        placed = true;
      }
    }
    return f;
  }

  /* ================= Asset manifest & fallback textures ================= */

  var manifest = null;
  var realTex = {};            // texture key -> true when the manifest file loaded

  function texKey(group, id) { return group.charAt(0) + "_" + id; }
  function manifestPath(group, id) {
    if (!manifest || !manifest[group]) return null;
    var p = manifest[group][id];
    return (typeof p === "string" && p) ? p : null;
  }
  function manifestQueue() {
    var out = [];
    var groups = {
      terrain: TERRAIN_LIST,
      props: Object.keys(PROP_EMOJI),
      characters: Object.keys(CHAR_EMOJI),
      fx: ["sparkle"]
    };
    for (var g in groups) {
      for (var i = 0; i < groups[g].length; i++) {
        var id = groups[g][i];
        var p = manifestPath(g, id);
        if (!p) continue;
        out.push({ key: texKey(g, id), url: ASSET_BASE + p });
      }
    }
    return out;
  }

  /* Night-indigo painted swatches: the game the kids see with zero art. */
  var TERRAIN_PAINT = {
    carpet: { stops: [[0, "#2e2a5c"], [0.55, "#272250"], [1, "#201c44"]] },
    carpet2: { stops: [[0, "#332e64"], [0.5, "#2a2556"], [1, "#221d48"]], speckle: "rgba(243,221,166,.08)" },
    wall: { stops: [[0, "#171432"], [1, "#100d26"]], bricks: true },
    rug: { stops: [[0, "#8a5f8f"], [0.6, "#6d4a78"], [1, "#523760"]], fringe: true },
    stairs: { stops: [[0, "#4a4180"], [1, "#332c60"]], steps: true },
    void: { stops: [[0, "#131028"], [1, "#0d0b1f"]] }
  };

  function roundRectPath(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y);
    g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r);
    g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
  }

  function paintTerrainTexture(sc, name) {
    var key = texKey("terrain", name);
    if (sc.textures.exists(key)) return;
    var spec = TERRAIN_PAINT[name] || TERRAIN_PAINT.void;
    var S = 128;
    var cv = sc.textures.createCanvas(key, S, S);
    if (!cv) return;
    var g = cv.getContext();
    var i;
    var grad = g.createLinearGradient(0, 0, S * 0.62, S);
    for (i = 0; i < spec.stops.length; i++) grad.addColorStop(spec.stops[i][0], spec.stops[i][1]);
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    if (spec.speckle) {
      g.fillStyle = spec.speckle;
      for (i = 0; i < 12; i++) {
        var sx = hash2(i + 1, 5) * S, sy = hash2(5, i + 1) * S;
        g.beginPath(); g.arc(sx, sy, 1.6 + hash2(i, i) * 2, 0, 6.284); g.fill();
      }
    }
    if (spec.bricks) {
      g.strokeStyle = "rgba(0,0,0,.28)";
      g.lineWidth = 2;
      for (i = 1; i < 5; i++) {
        g.beginPath(); g.moveTo(0, (S / 5) * i); g.lineTo(S, (S / 5) * i); g.stroke();
      }
      g.beginPath(); g.moveTo(S / 2, 0); g.lineTo(S / 2, S / 5); g.stroke();
      g.beginPath(); g.moveTo(S / 2, (S / 5) * 2); g.lineTo(S / 2, (S / 5) * 3); g.stroke();
      g.beginPath(); g.moveTo(S / 2, (S / 5) * 4); g.lineTo(S / 2, S); g.stroke();
    }
    if (spec.steps) {
      g.fillStyle = "rgba(243,221,166,.14)";
      for (i = 0; i < 4; i++) g.fillRect(10, 14 + i * 28, S - 20, 12);
    }
    if (spec.fringe) {
      g.strokeStyle = "rgba(243,221,166,.5)";
      g.lineWidth = 4;
      roundRectPath(g, 8, 8, S - 16, S - 16, 16);
      g.stroke();
    }
    g.strokeStyle = "rgba(0,0,0,.18)";
    g.lineWidth = 3;
    roundRectPath(g, 2, 2, S - 4, S - 4, S * 0.14);
    g.stroke();
    cv.refresh();
  }

  function paintSparkle(sc) {
    if (sc.textures.exists("fx_sparkle")) return;
    var S = 64, c = S / 2;
    var cv = sc.textures.createCanvas("fx_sparkle", S, S);
    if (!cv) return;
    var g = cv.getContext();
    var glow = g.createRadialGradient(c, c, 0, c, c, c);
    glow.addColorStop(0, "rgba(243,221,166,.9)");
    glow.addColorStop(0.4, "rgba(232,196,106,.35)");
    glow.addColorStop(1, "rgba(232,196,106,0)");
    g.fillStyle = glow;
    g.fillRect(0, 0, S, S);
    g.fillStyle = "#fdf9f0";
    g.beginPath();
    g.moveTo(c, 2);
    g.quadraticCurveTo(c + 4, c - 4, S - 2, c);
    g.quadraticCurveTo(c + 4, c + 4, c, S - 2);
    g.quadraticCurveTo(c - 4, c + 4, 2, c);
    g.quadraticCurveTo(c - 4, c - 4, c, 2);
    g.closePath();
    g.fill();
    cv.refresh();
  }

  /* The translucent warm glow a guest's gaze paints on the floor. */
  function paintGlowTile(sc) {
    if (sc.textures.exists("fx_glow")) return;
    var S = 128, c = S / 2;
    var cv = sc.textures.createCanvas("fx_glow", S, S);
    if (!cv) return;
    var g = cv.getContext();
    var grad = g.createRadialGradient(c, c, 0, c, c, c);
    grad.addColorStop(0, "rgba(243,221,166,.75)");
    grad.addColorStop(0.7, "rgba(232,196,106,.4)");
    grad.addColorStop(1, "rgba(232,196,106,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    cv.refresh();
  }

  function paintSoftCircle(sc, key, inner, outer) {
    if (sc.textures.exists(key)) return;
    var S = 128, c = S / 2;
    var cv = sc.textures.createCanvas(key, S, S);
    if (!cv) return;
    var g = cv.getContext();
    var grad = g.createRadialGradient(c, c, 0, c, c, c);
    grad.addColorStop(0, inner);
    grad.addColorStop(1, outer);
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    cv.refresh();
  }

  function buildFallbackTextures(sc) {
    for (var i = 0; i < TERRAIN_LIST.length; i++) paintTerrainTexture(sc, TERRAIN_LIST[i]);
    paintTerrainTexture(sc, "void");
    paintSparkle(sc);
    paintGlowTile(sc);
    paintSoftCircle(sc, "fx_halo", "rgba(243,221,166,.55)", "rgba(232,196,106,0)");
  }

  /* ================= Phaser boot ================= */

  var game = null, scene = null;
  var BootScene = null, WorldScene = null;

  function makeScenes() {
    BootScene = class BootScene extends Phaser.Scene {
      constructor() { super({ key: "Boot" }); }
      preload() {
        this.load.on("loaderror", function (file) {
          // A missing .webp is fine: swatch/emoji fallback covers it.
          if (file && file.key) delete realTex[file.key];
        });
        var q = manifestQueue();
        for (var i = 0; i < q.length; i++) {
          realTex[q[i].key] = true;
          this.load.image(q[i].key, q[i].url);
        }
      }
      create() {
        for (var k in realTex) {
          if (!this.textures.exists(k)) delete realTex[k];
        }
        buildFallbackTextures(this);
        this.scene.start("World");
      }
    };

    WorldScene = class WorldScene extends Phaser.Scene {
      constructor() { super({ key: "World" }); }
      create() {
        scene = this;
        this.cameras.main.setBackgroundColor("#100d26");
        onSceneReady();
      }
      update() {
        followHeroes();
      }
    };
  }

  /* ================= Stage geometry & rendering ================= */

  var originX = 0, originY = 0, worldW = 0, worldH = 0;
  var camTarget = null;

  function tileCenter(x, y) {
    return { x: originX + x * TILE + TILE / 2, y: originY + y * TILE + TILE / 2 };
  }

  /* An object sprite: real texture when the manifest delivered one, emoji
     stand-in otherwise (same idiom as Castle Life's makeIcon). */
  function makeIcon(group, id, emoji, px) {
    var key = texKey(group, id);
    var obj;
    if (scene.textures.exists(key) && realTex[key]) {
      obj = scene.add.image(0, 0, key);
      var src = scene.textures.get(key).getSourceImage();
      var big = Math.max(src.width || 1, src.height || 1);
      obj.setScale(px / big);
    } else {
      obj = scene.add.text(0, 0, emoji || "✨", {
        fontFamily: EMOJI_FONT,
        fontSize: Math.round(px * 0.84) + "px",
        padding: { x: 12, y: 12 }
      });
      obj.setOrigin(0.5, 0.5);
    }
    obj._baseSX = obj.scaleX;
    return obj;
  }
  function setFlip(obj, flip) {
    if (!obj) return;
    var base = Math.abs(obj._baseSX || 1);
    obj.scaleX = flip ? -base : base;
  }

  /* Heroes. Both are the player; Moon nudges left, Baby Lady right, so they
     stay readable even while sharing a tile. */
  var heroes = {
    moon: { x: 0, y: 0, c: null, inner: null, sprite: null, offX: -TILE * 0.16 },
    babylady: { x: 0, y: 0, c: null, inner: null, sprite: null, offX: TILE * 0.16 }
  };
  var HERO_IDS = ["moon", "babylady"];

  var sparkleEmitter = null;
  var stairsGlow = null;
  var propSprites = {};        // "x:y" -> sprite (for depth games while hiding)
  var presentSprites = [];     // index-aligned with floor.presents
  var floorTimers = [];        // scene timers to purge on rebuild
  var hushEmotes = [];

  function addTimer(ev) { floorTimers.push(ev); return ev; }
  function clearTimers() {
    for (var i = 0; i < floorTimers.length; i++) {
      if (floorTimers[i] && floorTimers[i].remove) floorTimers[i].remove(false);
    }
    floorTimers = [];
  }

  function renderFloor() {
    if (!scene || !floor) return;
    clearTimers();
    scene.tweens.killAll();
    scene.cameras.main.stopFollow();
    scene.children.removeAll(true);
    propSprites = {};
    presentSprites = [];
    hushEmotes = [];
    stairsGlow = null;

    worldW = Math.max(floor.w * TILE, VIS_W);
    worldH = Math.max(floor.h * TILE, VIS_H);
    originX = Math.round((worldW - floor.w * TILE) / 2);
    originY = Math.round((worldH - floor.h * TILE) / 2);

    var x, y;
    for (y = 0; y < floor.h; y++) {
      for (x = 0; x < floor.w; x++) {
        var t = floor.grid[y][x];
        var c = tileCenter(x, y);
        var img = scene.add.image(c.x, c.y, texKey("terrain", t));
        img.setDisplaySize(TILE + 2, TILE + 2).setDepth(0);
      }
    }

    // Stairs glow marker (pulses once every present is peeked)
    var sc = tileCenter(floor.stairs.x, floor.stairs.y);
    stairsGlow = scene.add.image(sc.x, sc.y, "fx_halo");
    stairsGlow.setDisplaySize(TILE * 1.6, TILE * 1.6).setDepth(2)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.12);

    // Props
    for (var k in floor.props) {
      var parts = k.split(":");
      var px = intOr(parts[0], 0), py = intOr(parts[1], 0);
      var p = floor.props[k];
      var pc = tileCenter(px, py);
      var size = TILE * (p.type === "arch" ? 0.95 : 0.9);
      var spr = makeIcon("props", p.type, PROP_EMOJI[p.type], size);
      spr.setPosition(pc.x, pc.y - TILE * 0.06);
      spr.setDepth(DEPTH_OBJ + pc.y + 2);
      propSprites[k] = spr;
    }

    // Presents (the peekable kind)
    for (var i = 0; i < floor.presents.length; i++) {
      var pr = floor.presents[i];
      var prc = tileCenter(pr.x, pr.y);
      var big = pr.variant === "present-giant" ? TILE * 1.5 : TILE * 0.72;
      var ps = makeIcon("props", pr.variant, PROP_EMOJI[pr.variant] || "🎁", big);
      ps.setPosition(prc.x, prc.y - (pr.variant === "present-giant" ? TILE * 0.2 : 0));
      ps.setDepth(DEPTH_OBJ + prc.y + 1);
      if (pr.peeked) ps.setAlpha(0.65);
      presentSprites.push(ps);
      if (!reduceMotion && !pr.peeked) {
        scene.tweens.add({
          targets: ps, y: ps.y - 5, duration: 1100, yoyo: true, repeat: -1,
          ease: "Sine.easeInOut", delay: Math.round(hash2(pr.x, pr.y) * 700)
        });
      }
    }

    // Guests
    for (var gi = 0; gi < floor.guests.length; gi++) buildGuest(floor.guests[gi]);

    // Heroes on the entrance rug
    for (var hi = 0; hi < HERO_IDS.length; hi++) {
      var id = HERO_IDS[hi];
      var hero = heroes[id];
      hero.x = floor.rug.x; hero.y = floor.rug.y;
      var hc = tileCenter(hero.x, hero.y);
      hero.c = scene.add.container(hc.x + hero.offX, hc.y);
      hero.inner = scene.add.container(0, 0);
      hero.c.add(hero.inner);
      var shadow = scene.add.ellipse(0, TILE * 0.34, TILE * 0.5, TILE * 0.18, 0x000000, 0.3);
      hero.inner.add(shadow);
      hero.sprite = makeIcon("characters", id, CHAR_EMOJI[id], TILE * (id === "moon" ? 1.05 : 0.85));
      hero.sprite.setPosition(0, -TILE * 0.1);
      hero.inner.add(hero.sprite);
      hero.c.setDepth(DEPTH_OBJ + hc.y + 5);
      if (!reduceMotion) {
        scene.tweens.add({
          targets: hero.sprite, y: hero.sprite.y - 5, duration: 950 + hi * 120,
          yoyo: true, repeat: -1, ease: "Sine.easeInOut"
        });
      }
    }
    syncHiding();

    // FX
    sparkleEmitter = scene.add.particles(0, 0, "fx_sparkle", {
      speed: { min: 120, max: 380 },
      angle: { min: 0, max: 360 },
      lifespan: 700,
      scale: { start: TILE / 130, end: 0 },
      alpha: { start: 1, end: 0 },
      gravityY: 260,
      blendMode: "ADD",
      emitting: false
    });
    sparkleEmitter.setDepth(9000);

    // Camera
    camTarget = scene.add.container(0, 0);
    followHeroes(true);
    var cam = scene.cameras.main;
    cam.setBounds(0, 0, worldW, worldH);
    cam.setZoom(ZOOM);
    cam.setRoundPixels(true);
    cam.startFollow(camTarget, true, CAM_LERP, CAM_LERP);
    cam.centerOn(camTarget.x, camTarget.y);
    if (!reduceMotion) cam.fadeIn(FADE_MS, 0, 0, 0);
    else cam.resetFX();

    refreshCones();
    refreshStairs();
    renderHud();
  }

  /* The camera chases the midpoint between the two heroes. */
  function followHeroes(instant) {
    if (!camTarget) return;
    var a = heroes.moon.c, b = heroes.babylady.c;
    if (!a || !b) return;
    camTarget.x = (a.x + b.x) / 2;
    camTarget.y = (a.y + b.y) / 2;
    if (instant && scene) scene.cameras.main.centerOn(camTarget.x, camTarget.y);
  }

  /* ================= Guests ================= */

  function buildGuest(gst) {
    var c = tileCenter(gst.x, gst.y);
    gst.sprite = makeIcon("characters", gst.id, CHAR_EMOJI[gst.id] || "✨", TILE * 0.95);
    gst.sprite.setPosition(c.x, c.y - TILE * 0.1);
    gst.sprite.setDepth(DEPTH_OBJ + c.y + 3);
    gst.glowImgs = [];
    gst.pathIdx = 0;
    gst.pathDir = 1;

    if (gst.dancer) {
      // Party decoration: bouncing gently, no cone, no spotting.
      if (!reduceMotion) {
        scene.tweens.add({
          targets: gst.sprite, y: gst.sprite.y - 14, duration: 420 + Math.round(hash2(gst.x, gst.y) * 300),
          yoyo: true, repeat: -1, ease: "Sine.easeInOut"
        });
      }
      return;
    }
    if (gst.stationary) {
      // The watcher who never slept: rotates her gaze 90° every ~2.5 s.
      addTimer(scene.time.addEvent({
        delay: 2500, loop: true,
        callback: function () {
          if (spotted || transitioning) return;
          var i = FACING_ORDER.indexOf(gst.facing);
          gst.facing = FACING_ORDER[(i + 1) % 4];
          setFlip(gst.sprite, gst.facing === "left");
          refreshConesFor(gst);
          checkSpotted();
        }
      }));
      return;
    }
    // Back-and-forth patrol at a gentle, floor-ramped pace.
    for (var i = 0; i < gst.path.length; i++) {
      if (gst.path[i].x === gst.x && gst.path[i].y === gst.y) { gst.pathIdx = i; break; }
    }
    addTimer(scene.time.addEvent({
      delay: gst.stepMs, loop: true,
      callback: function () { stepGuest(gst); }
    }));
  }

  function stepGuest(gst) {
    if (spotted || transitioning || !gst.sprite || !gst.sprite.active) return;
    var next = gst.pathIdx + gst.pathDir;
    if (next < 0 || next >= gst.path.length) {
      gst.pathDir = -gst.pathDir;
      next = gst.pathIdx + gst.pathDir;
      if (next < 0 || next >= gst.path.length) return;   // path of one: stand still
    }
    var from = gst.path[gst.pathIdx];
    var to = gst.path[next];
    gst.pathIdx = next;
    gst.x = to.x; gst.y = to.y;
    gst.facing = (to.x > from.x) ? "right" : (to.x < from.x) ? "left" : (to.y > from.y) ? "down" : "up";
    setFlip(gst.sprite, gst.facing === "left");
    var c = tileCenter(to.x, to.y);
    if (reduceMotion) {
      gst.sprite.setPosition(c.x, c.y - TILE * 0.1);
      gst.sprite.setDepth(DEPTH_OBJ + c.y + 3);
    } else {
      scene.tweens.add({
        targets: gst.sprite, x: c.x, y: c.y - TILE * 0.1,
        duration: Math.min(gst.stepMs * 0.85, 300), ease: "Linear",
        onUpdate: function () { gst.sprite.setDepth(DEPTH_OBJ + gst.sprite.y + 3); }
      });
    }
    refreshConesFor(gst);
    checkSpotted();
  }

  /* The straight line of lit tiles in front of a guest. */
  function coneTiles(gst) {
    if (gst.dancer) return [];
    var out = [];
    var d = DIRS[gst.facing] || DIRS.down;
    var len = coneLength(floorNum);
    for (var i = 1; i <= len; i++) {
      var tx = gst.x + d.dx * i, ty = gst.y + d.dy * i;
      if (blocksSight(floor, tx, ty)) break;
      out.push({ x: tx, y: ty });
    }
    return out;
  }

  function refreshConesFor(gst) {
    if (!scene) return;
    var tiles = coneTiles(gst);
    gst.cone = tiles;
    var imgs = gst.glowImgs || (gst.glowImgs = []);
    var i;
    while (imgs.length < tiles.length) {
      var img = scene.add.image(0, 0, "fx_glow");
      img.setDisplaySize(TILE * 1.35, TILE * 1.35);
      img.setDepth(DEPTH_CONE).setBlendMode(Phaser.BlendModes.ADD);
      imgs.push(img);
    }
    for (i = 0; i < imgs.length; i++) {
      if (i < tiles.length) {
        var c = tileCenter(tiles[i].x, tiles[i].y);
        imgs[i].setPosition(c.x, c.y).setVisible(true);
        imgs[i].setAlpha(0.34 - i * 0.05);     // softer with distance
      } else {
        imgs[i].setVisible(false);
      }
    }
  }
  function refreshCones() {
    for (var i = 0; i < floor.guests.length; i++) refreshConesFor(floor.guests[i]);
  }

  /* ================= Spotting ================= */

  var spotted = false;         // a friendly "back to bed" moment is playing
  var graceUntil = 0;
  var hushUntil = 0;
  var hushReadyAt = 0;

  function isHushed() { return Date.now() < hushUntil; }

  function heroHidden(id) {
    var h = heroes[id];
    // The entrance rug is the doorway's shadow — always safe. Without this a
    // patrol cone sweeping the rug re-spots freshly returned heroes forever.
    if (h.x === floor.rug.x && h.y === floor.rug.y) return true;
    return hides(floor, id, h.x, h.y);
  }

  /* Red-light-green-light spotting:
     - STEPPING into a lit tile is seen at once (moving in the light).
     - STANDING in a lit tile is safe for STILL_MS ("hold your breath!") so a
       sweeping cone can pass over a frozen hero; linger longer and you wiggle.
     heroMoved: this call comes from a step landing — heroes with movedFlag
     stepped just now. */
  var STILL_MS = 2000;
  var litSince = { moon: 0, babylady: 0 };
  function checkSpotted(heroMoved) {
    if (spotted || transitioning || !floor || floor.party) return;
    if (isHushed() || Date.now() < graceUntil) {
      litSince.moon = 0; litSince.babylady = 0;
      return;
    }
    var now = Date.now();
    for (var hi = 0; hi < HERO_IDS.length; hi++) {
      var id = HERO_IDS[hi];
      var h = heroes[id];
      var litBy = null;
      if (!heroHidden(id)) {
        for (var g = 0; g < floor.guests.length && !litBy; g++) {
          var cone = floor.guests[g].cone || [];
          for (var i = 0; i < cone.length; i++) {
            if (h.x === cone[i].x && h.y === cone[i].y) { litBy = floor.guests[g]; break; }
          }
        }
      }
      if (!litBy) { litSince[id] = 0; h.movedFlag = false; continue; }
      if (heroMoved && h.movedFlag) { h.movedFlag = false; doSpotted(litBy); return; }
      if (!litSince[id]) litSince[id] = now;
      else if (now - litSince[id] > STILL_MS) { doSpotted(litBy); return; }
    }
  }

  /* Warm and funny, never punishing: a voiced line, a big friendly bubble,
     a gentle white fade, and both heroes pop back onto the entrance rug.
     Nothing else is lost. */
  function doSpotted(gst) {
    spotted = true;
    heldKeys = [];
    stopRepeat();
    speak(gst.id, "spotted");
    showBubble((GUEST_NAMES[gst.id] || "Someone") + ": " +
      SPOTTED_TEXT[Math.floor(Math.random() * SPOTTED_TEXT.length)],
      CHAR_EMOJI[gst.id]);
    if (gst.sprite && !reduceMotion) {
      scene.tweens.add({
        targets: gst.sprite, scale: gst.sprite.scaleX * 1.12, duration: 180,
        yoyo: true, repeat: 2, ease: "Sine.easeInOut"
      });
    }
    addTimer(scene.time.delayedCall(SPOTTED_HOLD_MS, function () {
      var cam = scene.cameras.main;
      if (!reduceMotion) cam.flash(600, 255, 255, 255);
      addTimer(scene.time.delayedCall(reduceMotion ? 0 : 320, function () {
        placeHeroesAtRug();
        hideBubble();
        graceUntil = Date.now() + GRACE_MS;
        spotted = false;
      }));
    }));
  }

  function placeHeroesAtRug() {
    for (var i = 0; i < HERO_IDS.length; i++) {
      var h = heroes[HERO_IDS[i]];
      h.x = floor.rug.x; h.y = floor.rug.y;
      if (h.c) {
        var c = tileCenter(h.x, h.y);
        h.c.setPosition(c.x + h.offX, c.y);
        h.c.setDepth(DEPTH_OBJ + c.y + 5);
      }
    }
    movingCount = 0;
    syncHiding();
    followHeroes(true);
  }

  /* Big friendly DOM speech bubble over the stage. */
  var bubbleTimer = null;
  function showBubble(text, emoji) {
    if (!bubbleEl) return;
    bubbleEl.textContent = (emoji ? emoji + "  " : "") + text;
    bubbleEl.hidden = false;
    bubbleEl.classList.add("show");
    if (bubbleTimer) { clearTimeout(bubbleTimer); bubbleTimer = null; }
  }
  function hideBubble() {
    if (!bubbleEl) return;
    bubbleEl.classList.remove("show");
    bubbleTimer = setTimeout(function () { bubbleEl.hidden = true; }, 250);
  }

  /* ================= Hero movement ================= */

  var heldKeys = [];
  var dpadDir = null;
  var repeatPointerId = null;
  var movingCount = 0;         // hero tweens in flight
  var transitioning = false;
  var introOpen = true;

  function busy() { return spotted || transitioning || introOpen || menuOpen; }

  function stopRepeat() {
    dpadDir = null;
    repeatPointerId = null;
  }

  /* One input, two heroes: each steps if HER target tile allows it. */
  function tryStep(dir) {
    if (!floor || !scene || busy() || movingCount > 0 || isHushed()) return;
    var d = DIRS[dir];
    if (!d) return;
    var anyMoved = false;
    for (var i = 0; i < HERO_IDS.length; i++) {
      var id = HERO_IDS[i];
      var h = heroes[id];
      setFlip(h.sprite, dir === "left");
      var nx = h.x + d.dx, ny = h.y + d.dy;
      if (!passable(floor, id, nx, ny)) continue;    // she waits; the other may still go
      h.x = nx; h.y = ny;
      h.movedFlag = true;
      anyMoved = true;
      var c = tileCenter(nx, ny);
      movingCount++;
      (function (hero, cx, cy) {
        scene.tweens.add({
          targets: hero.c, x: cx + hero.offX, y: cy, duration: STEP_MS, ease: "Linear",
          onUpdate: function () { hero.c.setDepth(DEPTH_OBJ + hero.c.y + 5); },
          onComplete: function () {
            hero.c.setDepth(DEPTH_OBJ + cy + 5);
            movingCount--;
            if (movingCount <= 0) { movingCount = 0; onStepLanded(); }
          }
        });
        if (!reduceMotion) {
          scene.tweens.add({
            targets: hero.inner, y: { from: 0, to: -HOP_PX },
            duration: STEP_MS / 2, yoyo: true, ease: "Sine.easeOut"
          });
        }
      })(h, c.x, c.y);
    }
    if (!anyMoved) return;
    if (reduceMotion) {
      // tweens above still run but effectively instant pacing matters less
    }
  }

  /* After both tweens land: peeks, hmm lines, stairs, spotting, hold-repeat. */
  function onStepLanded() {
    if (!floor) return;
    syncHiding();
    for (var i = 0; i < HERO_IDS.length; i++) {
      var h = heroes[HERO_IDS[i]];
      var pr = presentAt(floor, h.x, h.y);
      if (pr && !pr.peeked) peekPresent(pr);
      maybeHmm(h.x, h.y);
    }
    checkSpotted(true);   // stepping into a lit tile is seen at once
    checkStairs();
    continueHold();
  }

  function continueHold() {
    if (busy() || movingCount > 0) return;
    var dir = heldKeys.length ? heldKeys[heldKeys.length - 1] : dpadDir;
    if (dir) tryStep(dir);
  }

  /* Hiding: a hero on her hidey tile tucks under/behind the prop — dimmed,
     drawn beneath it, unspottable. */
  function syncHiding() {
    for (var i = 0; i < HERO_IDS.length; i++) {
      var id = HERO_IDS[i];
      var h = heroes[id];
      if (!h.c) continue;
      var hidden = heroHidden(id);
      h.c.setAlpha(hidden ? 0.55 : 1);
      if (hidden) {
        var prop = propSprites[keyOf(h.x, h.y)];
        if (prop) h.c.setDepth(prop.depth - 1);
      }
    }
  }

  /* A hero one tile directly BEHIND a guest earns an occasional "hmm". */
  function maybeHmm(hx, hy) {
    var now = Date.now();
    if (now - lastHmm < HMM_GAP_MS || floor.party) return;
    for (var g = 0; g < floor.guests.length; g++) {
      var gst = floor.guests[g];
      if (gst.dancer) continue;
      var d = DIRS[gst.facing] || DIRS.down;
      if (gst.x - d.dx === hx && gst.y - d.dy === hy) {
        lastHmm = now;
        speak(gst.id, "hmm");
        return;
      }
    }
  }

  /* ================= Presents & stairs ================= */

  function peekPresent(pr) {
    pr.peeked = true;
    score += 1;
    if (score > save.bestScore) save.bestScore = score;
    captureRun();
    var idx = floor.presents.indexOf(pr);
    var spr = presentSprites[idx];
    if (spr) {
      scene.tweens.killTweensOf(spr);
      spr.setAlpha(0.65);
      if (!reduceMotion) {
        scene.tweens.add({ targets: spr, angle: { from: -6, to: 6 }, duration: 120, yoyo: true, repeat: 2 });
      }
    }
    if (sparkleEmitter && !reduceMotion) {
      var c = tileCenter(pr.x, pr.y);
      sparkleEmitter.explode(pr.variant === "present-giant" ? 26 : 12, c.x, c.y);
    }
    // Baby Lady yips about it (sometimes a longer "peek" remark instead).
    if (Math.random() < 0.7) speak("babylady", Math.random() < 0.6 ? "yip" : "peek");
    refreshStairs();
    renderHud();
  }

  function allPeeked() {
    for (var i = 0; i < floor.presents.length; i++) {
      if (!floor.presents[i].peeked) return false;
    }
    return true;
  }

  function refreshStairs() {
    if (!stairsGlow) return;
    var open = allPeeked();
    scene.tweens.killTweensOf(stairsGlow);
    if (open) {
      stairsGlow.setAlpha(0.55);
      if (!reduceMotion) {
        scene.tweens.add({
          targets: stairsGlow, alpha: { from: 0.35, to: 0.75 }, duration: 900,
          yoyo: true, repeat: -1, ease: "Sine.easeInOut"
        });
      }
    } else {
      stairsGlow.setAlpha(0.12);
    }
  }

  /* Stairs need every present peeked AND both heroes on/next to the tile.
     The first to arrive waits with a small bounce. */
  function checkStairs() {
    if (!allPeeked() || transitioning) return;
    var near = 0, on = false;
    for (var i = 0; i < HERO_IDS.length; i++) {
      var h = heroes[HERO_IDS[i]];
      var d = Math.abs(h.x - floor.stairs.x) + Math.abs(h.y - floor.stairs.y);
      if (d === 0) on = true;
      if (d <= 1) near++;
    }
    if (near >= 2 && on) { nextFloor(); return; }
    // One hero already there: a happy little waiting bounce.
    if (!reduceMotion) {
      for (var j = 0; j < HERO_IDS.length; j++) {
        var hh = heroes[HERO_IDS[j]];
        if (hh.x === floor.stairs.x && hh.y === floor.stairs.y && hh.inner) {
          scene.tweens.add({
            targets: hh.inner, y: { from: 0, to: -14 }, duration: 160, yoyo: true, ease: "Sine.easeOut"
          });
        }
      }
    }
  }

  /* ================= Floors & run flow ================= */

  function nextFloor() {
    transitioning = true;
    heldKeys = [];
    stopRepeat();
    var arrive = function () {
      floorNum += 1;
      if (floorNum > save.bestFloor) {
        save.bestFloor = floorNum;
        scheduleSave();
        if (!saidBest) { saidBest = true; narrate("best"); }
      }
      floor = genFloor(floorNum);
      renderFloor();
      graceUntil = Date.now() + 1200;
      transitioning = false;
      captureRun();
      flushSave();
      if (floor.party) narrate("party");
      else if (Math.random() < 0.25) narrate("floor");
    };
    if (reduceMotion || !scene) { arrive(); return; }
    var cam = scene.cameras.main;
    cam.once("camerafadeoutcomplete", arrive);
    cam.fadeOut(FADE_MS, 0, 0, 0);
  }

  function startRun(seed) {
    if (typeof seed === "number" && isFinite(seed) && seed > 0) runSeed = Math.floor(seed);
    floorNum = 1;
    score = 0;
    saidBest = false;
    hushUntil = 0;
    hushReadyAt = 0;
    spotted = false;
    transitioning = false;
    floor = genFloor(floorNum);
    captureRun();
    if (scene) renderFloor();
  }

  /* Pick the run back up: same seed and floor rebuild the map, and the
     presents already peeked stay peeked (their stairs stay unlocked). */
  function resumeRun(r) {
    runSeed = r.seed;
    floorNum = r.floor;
    score = r.score;
    resumedFloor = r.floor > 1 || r.peeked.length > 0 ? r.floor : 0;
    floor = genFloor(floorNum);
    for (var i = 0; i < r.peeked.length; i++) {
      var pr = floor.presents[r.peeked[i]];
      if (pr) pr.peeked = true;
    }
  }

  /* ================= Hush ================= */

  function doHush() {
    if (busy() || isHushed()) return;
    var now = Date.now();
    if (now < hushReadyAt) return;
    hushUntil = now + HUSH_MS;
    hushReadyAt = now + HUSH_MS + HUSH_COOLDOWN_MS;
    heldKeys = [];
    stopRepeat();
    syncHushButton();
    // Both crouch with a little "shh"
    for (var i = 0; i < HERO_IDS.length; i++) {
      var h = heroes[HERO_IDS[i]];
      if (!h.c) continue;
      var emote = scene.add.text(h.c.x, h.c.y - TILE * 0.75, "🤫", {
        fontFamily: EMOJI_FONT, fontSize: Math.round(TILE * 0.5) + "px", padding: { x: 10, y: 10 }
      });
      emote.setOrigin(0.5, 0.5).setDepth(9500);
      hushEmotes.push(emote);
      if (!reduceMotion && h.inner) {
        scene.tweens.add({ targets: h.inner, scaleY: 0.8, duration: 140, ease: "Sine.easeOut" });
      }
    }
    addTimer(scene.time.delayedCall(HUSH_MS, endHush));
    addTimer(scene.time.delayedCall(HUSH_MS + HUSH_COOLDOWN_MS, syncHushButton));
  }
  function endHush() {
    for (var i = 0; i < hushEmotes.length; i++) {
      if (hushEmotes[i] && hushEmotes[i].destroy) hushEmotes[i].destroy();
    }
    hushEmotes = [];
    for (var j = 0; j < HERO_IDS.length; j++) {
      var h = heroes[HERO_IDS[j]];
      if (!reduceMotion && h.inner && scene) {
        scene.tweens.add({ targets: h.inner, scaleY: 1, duration: 140, ease: "Sine.easeOut" });
      } else if (h.inner) {
        h.inner.scaleY = 1;
      }
    }
    checkSpotted();
    syncHushButton();
  }
  function syncHushButton() {
    if (!btnHush) return;
    var cooling = Date.now() < hushReadyAt;
    btnHush.classList.toggle("cooldown", cooling);
    btnHush.setAttribute("aria-disabled", cooling ? "true" : "false");
  }

  /* ================= HUD & intro ================= */

  function renderHud() {
    if (hudFloor) hudFloor.textContent = String(floorNum);
    if (hudScore) hudScore.textContent = String(score);
    if (hudBest) hudBest.textContent = save.bestFloor + " / " + save.bestScore;
  }

  /* Resuming should be visible, and always escapable: one tap starts fresh. */
  function showResumeNote() {
    if (!resumedFloor || !introOverlay) return;
    var card = introOverlay.querySelector(".intro-card");
    if (!card) return;
    var note = document.createElement("p");
    note.className = "resume-note";
    note.innerHTML = "🌙 Welcome back! You left off on <b>floor " + resumedFloor +
      "</b> with <b>" + score + "</b> " + (score === 1 ? "present" : "presents") + " peeked.";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "restart-btn";
    btn.textContent = "Start a brand-new sneak ✨";
    btn.addEventListener("click", function (e) {
      e.stopPropagation();                        // don't let it double as "close intro"
      startRun(Math.floor(Math.random() * 1000000) + 1);
      note.remove();
      btn.remove();
      closeIntro();
    });
    var go = card.querySelector(".intro-go");
    card.insertBefore(note, go || null);
    card.insertBefore(btn, go || null);
  }

  /* ================= Floors & progress menu ================= */

  var menuOpen = false;
  var clearArmed = false;      // "tap again to erase" — no scary browser confirm()

  /* Revisiting keeps the run's seed, so floor N is the very same castle the
     player already knows. Score stays put; it's a stroll, not a rewind. */
  function goToFloor(n) {
    n = clampN(intOr(n, 1), 1, Math.max(1, save.bestFloor));
    closeMenu();
    heldKeys = [];
    stopRepeat();
    floorNum = n;
    floor = genFloor(floorNum);
    renderFloor();
    graceUntil = Date.now() + 1500;
    captureRun();
    flushSave();
  }

  function buildFloorGrid() {
    if (!floorGrid) return;
    floorGrid.textContent = "";
    var top = Math.max(1, save.bestFloor);
    for (var n = 1; n <= top; n++) {
      (function (num) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "floor-chip" + (num === floorNum ? " current" : "") +
          (num % 5 === 0 ? " party" : "");
        b.textContent = num % 5 === 0 ? num + " 🎂" : String(num);
        b.setAttribute("aria-label", "Floor " + num + (num % 5 === 0 ? ", a party floor" : ""));
        if (num === floorNum) b.setAttribute("aria-current", "true");
        b.addEventListener("click", function () { goToFloor(num); });
        floorGrid.appendChild(b);
      })(n);
    }
    if (menuHint) {
      menuHint.textContent = top === 1
        ? "Reach the stairs to unlock more floors to revisit!"
        : "Tap a floor to sneak through it again.";
    }
  }

  function openMenu() {
    if (menuOpen || !menuOverlay) return;
    menuOpen = true;
    heldKeys = [];
    stopRepeat();
    disarmClear();
    buildFloorGrid();
    menuOverlay.hidden = false;
    if (btnCloseMenu) btnCloseMenu.focus();
  }
  function closeMenu() {
    if (!menuOpen || !menuOverlay) return;
    menuOpen = false;
    menuOverlay.hidden = true;
    disarmClear();
    graceUntil = Date.now() + 1000;   // no ambush the instant the panel closes
    if (btnMenu) btnMenu.focus();     // the only control that opens this menu
  }

  function disarmClear() {
    clearArmed = false;
    if (btnClear) {
      btnClear.textContent = "Clear all progress 🧹";
      btnClear.classList.remove("armed");
    }
  }
  /* Destructive, so it asks once — in the game's own voice, not a browser dialog. */
  function clearProgress() {
    if (!clearArmed) {
      clearArmed = true;
      if (btnClear) {
        btnClear.textContent = "Really erase everything? Tap again";
        btnClear.classList.add("armed");
      }
      return;
    }
    disarmClear();
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* private mode */ }
    save.bestFloor = 1;
    save.bestScore = 0;
    save.run = null;
    resumedFloor = 0;
    closeMenu();
    startRun(Math.floor(Math.random() * 1000000) + 1);
    renderHud();
    flushSave();
  }

  var introOpenedViaHelp = false;

  function closeIntro() {
    if (!introOpen) return;
    introOpen = false;
    if (introOverlay) {
      introOverlay.classList.add("closing");
      setTimeout(function () { introOverlay.hidden = true; }, 260);
    }
    releaseIntro();
    if (introOpenedViaHelp) {
      introOpenedViaHelp = false;
      if (btnHelp) btnHelp.focus();
    } else if (mapView) {
      mapView.focus();
    }
  }

  /* Reopen the how-to-play at any point in the session (js/game.js's sibling
     help overlay follows the same idea). busy() already treats introOpen as
     a pause, so reopening mid-floor safely freezes movement/hush/spotting. */
  function openHelp() {
    if (introOpen || !introOverlay) return;
    if (menuOpen) closeMenu();
    introOpenedViaHelp = true;
    introOpen = true;
    heldKeys = [];
    stopRepeat();
    introOverlay.classList.remove("closing");
    introOverlay.hidden = false;
    if (introClose) introClose.focus();
  }

  /* ================= Input ================= */

  function wireInput() {
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    // Autoplay policy: the narrator waits for the very first gesture.
    var release = function () { closeIntro(); };
    document.addEventListener("keydown", release, { once: true });
    document.addEventListener("pointerdown", release, { once: true });

    if (btnMenu) {
      btnMenu.addEventListener("click", function () {
        closeIntro();                 // the map is itself a first gesture
        if (menuOpen) closeMenu(); else openMenu();
      });
    }
    if (btnCloseMenu) btnCloseMenu.addEventListener("click", closeMenu);
    if (btnClear) btnClear.addEventListener("click", clearProgress);
    if (menuOverlay) {
      menuOverlay.addEventListener("click", function (e) {
        if (e.target === menuOverlay) closeMenu();   // tap the dark edge to dismiss
      });
    }

    if (btnHelp) btnHelp.addEventListener("click", openHelp);
    if (introClose) {
      introClose.addEventListener("click", function (e) {
        e.stopPropagation();
        closeIntro();
      });
    }
    if (introOverlay) {
      introOverlay.addEventListener("click", function (e) {
        if (e.target === introOverlay) closeIntro();   // tap the dark edge to dismiss
      });
    }

    if (btnSound) {
      btnSound.addEventListener("click", function (e) {
        setSound(!soundOn);
        if (e && e.detail) btnSound.blur();
      });
    }
    if (btnHush) {
      btnHush.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        btnHush.classList.add("pressed");
        doHush();
      });
      var unpress = function () { btnHush.classList.remove("pressed"); };
      ["pointerup", "pointercancel", "pointerleave"].forEach(function (evt) {
        btnHush.addEventListener(evt, unpress);
      });
    }

    wireTouchControls();

    ["pointerup", "pointercancel", "pointerleave"].forEach(function (evt) {
      window.addEventListener(evt, function (e) {
        // Only the finger that started the hold may stop it — the other thumb
        // is free to press Hush without cancelling the walk.
        if (repeatPointerId === null || e.pointerId === repeatPointerId) stopRepeat();
      });
    });
    window.addEventListener("blur", function () { stopRepeat(); heldKeys = []; releaseStick(true); });

    // Capture before flushing so a mid-floor exit keeps this floor's peeks.
    var saveNow = function () { if (floor) captureRun(); flushSave(); };
    window.addEventListener("pagehide", saveNow);
    document.addEventListener("visibilitychange", function () { if (document.hidden) saveNow(); });
  }

  function onKeyUp(e) {
    var k = e.key;
    if (!k) return;
    var dir = DIR_KEYS[k] || DIR_KEYS[String(k).toLowerCase()];
    if (!dir) return;
    var i = heldKeys.indexOf(dir);
    if (i >= 0) heldKeys.splice(i, 1);
  }

  function onKeyDown(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
    var k = e.key;
    if (!k) return;
    var dir = DIR_KEYS[k] || DIR_KEYS[String(k).toLowerCase()];
    var isSpace = (k === " " || k === "Spacebar");

    if (menuOpen) {
      if (k === "Escape") { e.preventDefault(); closeMenu(); }
      return;                             // the panel owns the keyboard while open
    }
    if (introOpen) {
      if (dir || isSpace || k === "Enter" || k === "Escape") { e.preventDefault(); closeIntro(); }
      return;
    }
    if (k === "Escape" || k === "m" || k === "M") { e.preventDefault(); openMenu(); return; }
    if (dir) {
      e.preventDefault();                 // arrows never scroll the page
      if (heldKeys.indexOf(dir) < 0) heldKeys.push(dir);
      tryStep(dir);
      return;
    }
    if (isSpace) {
      if (t && t.tagName === "BUTTON") return;    // the button handles its own press
      e.preventDefault();
      doHush();
    }
  }

  /* ================= Floating thumbstick (game/SPEC-TOUCH.md) =================
     Touching anywhere in the left ~45% of the stage's lower two-thirds springs
     the ring there; the nub follows the finger; direction is the dominant axis
     past a ~22% dead zone, fed into the same hold-to-repeat the keyboard uses.
     Stick and Hush button track separate pointerIds so two thumbs work. */

  var STICK_DEAD = 0.22;
  var stickPointerId = null;
  var stickDir = null;
  var stickRadius = 60;
  var stickOx = 0, stickOy = 0;

  var coarseMQ = (window.matchMedia ? window.matchMedia("(pointer: coarse)") : null);

  /* iPadOS reports a desktop-class UA: feature-detect, never sniff. */
  function touchUIWanted() {
    if ((navigator.maxTouchPoints || 0) > 0) return true;
    if (coarseMQ && coarseMQ.matches) return true;
    return window.innerWidth < 900;
  }
  function touchUIOn() { return document.documentElement.classList.contains("touch-ui"); }
  function syncTouchUI() {
    var on = touchUIWanted();
    if (on === touchUIOn()) { layoutStick(); return; }
    if (on) document.documentElement.classList.add("touch-ui");
    else { document.documentElement.classList.remove("touch-ui"); releaseStick(true); }
    layoutStick();
  }

  function stickBox() {
    if (!touchControls) return null;
    var r = touchControls.getBoundingClientRect();
    return (r.width && r.height) ? r : null;
  }
  function placeStick(cx, cy, nx, ny) {
    if (!stickEl) return;
    stickEl.style.left = Math.round(cx) + "px";
    stickEl.style.top = Math.round(cy) + "px";
    if (stickNub) {
      stickNub.style.transform = "translate(calc(-50% + " + Math.round(nx) + "px), calc(-50% + " + Math.round(ny) + "px))";
    }
  }
  function layoutStick() {
    if (!stickEl || !touchUIOn()) return;
    stickRadius = (stickEl.offsetWidth || 120) / 2;
    if (stickPointerId !== null) return;
    var r = stickBox();
    if (!r) return;
    var pad = stickRadius + 8;
    placeStick(
      clampN(r.width * 0.17, pad, Math.max(pad, r.width - pad)),
      clampN(r.height * 0.74, pad, Math.max(pad, r.height - pad)),
      0, 0
    );
  }
  function inStickZone(r, cx, cy) {
    return cx >= r.left && cx <= r.left + r.width * 0.45 &&
      cy >= r.top + r.height * (1 / 3) && cy <= r.bottom;
  }
  function onStagePointerDown(e) {
    if (!stickEl || !touchUIOn()) return;
    if (e.pointerType === "mouse") return;
    if (stickPointerId !== null) return;
    var r = stickBox();
    if (!r || !inStickZone(r, e.clientX, e.clientY)) return;
    stickPointerId = (e.pointerId === undefined) ? -1 : e.pointerId;
    stickDir = null;
    stickRadius = (stickEl.offsetWidth || 120) / 2;
    var pad = stickRadius + 8;
    stickOx = clampN(e.clientX - r.left, pad, Math.max(pad, r.width - pad));
    stickOy = clampN(e.clientY - r.top, pad, Math.max(pad, r.height - pad));
    stickEl.classList.add("active");
    placeStick(stickOx, stickOy, 0, 0);
  }
  function onStickMove(e) {
    if (stickPointerId === null) return;
    if (e.pointerId !== undefined && stickPointerId !== -1 && e.pointerId !== stickPointerId) return;
    var r = stickBox();
    if (!r) return;
    var dx = (e.clientX - r.left) - stickOx;
    var dy = (e.clientY - r.top) - stickOy;
    var d = Math.sqrt(dx * dx + dy * dy);
    var kk = (d > stickRadius && d > 0) ? stickRadius / d : 1;
    placeStick(stickOx, stickOy, dx * kk, dy * kk);
    if (d < stickRadius * STICK_DEAD) {           // resting thumb: no creeping
      if (stickDir) { stickDir = null; stopRepeat(); }
      return;
    }
    var dir = (Math.abs(dx) >= Math.abs(dy))
      ? (dx > 0 ? "right" : "left")
      : (dy > 0 ? "down" : "up");
    if (dir === stickDir && dpadDir === dir) return;
    stickDir = dir;
    dpadDir = dir;
    repeatPointerId = stickPointerId;
    tryStep(dir);
  }
  function releaseStick(force) {
    if (stickPointerId === null && !force) return;
    stickPointerId = null;
    stickDir = null;
    stopRepeat();
    if (stickEl) stickEl.classList.remove("active");
    layoutStick();
  }
  function wireTouchControls() {
    syncTouchUI();
    if (coarseMQ) {
      if (coarseMQ.addEventListener) coarseMQ.addEventListener("change", syncTouchUI);
      else if (coarseMQ.addListener) coarseMQ.addListener(syncTouchUI);
    }
    window.addEventListener("resize", syncTouchUI);
    window.addEventListener("orientationchange", function () { setTimeout(syncTouchUI, 80); });
    if (mapView) mapView.addEventListener("pointerdown", onStagePointerDown);
    window.addEventListener("pointermove", onStickMove);
    ["pointerup", "pointercancel"].forEach(function (evt) {
      window.addEventListener(evt, function (e) {
        if (stickPointerId === null) return;
        if (e.pointerId === undefined || stickPointerId === -1 || e.pointerId === stickPointerId) releaseStick(false);
      });
    });
  }

  /* ================= Boot ================= */

  function fatal(msg) {
    if (game) { try { game.destroy(true); } catch (e) { /* ignore */ } game = null; scene = null; }
    if (mapView) {
      mapView.innerHTML = "";
      mapView.classList.add("stage-error");
      var p = document.createElement("p");
      p.className = "hint";
      p.textContent = "Oh no! " + msg;
      mapView.appendChild(p);
    }
  }

  function onSceneReady() {
    if (!floor) floor = genFloor(floorNum);
    renderFloor();
    pendingIntro = true;
    graceUntil = Date.now() + 1500;
    flushSave();
    layoutStick();
    syncHushButton();
  }

  function init(mf, vf) {
    manifest = (mf && typeof mf === "object") ? mf : {};
    voices = (vf && typeof vf === "object") ? vf : null;   // silent game without it
    loadSave();
    soundOn = save.sound !== false;
    syncSoundButton();
    if (typeof Phaser === "undefined") { fatal("The magic paintbrush (Phaser) didn't load."); return; }

    if (save.run) resumeRun(save.run);
    else floor = genFloor(floorNum);
    showResumeNote();

    // Dwell heartbeat: catches "stood too long in the light" even when no
    // guest event fires (e.g. only leeblebeest, rotating every 2.5s).
    setInterval(function () { checkSpotted(); }, 300);

    makeScenes();
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: mapView,
      width: GAME_W,
      height: GAME_H,
      backgroundColor: "#100d26",
      transparent: false,
      banner: false,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        expandParent: false
      },
      render: { antialias: true, roundPixels: false },
      scene: [BootScene, WorldScene]
    });

    wireInput();
    renderHud();

    /* Testability hook — the canvas is opaque to DOM inspection. Read-only.
       Movement is tween-paced: tests must dispatch paced synthetic
       keydown/keyup on document.body, never burst-dispatch. */
    window.__presentPeek = {
      version: 1,
      getState: function () {
        return {
          floor: floorNum,
          score: score,
          bestFloor: save.bestFloor,
          bestScore: save.bestScore,
          party: !!(floor && floor.party),
          presentsTotal: floor ? floor.presents.length : 0,
          presentsPeeked: floor ? floor.presents.filter(function (p) { return p.peeked; }).length : 0,
          stairsUnlocked: !!(floor && allPeeked()),
          hushed: isHushed(),
          spotted: spotted,
          introOpen: introOpen,
          menuOpen: menuOpen,
          sound: soundOn
        };
      },
      getFloor: function () {
        if (!floor) return null;
        try { return JSON.parse(JSON.stringify({
          w: floor.w, h: floor.h, grid: floor.grid, props: floor.props,
          presents: floor.presents, rug: floor.rug, stairs: floor.stairs, party: floor.party
        })); } catch (e) { return null; }
      },
      getPositions: function () {
        return {
          moon: { x: heroes.moon.x, y: heroes.moon.y },
          babylady: { x: heroes.babylady.x, y: heroes.babylady.y },
          guests: (floor ? floor.guests : []).map(function (g) {
            return { id: g.id, x: g.x, y: g.y, facing: g.facing };
          })
        };
      },
      getSeed: function () { return runSeed; },
      getSavedRun: function () { return save.run ? JSON.parse(JSON.stringify(save.run)) : null; },
      resumedFrom: function () { return resumedFloor; },   // 0 = fresh run this session
      setSeed: function (s) { startRun(s); },     // intended before play begins
      tick: function () { checkSpotted(); }
    };
  }

  if (!mapView) return;

  function fetchJson(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) return null;
      return r.json();
    }).catch(function () { return null; });
  }

  /* Both manifests are optional: no assets = painted swatches + emoji,
     no voices = a perfectly playable silent game. */
  Promise.all([
    fetchJson(ASSET_BASE + "manifest.json"),
    fetchJson(VOICE_BASE + "manifest.json")
  ]).then(function (res) {
    init(res[0], res[1]);
  }).catch(function () {
    init(null, null);
  });
})();
