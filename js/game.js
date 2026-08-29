/* Princess Moon's Castle Life — game engine (v2)
 *
 * Phaser 3.90.0 — vendored as js/vendor/phaser.min.js (minified UMD build,
 * loaded by game.html before this file; no bundler, no modules).
 *
 * Hybrid architecture (game/SPEC-V2.md, Workstream B):
 *   - Phaser owns ONLY the map stage. Its canvas mounts inside #mapView and
 *     scales with Phaser.Scale.FIT.
 *   - Everything else stays DOM exactly as v1: header, satchel / crafting /
 *     furniture panels, dialogue box, toasts, confirm modal, touch d-pad.
 *   - All game rules, world data and the save format are v1's (game/SPEC.md).
 *     localStorage key "pm-castle-life-v1" stays byte-compatible.
 *
 * Art comes from game/assets/manifest.json when it exists. ANY subset may be
 * missing: the engine generates a fallback texture per terrain (the v1 CSS
 * tile colours) and draws the v1 emoji as Phaser Text for objects, characters
 * and nodes, so the game is fully playable with no art at all.
 */
(function () {
  "use strict";

  /* ================= Constants ================= */

  var SAVE_KEY = "pm-castle-life-v1";
  var RESPAWN_MS = 35000;   // resource node comes back this long after gathering
  var TICK_MS = 1000;       // respawn check
  var TOAST_MS = 2400;
  var FADE_MS = 250;        // map/room transition fade (each way)
  var STEP_MS = 150;        // one tweened grid step
  var HOP_PX = 7;           // little hop arc during a step
  var SAVE_DEBOUNCE = 150;
  var START_MAP = "grounds";
  var START_X = 9, START_Y = 5;

  /* Fixed internal stage size; Scale.FIT letterboxes it into #mapView. */
  var GAME_W = 1152, GAME_H = 768;

  /* Camera: the stage shows ~VIEW_TILES_X tiles across and follows Princess
     Moon, so the characters read at a size a 4-year-old can actually see
     (v2.0 fitted the whole 18x12 map in and the sprites were thumbnails).
     One tile size for every area keeps her the same size indoors and out;
     areas narrower/shorter than the viewport are centred instead of pinned
     to a corner (see renderArea's worldW/worldH). */
  var VIEW_TILES_X = 10;
  var TILE_PX = Math.floor(GAME_W / VIEW_TILES_X);   // 115
  var CAM_LERP = 0.14;         // a little glide, not a snap

  var ASSET_BASE = "game/assets/";
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

  /* Terrain textures the renderer may ask for (manifest keys + "void"). */
  var TERRAIN_LIST = [
    "grass", "grass2", "path", "dock", "tree", "rock", "water", "sand",
    "cavefloor", "cavewall", "floor", "wall", "flowers", "glow",
    "castledoor", "dooropen", "void"
  ];
  /* v1 emoji drawn over a *fallback* terrain swatch (never over real art). */
  var TERRAIN_EMOJI = { tree: "🌳", castledoor: "🏰", dooropen: "🚪" };

  /* Terrain glyphs the manifest ships as TRANSPARENT overlay sprites rather
     than opaque tiles: the map's own base ground is drawn underneath and the
     sprite sits on top as a y-sorted object (value = the v1 emoji fallback).
     No generated ground swatch is made for these — a missing file has to fall
     through to the emoji, exactly like nodes and furniture do. */
  var TERRAIN_OVERLAY = { rock: "🪨" };

  var PLAYER_EMOJI = "🧚";

  /* Depth bands: ground 0, terrain emoji 1, y-sorted objects 100+py, fx 9000+. */
  var DEPTH_OBJ = 100;

  /* ================= DOM ================= */

  function $(id) { return document.getElementById(id); }

  var mapView = $("mapView");
  var locationName = $("locationName");
  var toastEl = $("toast");
  var dialogueBox = $("dialogueBox");
  var dialoguePortrait = $("dialoguePortrait");
  var dialogueText = $("dialogueText");
  var dialogueNext = $("dialogueNext");
  var invGrid = $("invGrid");
  var recipeList = $("recipeList");
  var furnList = $("furnList");
  var decorHint = $("decorHint");
  var btnAction = $("btnAction");
  var touchControls = $("touchControls");
  var stickEl = $("touchStick");
  var stickNub = $("touchStickNub");
  var btnReset = $("btnReset");
  var btnSound = $("btnSound");
  var confirmModal = $("confirmModal");
  var confirmText = $("confirmText");
  var confirmYes = $("confirmYes");
  var confirmNo = $("confirmNo");
  var btnHelp = $("btnHelp");
  var helpOverlay = $("helpOverlay");
  var btnHelpClose = $("btnHelpClose");
  var btnHelpGotIt = $("btnHelpGotIt");

  /* ================= Runtime ================= */

  var world = null;            // parsed world.json
  var manifest = null;         // parsed game/assets/manifest.json (or {})
  var roomsById = {};
  var recipesById = {};
  var houseDoorMap = null;
  var state = null;

  var game = null;             // Phaser.Game
  var scene = null;            // the live WorldScene

  /* Current area geometry (stage coordinates) */
  var gridW = 0, gridH = 0;
  var tileSize = TILE_PX, originX = 0, originY = 0;
  var worldW = GAME_W, worldH = GAME_H;   // camera bounds (>= one viewport)
  var useDock = false, isCave = false, isOutdoor = false;
  var baseTerrain = "grass";   // what this map's ground is made of (see baseTerrainOf)

  /* Display objects for the current area */
  var groundAt = {};           // "x:y" -> ground Image
  var overlayAt = {};          // "x:y" -> [GameObject]
  var swayFx = [], waterFx = [], glowFx = [];
  var playerC = null, playerInner = null, playerSprite = null;
  var sparkleEmitter = null, dustEmitter = null;

  var npcIndex = {};           // "x:y" -> companion id (current area)
  var resIndex = {};           // "x:y" -> resource placement (current area)

  var dialogue = null;         // { id, lines, i, first }
  var dialogueOpenerFocus = null;
  var placing = null;          // furniture item id being placed
  var tileMenu = null;         // inline Move / Put away menu element
  var travelling = false;
  var moving = false;          // a step tween is in flight
  var saveTimer = null;
  var wiped = false;
  var lastBumpToast = 0;
  var pointerDriven = false;
  var heldKeys = [];           // held direction keys, most recent last
  var dpadDir = null;          // direction the thumbstick is currently asking for
  var repeatPointerId = null;  // the one finger allowed to stop the hold

  /* Floating thumbstick */
  var STICK_DEAD = 0.22;       // dead zone, as a fraction of the ring radius
  var stickPointerId = null;   // finger steering the stick (null = at rest)
  var stickDir = null;         // last direction it asked for
  var stickRadius = 60;        // ring radius in overlay px
  var stickOx = 0, stickOy = 0; // ring centre in overlay px
  var toastQueue = [], toastTimer = null;

  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ================= Small helpers ================= */

  function intOr(v, def) { var n = parseInt(v, 10); return isNaN(n) ? def : n; }
  function keyOf(x, y) { return x + ":" + y; }

  /* Stable pseudo-random per tile, so grass variants never shuffle. */
  function hash2(x, y) {
    var h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >> 13)) | 0;
    h = Math.imul(h, 1274126177) | 0;
    return ((h ^ (h >> 16)) >>> 0) / 4294967296;
  }

  /* Hide/show belt-and-braces: some panels carry a `display` rule that would
     out-rank the `hidden` attribute, so set both. */
  function setHidden(el, hide) {
    if (!el) return;
    el.hidden = !!hide;
    el.style.display = hide ? "none" : "";
  }

  /* Toasts queue so a burst of unlocks doesn't stomp on itself. */
  function toast(msg, ms, extraClass) {
    if (!toastEl || !msg) return;
    if (toastQueue.length > 4) return;
    toastQueue.push({ m: String(msg), ms: ms || TOAST_MS, cls: extraClass || "" });
    if (!toastTimer) nextToast();
  }
  function nextToast() {
    if (!toastQueue.length) {
      toastTimer = null;
      toastEl.className = "toast";
      setHidden(toastEl, true);
      return;
    }
    var t = toastQueue.shift();
    toastEl.className = "toast" + (t.cls ? " " + t.cls : "");
    toastEl.textContent = t.m;
    setHidden(toastEl, false);
    void toastEl.offsetWidth;          // restart the fade-in
    toastEl.classList.add("show");
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
      toastTimer = setTimeout(nextToast, 200);
    }, t.ms);
  }

  /* ================= Save / load  (unchanged from v1) ================= */

  function save() {
    if (saveTimer || wiped) return;
    saveTimer = setTimeout(flushSave, SAVE_DEBOUNCE);
  }
  function flushSave() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (!state || wiped) return;   // "Start over" must not be undone by the unload flush
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* private mode: play on */ }
  }

  function freshState() {
    return {
      mapId: world.maps[START_MAP] ? START_MAP : Object.keys(world.maps)[0],
      roomId: null,
      x: START_X, y: START_Y,
      facing: "down",
      inv: {},
      furniture: {},
      placed: {},
      met: [],
      cutscenesSeen: [],       // added in v2.1; older saves simply have none
      totals: { gathered: 0, crafted: 0 },
      nodesDepleted: {}
    };
  }

  /* Anything unrecognised in a save is dropped rather than trusted. */
  function sanitize(raw) {
    var s = freshState();
    if (!raw || typeof raw !== "object") return s;

    if (raw.totals && typeof raw.totals === "object") {
      s.totals.gathered = Math.max(0, intOr(raw.totals.gathered, 0));
      s.totals.crafted = Math.max(0, intOr(raw.totals.crafted, 0));
    }
    if (Object.prototype.toString.call(raw.met) === "[object Array]") {
      for (var i = 0; i < raw.met.length; i++) {
        var id = raw.met[i];
        if (typeof id === "string" && world.companions[id] && s.met.indexOf(id) < 0) s.met.push(id);
      }
    }
    /* Additive: a v1/v2.0 save has no cutscenesSeen and just gets an empty
       one, so nothing that used to load stops loading. */
    if (Object.prototype.toString.call(raw.cutscenesSeen) === "[object Array]") {
      for (var ci = 0; ci < raw.cutscenesSeen.length; ci++) {
        var csid = raw.cutscenesSeen[ci];
        if (typeof csid === "string" && cutsceneById(csid) && s.cutscenesSeen.indexOf(csid) < 0) {
          s.cutscenesSeen.push(csid);
        }
      }
    }
    if (raw.inv && typeof raw.inv === "object") {
      for (var r in raw.inv) {
        if (!world.resources[r]) continue;
        var c = intOr(raw.inv[r], 0);
        if (c > 0) s.inv[r] = Math.min(c, 999);
      }
    }
    if (raw.furniture && typeof raw.furniture === "object") {
      for (var f in raw.furniture) {
        if (!recipesById[f]) continue;
        var fc = intOr(raw.furniture[f], 0);
        if (fc > 0) s.furniture[f] = Math.min(fc, 999);
      }
    }
    if (raw.placed && typeof raw.placed === "object") {
      for (var rid in raw.placed) {
        var room = roomsById[rid];
        var list = raw.placed[rid];
        if (!room || Object.prototype.toString.call(list) !== "[object Array]") continue;
        var keep = [];
        var seen = {};
        for (var j = 0; j < list.length && keep.length < 200; j++) {
          var p = list[j];
          if (!p || typeof p !== "object") continue;
          var px = intOr(p.x, -1), py = intOr(p.y, -1);
          if (!recipesById[p.item]) continue;
          if (tileCharOf(room, px, py) === null) continue;
          if (seen[keyOf(px, py)]) continue;
          seen[keyOf(px, py)] = true;
          keep.push({ x: px, y: py, item: p.item });
        }
        if (keep.length) s.placed[rid] = keep;
      }
    }

    // nodesDepleted is deliberately dropped: everything is fresh on reload.

    // Location last, so unlock checks can see totals/met.
    if (typeof raw.roomId === "string" && roomsById[raw.roomId] && condMetWith(s, roomsById[raw.roomId].unlock)) {
      s.roomId = raw.roomId;
      s.mapId = raw.mapId && world.maps[raw.mapId] ? raw.mapId : s.mapId;
    } else if (typeof raw.mapId === "string" && world.maps[raw.mapId]) {
      s.roomId = null;
      s.mapId = raw.mapId;
    }
    if (DIRS[raw.facing]) s.facing = raw.facing;

    var area = s.roomId ? roomsById[s.roomId] : world.maps[s.mapId];
    var sx = intOr(raw.x, s.x), sy = intOr(raw.y, s.y);
    var spot = isWalkableIn(area, !!s.roomId, sx, sy, s) ? { x: sx, y: sy } : nearestWalkable(area, !!s.roomId, sx, sy, s);
    if (!spot) { // give up and start over rather than wedge the player in a wall
      var fresh = freshState();
      s.roomId = fresh.roomId; s.mapId = fresh.mapId;
      area = world.maps[s.mapId];
      spot = isWalkableIn(area, false, fresh.x, fresh.y, s) ? { x: fresh.x, y: fresh.y } : nearestWalkable(area, false, fresh.x, fresh.y, s);
    }
    s.x = spot ? spot.x : 0;
    s.y = spot ? spot.y : 0;
    return s;
  }

  function loadState() {
    var raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { raw = null; }
    if (!raw) return null;
    var parsed = null;
    try { parsed = JSON.parse(raw); } catch (e) { return null; }
    if (!parsed || typeof parsed !== "object") return null;
    return sanitize(parsed);
  }

  /* ================= World queries  (unchanged from v1) ================= */

  function areaIdOf(area) { return area && area._id ? area._id : ""; }
  function currentArea() {
    if (!state) return null;
    return state.roomId ? roomsById[state.roomId] : world.maps[state.mapId];
  }
  function inRoom() { return !!(state && state.roomId); }

  function tileCharOf(area, x, y) {
    if (!area || !area.tiles) return null;
    if (y < 0 || y >= area.tiles.length) return null;
    var row = area.tiles[y];
    if (typeof row !== "string" || x < 0 || x >= row.length) return null;
    return row.charAt(x);
  }
  function terrainOf(ch) {
    var t = ch !== null && world.tileTypes ? world.tileTypes[ch] : null;
    return t && t.terrain ? t.terrain : "void";
  }
  function baseWalkable(ch) {
    var t = ch !== null && world.tileTypes ? world.tileTypes[ch] : null;
    return !!(t && t.walkable);   // unknown glyphs are solid: never walk off the map
  }

  function exitIn(area, x, y) {
    var list = (area && area.exits) || [];
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e && intOr(e.x, -1) === x && intOr(e.y, -1) === y) return e;
    }
    return null;
  }
  function exitAt(x, y) { return exitIn(currentArea(), x, y); }

  /* Unlock conditions (recipes and rooms share the shape). Unknown types
     fail open — this game has no dead ends. */
  function condMetWith(s, u) {
    if (!u || !u.type || u.type === "start") return true;
    if (u.type === "gathered") return s.totals.gathered >= intOr(u.count, 0);
    if (u.type === "crafted") return s.totals.crafted >= intOr(u.count, 0);
    if (u.type === "companion") return s.met.indexOf(u.id) >= 0;
    return true;
  }
  function condMet(u) { return condMetWith(state, u); }
  function roomUnlocked(id) {
    var r = roomsById[id];
    return !!r && condMet(r.unlock);
  }

  /* A doorway that leads to a still-locked room. */
  function lockedDoorIn(area, x, y) {
    var e = exitIn(area, x, y);
    if (e && e.room && !roomUnlocked(e.to)) return e;
    return null;
  }

  function npcsFor(area, s) {
    var out = {};
    if (!area || !world.companions) return out;
    s = s || state;
    var id = areaIdOf(area);
    var listed = (area.npcs && Object.prototype.toString.call(area.npcs) === "[object Array]") ? area.npcs : [];
    var add = function (cid) {
      var c = world.companions[cid];
      if (!c) return;
      // Gated on a cutscene the player hasn't watched yet: not there at all.
      if (c.appearsAfter && !seenCutscene(c.appearsAfter, s)) return;
      if (c.map && c.map !== id) return;
      var cx = intOr(c.x, -1), cy = intOr(c.y, -1);
      if (tileCharOf(area, cx, cy) === null) return;
      out[keyOf(cx, cy)] = cid;
    };
    for (var i = 0; i < listed.length; i++) add(listed[i]);
    for (var cid in world.companions) {
      if (world.companions[cid] && world.companions[cid].map === id) add(cid);
    }
    return out;
  }

  function placedListFor(areaIdStr, s) {
    s = s || state;
    if (!s || !s.placed) return null;      // may run before boot finishes
    var list = s.placed[areaIdStr];
    return Object.prototype.toString.call(list) === "[object Array]" ? list : null;
  }
  function placedInAt(areaIdStr, x, y, s) {
    var list = placedListFor(areaIdStr, s);
    if (!list) return null;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].x === x && list[i].y === y) return list[i];
    }
    return null;
  }
  function placedAt(x, y) { return inRoom() ? placedInAt(state.roomId, x, y) : null; }

  function resourceAt(x, y) { return resIndex[keyOf(x, y)] || null; }
  function npcAt(x, y) { return npcIndex[keyOf(x, y)] || null; }

  function nodeKey(x, y) { return areaIdOf(currentArea()) + ":" + x + ":" + y; }
  function nodeDepleted(x, y) { return !!state.nodesDepleted[nodeKey(x, y)]; }

  /* Walkability for any area (used for spawn/teleport checks too). */
  function isWalkableIn(area, isRoom, x, y, s) {
    s = s || state;
    var ch = tileCharOf(area, x, y);
    if (ch === null || !baseWalkable(ch)) return false;
    var e = exitIn(area, x, y);
    if (e && e.room) {
      var room = roomsById[e.to];
      if (!room || !condMetWith(s, room.unlock)) return false;
    }
    var npcs = (area === currentArea() && s === state) ? npcIndex : npcsFor(area, s);
    if (npcs[keyOf(x, y)]) return false;
    if (isRoom && placedInAt(areaIdOf(area), x, y, s)) return false;
    return true;
  }
  function walkableAt(x, y) { return isWalkableIn(currentArea(), inRoom(), x, y, state); }

  function nearestWalkable(area, isRoom, x, y, s) {
    if (!area || !area.tiles) return null;
    var h = area.tiles.length;
    var w = 0;
    for (var i = 0; i < h; i++) w = Math.max(w, (area.tiles[i] || "").length);
    for (var r = 0; r <= Math.max(w, h); r++) {
      for (var dy = -r; dy <= r; dy++) {
        for (var dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          var nx = x + dx, ny = y + dy;
          if (isWalkableIn(area, isRoom, nx, ny, s)) return { x: nx, y: ny };
        }
      }
    }
    return null;
  }

  function areaHasTerrain(area, terrain) {
    if (!area || !area.tiles) return false;
    for (var y = 0; y < area.tiles.length; y++) {
      var row = area.tiles[y] || "";
      for (var x = 0; x < row.length; x++) {
        if (terrainOf(row.charAt(x)) === terrain) return true;
      }
    }
    return false;
  }

  function findTerrain(area, terrain) {
    if (!area || !area.tiles) return null;
    for (var y = 0; y < area.tiles.length; y++) {
      var row = area.tiles[y] || "";
      for (var x = 0; x < row.length; x++) {
        if (terrainOf(row.charAt(x)) === terrain) return { x: x, y: y };
      }
    }
    return null;
  }

  /* ================= Asset manifest ================= */

  function manifestPath(group, id) {
    if (!manifest || !manifest[group]) return null;
    var p = manifest[group][id];
    return (typeof p === "string" && p) ? p : null;
  }
  function texKey(group, id) { return group.charAt(0) + "_" + id; }

  /* Everyone who speaks in a cutscene may need a character sprite too. */
  function cutsceneSpeakers() {
    var out = [];
    var list = cutsceneList();
    for (var i = 0; i < list.length; i++) {
      var steps = (list[i] && Object.prototype.toString.call(list[i].steps) === "[object Array]") ? list[i].steps : [];
      for (var j = 0; j < steps.length; j++) {
        var id = steps[j] && steps[j].speaker;
        if (typeof id === "string" && id && id !== "narrator" && out.indexOf(id) < 0) out.push(id);
      }
    }
    return out;
  }

  /* Every manifest entry we might use, as {key, url} pairs. */
  function manifestQueue() {
    var out = [];
    var groups = {
      terrain: TERRAIN_LIST,
      characters: ["moon"].concat(Object.keys(world.companions || {})).concat(cutsceneSpeakers()),
      nodes: Object.keys(world.resources || {}),
      furniture: (world.recipes || []).map(function (r) { return r && r.id; }),
      fx: ["sparkle"]
    };
    var seen = {};
    for (var g in groups) {
      var ids = groups[g];
      for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        if (!id) continue;
        var key = texKey(g, id);
        if (seen[key]) continue;          // e.g. a companion literally named "moon"
        var p = manifestPath(g, id);
        if (!p) continue;
        seen[key] = true;
        out.push({ key: key, url: ASSET_BASE + p });
      }
    }
    return out;
  }

  /* ================= Generated fallback textures ================= */

  /* v1's CSS tile colours, redrawn on a canvas so a missing .webp still
     looks like the game the kids already know. */
  var TERRAIN_PAINT = {
    grass: { stops: [[0, "#4c8f6b"], [0.55, "#3a6f7c"], [1, "#2c4f68"]] },
    grass2: { stops: [[0, "#56986f"], [0.5, "#3d7480"], [1, "#284a63"]], speckle: "rgba(255,255,255,.10)" },
    path: { stops: [[0, "#e2c393"], [1, "#cda56e"]] },
    dock: { stops: [[0, "#a97c4c"], [1, "#7d5730"]], planks: true },
    sand: { stops: [[0, "#f0dfae"], [1, "#ddc287"]] },
    water: { stops: [[0, "#2a5f8c"], [0.55, "#1c3f70"], [1, "#142a52"]] },
    cavefloor: { stops: [[0, "#3b2350"], [1, "#2a1938"]] },
    cavewall: { stops: [[0, "#221530"], [1, "#150c22"]], crystals: true },
    floor: { stops: [[0, "#f3e2bd"], [1, "#e6cd9c"]], planks: true },
    wall: { stops: [[0, "#a495c4"], [1, "#7f6ea8"]], bricks: true },
    flowers: {
      stops: [[0, "#4c8f6b"], [0.55, "#3a6f7c"], [1, "#2c4f68"]],
      dots: [["rgba(242,169,196,.75)", 0.30, 0.35, 0.09], ["rgba(243,221,166,.75)", 0.68, 0.60, 0.08], ["rgba(255,255,255,.55)", 0.50, 0.20, 0.06]]
    },
    glow: { stops: [[0, "#3b2350"], [1, "#2a1938"]], halo: "rgba(243,221,166,.55)" },
    tree: { stops: [[0, "#4c8f6b"], [0.55, "#3a6f7c"], [1, "#2c4f68"]], blob: ["#2f6b4a", "#1e4632", 0.44] },
    castledoor: { stops: [[0, "#caa25a"], [1, "#8a6a34"]], frame: "rgba(253,249,240,.32)" },
    dooropen: { stops: [[0, "#9a7440"], [1, "#5d4520"]], frame: "rgba(253,249,240,.28)" },
    void: { stops: [[0, "#191636"], [1, "#12102a"]] }
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

    // Base gradient, roughly v1's 155deg linear-gradient.
    var grad = g.createLinearGradient(0, 0, S * 0.62, S);
    for (i = 0; i < spec.stops.length; i++) grad.addColorStop(spec.stops[i][0], spec.stops[i][1]);
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);

    if (spec.speckle) {
      g.fillStyle = spec.speckle;
      for (i = 0; i < 14; i++) {
        var sx = hash2(i + 1, 7) * S, sy = hash2(7, i + 1) * S;
        g.beginPath(); g.arc(sx, sy, 1.6 + hash2(i, i) * 2, 0, 6.284); g.fill();
      }
    }
    if (spec.planks) {
      g.strokeStyle = "rgba(0,0,0,.16)";
      g.lineWidth = 2;
      for (i = 1; i < 4; i++) {
        g.beginPath(); g.moveTo(0, (S / 4) * i); g.lineTo(S, (S / 4) * i); g.stroke();
      }
    }
    if (spec.bricks) {
      g.strokeStyle = "rgba(0,0,0,.18)";
      g.lineWidth = 2;
      for (i = 1; i < 5; i++) {
        g.beginPath(); g.moveTo(0, (S / 5) * i); g.lineTo(S, (S / 5) * i); g.stroke();
      }
      g.beginPath(); g.moveTo(S / 2, 0); g.lineTo(S / 2, S / 5); g.stroke();
      g.beginPath(); g.moveTo(S / 2, (S / 5) * 2); g.lineTo(S / 2, (S / 5) * 3); g.stroke();
      g.beginPath(); g.moveTo(S / 2, (S / 5) * 4); g.lineTo(S / 2, S); g.stroke();
    }
    if (spec.crystals) {
      var cols = ["rgba(215,227,240,.28)", "rgba(215,227,240,.20)", "rgba(232,196,106,.24)"];
      var pts = [[0.25, 0.30, 0.055], [0.70, 0.65, 0.045], [0.55, 0.20, 0.04]];
      for (i = 0; i < pts.length; i++) {
        g.fillStyle = cols[i];
        g.beginPath(); g.arc(pts[i][0] * S, pts[i][1] * S, pts[i][2] * S, 0, 6.284); g.fill();
      }
    }
    if (spec.dots) {
      for (i = 0; i < spec.dots.length; i++) {
        var d = spec.dots[i];
        g.fillStyle = d[0];
        g.beginPath(); g.arc(d[1] * S, d[2] * S, d[3] * S, 0, 6.284); g.fill();
      }
    }
    if (spec.halo) {
      var hg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.55);
      hg.addColorStop(0, spec.halo);
      hg.addColorStop(0.6, "rgba(232,196,106,.18)");
      hg.addColorStop(1, "rgba(232,196,106,0)");
      g.fillStyle = hg;
      g.fillRect(0, 0, S, S);
    }
    if (spec.blob) {
      var bg = g.createRadialGradient(S * 0.46, S * 0.5, 0, S * 0.5, S * 0.55, S * spec.blob[2]);
      bg.addColorStop(0, spec.blob[0]);
      bg.addColorStop(1, spec.blob[1]);
      g.fillStyle = bg;
      g.beginPath(); g.arc(S * 0.5, S * 0.55, S * spec.blob[2], 0, 6.284); g.fill();
    }
    if (spec.frame) {
      g.strokeStyle = spec.frame;
      g.lineWidth = 5;
      roundRectPath(g, 12, 10, S - 24, S - 14, 22);
      g.stroke();
    }

    // The "rounded swatch" read: a soft inner outline so tiles stay legible.
    g.strokeStyle = "rgba(0,0,0,.16)";
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
    // four-point star
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

  function paintVignette(sc) {
    if (sc.textures.exists("fx_vignette")) return;
    var W = 320, H = 214;
    var cv = sc.textures.createCanvas("fx_vignette", W, H);
    if (!cv) return;
    var g = cv.getContext();
    var grad = g.createRadialGradient(W / 2, H / 2, H * 0.18, W / 2, H / 2, H * 0.85);
    grad.addColorStop(0, "rgba(6,4,18,0)");
    grad.addColorStop(0.55, "rgba(6,4,18,.35)");
    grad.addColorStop(1, "rgba(6,4,18,.82)");
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    cv.refresh();
  }

  function buildFallbackTextures(sc) {
    for (var i = 0; i < TERRAIN_LIST.length; i++) {
      // overlay terrains (rock) are objects, not ground: no swatch, emoji instead
      if (TERRAIN_OVERLAY[TERRAIN_LIST[i]]) continue;
      paintTerrainTexture(sc, TERRAIN_LIST[i]);
    }
    paintSparkle(sc);
    paintSoftCircle(sc, "fx_dust", "rgba(240,232,214,.85)", "rgba(240,232,214,0)");
    paintSoftCircle(sc, "fx_halo", "rgba(243,221,166,.55)", "rgba(232,196,106,0)");
    paintVignette(sc);
  }

  /* ================= Stage geometry ================= */

  function tileCenter(x, y) {
    return {
      x: originX + x * tileSize + tileSize / 2,
      y: originY + y * tileSize + tileSize / 2
    };
  }

  /* The ground an overlay terrain (rock) sits on: whatever this map is made
     of. Falls back to grass so an unusual map still gets something sensible. */
  function baseTerrainOf(area) {
    if (areaHasTerrain(area, "cavefloor")) return "cavefloor";
    if (areaHasTerrain(area, "sand")) return "sand";
    if (areaHasTerrain(area, "floor")) return "floor";
    return "grass";
  }

  /* Which terrain texture a cell draws with (doors + shore docks + variants). */
  function groundTexFor(area, x, y) {
    var e = exitIn(area, x, y);
    if (e && e.room) return texKey("terrain", roomUnlocked(e.to) ? "dooropen" : "wall");
    var terrain = terrainOf(tileCharOf(area, x, y));
    if (terrain === "castledoor") return texKey("terrain", inRoom() ? "dooropen" : "castledoor");
    // rock is a transparent sprite: draw the map's own ground beneath it
    if (TERRAIN_OVERLAY[terrain]) terrain = baseTerrain;
    if (terrain === "path" && useDock) return texKey("terrain", "dock");
    if (terrain === "grass" && hash2(x, y) < 0.28) return texKey("terrain", "grass2");
    if (!TERRAIN_PAINT[terrain] && !(scene && scene.textures.exists(texKey("terrain", terrain)))) return texKey("terrain", "void");
    return texKey("terrain", terrain);
  }

  /* The v1 emoji that belongs on a fallback terrain swatch (if any). */
  function groundEmojiFor(area, x, y) {
    var e = exitIn(area, x, y);
    var name;
    if (e && e.room) name = roomUnlocked(e.to) ? "dooropen" : null;
    else {
      var terrain = terrainOf(tileCharOf(area, x, y));
      if (terrain === "castledoor") name = inRoom() ? "dooropen" : "castledoor";
      else name = terrain;
    }
    if (!name || !TERRAIN_EMOJI[name]) return null;
    // Real art already contains the object — only decorate generated swatches.
    if (realTerrain[name]) return null;
    return TERRAIN_EMOJI[name];
  }

  var realTerrain = {};   // terrain name -> true when the manifest texture loaded

  /* An object sprite: real texture when we have one, else the v1 emoji.
     `_baseSX` remembers the un-flipped horizontal scale (see setFlip). */
  function makeIcon(group, id, emoji, px) {
    var key = texKey(group, id);
    var obj;
    if (scene.textures.exists(key)) {
      obj = scene.add.image(0, 0, key);
      var src = scene.textures.get(key).getSourceImage();
      var big = Math.max(src.width || 1, src.height || 1);
      obj.setScale(px / big);
    } else {
      obj = scene.add.text(0, 0, emoji || "✨", {
        fontFamily: EMOJI_FONT,
        fontSize: Math.round(px * 0.84) + "px",
        padding: { x: 6, y: 6 }
      });
      obj.setOrigin(0.5, 0.5);
    }
    obj._baseSX = obj.scaleX;
    return obj;
  }

  /* Works for both Image and Text (Text has no reliable flip component). */
  function setFlip(obj, flip) {
    if (!obj) return;
    var base = Math.abs(obj._baseSX || 1);
    obj.scaleX = flip ? -base : base;
  }

  /* ================= Phaser scenes ================= */

  var BootScene = null, WorldScene = null;

  function makeScenes() {
    BootScene = class BootScene extends Phaser.Scene {
      constructor() { super({ key: "Boot" }); }
      preload() {
        this.load.on("loaderror", function (file) {
          // A missing .webp is fine: the fallback swatch/emoji covers it.
          if (file && file.key && file.key.indexOf("t_") === 0) delete realTerrain[file.key.slice(2)];
        });
        var q = manifestQueue();
        for (var i = 0; i < q.length; i++) {
          if (q[i].key.indexOf("t_") === 0) realTerrain[q[i].key.slice(2)] = true;
          this.load.image(q[i].key, q[i].url);
        }
      }
      create() {
        // Drop bookkeeping for anything that didn't actually make it in.
        for (var name in realTerrain) {
          if (!this.textures.exists(texKey("terrain", name))) delete realTerrain[name];
        }
        buildFallbackTextures(this);
        this.scene.start("World");
      }
    };

    WorldScene = class WorldScene extends Phaser.Scene {
      constructor() { super({ key: "World" }); }
      create() {
        scene = this;
        this.cameras.main.setBackgroundColor("#15132e");
        this.input.on("pointerup", onStagePointerUp);
        this.scale.on("resize", function () { closeTileMenu(); layoutStick(); });
        onSceneReady();
      }
    };
  }

  /* ================= Area rendering ================= */

  function clearOverlay(k) {
    var list = overlayAt[k];
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].destroy) list[i].destroy();
    }
    delete overlayAt[k];
  }

  function pushOverlay(k, obj) {
    if (!overlayAt[k]) overlayAt[k] = [];
    overlayAt[k].push(obj);
    return obj;
  }

  /* Build (or rebuild) everything sitting above the ground on one tile. */
  function buildOverlay(x, y) {
    var area = currentArea();
    var k = keyOf(x, y);
    clearOverlay(k);
    var c = tileCenter(x, y);
    var depth = DEPTH_OBJ + c.y;

    // Rock: a transparent sprite standing on the map's ground, y-sorted like a
    // node and anchored bottom-centre so it sits on the tile rather than in it.
    var terrain = terrainOf(tileCharOf(area, x, y));
    if (TERRAIN_OVERLAY[terrain]) {
      var boulder = makeIcon("terrain", terrain, TERRAIN_OVERLAY[terrain], tileSize * 0.9);
      boulder.setOrigin(0.5, 1);
      boulder.setPosition(c.x, c.y + tileSize * 0.44);
      boulder.setDepth(depth + 1);
      pushOverlay(k, boulder);
    }

    // Locked room doorway: a pulsing gold sparkle on the wall.
    var e = exitIn(area, x, y);
    if (e && e.room && !roomUnlocked(e.to)) {
      var ring = scene.add.image(c.x, c.y, "fx_halo");
      ring.setDisplaySize(tileSize * 1.1, tileSize * 1.1).setDepth(depth);
      var star = scene.add.image(c.x, c.y, "fx_sparkle");
      star.setDisplaySize(tileSize * 0.5, tileSize * 0.5).setDepth(depth + 1);
      pushOverlay(k, ring); pushOverlay(k, star);
      if (!reduceMotion) {
        scene.tweens.add({
          targets: [ring, star], alpha: { from: 0.45, to: 1 }, scale: { from: 0.86, to: 1.06 },
          duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
        });
      }
    }

    // Companion standing here
    var cid = npcAt(x, y);
    if (cid) {
      var comp = world.companions[cid];
      var npc = makeIcon("characters", cid, (comp && comp.emoji) || "✨", tileSize * 1.05);
      npc.setPosition(c.x, c.y - tileSize * 0.12).setDepth(depth + 2);
      pushOverlay(k, npc);
      if (!reduceMotion) {
        scene.tweens.add({
          targets: npc, y: npc.y - 4, duration: 900, yoyo: true, repeat: -1,
          ease: "Sine.easeInOut", delay: Math.round(hash2(x, y) * 600)
        });
      }
    }

    // Resource node
    var node = resourceAt(x, y);
    if (node) {
      var def = world.resources[node.type];
      var res = makeIcon("nodes", node.type, (def && (def.node || def.emoji)) || "✨", tileSize * 0.78);
      res.setPosition(c.x, c.y).setDepth(depth + 1);
      if (nodeDepleted(x, y)) { res.setAlpha(0.3); res.setScale(res.scaleX * 0.55, res.scaleY * 0.55); }
      pushOverlay(k, res);
    }

    // Placed furniture
    var p = placedAt(x, y);
    if (p) {
      var recipe = recipesById[p.item];
      var furn = makeIcon("furniture", p.item, (recipe && recipe.emoji) || "🎁", tileSize * 0.82);
      furn.setPosition(c.x, c.y - tileSize * 0.06).setDepth(depth + 1);
      pushOverlay(k, furn);
    }

    // Cave glow tiles get a soft halo
    if (isCave && terrainOf(tileCharOf(area, x, y)) === "glow") {
      var halo = scene.add.image(c.x, c.y, "fx_halo");
      halo.setDisplaySize(tileSize * 2.1, tileSize * 2.1);
      halo.setDepth(DEPTH_OBJ - 1).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);
      pushOverlay(k, halo);
      glowFx.push(halo);
    }
  }

  function makeGround(x, y) {
    var area = currentArea();
    var c = tileCenter(x, y);
    var k = keyOf(x, y);
    var img = scene.add.image(c.x, c.y, groundTexFor(area, x, y));
    img.setDisplaySize(tileSize + 1, tileSize + 1).setDepth(0);
    groundAt[k] = img;

    var emoji = groundEmojiFor(area, x, y);
    if (emoji) {
      var t = scene.add.text(c.x, c.y, emoji, {
        fontFamily: EMOJI_FONT, fontSize: Math.round(tileSize * 0.72) + "px", padding: { x: 6, y: 6 }
      });
      t.setOrigin(0.5, 0.5).setDepth(1);
      pushOverlay(k, t);
    }

    var terrain = terrainOf(tileCharOf(area, x, y));
    if (!reduceMotion && (terrain === "tree" || terrain === "flowers")) {
      img.setDisplaySize(tileSize * 1.06, tileSize * 1.06);   // headroom so the sway never shows a seam
      swayFx.push({ o: img, bx: c.x, ph: hash2(x, y) * 6.283 });
      var list = overlayAt[k];
      if (list) {
        for (var i = 0; i < list.length; i++) swayFx.push({ o: list[i], bx: list[i].x, ph: hash2(x, y) * 6.283 });
      }
    }
    if (!reduceMotion && terrain === "water") {
      var sh = scene.add.rectangle(c.x, c.y, tileSize, tileSize, 0x9fd8ff, 0.08);
      sh.setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
      pushOverlay(k, sh);
      waterFx.push(sh);
    }
  }

  function makePlayer() {
    var c = tileCenter(state.x, state.y);
    playerC = scene.add.container(c.x, c.y);
    playerInner = scene.add.container(0, 0);
    playerC.add(playerInner);

    var shadow = scene.add.ellipse(0, tileSize * 0.34, tileSize * 0.5, tileSize * 0.18, 0x000000, 0.3);
    playerInner.add(shadow);

    playerSprite = makeIcon("characters", "moon", PLAYER_EMOJI, tileSize * 1.15);
    playerSprite.setPosition(0, -tileSize * 0.1);
    playerInner.add(playerSprite);

    playerC.setDepth(DEPTH_OBJ + c.y + 3);
    setFacing(state.facing);

    if (!reduceMotion) {
      scene.tweens.add({
        targets: playerSprite, y: playerSprite.y - 4, duration: 950,
        yoyo: true, repeat: -1, ease: "Sine.easeInOut"
      });
    }
  }

  function setFacing(dir) {
    setFlip(playerSprite, dir === "left");
  }

  var playerHalo = null;

  function makeFx() {
    sparkleEmitter = scene.add.particles(0, 0, "fx_sparkle", {
      speed: { min: 60, max: 190 },
      angle: { min: 0, max: 360 },
      lifespan: 700,
      scale: { start: tileSize / 140, end: 0 },
      alpha: { start: 1, end: 0 },
      gravityY: 130,
      blendMode: "ADD",
      emitting: false
    });
    sparkleEmitter.setDepth(9000);

    dustEmitter = scene.add.particles(0, 0, "fx_dust", {
      speed: { min: 12, max: 42 },
      angle: { min: 200, max: 340 },
      lifespan: 420,
      scale: { start: tileSize / 260, end: 0 },
      alpha: { start: 0.45, end: 0 },
      emitting: false
    });
    dustEmitter.setDepth(90);

    if (isCave) {
      // Screen-space: scrollFactor 0 pins it to the viewport as the camera
      // follows, and the 8% overscan covers the 1.03 zoom-settle on arrival.
      var v = scene.add.image(GAME_W / 2, GAME_H / 2, "fx_vignette");
      v.setDisplaySize(GAME_W * 1.08, GAME_H * 1.08).setDepth(8500).setScrollFactor(0);
      var glow = scene.add.image(0, 0, "fx_halo");
      glow.setDisplaySize(tileSize * 3, tileSize * 3).setDepth(DEPTH_OBJ - 2)
        .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35);
      playerHalo = glow;
    } else {
      playerHalo = null;
    }
  }

  function startAmbientTweens() {
    if (reduceMotion) return;
    if (waterFx.length) {
      scene.tweens.addCounter({
        from: 0.03, to: 0.15, duration: 3400, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
        onUpdate: function (tw) {
          var v = tw.getValue();
          for (var i = 0; i < waterFx.length; i++) {
            if (waterFx[i].active) waterFx[i].setAlpha(v);
          }
        }
      });
    }
    if (glowFx.length) {
      scene.tweens.addCounter({
        from: 0.32, to: 0.72, duration: 2600, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
        onUpdate: function (tw) {
          var v = tw.getValue();
          for (var i = 0; i < glowFx.length; i++) {
            if (glowFx[i].active) glowFx[i].setAlpha(v);
          }
        }
      });
    }
    if (swayFx.length) {
      scene.tweens.addCounter({
        from: 0, to: 6.283, duration: 4200, repeat: -1,
        onUpdate: function (tw) {
          var p = tw.getValue();
          for (var i = 0; i < swayFx.length; i++) {
            var s = swayFx[i];
            if (s.o && s.o.active !== false) s.o.x = s.bx + Math.sin(p + s.ph) * 0.9;
          }
        }
      });
    }
  }

  /* Build the whole stage — once per map/room entry. */
  function renderArea() {
    var area = currentArea();
    if (!area || !area.tiles || !area.tiles.length) {
      fatal("This part of the castle is missing from the storybook.");
      return;
    }
    if (!scene) return;

    npcIndex = npcsFor(area);
    resIndex = {};
    var res = area.resources;
    if (Object.prototype.toString.call(res) === "[object Array]") {
      for (var i = 0; i < res.length; i++) {
        var n = res[i];
        if (!n || !world.resources[n.type]) continue;
        var rx = intOr(n.x, -1), ry = intOr(n.y, -1);
        if (tileCharOf(area, rx, ry) === null) continue;
        resIndex[keyOf(rx, ry)] = n;
      }
    }

    gridH = area.tiles.length;
    gridW = 0;
    for (var y0 = 0; y0 < gridH; y0++) gridW = Math.max(gridW, (area.tiles[y0] || "").length);

    /* One tile size everywhere, so Princess Moon never changes size when she
       walks through a door. The camera bounds are at least one viewport big:
       an area narrower (or shorter) than the stage gets the slack split
       evenly into originX/originY, which centres it — Phaser's own clamp
       would otherwise pin it to the top-left corner. */
    tileSize = TILE_PX;
    worldW = Math.max(gridW * tileSize, GAME_W);
    worldH = Math.max(gridH * tileSize, GAME_H);
    originX = Math.round((worldW - gridW * tileSize) / 2);
    originY = Math.round((worldH - gridH * tileSize) / 2);

    useDock = areaHasTerrain(area, "sand");
    isCave = areaHasTerrain(area, "cavefloor");
    isOutdoor = !inRoom();
    baseTerrain = baseTerrainOf(area);

    scene.cameras.main.stopFollow();     // the old player container is about to die
    scene.tweens.killAll();
    scene.children.removeAll(true);
    groundAt = {}; overlayAt = {};
    swayFx = []; waterFx = []; glowFx = [];
    playerC = playerInner = playerSprite = null;

    var x, y;
    for (y = 0; y < gridH; y++) for (x = 0; x < gridW; x++) buildOverlay(x, y);
    for (y = 0; y < gridH; y++) for (x = 0; x < gridW; x++) makeGround(x, y);

    makeFx();
    makePlayer();
    startAmbientTweens();
    syncPlayerHalo();

    if (mapView) mapView.setAttribute("data-map", areaIdOf(area));
    if (locationName) locationName.textContent = area.name || "";

    var cam = scene.cameras.main;
    cam.setBounds(0, 0, worldW, worldH);
    cam.setRoundPixels(true);
    cam.setZoom(1);
    cam.startFollow(playerC, true, CAM_LERP, CAM_LERP);
    cam.centerOn(playerC.x, playerC.y);
    if (!reduceMotion) {
      cam.fadeIn(FADE_MS, 0, 0, 0);
      cam.setZoom(1.03);
      scene.tweens.add({ targets: cam, zoom: 1, duration: 420, ease: "Sine.easeOut" });
    } else {
      cam.resetFX();
    }
  }

  /* World (stage) point -> canvas pixels, through the camera. */
  function worldToCanvas(wx, wy) {
    if (!scene || !scene.cameras) return { x: wx, y: wy };
    var cam = scene.cameras.main;
    var z = cam.zoom || 1;
    var view = cam.worldView;
    return { x: (wx - view.x) * z, y: (wy - view.y) * z };
  }

  /* Repaint one tile — gathering, respawns, furniture, unlocks. */
  function paintTile(x, y) {
    if (!scene || !groundAt[keyOf(x, y)]) return;
    var area = currentArea();
    groundAt[keyOf(x, y)].setTexture(groundTexFor(area, x, y));
    buildOverlay(x, y);
    var k = keyOf(x, y);
    var emoji = groundEmojiFor(area, x, y);
    if (emoji) {
      var c = tileCenter(x, y);
      var t = scene.add.text(c.x, c.y, emoji, {
        fontFamily: EMOJI_FONT, fontSize: Math.round(tileSize * 0.72) + "px", padding: { x: 6, y: 6 }
      });
      t.setOrigin(0.5, 0.5).setDepth(1);
      pushOverlay(k, t);
    }
  }

  function repaintDoorways() {
    var area = currentArea();
    var list = (area && area.exits) || [];
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e && e.room) paintTile(intOr(e.x, -1), intOr(e.y, -1));
    }
  }

  function syncPlayerHalo() {
    if (!playerHalo || !playerC) return;
    playerHalo.setPosition(playerC.x, playerC.y);
  }

  function positionPlayer(instant) {
    if (!playerC) return;
    var c = tileCenter(state.x, state.y);
    setFacing(state.facing);
    if (instant || reduceMotion) {
      playerC.setPosition(c.x, c.y);
      playerC.setDepth(DEPTH_OBJ + c.y + 3);
      syncPlayerHalo();
      moving = false;
      return;
    }
    moving = true;
    scene.tweens.add({
      targets: playerC, x: c.x, y: c.y, duration: STEP_MS, ease: "Linear",
      onUpdate: function () { playerC.setDepth(DEPTH_OBJ + playerC.y + 3); syncPlayerHalo(); },
      onComplete: function () {
        playerC.setDepth(DEPTH_OBJ + c.y + 3);
        syncPlayerHalo();
        moving = false;
        continueHold();
      }
    });
    scene.tweens.add({
      targets: playerInner, y: { from: 0, to: -HOP_PX },
      duration: STEP_MS / 2, yoyo: true, ease: "Sine.easeOut"
    });
  }

  /* Gold star burst at a tile (gather / craft / place). */
  function sparkleAt(x, y) {
    if (reduceMotion || !sparkleEmitter) return;
    var c = tileCenter(x, y);
    sparkleEmitter.explode(9, c.x, c.y);
  }

  function dustAt(x, y) {
    if (reduceMotion || !dustEmitter || !isOutdoor) return;
    var c = tileCenter(x, y);
    dustEmitter.explode(3, c.x, c.y + tileSize * 0.3);
  }

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
    if (locationName) locationName.textContent = "Somewhere quiet";
  }

  /* ================= Movement & travel ================= */

  function busy() {
    return !!dialogue || !!cutscene || travelling || isModalOpen() || isHelpOpen();
  }

  function tryMove(dir) {
    if (!state || !scene || !playerC || busy() || moving) return;
    var d = DIRS[dir];
    if (!d) return;
    if (state.facing !== dir) {
      state.facing = dir;
      setFacing(dir);
      save();
    }
    var nx = state.x + d.dx, ny = state.y + d.dy;
    var area = currentArea();

    if (tileCharOf(area, nx, ny) === null) return;                     // map edge

    var locked = lockedDoorIn(area, nx, ny);
    if (locked) {
      var room = roomsById[locked.to];
      bumpToast(unlockText(room && room.unlock));
      return;
    }
    if (placedAt(nx, ny)) { bumpToast("Something cozy is in the way ✨"); return; }
    if (!walkableAt(nx, ny)) return;

    closeTileMenu();          // the camera is about to scroll out from under it
    dustAt(state.x, state.y);
    state.x = nx; state.y = ny;
    positionPlayer(false);
    save();

    // Stepping onto an edge exit or a door travels; the arrival tile is never
    // re-checked, so exit-onto-exit can't loop.
    var e = exitAt(nx, ny);
    if (e) { takeExit(e); return; }
    if (!inRoom() && isCastleDoor(nx, ny)) { enterHouse(); return; }
    if (inRoom() && terrainOf(tileCharOf(area, nx, ny)) === "castledoor") { leaveHouse(); return; }
  }

  /* Keyboard auto-repeat / d-pad hold keep walking after each step lands. */
  function continueHold() {
    if (busy() || moving) return;
    var dir = heldKeys.length ? heldKeys[heldKeys.length - 1] : dpadDir;
    if (dir) tryMove(dir);
  }

  function bumpToast(msg) {
    var now = Date.now();
    if (now - lastBumpToast < 1200) return;
    lastBumpToast = now;
    toast(msg);
  }

  function isCastleDoor(x, y) {
    var area = currentArea();
    return !!(area && area.door && intOr(area.door.x, -1) === x && intOr(area.door.y, -1) === y);
  }

  function takeExit(e) {
    if (!e) return;
    if (e.room) {
      var room = roomsById[e.to];
      if (!room) return;
      if (!condMet(room.unlock)) { bumpToast(unlockText(room.unlock)); return; }
      goTo(true, e.to, intOr(e.tx, -1), intOr(e.ty, -1));
    } else {
      if (!world.maps[e.to]) return;
      goTo(false, e.to, intOr(e.tx, -1), intOr(e.ty, -1));
    }
  }

  function enterHouse() {
    var door = houseDoorMap && houseDoorMap.door;
    var roomId = door && door.toRoom;
    if (!roomId || !roomsById[roomId]) return;
    var room = roomsById[roomId];
    var spot = houseEntrySpot(room);
    goTo(true, roomId, spot.x, spot.y);
  }

  /* Just inside the hall's exit door (one tile north of it). */
  function houseEntrySpot(room) {
    var d = findTerrain(room, "castledoor");
    if (d) {
      if (isWalkableIn(room, true, d.x, d.y - 1, state)) return { x: d.x, y: d.y - 1 };
      return { x: d.x, y: d.y };
    }
    var any = nearestWalkable(room, true, 1, 1, state);
    return any || { x: 1, y: 1 };
  }

  function leaveHouse() {
    if (!houseDoorMap) return;
    var door = houseDoorMap.door;
    var mapId = areaIdOf(houseDoorMap);
    var dx = intOr(door.x, START_X), dy = intOr(door.y, START_Y);
    var tx = dx, ty = dy + 1;
    if (!isWalkableIn(houseDoorMap, false, tx, ty, state)) { tx = dx; ty = dy; }
    goTo(false, mapId, tx, ty);
  }

  /* Fade out through black, swap the area, fade back in. */
  function goTo(isRoom, id, tx, ty) {
    var area = isRoom ? roomsById[id] : world.maps[id];
    if (!area) return;
    var spot = isWalkableIn(area, isRoom, tx, ty, state) ? { x: tx, y: ty } : nearestWalkable(area, isRoom, tx, ty, state);
    if (!spot) spot = { x: 0, y: 0 };

    cancelPlacing();
    closeTileMenu();
    heldKeys = []; dpadDir = null;
    travelling = true;
    moving = false;

    var arrive = function () {
      if (isRoom) { state.roomId = id; }
      else { state.roomId = null; state.mapId = id; }
      state.x = spot.x; state.y = spot.y;
      renderArea();
      renderFurniture();
      travelling = false;
      flushSave();
      maybeCutscene();   // a scene whose trigger was met on another map
    };

    if (reduceMotion || !scene) { arrive(); return; }
    var cam = scene.cameras.main;
    cam.once("camerafadeoutcomplete", arrive);
    cam.fadeOut(FADE_MS, 0, 0, 0);
  }

  /* ================= Interact ================= */

  function interact() {
    if (!state) return;
    if (cutscene) { advanceCutscene(); return; }
    if (dialogue) { advanceDialogue(); return; }
    if (busy()) return;
    var d = DIRS[state.facing] || DIRS.down;
    if (interactTile(state.x + d.dx, state.y + d.dy)) return;
    interactTile(state.x, state.y);
  }

  function interactTile(x, y) {
    var area = currentArea();
    if (tileCharOf(area, x, y) === null) return false;

    var cid = npcAt(x, y);
    if (cid) { startDialogue(cid); return true; }

    var node = resourceAt(x, y);
    if (node && !nodeDepleted(x, y)) { gather(x, y, node); return true; }

    if (!inRoom() && isCastleDoor(x, y)) { enterHouse(); return true; }
    if (inRoom() && terrainOf(tileCharOf(area, x, y)) === "castledoor") { leaveHouse(); return true; }

    var e = exitIn(area, x, y);
    if (e && e.room) {
      var room = roomsById[e.to];
      if (room && !condMet(room.unlock)) { toast(unlockText(room.unlock)); return true; }
      takeExit(e);
      return true;
    }

    var p = placedAt(x, y);
    if (p) { openTileMenu(x, y); return true; }

    return false;
  }

  function gather(x, y, node) {
    var def = world.resources[node.type];
    if (!def) return;
    toast("+1 " + (def.emoji || "✨") + " " + (def.name || node.type));   // queued before any unlock news
    progress(function () {
      state.inv[node.type] = (state.inv[node.type] || 0) + 1;
      state.totals.gathered += 1;
      state.nodesDepleted[nodeKey(x, y)] = Date.now() + RESPAWN_MS;
    });
    paintTile(x, y);
    sparkleAt(x, y);
    var held = 0;
    for (var r in state.inv) held += state.inv[r] || 0;
    if (held >= 40) narrate("full", true);
  }

  /* ================= Voices ================= */
  /* Spoken lines from game/voices/ (Azure AI Speech). Entirely optional: with no
     manifest, a 404 clip, or sound switched off, the game simply stays quiet.
     One shared <audio> means two lines can never talk over each other. */

  var VOICE_BASE = "game/voices/";
  var SOUND_KEY = "pm-castle-life-sound";
  var voices = null;           // parsed manifest, or null when there is no audio
  var audioEl = null;          // created lazily, on the first line actually spoken
  var queuedNarration = null;  // Ana waits her turn rather than interrupting a friend
  var pendingGreeting = null;  // autoplay policy: held back until the first gesture
  var saidOnce = {};           // milestone lines that should only ever land once
  var soundOn = true;

  function loadSoundPref() {
    try { soundOn = localStorage.getItem(SOUND_KEY) !== "off"; }
    catch (e) { soundOn = true; }
  }

  function setSound(on) {
    soundOn = !!on;
    try { localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off"); } catch (e) { /* ignore */ }
    if (!soundOn) stopVoice();
    syncSoundButton();
  }

  function syncSoundButton() {
    if (!btnSound) return;
    btnSound.textContent = soundOn ? "\uD83D\uDD0A" : "\uD83D\uDD07";
    btnSound.setAttribute("aria-pressed", soundOn ? "true" : "false");
    btnSound.setAttribute("aria-label", soundOn ? "Turn voices off" : "Turn voices on");
    btnSound.setAttribute("title", soundOn ? "Voices are on" : "Voices are off");
  }

  function stopVoice() {
    queuedNarration = null;
    if (!audioEl) return;
    try { audioEl.pause(); audioEl.currentTime = 0; } catch (e) { /* ignore */ }
  }

  /* Play a clip path relative to game/voices/. Returns true if it was started. */
  function playClip(rel) {
    if (!rel || !soundOn || !voices) return false;
    if (!audioEl) {
      audioEl = new Audio();
      audioEl.volume = 0.9;
      audioEl.preload = "none";
      audioEl.addEventListener("ended", function () {
        var next = queuedNarration;
        queuedNarration = null;
        if (next) playClip(next);
      });
      audioEl.addEventListener("error", function () { queuedNarration = null; });
    }
    stopVoice();
    try {
      audioEl.src = VOICE_BASE + rel;
      var pr = audioEl.play();
      // A blocked autoplay rejects; swallow it so it never surfaces as an error.
      if (pr && typeof pr.catch === "function") pr.catch(function () {});
    } catch (e) { return false; }
    return true;
  }

  function voiceIsBusy() {
    return !!(audioEl && !audioEl.paused && !audioEl.ended);
  }

  /* One of the companion's own lines: index-aligned with world.json dialogue[]. */
  function speakCompanion(cid, index, isRevisit) {
    if (!voices || !voices.companions) return;
    var entry = voices.companions[cid];
    if (!entry) return;
    var rel = isRevisit
      ? entry.revisit
      : (Object.prototype.toString.call(entry.lines) === "[object Array]" ? entry.lines[index] : null);
    playClip(rel);
  }

  /* A cutscene line: voices.cutscenes["<id>"][stepIndex], index-aligned with
     the scene's steps[]. Missing manifest entry = a silent (but still
     perfectly playable) scene. */
  function speakCutscene(id, index) {
    if (!voices || !voices.cutscenes) return;
    var list = voices.cutscenes[id];
    if (Object.prototype.toString.call(list) !== "[object Array]") return;
    playClip(list[index]);
  }

  /* Ana's milestone lines. She never speaks over a friend - she waits. */
  function narrate(key, once) {
    if (!voices || !voices.narrator || !voices.narrator.lines) return;
    if (once) {
      if (saidOnce[key]) return;
      saidOnce[key] = true;
    }
    var rel = voices.narrator.lines[key];
    if (!rel || !soundOn) return;
    if (dialogue || cutscene || voiceIsBusy()) { queuedNarration = rel; return; }
    playClip(rel);
  }

  /* The greeting cannot play at load - browsers need a gesture first. */
  function releaseGreeting() {
    if (!pendingGreeting) return;
    var key = pendingGreeting;
    pendingGreeting = null;
    narrate(key, true);
  }

  /* ================= Dialogue ================= */

  function startDialogue(cid) {
    var c = world.companions[cid];
    if (!c) return;
    cancelPlacing();
    closeTileMenu();
    heldKeys = []; dpadDir = null;
    var first = state.met.indexOf(cid) < 0;
    var lines = [];
    if (first) {
      var src = Object.prototype.toString.call(c.dialogue) === "[object Array]" ? c.dialogue : [];
      for (var i = 0; i < src.length; i++) {
        if (typeof src[i] === "string" && src[i].trim()) lines.push(src[i]);
      }
    } else if (typeof c.revisit === "string" && c.revisit.trim()) {
      lines.push(c.revisit);
    }
    if (!lines.length) {
      var fallback = (Object.prototype.toString.call(c.dialogue) === "[object Array]" && c.dialogue[0]) || "…";
      lines.push(fallback);
    }
    dialogue = { id: cid, lines: lines, i: 0, first: first };
    setIcon(dialoguePortrait, "characters", cid, c.emoji || "✨");
    dialogueOpenerFocus = document.activeElement;
    if (dialogueBox) { setHidden(dialogueBox, false); dialogueBox.classList.add("open"); }
    showDialogueLine();
    if (dialogueNext && dialogueNext.focus) { try { dialogueNext.focus(); } catch (e) { /* ignore */ } }
  }

  function showDialogueLine() {
    if (!dialogue) return;
    var c = world.companions[dialogue.id];
    var name = (c && c.name) ? c.name + ": " : "";
    if (dialogueText) dialogueText.textContent = name + dialogue.lines[dialogue.i];
    speakCompanion(dialogue.id, dialogue.i, !dialogue.first);
    if (dialogueNext) {
      var last = dialogue.i >= dialogue.lines.length - 1;
      dialogueNext.textContent = last ? "All done ✨" : "Next ✨";
      dialogueNext.setAttribute("aria-label", last ? "Close what " + ((c && c.name) || "your friend") + " is saying" : "Next line");
    }
  }

  /* Whatever is currently talking — a friend or a whole story moment. */
  function advanceTalking() {
    if (cutscene) { advanceCutscene(); return; }
    if (dialogue) { advanceDialogue(); return; }
    interact();
  }

  function advanceDialogue() {
    if (!dialogue) return;
    if (dialogue.i < dialogue.lines.length - 1) {
      dialogue.i += 1;
      showDialogueLine();
      return;
    }
    endDialogue();
  }

  /* dialogueBox is shared by companion chat and cutscenes; both remember who
     had focus before it opened (usually the map, via #mapView's tabindex="-1")
     and hand it back here when it closes. */
  function restoreDialogueFocus() {
    var target = dialogueOpenerFocus;
    dialogueOpenerFocus = null;
    if (target && target.focus && document.contains(target)) { try { target.focus(); } catch (e) { /* ignore */ } }
    else if (mapView && mapView.focus) { try { mapView.focus(); } catch (e) { /* ignore */ } }
  }

  function endDialogue() {
    var d = dialogue;
    dialogue = null;
    stopVoice();
    if (dialogueBox) { setHidden(dialogueBox, true); dialogueBox.classList.remove("open"); }
    restoreDialogueFocus();
    if (!d) return;
    if (d.first && state.met.indexOf(d.id) < 0) {
      var c = world.companions[d.id];
      if (c && c.name) toast(c.name + " is your friend now 💖");
      progress(function () { state.met.push(d.id); });   // may add their recipe
      narrate("friend", true);
    }
  }

  /* ================= Cutscenes =================
     Data-driven visits (game/SPEC-SISTERS.md): world.cutscenes is optional and
     everything here no-ops when it is absent. A scene plays through the very
     same dialogue box, one step at a time, advancing on whatever advances
     dialogue; Escape (or "All done") ends the whole thing. Speakers with an
     `at` offset fade in beside the player and stay put until the scene ends. */

  /* Storybook stand-ins for visitors who have no companion entry (and so no
     name or emoji anywhere in the data). Sprites come from the manifest as
     soon as the art lands — this is only the fallback face. */
  var VISITOR_EMOJI = {
    evilest: "🌑", beedlist: "📓", shock: "🎭",
    leeblebeest: "💙", cheeblest: "🎀", narrator: "🌙"
  };

  var cutscene = null;         // { id, steps, i, actors: {id: sprite}, taken: {} }

  function cutsceneList() {
    var list = world && world.cutscenes;
    return Object.prototype.toString.call(list) === "[object Array]" ? list : [];
  }
  function cutsceneById(id) {
    var list = cutsceneList();
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === id) return list[i];
    }
    return null;
  }
  function seenCutscene(id, s) {
    s = s || state;
    if (!s || Object.prototype.toString.call(s.cutscenesSeen) !== "[object Array]") return false;
    return s.cutscenesSeen.indexOf(id) >= 0;
  }
  function markCutsceneSeen(id) {
    if (!state) return;
    if (Object.prototype.toString.call(state.cutscenesSeen) !== "[object Array]") state.cutscenesSeen = [];
    if (state.cutscenesSeen.indexOf(id) < 0) state.cutscenesSeen.push(id);
  }

  /* Who is talking: a companion when we have one, otherwise a plain
     capitalised id (the tower sisters are visitors, not companions). */
  function speakerInfo(step) {
    var id = (step && typeof step.speaker === "string") ? step.speaker : "narrator";
    if (id === "narrator") return { id: id, name: "", emoji: VISITOR_EMOJI.narrator };
    var c = world.companions[id];
    var name = (c && c.name) || (typeof step.name === "string" ? step.name : "") ||
      (id.charAt(0).toUpperCase() + id.slice(1));
    return { id: id, name: name, emoji: (c && c.emoji) || step.emoji || VISITOR_EMOJI[id] || "✨" };
  }

  /* Called after every progress() mutation. Picks the first unseen scene whose
     trigger is met on the map the player is standing on. */
  function maybeCutscene() {
    if (!state || cutscene || dialogue || travelling || isModalOpen()) return;
    var here = areaIdOf(currentArea());
    var list = cutsceneList();
    for (var i = 0; i < list.length; i++) {
      var cs = list[i];
      if (!cs || typeof cs.id !== "string") continue;
      if (seenCutscene(cs.id)) continue;
      if (cs.map && cs.map !== here) continue;
      if (!condMet(cs.trigger)) continue;
      startCutscene(cs);
      return;
    }
  }

  function startCutscene(cs) {
    var steps = Object.prototype.toString.call(cs.steps) === "[object Array]" ? cs.steps : [];
    var clean = [];
    for (var i = 0; i < steps.length; i++) {
      if (steps[i] && typeof steps[i].text === "string" && steps[i].text.trim()) clean.push(steps[i]);
    }
    if (!clean.length) { markCutsceneSeen(cs.id); save(); return; }   // nothing to show: don't wedge

    cancelPlacing();
    closeTileMenu();
    heldKeys = []; dpadDir = null;
    stopRepeat();
    releaseStick(true);
    cutscene = { id: cs.id, steps: clean, i: 0, actors: {}, taken: {} };
    dialogueOpenerFocus = document.activeElement;
    if (dialogueBox) { setHidden(dialogueBox, false); dialogueBox.classList.add("open"); }
    showCutsceneStep();
    if (dialogueNext && dialogueNext.focus) { try { dialogueNext.focus(); } catch (e) { /* ignore */ } }
  }

  /* A free tile for a visitor: the offset from the player, clamped into the
     map and nudged off the player's own tile (and off each other). */
  function cutsceneSpot(at) {
    var dx = intOr(at && at.dx, 0), dy = intOr(at && at.dy, 0);
    var bx = clampN(state.x + dx, 0, Math.max(0, gridW - 1));
    var by = clampN(state.y + dy, 0, Math.max(0, gridH - 1));
    var nudges = [[0, 0], [0, -1], [1, 0], [-1, 0], [0, 1], [1, -1], [-1, -1], [2, 0], [-2, 0], [0, -2]];
    for (var i = 0; i < nudges.length; i++) {
      var cx = clampN(bx + nudges[i][0], 0, Math.max(0, gridW - 1));
      var cy = clampN(by + nudges[i][1], 0, Math.max(0, gridH - 1));
      if (cx === state.x && cy === state.y) continue;
      if (cutscene.taken[keyOf(cx, cy)]) continue;
      return { x: cx, y: cy };
    }
    return { x: bx, y: by };
  }

  function addCutsceneActor(info, at) {
    if (!scene || cutscene.actors[info.id]) return;
    var spot = cutsceneSpot(at);
    cutscene.taken[keyOf(spot.x, spot.y)] = true;
    var c = tileCenter(spot.x, spot.y);
    var sprite = makeIcon("characters", info.id, info.emoji, tileSize * 1.05);
    sprite.setPosition(c.x, c.y - tileSize * 0.12);
    sprite.setDepth(DEPTH_OBJ + c.y + 2);
    cutscene.actors[info.id] = sprite;
    if (reduceMotion) { sprite.setAlpha(1); return; }
    sprite.setAlpha(0);
    scene.tweens.add({ targets: sprite, alpha: 1, duration: 280, ease: "Sine.easeOut" });
    scene.tweens.add({
      targets: sprite, y: sprite.y - 4, duration: 950, yoyo: true, repeat: -1,
      ease: "Sine.easeInOut", delay: 300
    });
  }

  function showCutsceneStep() {
    if (!cutscene) return;
    var step = cutscene.steps[cutscene.i];
    var info = speakerInfo(step);
    if (step.at) addCutsceneActor(info, step.at);

    setIcon(dialoguePortrait, "characters", info.id, info.emoji);
    if (dialogueText) dialogueText.textContent = (info.name ? info.name + ": " : "") + step.text;
    speakCutscene(cutscene.id, cutscene.i);
    if (dialogueNext) {
      var last = cutscene.i >= cutscene.steps.length - 1;
      dialogueNext.textContent = last ? "All done ✨" : "Next ✨";
      dialogueNext.setAttribute("aria-label", last ? "Close this story moment" : "Next line");
    }
  }

  function advanceCutscene() {
    if (!cutscene) return;
    if (cutscene.i < cutscene.steps.length - 1) {
      cutscene.i += 1;
      showCutsceneStep();
      return;
    }
    endCutscene();
  }

  /* Ends the scene whether it ran out of steps or the player skipped it: the
     visitors fade away, it is marked seen, and the area is rebuilt so anyone
     with `appearsAfter` is standing there now. */
  function endCutscene() {
    var cs = cutscene;
    cutscene = null;
    stopVoice();
    if (dialogueBox) { setHidden(dialogueBox, true); dialogueBox.classList.remove("open"); }
    restoreDialogueFocus();
    if (!cs) return;

    var actors = [];
    for (var id in cs.actors) { if (cs.actors[id]) actors.push(cs.actors[id]); }

    markCutsceneSeen(cs.id);
    flushSave();

    var finish = function () {
      for (var i = 0; i < actors.length; i++) {
        if (actors[i] && actors[i].destroy && actors[i].scene) actors[i].destroy();
      }
      if (!state) return;
      renderArea();     // Cheeblest is on the grounds now
      renderHud();
    };

    if (reduceMotion || !scene || !actors.length) { finish(); return; }
    scene.tweens.add({
      targets: actors, alpha: 0, duration: 320, ease: "Sine.easeIn", onComplete: finish
    });
  }

  /* ================= Unlocks ================= */

  function unlockedRecipeIds() {
    var out = [];
    var list = world.recipes || [];
    for (var i = 0; i < list.length; i++) {
      if (condMet(list[i].unlock)) out.push(list[i].id);
    }
    return out;
  }
  function unlockedRoomIds() {
    var out = [];
    for (var i = 0; i < (world.rooms || []).length; i++) {
      if (condMet(world.rooms[i].unlock)) out.push(world.rooms[i].id);
    }
    return out;
  }

  /* Every state mutation goes through here: snapshot -> mutate -> announce
     anything newly unlocked -> re-render the HUD -> save. */
  function progress(mutate) {
    var beforeRecipes = unlockedRecipeIds();
    var beforeRooms = unlockedRoomIds();
    mutate();
    var newRecipes = diff(unlockedRecipeIds(), beforeRecipes);
    var newRooms = diff(unlockedRoomIds(), beforeRooms);

    if (newRecipes.length === 1 || newRecipes.length === 2) {
      for (var i = 0; i < newRecipes.length; i++) {
        var r = recipesById[newRecipes[i]];
        if (r) toast("New recipe: " + (r.emoji ? r.emoji + " " : "") + r.name + " ✨");
      }
    } else if (newRecipes.length > 2) {
      toast("New recipes unlocked! ✨");
    }
    for (var j = 0; j < newRooms.length; j++) {
      var room = roomsById[newRooms[j]];
      if (room) toast((room.name || "A new room") + " is open! 🎉");
    }
    if (newRooms.length) narrate("room");            // a whole room beats a recipe
    else if (newRecipes.length) narrate("recipe");
    repaintDoorways();   // opens newly unlocked doors and refreshes "3 more to go" hints

    renderHud();
    save();
    maybeCutscene();
  }

  function diff(after, before) {
    var out = [];
    for (var i = 0; i < after.length; i++) {
      if (before.indexOf(after[i]) < 0) out.push(after[i]);
    }
    return out;
  }

  function unlockText(u) {
    if (!u) return "This door is resting for now ✨";
    if (u.type === "start") return "This way is open ✨";
    if (u.type === "crafted") {
      var left = Math.max(1, intOr(u.count, 0) - state.totals.crafted);
      return "Craft " + left + " more treasure" + (left === 1 ? "" : "s") + " to open this room ✨";
    }
    if (u.type === "gathered") {
      var g = Math.max(1, intOr(u.count, 0) - state.totals.gathered);
      return "Gather " + g + " more thing" + (g === 1 ? "" : "s") + " to open this room ✨";
    }
    if (u.type === "companion") {
      var c = world.companions[u.id];
      return "Say hello to " + ((c && c.name) || "a friend") + " to open this room ✨";
    }
    return "Keep exploring… ✨";
  }

  function recipeHint(u) {
    if (!u) return "Keep exploring…";
    if (u.type === "gathered") {
      var g = Math.max(1, intOr(u.count, 0) - state.totals.gathered);
      return "Gather " + g + " more thing" + (g === 1 ? "" : "s") + "…";
    }
    if (u.type === "crafted") {
      var c = Math.max(1, intOr(u.count, 0) - state.totals.crafted);
      return "Craft " + c + " more treasure" + (c === 1 ? "" : "s") + "…";
    }
    return "Keep exploring…";
  }

  /* ================= HUD ================= */

  /* Sprite from the manifest when we have one, else the v1 emoji. */
  function setIcon(el, group, id, emoji) {
    if (!el) return;
    el.textContent = "";
    var path = manifestPath(group, id);
    if (!path) { el.textContent = emoji || "✨"; return; }
    var img = document.createElement("img");
    img.className = "icon-img";
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.addEventListener("error", function () {
      if (img.parentNode) img.parentNode.removeChild(img);
      el.textContent = emoji || "✨";
    });
    img.src = ASSET_BASE + path;
    el.appendChild(img);
  }

  function iconSpan(cls, group, id, emoji) {
    var span = document.createElement("span");
    span.className = cls;
    setIcon(span, group, id, emoji);
    return span;
  }

  function renderHud() {
    renderInventory();
    renderRecipes();
    renderFurniture();
  }

  function renderInventory() {
    if (!invGrid) return;
    invGrid.innerHTML = "";
    var any = false;
    for (var id in world.resources) {
      var count = state.inv[id] || 0;
      if (count <= 0) continue;
      any = true;
      var def = world.resources[id];
      var cell = document.createElement("div");
      cell.className = "inv-item";
      cell.setAttribute("role", "img");
      cell.setAttribute("title", def.name || id);
      cell.setAttribute("aria-label", count + " " + (def.name || id));

      cell.appendChild(iconSpan("emoji", "nodes", id, def.emoji || "✨"));
      var n = document.createElement("span");
      n.className = "count";
      n.textContent = "×" + count;
      cell.appendChild(n);
      invGrid.appendChild(cell);
    }
    if (!any) {
      var hint = document.createElement("p");
      hint.className = "hint";
      hint.textContent = "Your satchel is empty — go find something sparkly 🌿";
      invGrid.appendChild(hint);
    }
  }

  function canCraft(recipe) {
    var needs = recipe.needs || {};
    for (var r in needs) {
      if ((state.inv[r] || 0) < intOr(needs[r], 0)) return false;
    }
    return true;
  }

  function needsLabel(recipe) {
    var parts = [];
    var needs = recipe.needs || {};
    for (var r in needs) {
      var def = world.resources[r];
      parts.push(intOr(needs[r], 0) + " " + ((def && def.name) || r));
    }
    return parts.join(", ");
  }

  function renderRecipes() {
    if (!recipeList) return;
    recipeList.innerHTML = "";
    var list = world.recipes || [];
    for (var i = 0; i < list.length; i++) {
      var recipe = list[i];
      if (!recipe || !recipe.id) continue;
      var unlocked = condMet(recipe.unlock);
      var isCompanion = recipe.unlock && recipe.unlock.type === "companion";
      if (!unlocked && isCompanion) continue;      // hidden entirely until you meet them
      recipeList.appendChild(unlocked ? recipeRow(recipe) : mysteryRow(recipe));
    }
    if (!recipeList.childNodes.length) {
      var hint = document.createElement("p");
      hint.className = "hint";
      hint.textContent = "Recipes will appear as you explore ✨";
      recipeList.appendChild(hint);
    }
  }

  function recipeRow(recipe) {
    var ready = canCraft(recipe);
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "recipe" + (ready ? " craftable" : "");
    btn.setAttribute("data-recipe", recipe.id);
    btn.setAttribute("aria-label",
      "Craft " + recipe.name + ". Needs " + needsLabel(recipe) + ". " +
      (ready ? "Ready to craft." : "Not enough yet."));

    btn.appendChild(iconSpan("r-emoji", "furniture", recipe.id, recipe.emoji || "✨"));

    var body = document.createElement("span");
    body.className = "r-info";

    var name = document.createElement("span");
    name.className = "r-name";
    name.textContent = recipe.name || recipe.id;
    body.appendChild(name);

    var needs = document.createElement("span");
    needs.className = "r-needs";
    var n = recipe.needs || {};
    for (var r in n) {
      var count = intOr(n[r], 0);
      var def = world.resources[r];
      var chip = document.createElement("span");
      chip.className = "need" + ((state.inv[r] || 0) >= count ? " have" : "");
      chip.textContent = count + ((def && def.emoji) || "✨");
      chip.setAttribute("title", count + " " + ((def && def.name) || r) +
        " (you have " + (state.inv[r] || 0) + ")");
      needs.appendChild(chip);
    }
    body.appendChild(needs);

    if (recipe.flavor) {
      var flavor = document.createElement("span");
      flavor.className = "r-flavor";
      flavor.textContent = recipe.flavor;
      body.appendChild(flavor);
    }

    btn.appendChild(body);
    return btn;
  }

  function mysteryRow(recipe) {
    var btn = document.createElement("button");
    btn.type = "button";
    // Tier recipes you haven't reached yet: a teasing "???" row.
    btn.className = "recipe mystery";
    btn.setAttribute("data-recipe", "");
    btn.setAttribute("aria-label", "A secret recipe. " + recipeHint(recipe.unlock));

    var em = document.createElement("span");
    em.className = "r-emoji";
    em.textContent = "❔";
    btn.appendChild(em);

    var body = document.createElement("span");
    body.className = "r-info";
    var name = document.createElement("span");
    name.className = "r-name";
    name.textContent = "???";
    body.appendChild(name);
    var hint = document.createElement("span");
    hint.className = "hint";
    hint.textContent = recipeHint(recipe.unlock);
    body.appendChild(hint);
    btn.appendChild(body);
    return btn;
  }

  function craft(recipeId) {
    var recipe = recipesById[recipeId];
    if (!recipe || !condMet(recipe.unlock)) return;
    if (!canCraft(recipe)) {
      var missing = [];
      var needs = recipe.needs || {};
      for (var r in needs) {
        var short = intOr(needs[r], 0) - (state.inv[r] || 0);
        if (short > 0) {
          var def = world.resources[r];
          missing.push(short + " " + ((def && def.emoji) || "") + " " + ((def && def.name) || r));
        }
      }
      toast("Still need " + missing.join(" and ") + " 💫");
      return;
    }
    toast("Made " + (recipe.emoji || "✨") + " " + (recipe.name || recipe.id) + "!");
    narrate("crafted", true);
    progress(function () {
      var needs = recipe.needs || {};
      for (var r in needs) {
        state.inv[r] = (state.inv[r] || 0) - intOr(needs[r], 0);
        if (state.inv[r] <= 0) delete state.inv[r];
      }
      state.furniture[recipe.id] = (state.furniture[recipe.id] || 0) + 1;
      state.totals.crafted += 1;
    });
    openPanel("furniture");     // so the new treasure is visible on a phone
    sparkleAt(state.x, state.y);
  }

  function renderFurniture() {
    if (!furnList) return;
    furnList.innerHTML = "";
    var any = false;
    var list = world.recipes || [];
    for (var i = 0; i < list.length; i++) {
      var recipe = list[i];
      var count = state.furniture[recipe.id] || 0;
      if (count <= 0) continue;
      any = true;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "furn-item" + (placing === recipe.id ? " selected" : "");
      btn.setAttribute("data-item", recipe.id);
      btn.setAttribute("aria-label", "Place " + (recipe.name || recipe.id) + ". You have " + count + ".");
      btn.setAttribute("aria-pressed", placing === recipe.id ? "true" : "false");

      btn.appendChild(iconSpan("f-emoji", "furniture", recipe.id, recipe.emoji || "🎁"));
      var name = document.createElement("span");
      name.className = "f-name";
      name.textContent = recipe.name || recipe.id;
      var n = document.createElement("span");
      n.className = "f-count";
      n.textContent = "×" + count;

      btn.appendChild(name);
      btn.appendChild(n);
      furnList.appendChild(btn);
    }
    if (!any) {
      var hint = document.createElement("p");
      hint.className = "hint";
      hint.textContent = "Craft something cozy and it will wait here for you 🛠️";
      furnList.appendChild(hint);
    } else if (!inRoom()) {
      var hint2 = document.createElement("p");
      hint2.className = "hint";
      hint2.textContent = "Step inside the castle to place these 🏰";
      furnList.appendChild(hint2);
    }
    setHidden(decorHint, !placing);
  }

  /* ================= Collapsible HUD panels =================
     On a phone the three panels are a very long scroll, so each one folds up
     from its own heading. The open/closed set is remembered per panel in
     localStorage; a phone starts with only Crafting open, a desktop with all
     three. The height animation is skipped under prefers-reduced-motion. */

  var HUD_KEY = "pm-castle-life-hud";
  var HELP_SEEN_KEY = "pm-castle-life-help-seen";
  var PANEL_ANIM_MS = 280;

  function panelSections() {
    return document.querySelectorAll(".hud-panel[data-panel]");
  }

  /* A phone, not a tablet: the HUD is stacked under the map and narrow. */
  function isPhoneLayout() {
    return window.innerWidth < 700;
  }

  function defaultPanelOpen(name) {
    return isPhoneLayout() ? (name === "craft") : true;
  }

  function readPanelPrefs() {
    var raw = null;
    try { raw = localStorage.getItem(HUD_KEY); } catch (e) { raw = null; }
    if (!raw) return {};
    try {
      var parsed = JSON.parse(raw);
      return (parsed && typeof parsed === "object") ? parsed : {};
    } catch (e) { return {}; }
  }

  function writePanelPrefs(prefs) {
    try { localStorage.setItem(HUD_KEY, JSON.stringify(prefs)); } catch (e) { /* private mode */ }
  }

  function setPanelOpen(sec, open, animate) {
    var body = sec.querySelector(".panel-body");
    var btn = sec.querySelector(".panel-toggle");
    if (!body || !btn) return;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) sec.classList.remove("collapsed"); else sec.classList.add("collapsed");

    if (body._panelTimer) { clearTimeout(body._panelTimer); body._panelTimer = null; }
    if (!animate || reduceMotion) {
      body.style.height = open ? "" : "0px";
      return;
    }
    var start = body.getBoundingClientRect().height;
    body.style.height = start + "px";
    void body.offsetHeight;                       // commit the starting height
    body.style.height = (open ? body.scrollHeight : 0) + "px";
    body._panelTimer = setTimeout(function () {
      body._panelTimer = null;
      if (open) body.style.height = "";           // back to auto: content can grow
    }, PANEL_ANIM_MS + 40);
  }

  function initPanels() {
    var prefs = readPanelPrefs();
    var secs = panelSections();
    for (var i = 0; i < secs.length; i++) {
      (function (sec) {
        var name = sec.getAttribute("data-panel");
        var open = (typeof prefs[name] === "boolean") ? prefs[name] : defaultPanelOpen(name);
        setPanelOpen(sec, open, false);
        var btn = sec.querySelector(".panel-toggle");
        if (!btn) return;
        btn.addEventListener("click", function () {
          var nowOpen = btn.getAttribute("aria-expanded") !== "true";
          setPanelOpen(sec, nowOpen, true);
          var saved = readPanelPrefs();
          saved[name] = nowOpen;
          writePanelPrefs(saved);
        });
      })(secs[i]);
    }
  }

  /* Opening a panel programmatically (e.g. so the player can see the furniture
     they just picked) must not fight the saved preference — it saves too. */
  function openPanel(name) {
    var sec = document.querySelector('.hud-panel[data-panel="' + name + '"]');
    if (!sec) return;
    var btn = sec.querySelector(".panel-toggle");
    if (!btn || btn.getAttribute("aria-expanded") === "true") return;
    setPanelOpen(sec, true, true);
    var saved = readPanelPrefs();
    saved[name] = true;
    writePanelPrefs(saved);
  }

  /* ================= Decorating ================= */

  function setStageCursor(cursor) {
    if (game && game.canvas) game.canvas.style.cursor = cursor || "";
  }

  function selectFurniture(item) {
    if (!state.furniture[item]) { cancelPlacing(); return; }
    if (!inRoom()) { toast("Furniture goes inside the castle 🏰"); return; }
    if (placing === item) { cancelPlacing(); return; }
    placing = item;
    document.body.classList.add("placing");
    if (mapView) mapView.classList.add("placing-cursor");
    setStageCursor("crosshair");
    setHidden(decorHint, false);
    renderFurniture();
    var recipe = recipesById[item];
    toast("Tap a floor tile to put " + ((recipe && recipe.name) || "it") + " down 💫");
  }

  function cancelPlacing() {
    document.body.classList.remove("placing");
    if (mapView) mapView.classList.remove("placing-cursor");
    setStageCursor("");
    setHidden(decorHint, true);
    if (!placing) return;
    placing = null;
    renderFurniture();
  }

  function tryPlace(x, y) {
    var item = placing;
    if (!item) return;
    if (!inRoom()) { cancelPlacing(); return; }
    if ((state.furniture[item] || 0) <= 0) { cancelPlacing(); return; }

    var area = currentArea();
    var ch = tileCharOf(area, x, y);
    if (ch === null || terrainOf(ch) !== "floor" || !baseWalkable(ch)) {
      toast("That needs to be a clear floor tile 💫");
      return;
    }
    if (exitIn(area, x, y)) { toast("Let's not block a doorway 🚪"); return; }
    if (placedInAt(state.roomId, x, y)) { toast("Something is already there ✨"); return; }
    if (npcAt(x, y)) { toast("Someone is standing there 🐾"); return; }
    if (x === state.x && y === state.y) { toast("Not right under your feet! 🧚"); return; }

    if (!placedListFor(state.roomId)) state.placed[state.roomId] = [];
    state.placed[state.roomId].push({ x: x, y: y, item: item });
    state.furniture[item] -= 1;
    if (state.furniture[item] <= 0) delete state.furniture[item];

    cancelPlacing();           // one piece per selection — never leaves a stale selection
    paintTile(x, y);
    sparkleAt(x, y);
    var recipe = recipesById[item];
    toast(((recipe && recipe.emoji) || "✨") + " " + ((recipe && recipe.name) || "It") + " looks lovely there!");
    narrate("placed", true);
    renderHud();
    save();
  }

  function removePlaced(x, y) {
    var list = placedListFor(state.roomId);
    if (!list) return null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].x === x && list[i].y === y) {
        var p = list.splice(i, 1)[0];
        if (!list.length) delete state.placed[state.roomId];
        state.furniture[p.item] = (state.furniture[p.item] || 0) + 1;
        return p;
      }
    }
    return null;
  }

  /* Canvas (stage) coordinates -> page coordinates, through the scale manager. */
  function stageToPage(sx, sy) {
    if (!game || !game.scale) return { x: 0, y: 0 };
    var sm = game.scale;
    sm.updateBounds();
    var b = sm.canvasBounds;
    var ds = sm.displayScale;
    return { x: b.x + sx / (ds.x || 1), y: b.y + sy / (ds.y || 1) };
  }

  function openTileMenu(x, y) {
    closeTileMenu();
    var p = placedAt(x, y);
    if (!p || !mapView || !game) return;
    var recipe = recipesById[p.item];

    tileMenu = document.createElement("div");
    tileMenu.className = "inline-menu";
    tileMenu.setAttribute("role", "group");
    tileMenu.setAttribute("aria-label", (recipe ? recipe.name : "Furniture") + " options");

    tileMenu.appendChild(menuButton("Move ✋", "Move " + (recipe ? recipe.name : "this"), function () {
      closeTileMenu();
      var removed = removePlaced(x, y);
      if (!removed) return;
      paintTile(x, y);
      renderHud();
      save();
      selectFurniture(removed.item);
    }));
    tileMenu.appendChild(menuButton("Put away 🧺", "Put " + (recipe ? recipe.name : "this") + " back in the satchel", function () {
      closeTileMenu();
      var removed = removePlaced(x, y);
      if (!removed) return;
      paintTile(x, y);
      renderHud();
      save();
      toast("Put " + ((recipe && recipe.name) || "it") + " away 🧺");
    }));

    mapView.appendChild(tileMenu);

    // Position under the tile: world -> canvas (via the camera) -> page -> #mapView.
    var c = tileCenter(x, y);
    var cv = worldToCanvas(c.x, c.y + tileSize / 2);
    var pt = stageToPage(cv.x, cv.y);
    var zoom = (scene && scene.cameras) ? (scene.cameras.main.zoom || 1) : 1;
    var mv = mapView.getBoundingClientRect();
    var left = pt.x - (mv.left + window.pageXOffset);
    var top = pt.y - (mv.top + window.pageYOffset);
    var w = tileMenu.offsetWidth || 120;
    var h = tileMenu.offsetHeight || 70;
    left = Math.max(4, Math.min(left - w / 2, mv.width - w - 4));
    if (top + h > mv.height - 4) top = Math.max(4, top - h - (tileSize * zoom) / (game.scale.displayScale.y || 1));
    tileMenu.style.left = Math.round(left) + "px";
    tileMenu.style.top = Math.round(top) + "px";
  }

  function menuButton(label, aria, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "inline-menu-btn";
    b.textContent = label;
    b.setAttribute("aria-label", aria);
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      onClick();
    });
    return b;
  }

  function closeTileMenu() {
    if (tileMenu && tileMenu.parentNode) tileMenu.parentNode.removeChild(tileMenu);
    tileMenu = null;
  }

  /* Tap on the canvas: place furniture, or open the move/put-away menu. */
  function onStagePointerUp(pointer) {
    if (busy() || !state) return;
    if (pointer.getDistance && pointer.getDistance() > 14) return;   // that was a drag
    // Through the camera: the stage scrolls now, so canvas pixels are not
    // world pixels. (pointer.x/y are already scale-manager corrected.)
    var wp = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    var tx = Math.floor((wp.x - originX) / tileSize);
    var ty = Math.floor((wp.y - originY) / tileSize);
    if (tx < 0 || ty < 0 || tx >= gridW || ty >= gridH) { closeTileMenu(); return; }
    var hadMenu = !!tileMenu;
    closeTileMenu();
    if (placing) { tryPlace(tx, ty); return; }
    if (!hadMenu && inRoom() && placedAt(tx, ty)) openTileMenu(tx, ty);
  }

  /* ================= Confirm modal ================= */

  var confirmAction = null;
  var confirmOpenerFocus = null;

  function isModalOpen() { return !!(confirmModal && !confirmModal.hidden); }

  function openConfirm(msg, onYes) {
    if (!confirmModal) { if (onYes) onYes(); return; }
    confirmAction = onYes || null;
    confirmOpenerFocus = document.activeElement;
    if (confirmText) confirmText.textContent = msg;
    setHidden(confirmModal, false);
    confirmModal.classList.add("open");
    if (confirmNo && confirmNo.focus) { try { confirmNo.focus(); } catch (e) { /* ignore */ } }
  }
  function closeConfirm() {
    confirmAction = null;
    if (!confirmModal) return;
    setHidden(confirmModal, true);
    confirmModal.classList.remove("open");
    var target = confirmOpenerFocus;
    confirmOpenerFocus = null;
    if (target && target.focus && document.contains(target)) { try { target.focus(); } catch (e) { /* ignore */ } }
  }

  /* ================= How-to-play overlay ================= */

  var helpOpenerFocus = null;

  function isHelpOpen() { return !!(helpOverlay && !helpOverlay.hidden); }

  function markHelpSeen() {
    try { localStorage.setItem(HELP_SEEN_KEY, "1"); } catch (e) { /* private mode */ }
  }
  function helpSeen() {
    try { return localStorage.getItem(HELP_SEEN_KEY) === "1"; } catch (e) { return false; }
  }

  function openHelp() {
    if (!helpOverlay) return;
    helpOpenerFocus = document.activeElement;
    setHidden(helpOverlay, false);
    helpOverlay.classList.add("open");
    markHelpSeen();
    var focusTarget = btnHelpClose || btnHelpGotIt;
    if (focusTarget && focusTarget.focus) { try { focusTarget.focus(); } catch (e) { /* ignore */ } }
  }
  function closeHelp() {
    if (!helpOverlay) return;
    setHidden(helpOverlay, true);
    helpOverlay.classList.remove("open");
    var target = helpOpenerFocus;
    helpOpenerFocus = null;
    if (target && target.focus && document.contains(target)) { try { target.focus(); } catch (e) { /* ignore */ } }
    else if (btnHelp && btnHelp.focus) { try { btnHelp.focus(); } catch (e) { /* ignore */ } }
  }

  /* ================= Respawn tick ================= */

  function tick() {
    if (!state) return;
    var now = Date.now();
    var prefix = areaIdOf(currentArea()) + ":";
    var changed = false;
    for (var k in state.nodesDepleted) {
      if (state.nodesDepleted[k] > now) continue;
      delete state.nodesDepleted[k];
      changed = true;
      if (k.indexOf(prefix) === 0) {
        var parts = k.split(":");
        var x = intOr(parts[parts.length - 2], -1);
        var y = intOr(parts[parts.length - 1], -1);
        paintTile(x, y);
      }
    }
    if (changed) save();
  }

  /* ================= Input ================= */

  function wireInput() {
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    if (btnSound) {
      btnSound.addEventListener("click", function (e) {
        setSound(!soundOn);
        if (e && e.detail) btnSound.blur();   // pointer click: don't keep focus
      });
    }
    // Browsers will not let audio start before the player touches something.
    var release = function () { releaseGreeting(); };
    document.addEventListener("keydown", release, { once: true });
    document.addEventListener("pointerdown", release, { once: true });

    document.addEventListener("click", function (e) {
      if (!tileMenu) return;
      if (tileMenu.contains(e.target)) return;
      if (game && game.canvas && e.target === game.canvas) return;   // the stage handles its own taps
      closeTileMenu();
    });

    // Crafting
    if (recipeList) {
      recipeList.addEventListener("click", function (e) {
        var btn = e.target;
        while (btn && btn !== recipeList && !(btn.classList && btn.classList.contains("recipe"))) btn = btn.parentNode;
        if (!btn || btn === recipeList) return;
        if (btn.classList.contains("mystery")) { toast("Something new is waiting… keep exploring ✨"); return; }
        var id = btn.getAttribute("data-recipe");
        if (id) craft(id);
      });
    }

    // Furniture selection
    if (furnList) {
      furnList.addEventListener("click", function (e) {
        var btn = e.target;
        while (btn && btn !== furnList && !(btn.classList && btn.classList.contains("furn-item"))) btn = btn.parentNode;
        if (!btn || btn === furnList) return;
        var item = btn.getAttribute("data-item");
        if (item) selectFurniture(item);
      });
    }

    // Dialogue
    if (dialogueNext) dialogueNext.addEventListener("click", function () { advanceTalking(); });

    // Touch controls: floating thumbstick on the stage + the big action button.
    wireTouchControls();

    ["pointerup", "pointercancel", "pointerleave"].forEach(function (evt) {
      window.addEventListener(evt, function (e) {
        // only the finger that started the hold may stop it — the other thumb
        // is free to work the action button without cancelling the walk
        if (repeatPointerId === null || e.pointerId === repeatPointerId) stopRepeat();
      });
    });
    window.addEventListener("blur", function () { stopRepeat(); heldKeys = []; releaseStick(true); });

    if (btnAction) {
      if (!btnAction.getAttribute("aria-label")) btnAction.setAttribute("aria-label", "Do the sparkly thing (gather, talk, open)");
      btnAction.addEventListener("pointerdown", function (e) {
        pointerDriven = true;
        e.preventDefault();
        btnAction.classList.add("pressed");
        advanceTalking();
      });
      var unpress = function () { btnAction.classList.remove("pressed"); };
      ["pointerup", "pointercancel", "pointerleave"].forEach(function (evt) {
        btnAction.addEventListener(evt, unpress);
      });
      btnAction.addEventListener("click", function (e) {
        if (pointerDriven && e.detail !== 0) return;
        advanceTalking();
      });
    }

    // Start over
    if (btnReset) {
      btnReset.addEventListener("click", function (e) {
        if (e && e.detail) btnReset.blur();   // pointer click: don't keep focus
        openConfirm("Start over? Your satchel, treasures and cozy rooms will all be cleared.", function () {
          wiped = true;
          if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
          try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
          location.reload();
        });
      });
    }
    if (confirmYes) confirmYes.addEventListener("click", function () {
      var act = confirmAction;
      closeConfirm();
      if (act) act();
    });
    if (confirmNo) confirmNo.addEventListener("click", closeConfirm);
    if (confirmModal) confirmModal.addEventListener("click", function (e) {
      if (e.target === confirmModal) closeConfirm();
    });

    // How to play
    if (btnHelp) btnHelp.addEventListener("click", function (e) {
      if (e && e.detail) btnHelp.blur();   // pointer click: don't keep focus
      openHelp();
    });
    if (btnHelpClose) btnHelpClose.addEventListener("click", closeHelp);
    if (btnHelpGotIt) btnHelpGotIt.addEventListener("click", closeHelp);
    if (helpOverlay) helpOverlay.addEventListener("click", function (e) {
      if (e.target === helpOverlay) closeHelp();
    });

    window.addEventListener("resize", closeTileMenu);
    window.addEventListener("pagehide", flushSave);
    document.addEventListener("visibilitychange", function () { if (document.hidden) flushSave(); });
  }

  function stopRepeat() {
    dpadDir = null;
    repeatPointerId = null;
  }

  /* ================= Floating thumbstick =================
     Roblox-style: touching the lower-left of the stage springs a translucent
     ring to that spot and the nub follows the thumb. Direction is the dominant
     axis of the drag (4-way, matching the grid) past a dead zone, fed into the
     same dpadDir / repeat mechanism the keyboard uses.

     Deliberately NOT a DOM hit target: the listener lives on #mapView and never
     calls preventDefault, so a plain tap in the stick corner still reaches the
     Phaser placement handler (which ignores anything it measures as a drag).
     Stick and action button track separate pointerIds, so two thumbs work. */

  var coarseMQ = (window.matchMedia ? window.matchMedia("(pointer: coarse)") : null);

  /* iPadOS reports a desktop-class UA, so feature-detect rather than sniff. */
  function touchUIWanted() {
    if ((navigator.maxTouchPoints || 0) > 0) return true;
    if (coarseMQ && coarseMQ.matches) return true;
    return window.innerWidth < 900;              // the old narrow-screen case
  }

  function touchUIOn() { return document.documentElement.classList.contains("touch-ui"); }

  function syncTouchUI() {
    var on = touchUIWanted();
    if (on === touchUIOn()) { layoutStick(); return; }
    if (on) document.documentElement.classList.add("touch-ui");
    else { document.documentElement.classList.remove("touch-ui"); releaseStick(true); }
    layoutStick();
  }

  function clampN(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /* Overlay box == canvas box (see the CSS note), so one coordinate space. */
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

  /* Park the ring in the lower-left of the stage. */
  function layoutStick() {
    if (!stickEl || !touchUIOn()) return;
    stickRadius = (stickEl.offsetWidth || 120) / 2;
    if (stickPointerId !== null) return;          // a thumb owns it right now
    var r = stickBox();
    if (!r) return;
    var pad = stickRadius + 8;
    placeStick(
      clampN(r.width * 0.17, pad, Math.max(pad, r.width - pad)),
      clampN(r.height * 0.74, pad, Math.max(pad, r.height - pad)),
      0, 0
    );
  }

  /* Left ~45% of the stage, lower two-thirds. */
  function inStickZone(r, cx, cy) {
    return cx >= r.left && cx <= r.left + r.width * 0.45 &&
      cy >= r.top + r.height * (1 / 3) && cy <= r.bottom;
  }

  function onStagePointerDown(e) {
    if (!stickEl || !touchUIOn()) return;
    if (e.pointerType === "mouse") return;        // desktop pointing stays untouched
    if (stickPointerId !== null) return;          // one thumb on the stick
    var r = stickBox();
    if (!r || !inStickZone(r, e.clientX, e.clientY)) return;
    stickPointerId = (e.pointerId === undefined) ? -1 : e.pointerId;
    stickDir = null;
    pointerDriven = true;
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
    var k = (d > stickRadius && d > 0) ? stickRadius / d : 1;
    placeStick(stickOx, stickOy, dx * k, dy * k);

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
    repeatPointerId = stickPointerId;             // only this thumb may stop it
    tryMove(dir);
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

  function onKeyUp(e) {
    var k = e.key;
    if (!k) return;
    var dir = DIR_KEYS[k] || DIR_KEYS[String(k).toLowerCase()];
    if (!dir) return;
    var i = heldKeys.indexOf(dir);
    if (i >= 0) heldKeys.splice(i, 1);
  }

  function onKeyDown(e) {
    if (!state) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;

    var k = e.key;
    if (!k) return;
    var dir = DIR_KEYS[k] || DIR_KEYS[String(k).toLowerCase()];
    var isConfirmKey = (k === " " || k === "Spacebar" || k === "Enter");

    // The browser already activates a focused button on Space/Enter; doing the
    // game action too would fire a single press twice.
    if (isConfirmKey && t && t.tagName === "BUTTON") return;

    if (isModalOpen()) {
      if (k === "Escape") { e.preventDefault(); closeConfirm(); }
      else if (dir || k === " " || k === "Spacebar") e.preventDefault();   // never scroll behind the modal
      return;
    }

    if (isHelpOpen()) {
      if (k === "Escape") { e.preventDefault(); closeHelp(); }
      else if (dir || k === " " || k === "Spacebar") e.preventDefault();   // never scroll behind the overlay
      return;
    }

    if (cutscene) {
      if (isConfirmKey) {
        if (t === dialogueNext) return;    // the button's own click will advance
        e.preventDefault();
        advanceCutscene();
      } else if (k === "Escape") {
        e.preventDefault();
        endCutscene();                     // skippable, and cleanly
      } else if (dir) {
        e.preventDefault();                // no walking off mid-scene
      }
      return;
    }

    if (dialogue) {
      if (isConfirmKey) {
        if (t === dialogueNext) return;    // the button's own click will advance
        e.preventDefault();
        advanceDialogue();
      } else if (k === "Escape") {
        e.preventDefault();
        endDialogue();
      } else if (dir) {
        e.preventDefault();
      }
      return;
    }

    if (k === "Escape") {
      if (placing || tileMenu) { e.preventDefault(); cancelPlacing(); closeTileMenu(); }
      return;
    }

    if (dir) {
      e.preventDefault();               // arrows never scroll the page
      if (heldKeys.indexOf(dir) < 0) heldKeys.push(dir);
      tryMove(dir);
      return;
    }

    if (isConfirmKey) {
      // Let a focused button/link handle its own Enter/Space.
      if (t && t !== document.body && t !== document.documentElement &&
        (t.tagName === "BUTTON" || t.tagName === "A" || (t.getAttribute && t.getAttribute("role") === "button"))) {
        return;
      }
      e.preventDefault();
      interact();
    }
  }

  /* ================= Boot ================= */

  function indexWorld(w) {
    world = w;
    if (!world.tileTypes) world.tileTypes = {};
    if (!world.resources) world.resources = {};
    if (!world.companions) world.companions = {};
    if (!world.maps) world.maps = {};
    if (Object.prototype.toString.call(world.recipes) !== "[object Array]") world.recipes = [];
    if (Object.prototype.toString.call(world.rooms) !== "[object Array]") world.rooms = [];

    for (var mid in world.maps) {
      if (world.maps[mid]) world.maps[mid]._id = mid;
    }
    for (var i = 0; i < world.rooms.length; i++) {
      var r = world.rooms[i];
      if (!r || !r.id) continue;
      r._id = r.id;
      roomsById[r.id] = r;
    }
    for (var j = 0; j < world.recipes.length; j++) {
      var recipe = world.recipes[j];
      if (recipe && recipe.id) recipesById[recipe.id] = recipe;
    }
    houseDoorMap = null;
    for (var mid2 in world.maps) {
      var m = world.maps[mid2];
      if (m && m.door && m.door.toRoom && roomsById[m.door.toRoom]) { houseDoorMap = m; break; }
    }
  }

  var firstRun = false;

  /* Runs once WorldScene.create() has a live scene to draw into. */
  function onSceneReady() {
    renderArea();
    // Last safety net: never start standing inside a wall / on a friend.
    if (!walkableAt(state.x, state.y)) {
      var spot = nearestWalkable(currentArea(), inRoom(), state.x, state.y, state);
      if (spot) { state.x = spot.x; state.y = spot.y; positionPlayer(true); }
    }
    renderHud();
    flushSave();
    layoutStick();

    maybeCutscene();   // a save that already meets a trigger, reloaded here
    pendingGreeting = firstRun ? "intro" : "welcome";
    if (firstRun && !helpSeen()) {
      openHelp();
    } else if (firstRun) {
      toast((touchUIOn()
        ? "Drag the circle to walk · ✨ to gather"
        : "Walk with the arrow keys · ✨ to gather") +
        " · Craft cozy things for your castle 💫", 6500, "intro-toast");
    } else {
      var area = currentArea();
      toast("Welcome back to " + ((area && area.name) || "the castle") + " 🌙");
    }
    firstRun = false;
  }

  function init(w, mf, vf) {
    indexWorld(w);
    manifest = (mf && typeof mf === "object") ? mf : {};
    voices = (vf && typeof vf === "object" && (vf.companions || vf.cutscenes || vf.narrator)) ? vf : null;
    loadSoundPref();
    syncSoundButton();
    if (!Object.keys(world.maps).length) { fatal("The castle grounds are missing."); return; }
    if (typeof Phaser === "undefined") { fatal("The magic paintbrush (Phaser) didn't load."); return; }

    // Normalise the overlays the page ships hidden (their CSS `display` rules
    // would otherwise win over the plain `hidden` attribute).
    setHidden(dialogueBox, true);
    setHidden(confirmModal, true);
    setHidden(helpOverlay, true);
    setHidden(toastEl, true);
    setHidden(decorHint, true);

    var loaded = loadState();
    firstRun = !loaded;
    state = loaded || sanitize(null);

    makeScenes();
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: mapView,
      width: GAME_W,
      height: GAME_H,
      backgroundColor: "#15132e",
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
    setInterval(tick, TICK_MS);

    /* Testability hook — the canvas is opaque to DOM inspection.
       Read-only accessors; `tick()` only runs the respawn sweep the 1s
       interval already performs, and returns undefined. */
    window.__castleLife = {
      version: 2,
      getState: function () {
        try { return JSON.parse(JSON.stringify(state)); } catch (e) { return null; }
      },
      getMapId: function () { return state ? (state.roomId || state.mapId) : null; },
      /* Read-only camera/geometry snapshot: the canvas is opaque to the DOM,
         so this is the only way a test can check the zoom and the follow. */
      getView: function () {
        if (!scene || !scene.cameras) return null;
        var cam = scene.cameras.main;
        var v = cam.worldView;
        var pc = playerC ? { x: playerC.x, y: playerC.y } : null;
        return {
          tileSize: tileSize, gridW: gridW, gridH: gridH,
          worldW: worldW, worldH: worldH, originX: originX, originY: originY,
          zoom: cam.zoom, scrollX: cam.scrollX, scrollY: cam.scrollY,
          viewW: v.width, viewH: v.height, viewX: v.x, viewY: v.y,
          tilesAcross: v.width / tileSize, tilesDown: v.height / tileSize,
          player: pc,
          playerOnScreen: pc ? { x: (pc.x - v.x) / (v.width || 1), y: (pc.y - v.y) / (v.height || 1) } : null,
          inCutscene: !!cutscene
        };
      },
      tick: function () { tick(); }
    };
  }

  if (!mapView) return;

  // Panels fold before the world even loads, so nothing flashes open.
  initPanels();

  function fetchJson(url, optional) {
    return fetch(url).then(function (r) {
      if (!r.ok) {
        if (optional) return null;
        throw new Error(url + " " + r.status);
      }
      return r.json();
    }).catch(function (err) {
      if (optional) return null;
      throw err;
    });
  }

  Promise.all([
    fetchJson("game/world.json", false),
    fetchJson(ASSET_BASE + "manifest.json", true),
    fetchJson("game/voices/manifest.json", true)
  ]).then(function (res) {
    var w = res[0];
    if (!w || typeof w !== "object") throw new Error("world.json is not a story");
    init(w, res[1], res[2]);
  }).catch(function (err) {
    fatal("The castle wouldn't open (" + err.message + "). Try refreshing the page.");
  });
})();
