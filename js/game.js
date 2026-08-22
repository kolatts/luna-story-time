/* Princess Moon's Castle Life — game engine
 * One plain script (no modules), same house style as js/reader.js.
 * Loads game/world.json once, then runs a cozy tile game: walk, gather,
 * craft, decorate. Art in this pass is emoji + CSS tiles; a future session
 * can swap the emoji for images without touching the rules below.
 */
(function () {
  "use strict";

  /* ---------- Constants ---------- */
  var SAVE_KEY = "pm-castle-life-v1";
  var RESPAWN_MS = 35000;   // resource node comes back this long after gathering
  var TICK_MS = 1000;       // respawn check
  var TOAST_MS = 2400;
  var FADE_MS = 180;        // map/room transition fade
  var REPEAT_MS = 180;      // touch d-pad hold-to-repeat
  var SAVE_DEBOUNCE = 150;
  var START_MAP = "grounds";
  var START_X = 9, START_Y = 5;

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

  /* ---------- DOM ---------- */
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
  var btnReset = $("btnReset");
  var confirmModal = $("confirmModal");
  var confirmText = $("confirmText");
  var confirmYes = $("confirmYes");
  var confirmNo = $("confirmNo");

  /* ---------- Runtime ---------- */
  var world = null;            // parsed world.json
  var roomsById = {};          // room id -> room
  var recipesById = {};        // recipe id -> recipe
  var houseDoorMap = null;     // map object that owns the castle door
  var state = null;

  var playerEl = null;
  var tileEls = [];            // tileEls[y][x] -> div.tile
  var gridW = 0, gridH = 0;
  var npcIndex = {};           // "x:y" -> companion id (current area)
  var resIndex = {};           // "x:y" -> resource placement (current area)

  var dialogue = null;         // { id, lines, i, first }
  var placing = null;          // furniture item id being placed
  var tileMenu = null;         // inline Move / Put away menu element
  var travelling = false;
  var saveTimer = null;
  var wiped = false;           // set by "Start over" so nothing writes the save back
  var lastBumpToast = 0;
  var pointerDriven = false;   // touch/mouse used the d-pad; ignore synthetic clicks
  var repeatTimer = null;
  var repeatPointerId = null;  // pointer that started hold-to-repeat; only it may stop it
  var toastQueue = [], toastTimer = null;

  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ================= Small helpers ================= */

  function intOr(v, def) { var n = parseInt(v, 10); return isNaN(n) ? def : n; }
  function keyOf(x, y) { return x + ":" + y; }

  /* Hide/show belt-and-braces: some panels carry a `display` rule that would
     out-rank the `hidden` attribute, so set both. */
  function setHidden(el, hide) {
    if (!el) return;
    el.hidden = !!hide;
    el.style.display = hide ? "none" : "";
  }

  function closestTile(node) {
    while (node && node !== mapView) {
      if (node.classList && node.classList.contains("tile")) return node;
      node = node.parentNode;
    }
    return null;
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
    setHidden(toastEl, false);
    toastEl.textContent = t.m;
    void toastEl.offsetWidth;          // restart the fade-in
    toastEl.classList.add("show");
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
      toastTimer = setTimeout(nextToast, 200);
    }, t.ms);
  }

  /* A little ✦ ✧ pop over a tile (CSS animates the children outward). */
  function sparkleAt(x, y) {
    if (reduceMotion) return;
    var tile = tileEls[y] && tileEls[y][x];
    if (!tile || !mapView) return;
    var burst = document.createElement("div");
    burst.className = "sparkle-burst";
    burst.setAttribute("aria-hidden", "true");
    burst.style.left = (tile.offsetLeft + tile.offsetWidth / 2) + "px";
    burst.style.top = (tile.offsetTop + tile.offsetHeight / 2) + "px";
    for (var i = 0; i < 6; i++) {
      var s = document.createElement("span");
      s.textContent = i % 2 ? "✧" : "✦";
      s.style.setProperty("--i", String(i));
      burst.appendChild(s);
    }
    mapView.appendChild(burst);
    setTimeout(function () {
      if (burst.parentNode) burst.parentNode.removeChild(burst);
    }, 1000);
  }

  /* ================= Save / load ================= */

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

  /* ================= World queries ================= */

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

  /* A "*" doorway that leads to a still-locked room. */
  function lockedDoorIn(area, x, y) {
    var e = exitIn(area, x, y);
    if (e && e.room && !roomUnlocked(e.to)) return e;
    return null;
  }

  function npcsFor(area) {
    var out = {};
    if (!area || !world.companions) return out;
    var id = areaIdOf(area);
    var listed = (area.npcs && Object.prototype.toString.call(area.npcs) === "[object Array]") ? area.npcs : [];
    var add = function (cid) {
      var c = world.companions[cid];
      if (!c) return;
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
    var npcs = (area === currentArea()) ? npcIndex : npcsFor(area);
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

  /* ================= Rendering ================= */

  function ensurePlayer() {
    if (playerEl) return playerEl;
    playerEl = document.createElement("div");
    playerEl.id = "player";
    playerEl.className = "player face-down";
    var sprite = document.createElement("span");
    sprite.className = "p-sprite";
    sprite.textContent = "🧚";
    playerEl.appendChild(sprite);
    playerEl.setAttribute("aria-hidden", "true");
    return playerEl;
  }

  function tilePx() {
    var v = 0;
    try {
      v = parseFloat(getComputedStyle(mapView).getPropertyValue("--tile"));
    } catch (e) { v = 0; }
    return v > 0 ? v : 34;
  }

  /* Build the whole grid — once per map/room entry. */
  function renderArea() {
    var area = currentArea();
    if (!area || !area.tiles || !area.tiles.length) {
      fatal("This part of the castle is missing from the storybook.");
      return;
    }
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

    mapView.innerHTML = "";
    mapView.setAttribute("data-map", areaIdOf(area));
    mapView.classList.toggle("in-room", inRoom());
    mapView.style.gridTemplateColumns = "repeat(" + gridW + ", var(--tile))";

    tileEls = [];
    for (var y = 0; y < gridH; y++) {
      tileEls[y] = [];
      for (var x = 0; x < gridW; x++) {
        var el = document.createElement("div");
        el.setAttribute("data-x", String(x));
        el.setAttribute("data-y", String(y));
        tileEls[y][x] = el;
        mapView.appendChild(el);
        paintTile(x, y);
      }
    }

    mapView.appendChild(ensurePlayer());
    if (locationName) locationName.textContent = area.name || "";
    positionPlayer(true);
  }

  /* Repaint one tile — used for gathering, respawns, furniture, unlocks. */
  function paintTile(x, y) {
    var el = tileEls[y] && tileEls[y][x];
    if (!el) return;
    var area = currentArea();
    var ch = tileCharOf(area, x, y);
    var terrain = terrainOf(ch);
    var cls = "tile t-" + terrain;
    var text = "";
    var title = "";

    // Castle door (outdoors) / the hall's way back out (indoors)
    if (terrain === "castledoor") {
      cls += " door";
      if (inRoom()) { text = "🚪"; title = "Back outside"; }
      else { text = "🏰"; title = "The castle door"; }
    }

    // Room-to-room doorways: sparkly lock, or an open door once unlocked
    var e = exitIn(area, x, y);
    if (e && e.room) {
      var room = roomsById[e.to];
      if (room && condMet(room.unlock)) {
        cls += " door open";
        text = "🚪";
        title = room.name || "";
      } else {
        cls += " locked";
        text = "✨🔒";
        title = room ? unlockText(room.unlock) : "Locked";
      }
    }

    // Companion standing here
    var cid = npcAt(x, y);
    if (cid) {
      var c = world.companions[cid];
      cls += " npc";
      text = (c && c.emoji) || "✨";
      title = (c && c.name) || "";
    }

    // Resource node
    var node = resourceAt(x, y);
    if (node) {
      var def = world.resources[node.type];
      cls += " res";
      text = (def && (def.node || def.emoji)) || "✨";
      if (nodeDepleted(x, y)) {
        cls += " depleted";      // CSS shrinks + fades the leftover sprig
        title = def ? def.name + " (gathered — it will grow back)" : "";
      } else {
        title = def ? def.name : "";
      }
    }

    // Placed furniture wins the tile
    var p = placedAt(x, y);
    if (p) {
      var recipe = recipesById[p.item];
      cls += " furn";
      text = (recipe && recipe.emoji) || "🎁";
      title = (recipe ? recipe.name : "Furniture") + " — tap to move or put away";
    }

    el.className = cls;
    el.textContent = text;
    if (title) el.setAttribute("title", title); else el.removeAttribute("title");
  }

  function repaintDoorways() {
    var area = currentArea();
    var list = (area && area.exits) || [];
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e && e.room) paintTile(intOr(e.x, -1), intOr(e.y, -1));
    }
  }

  function positionPlayer(instant) {
    var el = ensurePlayer();
    if (instant) el.style.transition = "none";
    var tile = tileEls[state.y] && tileEls[state.y][state.x];
    var px, py;
    if (tile) { px = tile.offsetLeft; py = tile.offsetTop; }
    else { var t = tilePx(); px = state.x * t; py = state.y * t; }
    el.style.transform = "translate(" + px + "px, " + py + "px)";
    el.className = "player face-" + state.facing;
    if (instant) { void el.offsetWidth; el.style.transition = ""; }
  }

  function fatal(msg) {
    if (mapView) {
      mapView.innerHTML = "";
      mapView.removeAttribute("style");
      var p = document.createElement("p");
      p.className = "hint";
      p.textContent = "Oh no! " + msg;
      mapView.appendChild(p);
    }
    if (locationName) locationName.textContent = "Somewhere quiet";
  }

  /* ================= Movement & travel ================= */

  function busy() {
    return !!dialogue || travelling || isModalOpen();
  }

  function tryMove(dir) {
    if (!state || busy()) return;
    var d = DIRS[dir];
    if (!d) return;
    if (state.facing !== dir) {
      state.facing = dir;
      positionPlayer(false);
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

  /* Fade out, swap the area, fade back in. */
  function goTo(isRoom, id, tx, ty) {
    var area = isRoom ? roomsById[id] : world.maps[id];
    if (!area) return;
    var spot = isWalkableIn(area, isRoom, tx, ty, state) ? { x: tx, y: ty } : nearestWalkable(area, isRoom, tx, ty, state);
    if (!spot) spot = { x: 0, y: 0 };

    cancelPlacing();
    closeTileMenu();
    travelling = true;
    if (mapView) mapView.classList.add("fading");

    setTimeout(function () {
      if (isRoom) { state.roomId = id; }
      else { state.roomId = null; state.mapId = id; }
      state.x = spot.x; state.y = spot.y;
      renderArea();
      renderFurniture();
      if (mapView) mapView.classList.remove("fading");
      travelling = false;
      flushSave();
    }, reduceMotion ? 0 : FADE_MS);
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

  /* ================= Interact ================= */

  function interact() {
    if (!state) return;
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
  }

  /* ================= Dialogue ================= */

  function startDialogue(cid) {
    var c = world.companions[cid];
    if (!c) return;
    cancelPlacing();
    closeTileMenu();
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
    if (dialoguePortrait) dialoguePortrait.textContent = c.emoji || "✨";
    if (dialogueBox) { setHidden(dialogueBox, false); dialogueBox.classList.add("open"); }
    showDialogueLine();
  }

  function showDialogueLine() {
    if (!dialogue) return;
    var c = world.companions[dialogue.id];
    var name = (c && c.name) ? c.name + ": " : "";
    if (dialogueText) dialogueText.textContent = name + dialogue.lines[dialogue.i];
    if (dialogueNext) {
      var last = dialogue.i >= dialogue.lines.length - 1;
      dialogueNext.textContent = last ? "All done ✨" : "Next ✨";
      dialogueNext.setAttribute("aria-label", last ? "Close what " + ((c && c.name) || "your friend") + " is saying" : "Next line");
    }
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

  function endDialogue() {
    var d = dialogue;
    dialogue = null;
    if (dialogueBox) { setHidden(dialogueBox, true); dialogueBox.classList.remove("open"); }
    if (!d) return;
    if (d.first && state.met.indexOf(d.id) < 0) {
      var c = world.companions[d.id];
      if (c && c.name) toast(c.name + " is your friend now 💖");
      progress(function () { state.met.push(d.id); });   // may add their recipe
    }
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
    repaintDoorways();   // opens newly unlocked doors and refreshes "3 more to go" hints

    renderHud();
    save();
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
      cell.setAttribute("title", def.name || id);
      cell.setAttribute("aria-label", count + " " + (def.name || id));

      var em = document.createElement("span");
      em.className = "emoji";
      em.textContent = def.emoji || "✨";
      var n = document.createElement("span");
      n.className = "count";
      n.textContent = "×" + count;

      cell.appendChild(em);
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

    var em = document.createElement("span");
    em.className = "r-emoji";
    em.textContent = recipe.emoji || "✨";
    btn.appendChild(em);

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
    // (Not `locked-hidden` — css/game.css hides that class outright, which is
    // what companion recipes get by simply not being rendered at all.)
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
    progress(function () {
      var needs = recipe.needs || {};
      for (var r in needs) {
        state.inv[r] = (state.inv[r] || 0) - intOr(needs[r], 0);
        if (state.inv[r] <= 0) delete state.inv[r];
      }
      state.furniture[recipe.id] = (state.furniture[recipe.id] || 0) + 1;
      state.totals.crafted += 1;
    });
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

      var em = document.createElement("span");
      em.className = "f-emoji";
      em.textContent = recipe.emoji || "🎁";
      var name = document.createElement("span");
      name.className = "f-name";
      name.textContent = recipe.name || recipe.id;
      var n = document.createElement("span");
      n.className = "f-count";
      n.textContent = "×" + count;

      btn.appendChild(em);
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

  /* ================= Decorating ================= */

  function selectFurniture(item) {
    if (!state.furniture[item]) { cancelPlacing(); return; }
    if (!inRoom()) { toast("Furniture goes inside the castle 🏰"); return; }
    if (placing === item) { cancelPlacing(); return; }
    placing = item;
    document.body.classList.add("placing");
    if (mapView) mapView.classList.add("placing-cursor");
    setHidden(decorHint, false);
    renderFurniture();
    var recipe = recipesById[item];
    toast("Tap a floor tile to put " + ((recipe && recipe.name) || "it") + " down 💫");
  }

  function cancelPlacing() {
    document.body.classList.remove("placing");
    if (mapView) mapView.classList.remove("placing-cursor");
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

  function openTileMenu(x, y) {
    closeTileMenu();
    var p = placedAt(x, y);
    var tile = tileEls[y] && tileEls[y][x];
    if (!p || !tile || !mapView) return;
    var recipe = recipesById[p.item];

    tileMenu = document.createElement("div");
    tileMenu.className = "inline-menu";
    tileMenu.setAttribute("role", "group");
    tileMenu.setAttribute("aria-label", (recipe ? recipe.name : "Furniture") + " options");
    tileMenu.style.left = (tile.offsetLeft + tile.offsetWidth / 2) + "px";
    tileMenu.style.top = (tile.offsetTop + tile.offsetHeight) + "px";

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

  /* ================= Confirm modal ================= */

  var confirmAction = null;

  function isModalOpen() { return !!(confirmModal && !confirmModal.hidden); }

  function openConfirm(msg, onYes) {
    if (!confirmModal) { if (onYes) onYes(); return; }
    confirmAction = onYes || null;
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
        if (tileEls[y] && tileEls[y][x]) paintTile(x, y);
      }
    }
    if (changed) save();
  }

  /* ================= Input ================= */

  function wireInput() {
    document.addEventListener("keydown", onKeyDown);

    // Clicks on the map: place furniture, or open the move/put-away menu.
    if (mapView) {
      mapView.addEventListener("click", function (e) {
        if (busy()) return;
        var tile = closestTile(e.target);
        if (!tile) return;
        var x = intOr(tile.getAttribute("data-x"), -1);
        var y = intOr(tile.getAttribute("data-y"), -1);
        if (x < 0 || y < 0) return;
        var hadMenu = !!tileMenu;
        closeTileMenu();
        if (placing) { tryPlace(x, y); return; }
        if (!hadMenu && inRoom() && placedAt(x, y)) openTileMenu(x, y);
      });
    }

    document.addEventListener("click", function (e) {
      if (tileMenu && !tileMenu.contains(e.target) && !closestTile(e.target)) closeTileMenu();
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
    if (dialogueNext) dialogueNext.addEventListener("click", function () { advanceDialogue(); });

    // Touch d-pad + action button: click and press-and-hold both work.
    var dpad = document.querySelector(".dpad");
    if (dpad) {
      dpad.addEventListener("pointerdown", function (e) {
        var btn = dirButton(e.target);
        if (!btn) return;
        pointerDriven = true;
        e.preventDefault();
        var dir = btn.getAttribute("data-dir");
        tryMove(dir);
        startRepeat(dir, e.pointerId);
      });
      dpad.addEventListener("click", function (e) {
        var btn = dirButton(e.target);
        if (!btn) return;
        if (pointerDriven && e.detail !== 0) return;   // pointerdown already moved us
        tryMove(btn.getAttribute("data-dir"));
      });
      var dpadButtons = dpad.querySelectorAll("button[data-dir]");
      for (var i = 0; i < dpadButtons.length; i++) {
        var b = dpadButtons[i];
        if (!b.getAttribute("aria-label")) b.setAttribute("aria-label", "Walk " + b.getAttribute("data-dir"));
        if (!b.getAttribute("type")) b.setAttribute("type", "button");
      }
    }
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (evt) {
      window.addEventListener(evt, function (e) {
        // only the finger that started the repeat may stop it
        if (repeatPointerId === null || e.pointerId === repeatPointerId) stopRepeat();
      });
    });
    window.addEventListener("blur", stopRepeat);

    if (btnAction) {
      if (!btnAction.getAttribute("aria-label")) btnAction.setAttribute("aria-label", "Do the sparkly thing (gather, talk, open)");
      btnAction.addEventListener("pointerdown", function (e) {
        pointerDriven = true;
        e.preventDefault();
        if (dialogue) advanceDialogue(); else interact();
      });
      btnAction.addEventListener("click", function (e) {
        if (pointerDriven && e.detail !== 0) return;
        if (dialogue) advanceDialogue(); else interact();
      });
    }

    // Start over
    if (btnReset) {
      btnReset.addEventListener("click", function () {
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

    window.addEventListener("resize", function () { positionPlayer(true); closeTileMenu(); });
    window.addEventListener("pagehide", flushSave);
    document.addEventListener("visibilitychange", function () { if (document.hidden) flushSave(); });
  }

  function dirButton(node) {
    while (node && node !== document.body) {
      if (node.getAttribute && node.getAttribute("data-dir")) return node;
      node = node.parentNode;
    }
    return null;
  }

  function startRepeat(dir, pointerId) {
    stopRepeat();
    repeatPointerId = (pointerId === undefined) ? null : pointerId;
    repeatTimer = setInterval(function () { tryMove(dir); }, REPEAT_MS);
  }
  function stopRepeat() {
    if (repeatTimer) { clearInterval(repeatTimer); repeatTimer = null; }
    repeatPointerId = null;
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

    if (isModalOpen()) {
      if (k === "Escape") { e.preventDefault(); closeConfirm(); }
      else if (dir || k === " " || k === "Spacebar") e.preventDefault();   // never scroll behind the modal
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

  function init(w) {
    indexWorld(w);
    if (!Object.keys(world.maps).length) { fatal("The castle grounds are missing."); return; }

    // Normalise the overlays the page ships hidden (their CSS `display` rules
    // would otherwise win over the plain `hidden` attribute).
    setHidden(dialogueBox, true);
    setHidden(confirmModal, true);
    setHidden(toastEl, true);
    setHidden(decorHint, true);

    var loaded = loadState();
    var firstRun = !loaded;
    state = loaded || sanitize(null);

    renderArea();
    // Last safety net: never start standing inside a wall / on a friend.
    if (!walkableAt(state.x, state.y)) {
      var spot = nearestWalkable(currentArea(), inRoom(), state.x, state.y, state);
      if (spot) { state.x = spot.x; state.y = spot.y; positionPlayer(true); }
    }
    renderHud();
    wireInput();
    setInterval(tick, TICK_MS);
    flushSave();

    if (firstRun) {
      toast("Walk with the arrow keys · ✨ to gather · Craft cozy things for your castle 💫", 6500, "intro-toast");
    } else {
      var area = currentArea();
      toast("Welcome back to " + ((area && area.name) || "the castle") + " 🌙");
    }
  }

  if (!mapView) return;

  fetch("game/world.json")
    .then(function (r) { if (!r.ok) throw new Error("world.json " + r.status); return r.json(); })
    .then(function (w) {
      if (!w || typeof w !== "object") throw new Error("world.json is not a story");
      init(w);
    })
    .catch(function (err) {
      fatal("The castle wouldn't open (" + err.message + "). Try refreshing the page.");
    });
})();
