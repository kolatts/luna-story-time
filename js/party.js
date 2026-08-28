/* =====================================================================
   The Birthday Party Patrol — multiplayer birthday tower defense
   1–4 players over a polling Azure Functions "mailbox" (party/SPEC.md).
   The room creator's browser runs the authoritative simulation; guests
   send commands and lerp snapshots. Any empty side is played by the
   castle (AI). Bedtime-safe: booped snackers puff home, nobody is hurt,
   and everyone gets cake at the end.
   ===================================================================== */
(function () {
  "use strict";

  // ------------------------------------------------------------ config
  var VERSION = 1;
  var SAVE_KEY = "pm-party-patrol-v1";
  var IS_LOCAL = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  var API_BASE = IS_LOCAL
    ? "http://localhost:7071/api"
    : "https://luna-storytime-functions.azurewebsites.net/api";

  var GRID_W = 18, GRID_H = 11, TILE = 64;          // render px per tile
  var MATCH_SECONDS = 300;
  var GOODIE_COUNT = 10;
  var STEAL_TO_WIN = 6;                              // snackers win at >= 6 stolen
  var POLL_LOBBY = 1500, POLL_GUEST = 700, POLL_HOST = 600, HEARTBEAT = 5000;
  var STEP = 0.1;                                    // sim logic step, seconds

  var SIDES = {
    patrol:   { name: "Party Patrol",    poolEmoji: "✨", accrue: 2, start: 60 },
    snackers: { name: "Sneaky Snackers", poolEmoji: "😈", accrue: 3, start: 40 }
  };

  var CHARACTERS = {
    moon:        { side: "patrol",   name: "Princess Moon", emoji: "🧚", img: "peek/assets/characters/moon.webp" },
    babylady:    { side: "patrol",   name: "Baby Lady",     emoji: "🐶", img: "peek/assets/characters/babylady.webp" },
    cottontail:  { side: "patrol",   name: "Cottontail",    emoji: "🐆", img: "peek/assets/characters/cottontail.webp" },
    winds:       { side: "patrol",   name: "Winds",         emoji: "💨", img: "peek/assets/characters/winds.webp" },
    shock:       { side: "snackers", name: "Shock",         emoji: "⛈️", img: "game/assets/characters/shock.webp" },
    elysian:     { side: "snackers", name: "Elysian",       emoji: "🧙", img: "party/assets/characters/elysian.webp" },
    unicorn:     { side: "snackers", name: "The Unicorn",   emoji: "🦄", img: "party/assets/characters/unicorn.webp" },
    leeblebeest: { side: "snackers", name: "Leeblebeest",   emoji: "🔵", img: "peek/assets/characters/leeblebeest.webp" }
  };

  var MINIONS = {
    stormpuff: { name: "Storm Puff", emoji: "🌩️", cost: 15, hp: 2, speed: 2.2, img: "party/assets/minions/stormpuff.webp" },
    humnote:   { name: "Hum Note",   emoji: "🎵",       cost: 25, hp: 4, speed: 1.6, aura: 2.5, img: "party/assets/minions/humnote.webp" },
    inkblot:   { name: "Ink Blot",   emoji: "🖋️", cost: 35, hp: 7, speed: 1.0, img: "party/assets/minions/inkblot.webp" }
  };
  var CHAMP_HP = 12, CHAMP_SPEED = 1.2, CHAMP_CARRY = 3, MARCH_COOLDOWN = 45;
  var CHEER_COST = 20, CHEER_SECONDS = 3;

  var TOWERS = {
    lantern:  { name: "Twinkle Lantern", emoji: "🏮", cost: 30, range: 2.5, img: "party/assets/towers/lantern.webp" },
    fountain: { name: "Bubble Fountain", emoji: "🫧", cost: 45, range: 2.5, every: 2.5, hold: 1.2, img: "party/assets/towers/fountain.webp" },
    cannon:   { name: "Sparkle Cannon",  emoji: "✨",       cost: 60, range: 3.0, every: 1.1, img: "party/assets/towers/cannon.webp" }
  };

  // Two walking routes, tower-gate (top) and cave-gate (bottom), converging
  // at (9,5) into the shared table run. Tile-corner waypoints.
  var ROUTES = [
    [[0, 2], [6, 2], [6, 4], [9, 4], [9, 5], [14, 5], [15, 5]],
    [[0, 8], [4, 8], [4, 6], [9, 6], [9, 5], [14, 5], [15, 5]]
  ];
  var PADS = [
    [2, 1], [5, 1], [2, 3], [7, 3], [2, 7], [2, 9],
    [5, 7], [8, 7], [10, 4], [12, 4], [10, 6], [12, 6]
  ];
  var TREES = [[2, 5], [8, 1], [8, 9], [12, 2], [12, 8], [17, 1], [17, 9], [17, 0], [0, 0], [0, 10]];
  var FLOWERS = [[1, 4], [3, 3], [5, 5], [7, 0], [10, 1], [10, 9], [13, 8], [14, 1], [6, 9], [3, 0]];
  var TABLE_CENTER = [16.1, 5.0];
  var GOODIE_SLOTS = [
    { kind: "present", x: 15.0, y: 3.3 }, { kind: "present", x: 16.0, y: 3.1 }, { kind: "present", x: 17.0, y: 3.3 },
    { kind: "present", x: 15.0, y: 6.7 }, { kind: "present", x: 16.0, y: 6.9 }, { kind: "present", x: 17.0, y: 6.7 },
    { kind: "cupcake", x: 15.3, y: 4.4 }, { kind: "cupcake", x: 15.3, y: 5.6 }, { kind: "cupcake", x: 16.9, y: 4.4 },
    { kind: "cake",    x: 16.3, y: 5.0 }
  ];
  var HERO_SPAWNS = [[13.2, 3.8], [13.2, 6.2], [14.2, 3.2], [14.2, 6.8]];
  var AI_POSTS = [[9.5, 5.0], [13.5, 5.0]];

  var SPRITES = {
    grass: "game/assets/terrain/grass.webp", grass2: "game/assets/terrain/grass2.webp",
    path: "game/assets/terrain/path.webp", tree: "game/assets/terrain/tree.webp",
    flowers: "game/assets/terrain/flowers.webp", castledoor: "game/assets/terrain/castledoor.webp",
    pad: "game/assets/furniture/pathstones.webp", sparkle: "game/assets/fx/sparkle.webp",
    table: "peek/assets/props/table.webp", balloons: "peek/assets/props/balloons.webp",
    present1: "peek/assets/props/present1.webp", present2: "peek/assets/props/present2.webp",
    present3: "peek/assets/props/present3.webp", cake: "peek/assets/props/cake.webp",
    cupcake: "party/assets/props/cupcake.webp"
  };
  Object.keys(CHARACTERS).forEach(function (k) { SPRITES["char_" + k] = CHARACTERS[k].img; });
  Object.keys(MINIONS).forEach(function (k) { SPRITES["minion_" + k] = MINIONS[k].img; });
  Object.keys(TOWERS).forEach(function (k) { SPRITES["tower_" + k] = TOWERS[k].img; });

  var FALLBACK_EMOJI = {
    pad: "🪨", tree: "🌳", flowers: "🌼", castledoor: "🚪",
    table: "🛋️", balloons: "🎈", sparkle: "✨",
    present1: "🎁", present2: "🎁", present3: "🎁",
    cake: "🎂", cupcake: "🧁",
    char_moon: "🧚", char_babylady: "🐶", char_cottontail: "🐆",
    char_winds: "💨", char_shock: "⛈️", char_elysian: "🧙",
    char_unicorn: "🦄", char_leeblebeest: "🔵",
    minion_stormpuff: "🌩️", minion_humnote: "🎵", minion_inkblot: "🖋️",
    tower_lantern: "🏮", tower_fountain: "🫧", tower_cannon: "✨"
  };

  // ------------------------------------------------------------- state
  var save = loadSave();
  var net = {
    code: null, playerId: null, secret: null, isHost: false,
    phase: null, players: [], lastRk: "", errors: 0, gets: 0, posts: 0,
    pollTimer: null, heartbeatTimer: null, lastSnapshotSeen: 0, hostQuietSince: 0
  };
  var sim = null;              // host: authoritative, JSON-serializable state
  var view = { prev: null, cur: null, at: 0, interval: POLL_GUEST, version: 0, lastEventSeq: 0 };
  var ui = { screen: "landing", armedTower: null, gate: 0, myChar: null, mySide: null, banner: null, bannerTimer: null };
  var timeScale = 1;           // test hook can speed the host sim up
  var scene = null, game = null;

  var $ = function (id) { return document.getElementById(id); };
  var overlayEl = $("overlay"), cardEl = $("overlayCard");
  var hudClock = $("hudClock"), hudGoodies = $("hudGoodies"), hudPool = $("hudPool");
  var actionBar = $("actionBar"), bannerEl = $("bannerBubble");

  // -------------------------------------------------------------- save
  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      var s = raw ? JSON.parse(raw) : {};
      if (typeof s !== "object" || s === null) s = {};
      if (typeof s.sound !== "boolean") s.sound = true;
      return s;
    } catch (e) { return { sound: true }; }
  }
  function persistSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* private mode */ }
  }

  // --------------------------------------------------------------- net
  function api(path, opts) {
    return fetch(API_BASE + path, opts).then(function (res) {
      return res.json().catch(function () { return { ok: false, message: "The castle didn't answer." }; })
        .then(function (data) { data.__status = res.status; return data; });
    });
  }
  function post(path, body) {
    net.posts++;
    return api(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {})
    });
  }
  function authBody(extra) {
    var b = extra || {};
    b.playerId = net.playerId; b.secret = net.secret;
    return b;
  }

  function createRoom() {
    return post("/party/rooms").then(function (d) {
      if (!d.ok) throw new Error(d.message || "Could not start a party.");
      enterRoom(d.code, d.playerId, d.secret, true);
      return d.code;
    });
  }
  function joinRoom(code) {
    code = String(code || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
    return post("/party/rooms/" + code + "/join").then(function (d) {
      if (!d.ok) throw new Error(d.message || "Could not join.");
      enterRoom(code, d.playerId, d.secret, false);
      handleRoom(d.room);
      return code;
    });
  }
  function enterRoom(code, playerId, secret, isHost) {
    net.code = code; net.playerId = playerId; net.secret = secret; net.isHost = isHost;
    net.lastRk = ""; net.phase = "lobby";
    save.lastRoom = { code: code, playerId: playerId, secret: secret, isHost: isHost, ts: Date.now() };
    persistSave();
    $("btnLeave").hidden = false;
    startHeartbeat();
    schedulePoll(50);
    showLobby();
  }
  function leaveRoom() {
    stopPolling();
    net.code = null; net.playerId = null; net.secret = null; net.isHost = false; net.phase = null;
    sim = null; view.prev = view.cur = null; view.version = 0; view.lastEventSeq = 0;
    delete save.lastRoom; persistSave();
    $("btnLeave").hidden = true;
    if (scene) scene.resetDynamic();
    showLanding();
  }

  function setPrefs(prefs) {
    return post("/party/rooms/" + net.code + "/player", authBody(prefs)).then(function (d) {
      if (d.ok) handleRoom(d.room);
      return d;
    });
  }
  function hostStart() {
    return post("/party/rooms/" + net.code + "/start", authBody()).then(function (d) {
      if (d.ok) handleRoom(d.room);
      return d;
    });
  }
  function hostReset() {
    return post("/party/rooms/" + net.code + "/reset", authBody()).then(function (d) {
      if (d.ok) { sim = null; view.prev = view.cur = null; view.version = 0; view.lastEventSeq = 0; if (scene) scene.resetDynamic(); handleRoom(d.room); }
      return d;
    });
  }
  function sendCommand(cmd) {
    return post("/party/rooms/" + net.code + "/command", authBody({ cmd: cmd }));
  }

  function startHeartbeat() {
    clearInterval(net.heartbeatTimer);
    net.heartbeatTimer = setInterval(function () {
      if (net.code && !document.hidden) setPrefs({});
    }, HEARTBEAT);
  }
  function stopPolling() {
    clearTimeout(net.pollTimer); net.pollTimer = null;
    clearInterval(net.heartbeatTimer); net.heartbeatTimer = null;
  }
  function schedulePoll(ms) {
    clearTimeout(net.pollTimer);
    net.pollTimer = setTimeout(pollOnce, ms);
  }
  function pollCadence() {
    if (net.phase === "playing") return net.isHost ? POLL_HOST : POLL_GUEST;
    return POLL_LOBBY;
  }
  function pollOnce() {
    if (!net.code) return;
    // A hidden guest can rest; a hidden HOST must keep relaying the party
    // (browser timer throttling slows this to ~1 Hz, which is fine).
    if (document.hidden && !(net.isHost && net.phase === "playing")) { schedulePoll(pollCadence()); return; }
    var wantCommands = net.isHost && net.phase === "playing";
    var url = "/party/rooms/" + net.code + (wantCommands ? "?after=" + encodeURIComponent(net.lastRk) : "");
    net.gets++;
    api(url).then(function (d) {
      if (d.__status === 404) { leaveRoom(); return; }
      if (!d.ok) { net.errors++; return; }
      handleRoom(d);
      if (wantCommands && sim) {
        (d.commands || []).forEach(function (c) {
          if (c.rk > net.lastRk) net.lastRk = c.rk;
          applyCommand(c.playerId, c.cmd || {});
        });
        pushSnapshot();
      }
    }).catch(function () { net.errors++; })
      .then(function () { schedulePoll(pollCadence()); });
  }

  function pushSnapshot() {
    if (!sim || !net.isHost) return;
    sim.consumedRk = net.lastRk || "";   // lets a reloading host skip already-applied commands
    var body = authBody({ snapshot: sim, consumed: net.lastRk || null });
    if (sim.phase === "done") { body.phase = "done"; body.result = sim.result; }
    return post("/party/rooms/" + net.code + "/snapshot", body);
  }

  // ------------------------------------------------- room state routing
  function handleRoom(room) {
    if (!room || !room.players) return;
    var prevPhase = net.phase;
    net.phase = room.phase;
    net.players = room.players;
    var me = myPlayer();
    if (me) { ui.mySide = me.side; ui.myChar = me.character; }

    if (room.phase === "lobby") {
      if (prevPhase === "done" || prevPhase === "playing") {
        sim = null; view.prev = view.cur = null; view.version = 0; view.lastEventSeq = 0;
        if (scene) scene.resetDynamic();
        actionBar.hidden = true;
      }
      // Re-render only when the lobby actually changed — a steady re-render
      // every poll would eat taps mid-click.
      var sig = JSON.stringify([room.players, room.phase]);
      if (ui.lobbySig !== sig || ui.screen !== "lobby") { ui.lobbySig = sig; showLobby(); }
    } else if (room.phase === "playing") {
      if (prevPhase !== "playing") net.lastSnapshotSeen = Date.now();
      if (net.isHost) {
        if (!sim) {
          // Fresh start, or the host reloaded mid-match: resume from the last snapshot.
          sim = room.snapshot ? room.snapshot : buildSim();
          net.lastRk = (sim && sim.consumedRk) || "";
          startHostLoop();
        }
      } else ingestGuestSnapshot(room);
      if (ui.screen !== "game" && !(sim && sim.phase === "done")) showGame();
      maybeWarnHostAsleep();
    } else if (room.phase === "done") {
      if (!net.isHost) ingestGuestSnapshot(room); // final board state behind the banner
      var result = room.result || (sim && sim.result) || null;
      if (ui.screen !== "gameover") showGameOver(result);
    }
  }

  function ingestGuestSnapshot(room) {
    if (!room.snapshot || room.snapshotVersion <= view.version) return;
    view.prev = view.cur; view.cur = room.snapshot;
    view.interval = Math.max(300, Date.now() - view.at); view.at = Date.now();
    view.version = room.snapshotVersion;
    net.lastSnapshotSeen = Date.now();
    playNewEvents(room.snapshot);
  }

  function myPlayer() {
    for (var i = 0; i < net.players.length; i++) if (net.players[i].id === net.playerId) return net.players[i];
    return null;
  }
  function sidePlayers(side) { return net.players.filter(function (p) { return p.side === side; }); }
  function maybeWarnHostAsleep() {
    if (net.isHost || net.phase !== "playing") return;
    var quiet = Date.now() - (net.lastSnapshotSeen || Date.now());
    if (quiet > 10000 && ui.screen === "game") showHostAsleep();
    if (quiet < 10000 && ui.screen === "hostasleep") showGame();
  }

  // ------------------------------------------------------ simulation (host)
  function buildSim() {
    var goodies = GOODIE_SLOTS.map(function (slot, i) {
      return { id: "g" + i, kind: slot.kind, state: "table", slot: i };
    });
    var champs = {};
    var patrolPlayers = sidePlayers("patrol");
    patrolPlayers.forEach(function (p, i) {
      var sp = HERO_SPAWNS[i % HERO_SPAWNS.length];
      champs[p.id] = { char: p.character || "moon", x: sp[0], y: sp[1], tx: sp[0], ty: sp[1], cd: 0 };
    });
    var aiPatrol = patrolPlayers.length === 0;
    if (aiPatrol) {
      champs.ai_moon = { char: "moon", x: AI_POSTS[0][0], y: AI_POSTS[0][1], tx: AI_POSTS[0][0], ty: AI_POSTS[0][1], cd: 0, ai: true };
      champs.ai_babylady = { char: "babylady", x: AI_POSTS[1][0], y: AI_POSTS[1][1], tx: AI_POSTS[1][0], ty: AI_POSTS[1][1], cd: 0, ai: true };
    }
    var stats = {};
    net.players.forEach(function (p) { stats[p.id] = { boops: 0, steals: 0, sends: 0, places: 0, char: p.character, side: p.side }; });
    stats.castle = { boops: 0, steals: 0, sends: 0, places: 0, char: null, side: null };
    return {
      v: VERSION, t: 0, dur: MATCH_SECONDS, phase: "playing",
      pools: { patrol: SIDES.patrol.start, snackers: SIDES.snackers.start },
      nextId: 1, eventSeq: 0, events: [],
      goodies: goodies, towers: [], minions: [], champs: champs,
      march: {}, cheerUntil: 0,
      aiSnackers: sidePlayers("snackers").length === 0,
      aiPatrol: aiPatrol,
      ai: { nextWave: 12, waveN: 0, marches: [110, 230], buildN: 0 },
      stats: stats, result: null
    };
  }

  // The host loop runs on a wall-clock interval, NOT requestAnimationFrame:
  // rAF fully suspends in hidden/occluded tabs, which would freeze the whole
  // party for every guest the moment the host glances at another app. Timers
  // are throttled (~1 Hz) in background tabs but keep ticking, and the
  // wall-clock catch-up (capped at 2 s per tick) keeps the countdown honest.
  var hostTimer = null, lastSimWall = 0, acc = 0;
  function startHostLoop() {
    if (hostTimer) return;
    lastSimWall = performance.now();
    acc = 0;
    hostTimer = setInterval(hostTick, 100);
  }
  function hostTick() {
    if (!sim || !net.isHost) { clearInterval(hostTimer); hostTimer = null; return; }
    var now = performance.now();
    var dt = Math.min(2.0, (now - lastSimWall) / 1000) * timeScale;
    lastSimWall = now;
    if (sim.phase !== "playing") return;
    acc += dt;
    var guard = 0;
    while (acc >= STEP && guard++ < 400) { stepSim(STEP); acc -= STEP; }
  }

  function emit(type, x, y, data) {
    sim.eventSeq++;
    sim.events.push({ seq: sim.eventSeq, type: type, x: x || 0, y: y || 0, data: data || null });
    if (sim.events.length > 30) sim.events.splice(0, sim.events.length - 30);
  }
  function addStat(pid, key, n) {
    var s = sim.stats[pid] || sim.stats.castle;
    if (s) s[key] += (n || 1);
  }

  function stepSim(dt) {
    sim.t += dt;
    sim.pools.patrol = Math.min(999, sim.pools.patrol + SIDES.patrol.accrue * dt);
    sim.pools.snackers = Math.min(999, sim.pools.snackers + SIDES.snackers.accrue * dt);

    if (sim.aiSnackers) aiSnackersAct();
    if (sim.aiPatrol) aiPatrolAct();

    stepTowers(dt);
    stepChamps(dt);
    stepMinions(dt);

    var stolen = countStolen();
    if (sim.t >= sim.dur || stolen >= GOODIE_COUNT) endMatch(stolen);
  }

  function countStolen() {
    return sim.goodies.filter(function (g) { return g.state === "stolen"; }).length;
  }

  function endMatch(stolen) {
    if (sim.phase === "done") return;
    sim.phase = "done";
    var winner = stolen >= STEAL_TO_WIN ? "snackers" : "patrol";
    sim.result = { winner: winner, stolen: stolen, saved: GOODIE_COUNT - stolen, stats: sim.stats };
    emit("end", 9, 5, { winner: winner });
    pushSnapshot();
    showGameOver(sim.result);
  }

  // Towers
  function stepTowers(dt) {
    sim.towers.forEach(function (tw) {
      var def = TOWERS[tw.type];
      if (!def.every) return; // lantern is a passive aura
      var interval = def.every * (humSlowed(tw.x, tw.y) ? 1.3 : 1);
      tw.cd -= dt;
      if (tw.cd > 0) return;
      if (tw.type === "cannon") {
        var m = nearestMinion(tw.x, tw.y, def.range);
        if (m) { tw.cd = interval; damageMinion(m, 1, tw.owner); emit("zap", m.x, m.y, { fx: tw.x, fy: tw.y }); }
      } else if (tw.type === "fountain") {
        var s = strongestMinion(tw.x, tw.y, def.range);
        if (s) { tw.cd = interval; s.heldUntil = sim.t + def.hold; emit("bubble", s.x, s.y); }
      }
    });
  }
  function humSlowed(x, y) {
    return sim.minions.some(function (m) {
      return m.type === "humnote" && dist(m.x, m.y, x, y) <= MINIONS.humnote.aura;
    });
  }
  function nearestMinion(x, y, range) {
    var best = null, bd = range;
    sim.minions.forEach(function (m) {
      var d = dist(m.x, m.y, x, y);
      if (d <= bd) { bd = d; best = m; }
    });
    return best;
  }
  function strongestMinion(x, y, range) {
    var best = null;
    sim.minions.forEach(function (m) {
      var d = dist(m.x, m.y, x, y);
      if (d <= range && (!best || m.hp > best.hp) && m.heldUntil < sim.t) best = m;
    });
    return best;
  }

  // Hero champions
  function stepChamps(dt) {
    Object.keys(sim.champs).forEach(function (pid) {
      var c = sim.champs[pid];
      if (c.ai) aiChampThink(c);
      var d = dist(c.x, c.y, c.tx, c.ty);
      if (d > 0.05) {
        var step = Math.min(d, 3.5 * dt);
        c.x += (c.tx - c.x) / d * step;
        c.y += (c.ty - c.y) / d * step;
      }
      c.cd -= dt;
      if (c.cd <= 0) {
        var m = nearestMinion(c.x, c.y, 1.2);
        if (m) { c.cd = 0.9; damageMinion(m, 1, pid); emit("boop", m.x, m.y); }
      }
    });
  }
  function aiChampThink(c) {
    var m = nearestMinion(c.x, c.y, 3.0);
    if (m) { c.tx = m.x; c.ty = m.y; }
    else {
      var post = c.char === "moon" ? AI_POSTS[0] : AI_POSTS[1];
      c.tx = post[0]; c.ty = post[1];
    }
  }

  // Minions
  function minionSpeed(m) {
    var def = m.champ ? { speed: CHAMP_SPEED } : MINIONS[m.type];
    var v = def.speed;
    if (m.carry && m.carry.length) v *= 0.8;
    if (sim.cheerUntil > sim.t) v *= 1.5;
    // Twinkle Lanterns slow everything nearby.
    var slowed = sim.towers.some(function (tw) {
      return tw.type === "lantern" && dist(tw.x, tw.y, m.x, m.y) <= TOWERS.lantern.range;
    });
    if (slowed) v *= 0.55;
    return v;
  }
  function stepMinions(dt) {
    for (var i = sim.minions.length - 1; i >= 0; i--) {
      var m = sim.minions[i];
      if (m.heldUntil > sim.t) continue;
      var route = ROUTES[m.gate];
      var pts = m.dir === "in" ? route : route.slice().reverse();
      var target = pts[m.wpt];
      if (!target) continue;
      var tx = target[0], ty = target[1];
      var d = dist(m.x, m.y, tx, ty);
      var step = minionSpeed(m) * dt;
      if (d <= step + 0.02) {
        m.x = tx; m.y = ty; m.wpt++;
        if (m.wpt >= pts.length) {
          if (m.dir === "in") {
            grabGoodies(m);
            m.dir = "out"; m.wpt = 1; // pts[0] of reversed route is where we stand
          } else {
            escapeMinion(m, i);
          }
        }
      } else {
        m.x += (tx - m.x) / d * step;
        m.y += (ty - m.y) / d * step;
      }
    }
  }
  function grabGoodies(m) {
    var want = m.champ ? CHAMP_CARRY : 1;
    m.carry = m.carry || [];
    // Champions go for the cake first; little snackers can't lift it.
    var pickable = sim.goodies.filter(function (g) {
      if (g.state !== "table") return false;
      if (g.kind === "cake" && !m.champ) return false;
      return true;
    });
    pickable.sort(function (a, b) {
      var ak = a.kind === "cake" ? 0 : 1, bk = b.kind === "cake" ? 0 : 1;
      return m.champ ? ak - bk : bk - ak;
    });
    for (var i = 0; i < pickable.length && m.carry.length < want; i++) {
      pickable[i].state = "carried"; pickable[i].by = m.id;
      m.carry.push(pickable[i].id);
    }
    if (m.carry.length) emit("grab", m.x, m.y, { n: m.carry.length });
  }
  function escapeMinion(m, idx) {
    var n = (m.carry || []).length;
    if (n > 0) {
      m.carry.forEach(function (gid) {
        var g = goodieById(gid);
        if (g) { g.state = "stolen"; g.by = null; }
      });
      sim.pools.snackers += 6 * n;
      addStat(m.owner, "steals", n);
      emit("steal", m.x, m.y, { n: n });
    }
    sim.minions.splice(idx, 1);
  }
  function goodieById(id) {
    for (var i = 0; i < sim.goodies.length; i++) if (sim.goodies[i].id === id) return sim.goodies[i];
    return null;
  }
  function damageMinion(m, dmg, byPid) {
    m.hp -= dmg;
    if (m.hp > 0) return;
    // Booped! Puff of stars, goodies float home, snacker scampers off. Nobody hurt.
    (m.carry || []).forEach(function (gid) {
      var g = goodieById(gid);
      if (g) { g.state = "table"; g.by = null; }
    });
    sim.pools.patrol += 4;
    addStat(byPid, "boops", 1);
    emit("pop", m.x, m.y, { champ: !!m.champ, carried: (m.carry || []).length });
    var i = sim.minions.indexOf(m);
    if (i >= 0) sim.minions.splice(i, 1);
  }
  function spawnMinion(type, gate, owner, champChar) {
    var start = ROUTES[gate][0];
    var m = {
      id: "m" + (sim.nextId++), type: type, gate: gate, owner: owner || "castle",
      x: start[0], y: start[1], dir: "in", wpt: 1,
      hp: champChar ? CHAMP_HP : MINIONS[type].hp,
      maxHp: champChar ? CHAMP_HP : MINIONS[type].hp,
      heldUntil: 0, carry: [], champ: champChar || null
    };
    sim.minions.push(m);
    emit("spawn", m.x, m.y, { type: type, champ: champChar || null });
    return m;
  }

  // ----------------------------------------------------------- commands
  function applyCommand(pid, cmd) {
    if (!sim || sim.phase !== "playing" || !cmd || !cmd.type) return;
    var player = null;
    for (var i = 0; i < net.players.length; i++) if (net.players[i].id === pid) player = net.players[i];
    var side = player ? player.side : null;

    switch (cmd.type) {
      case "place": {
        if (side !== "patrol") return;
        var def = TOWERS[cmd.tower];
        if (!def) return;
        var pad = PADS.find(function (p) { return p[0] === cmd.pad[0] && p[1] === cmd.pad[1]; });
        if (!pad) return;
        var taken = sim.towers.some(function (t) { return t.px === pad[0] && t.py === pad[1]; });
        if (taken || sim.pools.patrol < def.cost) return;
        sim.pools.patrol -= def.cost;
        sim.towers.push({ id: "t" + (sim.nextId++), type: cmd.tower, x: pad[0], y: pad[1], px: pad[0], py: pad[1], cd: 0, owner: pid });
        addStat(pid, "places", 1);
        emit("place", pad[0], pad[1], { type: cmd.tower });
        break;
      }
      case "move": {
        if (side !== "patrol") return;
        var c = sim.champs[pid];
        if (!c) return;
        c.tx = clamp(cmd.x, 0.4, 14.6); // champions stay off the table
        c.ty = clamp(cmd.y, 0.4, GRID_H - 0.4);
        break;
      }
      case "send": {
        if (side !== "snackers") return;
        var mdef = MINIONS[cmd.minion];
        if (!mdef || sim.pools.snackers < mdef.cost) return;
        sim.pools.snackers -= mdef.cost;
        addStat(pid, "sends", 1);
        spawnMinion(cmd.minion, cmd.gate === 1 ? 1 : 0, pid, null);
        break;
      }
      case "march": {
        if (side !== "snackers") return;
        var readyAt = sim.march[pid] || 0;
        if (sim.t < readyAt) return;
        sim.march[pid] = sim.t + MARCH_COOLDOWN;
        addStat(pid, "sends", 1);
        spawnMinion("stormpuff", cmd.gate === 1 ? 1 : 0, pid, player.character || "shock");
        emit("march", ROUTES[cmd.gate === 1 ? 1 : 0][0][0], ROUTES[cmd.gate === 1 ? 1 : 0][0][1], { char: player.character });
        break;
      }
      case "cheer": {
        if (side !== "snackers") return;
        if (sim.pools.snackers < CHEER_COST || sim.cheerUntil > sim.t) return;
        sim.pools.snackers -= CHEER_COST;
        sim.cheerUntil = sim.t + CHEER_SECONDS;
        emit("cheer", 9, 5);
        break;
      }
    }
  }

  function act(cmd) {
    if (net.isHost) applyCommand(net.playerId, cmd);
    else sendCommand(cmd);
  }

  // ----------------------------------------------------------------- AI
  function aiSnackersAct() {
    var ai = sim.ai;
    if (sim.t >= ai.nextWave) {
      ai.waveN++;
      ai.nextWave = sim.t + 22;
      var comp = aiWaveComposition(ai.waveN);
      // Spread the wave: stagger each minion a little off-screen so they file in.
      comp.forEach(function (type, i) {
        var m = spawnMinion(type, (ai.waveN + i) % 2, "castle", null);
        m.x -= i * 0.55; // stagger off-screen so they file in
      });
      addStat("castle", "sends", comp.length);
      emit("wave", 0, 5, { n: ai.waveN });
    }
    if (ai.marches.length && sim.t >= ai.marches[0]) {
      ai.marches.shift();
      spawnMinion("stormpuff", 0, "castle", "shock");
      emit("march", 0, 2, { char: "shock" });
    }
  }
  function aiWaveComposition(n) {
    if (n === 1) return ["stormpuff"];
    if (n === 2) return ["stormpuff", "stormpuff"];
    if (n === 3) return ["stormpuff", "humnote"];
    if (n === 4) return ["inkblot", "stormpuff"];
    if (n === 5) return ["humnote", "stormpuff", "stormpuff"];
    var big = ["inkblot", "humnote", "stormpuff"];
    if (n >= 8) big.push("stormpuff");
    return big;
  }
  var AI_BUILDS = [
    { at: 5,   type: "cannon",   pad: [10, 4] },
    { at: 25,  type: "lantern",  pad: [12, 4] },
    { at: 55,  type: "cannon",   pad: [10, 6] },
    { at: 90,  type: "fountain", pad: [12, 6] },
    { at: 130, type: "cannon",   pad: [7, 3] },
    { at: 170, type: "lantern",  pad: [8, 7] },
    { at: 220, type: "cannon",   pad: [5, 7] }
  ];
  function aiPatrolAct() {
    var b = AI_BUILDS[sim.ai.buildN];
    if (!b || sim.t < b.at) return;
    var def = TOWERS[b.type];
    if (sim.pools.patrol < def.cost) return;
    sim.pools.patrol -= def.cost;
    sim.towers.push({ id: "t" + (sim.nextId++), type: b.type, x: b.pad[0], y: b.pad[1], px: b.pad[0], py: b.pad[1], cd: 0, owner: "castle" });
    addStat("castle", "places", 1);
    emit("place", b.pad[0], b.pad[1], { type: b.type });
    sim.ai.buildN++;
  }

  // ------------------------------------------------------------ helpers
  function dist(x1, y1, x2, y2) { var dx = x1 - x2, dy = y1 - y2; return Math.sqrt(dx * dx + dy * dy); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function fmtClock(secs) {
    secs = Math.max(0, Math.ceil(secs));
    return Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0");
  }
  function currentState() {
    if (net.isHost) return sim;
    return view.cur;
  }

  // ------------------------------------------------------------- audio
  var audioCtx = null, audioReady = false;
  function ensureAudio() {
    if (!audioReady) {
      try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioReady = true; } catch (e) { }
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(function () { });
  }
  function tone(freq, dur, type, vol, when) {
    if (!save.sound || !audioCtx) return;
    try {
      var t0 = audioCtx.currentTime + (when || 0);
      var osc = audioCtx.createOscillator(), g = audioCtx.createGain();
      osc.type = type || "sine"; osc.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.12, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(g); g.connect(audioCtx.destination);
      osc.start(t0); osc.stop(t0 + dur + 0.05);
    } catch (e) { }
  }
  var SFX = {
    boop: function () { tone(520, 0.12, "triangle", 0.14); tone(760, 0.14, "triangle", 0.1, 0.05); },
    pop: function () { tone(660, 0.1, "triangle", 0.14); tone(990, 0.16, "sine", 0.12, 0.06); },
    place: function () { tone(392, 0.12, "sine", 0.12); tone(523, 0.18, "sine", 0.1, 0.08); },
    steal: function () { tone(330, 0.16, "sawtooth", 0.06); tone(262, 0.22, "sawtooth", 0.06, 0.1); },
    grab: function () { tone(440, 0.1, "square", 0.05); },
    send: function () { tone(294, 0.1, "triangle", 0.1); tone(370, 0.12, "triangle", 0.09, 0.06); },
    cheer: function () { tone(494, 0.1, "square", 0.06); tone(587, 0.1, "square", 0.06, 0.07); tone(740, 0.14, "square", 0.06, 0.14); },
    tick: function () { tone(880, 0.05, "sine", 0.07); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.25, "triangle", 0.12, i * 0.13); }); },
    ui: function () { tone(587, 0.07, "sine", 0.08); }
  };

  // ---------------------------------------------------------- overlays
  function showOverlay(html) {
    overlayEl.hidden = false;
    cardEl.innerHTML = html;
  }
  function hideOverlay() { overlayEl.hidden = true; }

  function showLanding() {
    ui.screen = "landing";
    var resume = "";
    if (save.lastRoom && Date.now() - save.lastRoom.ts < 2 * 3600 * 1000) {
      resume = '<button class="big-btn mint" id="btnResume">🎈 Back to party <b>' + save.lastRoom.code + "</b></button>";
    }
    showOverlay(
      '<h2>🎂 The Birthday Party Patrol</h2>' +
      "<p>It's the twins' birthday at Castle Everstair — and the sneaky ones want the presents <i>and</i> the cake! Up to <b>4 friends</b> can play: guard the goodies, or sneak them away.</p>" +
      resume +
      '<button class="big-btn" id="btnCreate">🏰 Start a party</button>' +
      '<button class="big-btn secondary" id="btnJoin">🔑 Join with a code</button>' +
      '<p class="soft">One friend starts the party and reads the room code out loud — everyone else joins with it. Playing alone works too: the castle plays the other side!</p>' +
      '<div class="form-status" id="landStatus"></div>'
    );
    var btnResume = $("btnResume");
    if (btnResume) btnResume.addEventListener("click", function () {
      ensureAudio(); SFX.ui();
      var lr = save.lastRoom;
      net.code = lr.code; net.playerId = lr.playerId; net.secret = lr.secret; net.isHost = !!lr.isHost;
      api("/party/rooms/" + lr.code).then(function (d) {
        if (d.ok && d.players && d.players.some(function (p) { return p.id === lr.playerId; })) {
          net.phase = d.phase;
          $("btnLeave").hidden = false;
          startHeartbeat(); schedulePoll(50);
          handleRoom(d);
        } else {
          delete save.lastRoom; persistSave(); showLanding();
        }
      }).catch(function () { $("landStatus").textContent = "The castle didn't answer — try again?"; });
    });
    $("btnCreate").addEventListener("click", function () {
      ensureAudio(); SFX.ui();
      $("landStatus").textContent = "Opening the castle doors…";
      createRoom().catch(function (e) { $("landStatus").textContent = e.message; });
    });
    $("btnJoin").addEventListener("click", function () { ensureAudio(); SFX.ui(); showJoin(); });
  }

  function showJoin() {
    ui.screen = "join";
    showOverlay(
      "<h2>🔑 Join a party</h2>" +
      "<p>Ask the party host for the <b>4 letters</b> on their screen!</p>" +
      '<input class="code-input" id="codeInput" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD">' +
      '<button class="big-btn" id="btnGo">🎈 Join the party</button>' +
      '<button class="big-btn secondary" id="btnBack">‹ Back</button>' +
      '<div class="form-status" id="joinStatus"></div>'
    );
    var input = $("codeInput");
    input.focus();
    input.addEventListener("input", function () {
      input.value = input.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
    });
    function go() {
      if (input.value.length !== 4) { $("joinStatus").textContent = "The code has 4 letters."; return; }
      $("joinStatus").textContent = "Knocking on the castle door…";
      joinRoom(input.value).catch(function (e) { $("joinStatus").textContent = e.message; });
    }
    $("btnGo").addEventListener("click", function () { ensureAudio(); SFX.ui(); go(); });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
    $("btnBack").addEventListener("click", showLanding);
  }

  function charTileHtml(charId, disabled, selected) {
    var c = CHARACTERS[charId];
    var img = '<img src="' + c.img + '" alt="" onerror="this.outerHTML=\'<span class=char-emoji>' + c.emoji + "</span>'\">";
    return '<button type="button" class="char-tile' + (selected ? " selected" : "") + '" data-char="' + charId + '"' +
      (disabled ? " disabled" : "") + ">" + img + "<span>" + c.name + "</span></button>";
  }

  function showLobby() {
    if (net.phase !== "lobby") return;
    ui.screen = "lobby";
    var me = myPlayer() || {};
    var mySide = me.side, myChar = me.character, isReady = !!me.ready;
    var takenChars = {};
    net.players.forEach(function (p) { if (p.character && p.id !== net.playerId) takenChars[p.character] = true; });

    var codeHtml = '<div class="room-code">' + net.code.split("").map(function (ch) { return "<span>" + ch + "</span>"; }).join("") + "</div>";

    var crewHtml = '<div class="crew-list">' + net.players.map(function (p) {
      var c = p.character ? CHARACTERS[p.character] : null;
      var face = c ? '<img src="' + c.img + '" alt="" onerror="this.outerHTML=\'' + c.emoji + "'\">" : "🙂";
      var sideCls = p.side || "none";
      var sideName = p.side ? SIDES[p.side].name : "picking…";
      var snoozing = Date.now() - p.lastSeen > 15000;
      return '<div class="crew-row' + (snoozing ? " snoozing" : "") + '">' +
        '<span class="crew-face">' + face + "</span>" +
        '<span class="crew-name">' + (c ? c.name : "A friend") + (p.id === net.playerId ? " (you)" : "") + (p.isHost ? " 👑" : "") + "</span>" +
        '<span class="crew-side ' + sideCls + '">' + sideName + "</span>" +
        '<span class="crew-ready">' + (p.ready ? "✅" : "⏳") + "</span></div>";
    }).join("") + "</div>";

    var sideHtml =
      '<div class="side-toggle">' +
      '<button type="button" id="sidePatrol" class="' + (mySide === "patrol" ? "sel-patrol" : "") + '">🛡️ Party Patrol<br><span class="soft">guard the goodies</span></button>' +
      '<button type="button" id="sideSnackers" class="' + (mySide === "snackers" ? "sel-snackers" : "") + '">😈 Sneaky Snackers<br><span class="soft">snatch the goodies</span></button>' +
      "</div>";

    var charHtml = "";
    if (mySide) {
      var chars = Object.keys(CHARACTERS).filter(function (k) { return CHARACTERS[k].side === mySide; });
      charHtml = '<div class="char-grid">' + chars.map(function (k) {
        return charTileHtml(k, !!takenChars[k], myChar === k);
      }).join("") + "</div>";
    }

    var patrolCount = sidePlayers("patrol").length, snackerCount = sidePlayers("snackers").length;
    var castleNote = "";
    if (patrolCount === 0) castleNote = '<div class="castle-chip">🏰 The castle will play the Party Patrol</div>';
    else if (snackerCount === 0) castleNote = '<div class="castle-chip">🏰 The castle will play the Sneaky Snackers</div>';

    var allReady = net.players.length > 0 && net.players.every(function (p) { return p.ready; });
    var readyBtn = '<button class="big-btn mint" id="btnReady"' + (mySide && myChar ? "" : " disabled") + ">" +
      (isReady ? "🙌 Ready! (tap to unready)" : "✋ I'm ready!") + "</button>";
    var startBtn = net.isHost
      ? '<button class="big-btn" id="btnStart"' + (allReady ? "" : " disabled") + ">🎉 Start the party!</button>"
      : '<p class="soft">Waiting for the party host to start…</p>';

    showOverlay(
      "<h2>🎈 Party lobby</h2>" +
      '<p class="soft">Friends join with this code:</p>' + codeHtml +
      crewHtml + castleNote + sideHtml + charHtml + readyBtn + startBtn +
      '<div class="form-status" id="lobbyStatus"></div>'
    );

    $("sidePatrol").addEventListener("click", function () { ensureAudio(); SFX.ui(); setPrefs({ side: "patrol" }); });
    $("sideSnackers").addEventListener("click", function () { ensureAudio(); SFX.ui(); setPrefs({ side: "snackers" }); });
    Array.prototype.forEach.call(cardEl.querySelectorAll(".char-tile"), function (btn) {
      btn.addEventListener("click", function () {
        ensureAudio(); SFX.ui();
        setPrefs({ character: btn.getAttribute("data-char") }).then(function (d) {
          if (!d.ok) $("lobbyStatus").textContent = d.message || "";
        });
      });
    });
    var btnReady = $("btnReady");
    if (btnReady) btnReady.addEventListener("click", function () {
      ensureAudio(); SFX.ui(); setPrefs({ ready: !isReady });
    });
    var btnStart = $("btnStart");
    if (btnStart) btnStart.addEventListener("click", function () {
      ensureAudio(); SFX.ui();
      btnStart.disabled = true;
      hostStart().then(function (d) { if (!d.ok) { btnStart.disabled = false; $("lobbyStatus").textContent = d.message || ""; } });
    });
  }

  function showGame() {
    ui.screen = "game";
    hideOverlay();
    buildActionBar();
    actionBar.hidden = false;
  }

  function showHostAsleep() {
    ui.screen = "hostasleep";
    showOverlay(
      "<h2>😴 The party host fell asleep…</h2>" +
      "<p>We can't hear the game right now. If they come back, the party keeps going!</p>" +
      '<button class="big-btn secondary" id="btnLeaveNow">🚪 Leave the party</button>'
    );
    $("btnLeaveNow").addEventListener("click", leaveRoom);
  }

  function showGameOver(result) {
    ui.screen = "gameover";
    actionBar.hidden = true;
    var winner = result ? result.winner : "patrol";
    var saved = result ? result.saved : 0, stolen = result ? result.stolen : 0;
    var mySide = ui.mySide;
    var won = mySide ? winner === mySide : winner === "patrol";
    SFX.win();

    var headline = winner === "patrol"
      ? "🛡️ The Party Patrol saved the party!"
      : "😈 The Sneaky Snackers feasted tonight!";
    var sub = winner === "patrol"
      ? "The guests arrived and <b>" + saved + " goodies</b> were still on the table. Hooray!"
      : "<b>" + stolen + " goodies</b> got snuck away to the tower for a midnight feast!";

    var statsHtml = "";
    if (result && result.stats) {
      statsHtml = '<div class="stat-rows">' + Object.keys(result.stats).map(function (pid) {
        var s = result.stats[pid];
        if (!s) return "";
        var name = pid === "castle" ? "🏰 The castle" : (s.char && CHARACTERS[s.char] ? CHARACTERS[s.char].emoji + " " + CHARACTERS[s.char].name : "A friend");
        if (pid === "castle" && !s.boops && !s.sends && !s.places && !s.steals) return "";
        var bits = [];
        if (s.side === "patrol" || pid === "castle") { if (s.boops) bits.push(s.boops + " boops"); if (s.places) bits.push(s.places + " builds"); }
        if (s.side === "snackers" || pid === "castle") { if (s.steals) bits.push(s.steals + " goodies snuck"); if (s.sends) bits.push(s.sends + " sends"); }
        if (!bits.length) bits.push("cheered very loudly");
        return '<div class="stat-row"><span>' + name + "</span><span>" + bits.join(" · ") + "</span></div>";
      }).join("") + "</div>";
    }

    var leeble = winner === "snackers" && result && result.stats && Object.keys(result.stats).some(function (pid) {
      return result.stats[pid] && result.stats[pid].char === "leeblebeest" && result.stats[pid].steals > 0;
    }) ? '<p class="soft">"Somebody had to count the cupcakes." — Leeblebeest</p>' : "";

    showOverlay(
      "<h2>" + headline + "</h2>" +
      '<p class="result-banner">' + sub + "</p>" + statsHtml + leeble +
      "<p>…and then <b>everyone had cake anyway</b>. Even the sneaky ones. <i>Especially</i> the sneaky ones. 🎂</p>" +
      (net.isHost
        ? '<button class="big-btn" id="btnAgain">🔁 Play again (same friends)</button>'
        : '<p class="soft">The host can start another round…</p>') +
      '<button class="big-btn secondary" id="btnLeaveNow">🚪 Leave the party</button>'
    );
    var btnAgain = $("btnAgain");
    if (btnAgain) btnAgain.addEventListener("click", function () { ensureAudio(); SFX.ui(); hostReset(); });
    $("btnLeaveNow").addEventListener("click", leaveRoom);
  }

  // ------------------------------------------------------- action bar
  function buildActionBar() {
    var side = ui.mySide;
    actionBar.innerHTML = "";
    if (!side) { actionBar.innerHTML = '<div class="action-hint">You\'re watching the party! 🎉</div>'; return; }
    var frag = document.createDocumentFragment();

    function btn(id, icon, label, cost) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "action-btn2"; b.id = id;
      b.innerHTML = '<span class="ab-icon">' + icon + '</span><span>' + label + '</span>' +
        (cost != null ? '<span class="ab-cost">' + cost + " " + SIDES[side].poolEmoji + "</span>" : '<span class="ab-cost">free</span>');
      frag.appendChild(b);
      return b;
    }

    if (side === "patrol") {
      Object.keys(TOWERS).forEach(function (k) {
        var t = TOWERS[k];
        var b = btn("tw_" + k, t.emoji, t.name.split(" ")[1] || t.name, t.cost);
        b.addEventListener("click", function () {
          ensureAudio(); SFX.ui();
          ui.armedTower = ui.armedTower === k ? null : k;
          updateActionBar();
          setHint(ui.armedTower ? "Now tap a stone circle to build it!" : "Tap the garden to walk there. Boop the sneakers!");
        });
      });
      var hint = document.createElement("div");
      hint.className = "action-hint"; hint.id = "actionHint";
      hint.textContent = "Tap a helper to build it, or tap the garden to walk there!";
      frag.appendChild(hint);
    } else {
      Object.keys(MINIONS).forEach(function (k) {
        var m = MINIONS[k];
        var b = btn("mn_" + k, m.emoji, m.name.split(" ")[0], m.cost);
        b.addEventListener("click", function () {
          ensureAudio(); SFX.send();
          act({ type: "send", minion: k, gate: ui.gate });
          ui.gate = 1 - ui.gate;
        });
      });
      var march = btn("btnMarch", CHARACTERS[ui.myChar] ? CHARACTERS[ui.myChar].emoji : "😈", "March!", null);
      march.addEventListener("click", function () {
        ensureAudio(); SFX.send();
        act({ type: "march", gate: ui.gate });
      });
      var cheer = btn("btnCheer", "📣", "Hurry!", CHEER_COST);
      cheer.addEventListener("click", function () {
        ensureAudio(); SFX.cheer();
        act({ type: "cheer" });
      });
      var hint2 = document.createElement("div");
      hint2.className = "action-hint"; hint2.id = "actionHint";
      hint2.textContent = "Tap a snacker to send it sneaking! Tap a gate to pick the door.";
      frag.appendChild(hint2);
    }
    actionBar.appendChild(frag);
  }
  function setHint(text) {
    var h = $("actionHint");
    if (h) h.textContent = text;
  }
  function updateActionBar() {
    var st = currentState();
    if (!st || !ui.mySide) return;
    if (ui.mySide === "patrol") {
      Object.keys(TOWERS).forEach(function (k) {
        var b = $("tw_" + k);
        if (!b) return;
        b.disabled = st.pools.patrol < TOWERS[k].cost;
        b.classList.toggle("armed", ui.armedTower === k);
      });
    } else {
      Object.keys(MINIONS).forEach(function (k) {
        var b = $("mn_" + k);
        if (b) b.disabled = st.pools.snackers < MINIONS[k].cost;
      });
      var march = $("btnMarch");
      if (march) {
        var readyAt = (st.march && st.march[net.playerId]) || 0;
        var left = Math.ceil(readyAt - st.t);
        var old = march.querySelector(".ab-cd");
        if (left > 0) {
          if (!old) { var cd = document.createElement("span"); cd.className = "ab-cd"; march.appendChild(cd); }
          march.querySelector(".ab-cd").textContent = left + "s";
          march.disabled = true;
        } else {
          if (old) old.remove();
          march.disabled = false;
        }
      }
      var cheer = $("btnCheer");
      if (cheer) cheer.disabled = st.pools.snackers < CHEER_COST || (st.cheerUntil > st.t);
    }
  }

  // ------------------------------------------------------------- banner
  function showBanner(text, ms) {
    clearTimeout(ui.bannerTimer);
    bannerEl.textContent = text;
    bannerEl.hidden = false;
    ui.bannerTimer = setTimeout(function () { bannerEl.hidden = true; }, ms || 2200);
  }

  // -------------------------------------------------------- HUD ticker
  var lastTickSecond = -1;
  setInterval(function () {
    var st = currentState();
    if (!st || net.phase !== "playing" && net.phase !== "done") return;
    var left = st.dur - st.t;
    hudClock.textContent = fmtClock(left);
    hudClock.parentElement.classList.toggle("urgent", left < 30 && st.phase === "playing");
    var onTable = st.goodies.filter(function (g) { return g.state !== "stolen"; }).length;
    hudGoodies.textContent = String(onTable);
    var side = ui.mySide || "patrol";
    hudPool.parentElement.firstChild.textContent = SIDES[side].poolEmoji + " ";
    hudPool.textContent = String(Math.floor(st.pools[side]));
    if (st.phase === "playing" && left < 10 && Math.ceil(left) !== lastTickSecond) {
      lastTickSecond = Math.ceil(left); SFX.tick();
    }
    updateActionBar();
  }, 250);

  // ------------------------------------------------- events → fx / sfx
  function playNewEvents(snap) {
    if (!snap || !snap.events) return;
    snap.events.forEach(function (ev) {
      if (ev.seq <= view.lastEventSeq) return;
      view.lastEventSeq = ev.seq;
      handleEvent(ev);
    });
  }
  // Host plays its own events straight from emit() order each frame.
  var hostPlayedSeq = 0;
  function playHostEvents() {
    if (!sim) return;
    sim.events.forEach(function (ev) {
      if (ev.seq <= hostPlayedSeq) return;
      hostPlayedSeq = ev.seq;
      handleEvent(ev);
    });
  }
  function handleEvent(ev) {
    switch (ev.type) {
      case "pop":
        SFX.pop();
        if (scene) scene.burst(ev.x, ev.y, ev.data && ev.data.champ ? 14 : 7);
        if (ev.data && ev.data.carried) showBanner("🎁 Goodies saved!", 1500);
        break;
      case "steal": SFX.steal(); showBanner("😈 " + (ev.data && ev.data.n > 1 ? ev.data.n + " goodies" : "A goodie") + " snuck away!", 1800); break;
      case "grab": SFX.grab(); break;
      case "place": SFX.place(); if (scene) scene.burst(ev.x, ev.y, 5); break;
      case "zap": SFX.boop(); if (scene) scene.zap(ev.data.fx, ev.data.fy, ev.x, ev.y); break;
      case "boop": SFX.boop(); break;
      case "bubble": if (scene) scene.bubble(ev.x, ev.y); break;
      case "march": showBanner("👀 A BIG sneak is coming!", 2200); SFX.send(); break;
      case "cheer": showBanner("📣 Hurry hurry hurry!", 1500); break;
      case "wave": showBanner("🌩️ Sneaky snackers incoming!", 1800); SFX.send(); break;
      case "spawn": break;
      case "end": break;
    }
  }

  // --------------------------------------------------------- rendering
  var PATH_TILES = {};
  ROUTES.forEach(function (route) {
    for (var i = 0; i < route.length - 1; i++) {
      var a = route[i], b = route[i + 1];
      var dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]);
      var x = a[0], y = a[1];
      PATH_TILES[x + ":" + y] = true;
      while (x !== b[0] || y !== b[1]) { x += dx; y += dy; PATH_TILES[x + ":" + y] = true; }
    }
  });

  function px(v) { return v * TILE + TILE / 2; }

  function PartyScene() { Phaser.Scene.call(this, { key: "party" }); }
  PartyScene.prototype = Object.create(Phaser.Scene.prototype);
  PartyScene.prototype.constructor = PartyScene;

  PartyScene.prototype.preload = function () {
    var self = this;
    this.missing = {};
    this.load.on("loaderror", function (file) { self.missing[file.key] = true; });
    Object.keys(SPRITES).forEach(function (key) { self.load.image(key, SPRITES[key]); });
  };

  PartyScene.prototype.makeFallback = function (key) {
    var emoji = FALLBACK_EMOJI[key];
    var size = 128;
    var canvas = this.textures.createCanvas(key, size, size);
    var ctx = canvas.getContext();
    if (key === "grass" || key === "grass2") {
      ctx.fillStyle = key === "grass" ? "#79c974" : "#6fc06a"; ctx.fillRect(0, 0, size, size);
    } else if (key === "path") {
      ctx.fillStyle = "#d9b98a"; ctx.fillRect(0, 0, size, size);
    } else if (emoji) {
      ctx.font = "100px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(emoji, size / 2, size / 2 + 6);
    } else {
      ctx.fillStyle = "#b7a7d4"; ctx.fillRect(24, 24, size - 48, size - 48);
    }
    canvas.refresh();
  };

  PartyScene.prototype.create = function () {
    var self = this;
    scene = this;
    Object.keys(SPRITES).forEach(function (key) {
      if (self.missing[key] || !self.textures.exists(key)) self.makeFallback(key);
    });

    // --- static ground
    for (var y = 0; y < GRID_H; y++) {
      for (var x = 0; x < GRID_W; x++) {
        var key = PATH_TILES[x + ":" + y] ? "path" : ((x + y) % 2 === 0 ? "grass" : "grass2");
        var img = this.add.image(px(x), px(y), key).setDisplaySize(TILE + 1, TILE + 1);
        img.setDepth(0);
      }
    }
    // sunlight tint wash so reused night-garden tiles read as daytime
    this.add.rectangle(GRID_W * TILE / 2, GRID_H * TILE / 2, GRID_W * TILE, GRID_H * TILE, 0xfff2c2, 0.13).setDepth(1);

    FLOWERS.forEach(function (f) { self.add.image(px(f[0]), px(f[1]), "flowers").setDisplaySize(TILE * 0.8, TILE * 0.8).setDepth(1); });
    TREES.forEach(function (t) { self.add.image(px(t[0]), px(t[1]), "tree").setDisplaySize(TILE * 1.35, TILE * 1.35).setDepth(2); });
    ROUTES.forEach(function (route) {
      var g = route[0];
      self.add.image(px(g[0]) - TILE * 0.2, px(g[1]), "castledoor").setDisplaySize(TILE * 1.2, TILE * 1.4).setDepth(2);
    });
    this.padSprites = {};
    PADS.forEach(function (p) {
      var s = self.add.image(px(p[0]), px(p[1]), "pad").setDisplaySize(TILE * 0.92, TILE * 0.92).setDepth(1).setAlpha(0.85);
      self.padSprites[p[0] + ":" + p[1]] = s;
    });
    // party table + balloons
    this.add.image(px(TABLE_CENTER[0]), px(TABLE_CENTER[1]), "table").setDisplaySize(TILE * 2.7, TILE * 2.7).setDepth(2);
    this.add.image(px(17.2), px(2.1), "balloons").setDisplaySize(TILE * 1.1, TILE * 1.4).setDepth(3);
    this.add.image(px(17.2), px(7.9), "balloons").setDisplaySize(TILE * 1.1, TILE * 1.4).setDepth(3);

    // goodies
    this.goodieSprites = {};
    GOODIE_SLOTS.forEach(function (slot, i) {
      var key = slot.kind === "cake" ? "cake" : slot.kind === "cupcake" ? "cupcake" : "present" + ((i % 3) + 1);
      var size = slot.kind === "cake" ? 0.95 : slot.kind === "cupcake" ? 0.5 : 0.62;
      var s = self.add.image(px(slot.x), px(slot.y), key).setDisplaySize(TILE * size, TILE * size).setDepth(4);
      self.goodieSprites["g" + i] = s;
    });

    this.dynamicLayer = this.add.layer().setDepth(5);
    this.fxLayer = this.add.layer().setDepth(9);
    this.entitySprites = {};       // id -> container
    this.auraGraphics = this.add.graphics().setDepth(3);
    this.padGlow = this.add.graphics().setDepth(3);

    this.input.on("pointerdown", function (pointer) {
      handleStageTap(pointer.worldX / TILE, pointer.worldY / TILE);
    });
  };

  PartyScene.prototype.resetDynamic = function () {
    var self = this;
    if (!this.entitySprites) return;
    Object.keys(this.entitySprites).forEach(function (id) { self.entitySprites[id].destroy(); });
    this.entitySprites = {};
    if (this.auraGraphics) this.auraGraphics.clear();
    if (this.padGlow) this.padGlow.clear();
  };

  PartyScene.prototype.getOrMakeEntity = function (id, textureKey, sizeTiles, isChamp) {
    if (this.entitySprites[id]) return this.entitySprites[id];
    var c = this.add.container(0, 0);
    var spr = this.add.image(0, 0, textureKey).setDisplaySize(TILE * sizeTiles, TILE * sizeTiles);
    c.add(spr);
    c.__spr = spr;
    var hp = this.add.graphics();
    c.add(hp);
    c.__hp = hp;
    var carryIcon = this.add.text(0, -TILE * 0.55, "", { fontSize: "20px" }).setOrigin(0.5);
    c.add(carryIcon);
    c.__carry = carryIcon;
    this.dynamicLayer.add(c);
    if (isChamp) {
      var ring = this.add.graphics();
      ring.lineStyle(3, 0xffd98a, 0.9).strokeCircle(0, TILE * 0.38, TILE * 0.3);
      c.addAt(ring, 0);
    }
    this.entitySprites[id] = c;
    return c;
  };

  PartyScene.prototype.drawHpPips = function (container, hp, maxHp) {
    var g = container.__hp;
    g.clear();
    if (hp >= maxHp) return;
    var w = TILE * 0.7, h = 6;
    g.fillStyle(0x1a1636, 0.7).fillRoundedRect(-w / 2, -TILE * 0.48, w, h, 3);
    g.fillStyle(0x9fe3c1, 1).fillRoundedRect(-w / 2, -TILE * 0.48, w * Math.max(0, hp / maxHp), h, 3);
  };

  PartyScene.prototype.burst = function (tx, ty, n) {
    var self = this;
    for (var i = 0; i < n; i++) {
      (function () {
        var s = self.add.image(px(tx), px(ty), "sparkle").setDisplaySize(18, 18).setDepth(9);
        self.fxLayer.add(s);
        var ang = Math.random() * Math.PI * 2, d = 20 + Math.random() * 34;
        self.tweens.add({
          targets: s, x: px(tx) + Math.cos(ang) * d, y: px(ty) + Math.sin(ang) * d,
          alpha: 0, scale: 0.4, duration: 500 + Math.random() * 250,
          onComplete: function () { s.destroy(); }
        });
      })();
    }
  };
  PartyScene.prototype.zap = function (fx, fy, tx, ty) {
    var g = this.add.graphics().setDepth(9);
    g.lineStyle(3, 0xffe9a8, 0.9).lineBetween(px(fx), px(fy), px(tx), px(ty));
    this.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: function () { g.destroy(); } });
    this.burst(tx, ty, 3);
  };
  PartyScene.prototype.bubble = function (tx, ty) {
    var s = this.add.circle(px(tx), px(ty), TILE * 0.34, 0xbfe8ff, 0.45).setDepth(9);
    s.setStrokeStyle(2, 0xffffff, 0.8);
    this.tweens.add({ targets: s, alpha: 0, scale: 1.3, duration: 1100, onComplete: function () { s.destroy(); } });
  };

  PartyScene.prototype.update = function () {
    var st = currentState();
    if (net.isHost) playHostEvents();
    if (!st) return;
    var self = this;

    // interpolation factor for guests
    var alpha = 1;
    var prev = null;
    if (!net.isHost && view.prev && view.cur) {
      prev = view.prev;
      alpha = clamp((Date.now() - view.at) / view.interval, 0, 1);
    }
    function lerpPos(id, cx, cy, collection) {
      if (!prev || !collection) return { x: cx, y: cy };
      var p = null;
      for (var i = 0; i < collection.length; i++) if (collection[i].id === id) p = collection[i];
      if (!p) return { x: cx, y: cy };
      return { x: p.x + (cx - p.x) * alpha, y: p.y + (cy - p.y) * alpha };
    }

    var seen = {};

    // towers
    (st.towers || []).forEach(function (tw) {
      seen[tw.id] = true;
      var c = self.getOrMakeEntity(tw.id, "tower_" + tw.type, 0.9, false);
      c.setPosition(px(tw.x), px(tw.y));
    });

    // minions
    (st.minions || []).forEach(function (m) {
      seen[m.id] = true;
      var key = m.champ ? "char_" + m.champ : "minion_" + m.type;
      var c = self.getOrMakeEntity(m.id, key, m.champ ? 1.15 : 0.8, false);
      var pos = lerpPos(m.id, m.x, m.y, prev && prev.minions);
      c.setPosition(px(pos.x), px(pos.y));
      self.drawHpPips(c, m.hp, m.maxHp);
      c.__carry.setText(m.carry && m.carry.length ? "🎁".repeat(Math.min(3, m.carry.length)) : "");
      c.__spr.setFlipX(m.dir === "out");
    });

    // hero champions
    Object.keys(st.champs || {}).forEach(function (pid) {
      var ch = st.champs[pid];
      var id = "champ_" + pid;
      seen[id] = true;
      var c = self.getOrMakeEntity(id, "char_" + ch.char, 1.0, true);
      var pos = ch;
      if (prev && prev.champs && prev.champs[pid]) {
        var p = prev.champs[pid];
        pos = { x: p.x + (ch.x - p.x) * alpha, y: p.y + (ch.y - p.y) * alpha };
      }
      c.setPosition(px(pos.x), px(pos.y));
    });

    // remove stale entities
    Object.keys(this.entitySprites).forEach(function (id) {
      if (!seen[id]) { self.entitySprites[id].destroy(); delete self.entitySprites[id]; }
    });

    // goodies visibility
    (st.goodies || []).forEach(function (g) {
      var s = self.goodieSprites[g.id];
      if (s) s.setVisible(g.state === "table");
    });

    // auras (lantern glow + hum wobble)
    this.auraGraphics.clear();
    (st.towers || []).forEach(function (tw) {
      if (tw.type === "lantern") {
        self.auraGraphics.fillStyle(0xffd98a, 0.12).fillCircle(px(tw.x), px(tw.y), TOWERS.lantern.range * TILE);
      }
    });
    (st.minions || []).forEach(function (m) {
      if (m.type === "humnote") {
        self.auraGraphics.fillStyle(0xb28cff, 0.09).fillCircle(px(m.x), px(m.y), MINIONS.humnote.aura * TILE);
      }
    });

    // pad glow while a tower is armed
    this.padGlow.clear();
    if (ui.armedTower && ui.mySide === "patrol") {
      PADS.forEach(function (p) {
        var taken = (st.towers || []).some(function (t) { return t.px === p[0] && t.py === p[1]; });
        if (!taken) {
          self.padGlow.lineStyle(3, 0xffd98a, 0.85).strokeCircle(px(p[0]), px(p[1]), TILE * 0.5);
        }
      });
    }
  };

  function handleStageTap(rawX, rawY) {
    ensureAudio();
    if (net.phase !== "playing" || !ui.mySide) return;
    // Convert from world-tile space to the sim's tile-center convention.
    var tx = rawX - 0.5, ty = rawY - 0.5;
    if (ui.mySide === "patrol") {
      if (ui.armedTower) {
        var pad = null, best = 0.75;
        PADS.forEach(function (p) {
          var d = dist(tx, ty, p[0], p[1]);
          if (d < best) { best = d; pad = p; }
        });
        if (pad) {
          act({ type: "place", tower: ui.armedTower, pad: pad });
          ui.armedTower = null;
          updateActionBar();
          setHint("Building! ✨");
          return;
        }
      }
      act({ type: "move", x: tx, y: ty });
    } else {
      // snackers: tapping near a gate picks the sneaking door
      var g0 = ROUTES[0][0], g1 = ROUTES[1][0];
      if (dist(tx, ty, g0[0], g0[1]) < 1.6) { ui.gate = 0; setHint("Sneaking through the top gate! 🚪"); SFX.ui(); }
      else if (dist(tx, ty, g1[0], g1[1]) < 1.6) { ui.gate = 1; setHint("Sneaking through the bottom gate! 🚪"); SFX.ui(); }
    }
  }

  // --------------------------------------------------------------- boot
  function boot() {
    var config = {
      type: Phaser.AUTO,
      parent: "mapView",
      width: GRID_W * TILE,
      height: GRID_H * TILE,
      backgroundColor: "#5cb85c",
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: PartyScene
    };
    try {
      game = new Phaser.Game(config);
    } catch (e) {
      var mv = $("mapView");
      mv.classList.add("stage-error");
      mv.textContent = "Oh no — the garden couldn't wake up. Try refreshing?";
      return;
    }

    $("btnSound").addEventListener("click", function () {
      save.sound = !save.sound; persistSave();
      this.setAttribute("aria-pressed", String(save.sound));
      this.textContent = save.sound ? "🔊" : "🔇";
      ensureAudio(); if (save.sound) SFX.ui();
    });
    $("btnSound").setAttribute("aria-pressed", String(save.sound));
    $("btnSound").textContent = save.sound ? "🔊" : "🔇";

    $("btnLeave").addEventListener("click", function () {
      if (confirmLeave) { leaveRoom(); confirmLeave = false; this.textContent = "🚪"; }
      else { confirmLeave = true; this.textContent = "🚪?"; var b = this; setTimeout(function () { confirmLeave = false; b.textContent = "🚪"; }, 2500); }
    });
    var confirmLeave = false;

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && net.code) schedulePoll(50);
    });
    window.addEventListener("pagehide", function () { persistSave(); });

    showLanding();
  }

  // ----------------------------------------------------------- test hook
  window.__partyPatrol = {
    version: VERSION,
    getPhase: function () { return net.phase; },
    getRoom: function () { return { code: net.code, playerId: net.playerId, isHost: net.isHost }; },
    getPlayers: function () { return net.players; },
    getSnapshot: function () { return net.isHost ? sim : view.cur; },
    getSim: function () { return sim; },
    isHost: function () { return net.isHost; },
    act: act,
    createRoom: createRoom,
    joinRoom: joinRoom,
    setPrefs: setPrefs,
    start: hostStart,
    reset: hostReset,
    leave: leaveRoom,
    setApiBase: function (url) { API_BASE = url; },
    setTimeScale: function (k) { timeScale = Math.max(0.1, Math.min(20, k)); },
    netStats: function () { return { gets: net.gets, posts: net.posts, errors: net.errors, snapshotVersion: view.version }; },
    debugBoot: function () {
      var s = game && game.scene && game.scene.getScene("party");
      return {
        game: !!game,
        sceneCreated: !!scene,
        sceneStatus: s && s.scene.settings.status,
        loadProgress: s && s.load ? s.load.progress : null,
        loadTotal: s && s.load ? s.load.totalToLoad : null,
        loadFailed: s && s.load ? s.load.totalFailed : null,
        rendererType: game && game.renderer ? game.renderer.type : null
      };
    },
    getPositions: function () {
      var st = currentState();
      if (!st) return null;
      return {
        minions: (st.minions || []).map(function (m) { return { id: m.id, type: m.type, x: m.x, y: m.y, hp: m.hp, carry: (m.carry || []).length, champ: m.champ }; }),
        champs: st.champs, towers: st.towers,
        stolen: (st.goodies || []).filter(function (g) { return g.state === "stolen"; }).length,
        t: st.t, phase: st.phase
      };
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
