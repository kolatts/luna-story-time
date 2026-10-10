/* Luna's Story Time — light, cookieless usage tracking
 * Sends a handful of custom events to Application Insights (luna-storytime-ai)
 * so we can see which stories get read, which get finished, and whether the
 * suggestion form and games get used. No cookies, no localStorage, no SDK:
 * just a random per-tab session id in sessionStorage and a beacon per event.
 *
 * Only the live site reports. To test from localhost, open any page with
 * ?track=1 (sticks for the tab); those events are tagged env=dev and the
 * workbook filters them out.
 *
 * Event names are the workbook's contract (analytics/luna-workbook.json):
 *   page_view      { page }
 *   story_open     { book, title, pages, resumedAt }
 *   story_page     { book, spread, pages }   spread 1..pages; pages+1 = Wonder Together
 *   story_finish   { book, title, pages, auto }
 *   suggest_view / suggest_focus / suggest_submit
 *   game_open      { game }
 *   game_play      { game }            first real input on a game page
 */
(function () {
  "use strict";

  var IKEY = "90cc3f5a-a361-4f70-bc7b-43f86ec628ae";
  var ENDPOINT = "https://centralus-2.in.applicationinsights.azure.com/v2/track";
  var LIVE_HOST = "kolatts.github.io";

  function session(key, value) {
    try {
      if (value !== undefined) sessionStorage.setItem(key, value);
      return sessionStorage.getItem(key);
    } catch (e) { return null; }
  }

  var isLive = location.hostname === LIVE_HOST;
  if (/[?&]track=1\b/.test(location.search)) session("luna-track-dev", "1");
  var enabled = isLive || session("luna-track-dev") === "1";

  var sessionId = session("luna-track-sid");
  if (!sessionId) {
    sessionId = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    session("luna-track-sid", sessionId);
  }

  var pageName = (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "") || "index";

  function track(name, props) {
    if (!enabled) return;
    var properties = { env: isLive ? "prod" : "dev", page: pageName };
    for (var k in props) if (Object.prototype.hasOwnProperty.call(props, k)) properties[k] = String(props[k]);

    var envelope = {
      name: "Microsoft.ApplicationInsights." + IKEY.replace(/-/g, "") + ".Event",
      time: new Date().toISOString(),
      iKey: IKEY,
      tags: {
        "ai.session.id": sessionId,
        "ai.operation.name": pageName,
        "ai.device.type": "Browser",
        "ai.internal.sdkVersion": "luna-track:1"
      },
      data: { baseType: "EventData", baseData: { ver: 2, name: name, properties: properties } }
    };
    var body = JSON.stringify(envelope);

    // sendBeacon survives page unloads (tapping 🏠 mid-story); fetch is the fallback.
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "text/plain;charset=UTF-8" }))) return;
    } catch (e) { /* fall through */ }
    try {
      fetch(ENDPOINT, { method: "POST", body: body, keepalive: true, mode: "cors",
        headers: { "Content-Type": "text/plain;charset=UTF-8" } }).catch(function () {});
    } catch (e) { /* telemetry never breaks story time */ }
  }

  window.lunaTrack = track;
  track("page_view", {});

  /* ---------- Suggestion form: seen, touched, sent ---------- */
  var suggest = document.getElementById("suggest");
  var form = document.getElementById("suggestForm");
  if (suggest && "IntersectionObserver" in window) {
    var seen = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) {
        track("suggest_view", {});
        seen.disconnect();
      }
    }, { threshold: 0.4 });
    seen.observe(suggest);
  }
  if (form) {
    form.addEventListener("focusin", function () { track("suggest_focus", {}); }, { once: true });
  }

  /* ---------- Games: opened, then actually played ---------- */
  var GAME_PAGES = { game: "castle-life", peek: "present-peek", party: "birthday-party-patrol" };
  var game = GAME_PAGES[pageName];
  if (game) {
    track("game_open", { game: game });
    var played = false;
    var onPlay = function (e) {
      if (played || (e.target && e.target.closest && e.target.closest("a"))) return;
      played = true;
      track("game_play", { game: game });
      window.removeEventListener("pointerdown", onPlay, true);
      window.removeEventListener("keydown", onPlay, true);
    };
    window.addEventListener("pointerdown", onPlay, true);
    window.addEventListener("keydown", onPlay, true);
  }
})();
