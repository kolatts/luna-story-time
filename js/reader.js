/* Luna's Story Time — storybook reader
 * Read-aloud via the Web Speech API with word-level highlighting,
 * tap-a-word pronunciation, sparkle-word definitions, and auto page-turns:
 * pressing Play starts a read-through that counts down and turns each page.
 */
(function () {
  "use strict";

  // "A and B" for two names, "A, B, and C" for more. Must mirror generate-narration.py join_authors.
  function joinAuthors(authors) {
    if (authors.length <= 2) return authors.join(" and ");
    return authors.slice(0, -1).join(", ") + ", and " + authors[authors.length - 1];
  }

  var params = new URLSearchParams(location.search);
  var slug = params.get("book") || "princess-moon-and-the-nevershine-lantern";
  var base = "books/" + slug + "/";

  var book = null;
  var pages = [];        // cover page + spreads + finale
  var current = 0;
  var readingThrough = false; // Play was pressed with auto-turn on: keep reading page after page
  var speaking = false;
  var readToken = 0;     // bumped on every stop so a late onend can't turn the page
  var renderCount = 0;   // used to skip the initial-load focus steal
  var furthest = -1;     // furthest page reached this visit (for drop-off tracking)
  var finished = false;

  function track(name, props) { if (window.lunaTrack) window.lunaTrack(name, props); }

  var host = document.getElementById("spreadHost");
  var moonsNav = document.getElementById("progressMoons");
  var playBtn = document.getElementById("playBtn");
  var prevBtn = document.getElementById("prevBtn");
  var nextBtn = document.getElementById("nextBtn");
  var bigTextBtn = document.getElementById("bigTextBtn");
  var speedBtn = document.getElementById("speedBtn");
  var autoBtn = document.getElementById("autoBtn");
  var countdownEl = document.getElementById("turnCountdown");
  var countdownText = document.getElementById("turnCountdownText");
  var stayBtn = document.getElementById("stayBtn");

  /* ---------- Reading speed (speed-dial cycle button) ----------
     audio.playbackRate takes a plain multiplier; the Web Speech API's rate
     doesn't scale linearly with how fast it actually sounds, so each step
     gets its own tuned ttsRate rather than reusing the multiplier. */
  var SPEEDS = [
    { mult: 0.75, ttsRate: 0.72, icon: "🐢", label: "Slow" },
    { mult: 1,    ttsRate: 0.92, icon: "🙂", label: "Normal" },
    { mult: 1.25, ttsRate: 1.05, icon: "🐇", label: "Fast" },
    { mult: 1.5,  ttsRate: 1.2,  icon: "⚡", label: "Extra fast" }
  ];
  var DEFAULT_SPEED_INDEX = 1; // "Normal" — today's un-toggled default
  var speedIndex = DEFAULT_SPEED_INDEX;

  function syncSpeedButton() {
    var s = SPEEDS[speedIndex];
    speedBtn.textContent = s.icon + " " + s.mult + "×";
    speedBtn.title = "Reading speed: " + s.label;
    speedBtn.setAttribute("aria-label", "Reading speed: " + s.label + ", " + s.mult + " times. Tap to change speed.");
    speedBtn.classList.toggle("speed-set", speedIndex !== DEFAULT_SPEED_INDEX);
  }

  /* ---------- Auto page-turn delay (cycle button; 0 = turn pages yourself) ---------- */
  var TURN_DELAYS = [3, 5, 10, 0];
  var DEFAULT_TURN_DELAY = 5;
  var turnDelay = DEFAULT_TURN_DELAY;

  function syncAutoButton() {
    var label = turnDelay ? "Turn the pages for me after " + turnDelay + " seconds" : "Turn the pages myself";
    autoBtn.textContent = turnDelay ? "⏱ " + turnDelay + "s" : "✋ Off";
    autoBtn.title = label;
    autoBtn.setAttribute("aria-label", label + ". Tap to change.");
    autoBtn.classList.toggle("speed-set", turnDelay !== DEFAULT_TURN_DELAY);
  }

  /* ---------- Reader preferences + reading position (localStorage) ---------- */
  var READER_STATE_KEY = "luna-reader-v1";
  function loadReaderState() {
    try { return JSON.parse(localStorage.getItem(READER_STATE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveReaderState(state) {
    try { localStorage.setItem(READER_STATE_KEY, JSON.stringify(state)); } catch (e) { /* private mode: play on */ }
  }
  var readerState = loadReaderState();
  if (!readerState.prefs) readerState.prefs = {};
  if (!readerState.books) readerState.books = {};

  // Only the auto-turn *delay* is restored; reading itself never starts on
  // load — a page that starts talking by itself is startling.
  if (readerState.prefs.bigText) {
    document.body.classList.add("big-text");
    bigTextBtn.setAttribute("aria-pressed", "true");
  }
  if (typeof readerState.prefs.speedIndex === "number" && SPEEDS[readerState.prefs.speedIndex]) {
    speedIndex = readerState.prefs.speedIndex;
  } else if (readerState.prefs.slow) {
    // Migrate the old binary "slow" toggle, saved by an earlier version of the reader.
    speedIndex = 0;
  }
  syncSpeedButton();
  if (TURN_DELAYS.indexOf(readerState.prefs.turnDelay) >= 0) turnDelay = readerState.prefs.turnDelay;
  syncAutoButton();

  /* ---------- Narration audio (pre-generated Azure "Ana" voice) ---------- */
  var narration = null;   // { pageId: [[ms, charOffset, wordLen], ...] }
  var audio = null;       // single reusable <audio> element (autoplay-friendly)
  var rafId = null;
  var wordSprite = null;  // { word: [startMs, durMs] } into narration/words.mp3
  var spriteAudio = null; // <audio> for word-sprite segments
  var vocabAudio = null;  // <audio> for vocab definition clips
  var segTimer = null;

  /* ---------- Speech ---------- */
  var synth = window.speechSynthesis;
  var chosenVoice = null;

  function pickVoice() {
    if (!synth) return;
    var voices = synth.getVoices();
    if (!voices.length) return;
    var en = voices.filter(function (v) { return /^en(-|_|$)/i.test(v.lang); });
    var pool = en.length ? en : voices;
    var pref =
      pool.filter(function (v) { return /natural|neural/i.test(v.name) && /female|aria|jenny|sonia|libby|ana/i.test(v.name); })[0] ||
      pool.filter(function (v) { return /natural|neural/i.test(v.name); })[0] ||
      pool.filter(function (v) { return /female|zira|susan|hazel|samantha/i.test(v.name); })[0] ||
      pool[0];
    chosenVoice = pref || null;
  }
  if (synth) {
    pickVoice();
    synth.onvoiceschanged = pickVoice;
  }

  function stopSpeaking() {
    readToken++;
    if (synth) synth.cancel();
    if (audio) { audio.pause(); audio.removeAttribute("src"); audio.load(); }
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (segTimer) { clearTimeout(segTimer); segTimer = null; }
    if (spriteAudio) spriteAudio.pause();
    if (vocabAudio) vocabAudio.pause();
    speaking = false;
    syncPlayButton();
    clearHighlights();
  }

  /* Stop reading AND end the read-through, so no page turns follow. */
  function stopReadingThrough() {
    readingThrough = false;
    cancelCountdown();
    stopSpeaking();
  }

  function syncPlayButton() {
    var active = speaking || readingThrough;
    playBtn.textContent = active ? "⏸" : "🔊";
    playBtn.setAttribute("aria-label", active ? "Stop reading" : turnDelay ? "Read the story to me" : "Read this page to me");
  }

  function clearHighlights() {
    var lit = host.querySelectorAll(".w.speaking, .refrain-line.speaking");
    for (var i = 0; i < lit.length; i++) lit[i].classList.remove("speaking");
  }

  /* Highlight the word span covering charIdx of the page's speakText (or the
     refrain callout for offsets beyond it), scrolling it into view. */
  function highlightAt(page, charIdx) {
    clearHighlights();
    var el = null;
    if (charIdx >= page.speakText.length) {
      el = host.querySelector(".refrain-line");
    } else if (page.spans) {
      for (var i = 0; i < page.spans.length; i++) {
        if (page.spans[i].start <= charIdx && charIdx < page.spans[i].end + 1) { el = page.spans[i].el; break; }
        if (page.spans[i].start > charIdx) { el = page.spans[i > 0 ? i - 1 : 0].el; break; }
      }
      if (!el && page.spans.length) el = page.spans[page.spans.length - 1].el;
    }
    if (el) {
      el.classList.add("speaking");
      var r = el.getBoundingClientRect();
      if (r.top < 70 || r.bottom > window.innerHeight - 120) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
  }

  /* Play pre-generated narration with timing-synced highlights. */
  function playNarration(page, onDone) {
    if (!audio) { audio = new Audio(); audio.preload = "auto"; }
    var bounds = narration[page.audioId];
    audio.src = bookAsset("narration/" + page.audioId + ".mp3");
    audio.playbackRate = SPEEDS[speedIndex].mult;

    var fellBack = false;
    audio.onerror = function () {
      // Missing/broken audio: fall back to the browser voice.
      fellBack = true;
      speaking = false;
      speakText(page.speakText + (page.refrain ? " … " + book.refrain : ""), onDone, page.spans);
    };
    audio.onended = function () {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      speaking = false;
      clearHighlights();
      if (onDone) onDone();
      syncPlayButton();
    };

    function tick() {
      if (fellBack || audio.paused) { rafId = null; return; }
      var ms = audio.currentTime * 1000;
      var current = null;
      for (var i = 0; i < bounds.length; i++) {
        if (bounds[i][0] <= ms) current = bounds[i]; else break;
      }
      if (current) highlightAt(page, current[1]);
      rafId = requestAnimationFrame(tick);
    }

    var p = audio.play();
    if (p && p.catch) p.catch(function () { audio.onerror(); });
    speaking = true;
    syncPlayButton();
    rafId = requestAnimationFrame(tick);
  }

  function speakText(text, onDone, wordSpans) {
    if (!synth) { if (onDone) onDone(); return; }
    synth.cancel();
    var u = new SpeechSynthesisUtterance(text);
    if (chosenVoice) u.voice = chosenVoice;
    u.rate = SPEEDS[speedIndex].ttsRate;
    u.pitch = 1.05;

    if (wordSpans && wordSpans.length) {
      u.onboundary = function (e) {
        if (e.name && e.name !== "word") return;
        var idx = e.charIndex || 0;
        clearHighlights();
        var span = null;
        for (var i = 0; i < wordSpans.length; i++) {
          if (wordSpans[i].start <= idx && idx < wordSpans[i].end + 1) { span = wordSpans[i].el; break; }
          if (wordSpans[i].start > idx) { span = wordSpans[i > 0 ? i - 1 : 0].el; break; }
        }
        if (!span && wordSpans.length) span = wordSpans[wordSpans.length - 1].el;
        if (span) {
          span.classList.add("speaking");
          if (typeof span.scrollIntoView === "function") {
            var r = span.getBoundingClientRect();
            if (r.top < 70 || r.bottom > window.innerHeight - 120) {
              span.scrollIntoView({ block: "center", behavior: "smooth" });
            }
          }
        }
      };
    }
    u.onend = function () {
      speaking = false;
      clearHighlights();
      if (onDone) onDone();
      syncPlayButton();
    };
    u.onerror = function () {
      speaking = false;
      syncPlayButton();
      clearHighlights();
    };
    speaking = true;
    syncPlayButton();
    synth.speak(u);
  }

  function speakWord(word) {
    if (!synth) return;
    synth.cancel();
    var u = new SpeechSynthesisUtterance(word);
    if (chosenVoice) u.voice = chosenVoice;
    u.rate = 0.75;
    u.pitch = 1.1;
    synth.speak(u);
  }

  /* Say one word with the Ana voice via the word sprite; browser voice fallback. */
  function sayWord(word) {
    if (speaking || readingThrough) stopReadingThrough(); // exploring the page ends the read-through
    var seg = wordSprite && wordSprite[word];
    if (!seg) { speakWord(word); return; }
    if (!spriteAudio) {
      spriteAudio = new Audio(bookAsset("narration/words.mp3"));
      spriteAudio.preload = "auto";
    }
    if (segTimer) { clearTimeout(segTimer); segTimer = null; }
    var start = function () {
      spriteAudio.currentTime = seg[0] / 1000;
      var p = spriteAudio.play();
      if (p && p.catch) p.catch(function () { speakWord(word); });
      segTimer = setTimeout(function () { spriteAudio.pause(); segTimer = null; }, seg[1] + 120);
    };
    if (spriteAudio.readyState >= 1) start();
    else spriteAudio.addEventListener("loadedmetadata", start, { once: true });
  }

  /* Say a sparkle word plus its definition with the Ana voice; fallback to browser voice. */
  function sayVocab(entry) {
    if (speaking || readingThrough) stopReadingThrough();
    if (!vocabAudio) { vocabAudio = new Audio(); vocabAudio.preload = "auto"; }
    var key = stripPunct(entry.word);
    vocabAudio.onerror = function () { speakWord(entry.word + ". " + entry.definition); };
    vocabAudio.src = bookAsset("narration/vocab/" + key + ".mp3");
    var p = vocabAudio.play();
    if (p && p.catch) p.catch(function () { speakWord(entry.word + ". " + entry.definition); });
  }

  /* ---------- Page building ---------- */
  function stripPunct(w) {
    return w.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, "").toLowerCase();
  }

  /* Wrap every word of `text` in a span; returns {html-fragment, spans:[{start,end,el}]}. */
  function buildWordSpans(container, text, vocabMap) {
    var frag = document.createDocumentFragment();
    var spans = [];
    var re = /\S+/g, m, last = 0;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      var el = document.createElement("span");
      el.className = "w";
      el.textContent = m[0];
      var clean = stripPunct(m[0]);
      if (vocabMap && vocabMap[clean]) {
        el.classList.add("sparkle");
        el.setAttribute("data-vocab", clean);
        el.setAttribute("role", "button");
        el.setAttribute("tabindex", "0");
      }
      el.setAttribute("data-word", clean || m[0]);
      frag.appendChild(el);
      spans.push({ start: m.index, end: m.index + m[0].length, el: el });
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    container.appendChild(frag);
    return spans;
  }

  /* Short, page-turn-triggered magic; decorative and confined to the artwork.
     CSS stops it within five seconds and disables it for reduced motion. */
  function addSceneEffect(wrap, effect) {
    if (["embers", "bubbles", "vortex", "bond", "starlight"].indexOf(effect) < 0) return;
    var layer = document.createElement("div");
    layer.className = "scene-magic scene-magic--" + effect;
    layer.setAttribute("aria-hidden", "true");
    for (var i = 0; i < 20; i++) {
      var particle = document.createElement("i");
      var bubble = effect === "bubbles" || (effect === "bond" && i % 2 === 0);
      particle.className = "magic-particle" + (bubble ? " magic-bubble" : "");
      particle.style.setProperty("--x", (7 + (i * 37 % 86)) + "%");
      particle.style.setProperty("--y", (12 + (i * 23 % 77)) + "%");
      particle.style.setProperty("--size", (bubble ? 10 + i % 5 * 6 : 3 + i % 4) + "px");
      particle.style.setProperty("--drift", (-45 + i * 17 % 90) + "px");
      particle.style.setProperty("--delay", (i % 5 * 0.12) + "s");
      particle.style.setProperty("--duration", (3.2 + i % 4 * 0.3) + "s");
      particle.style.setProperty("--angle", (i * 53) + "deg");
      layer.appendChild(particle);
    }
    wrap.appendChild(layer);
  }

  function makeArt(src, alt, placeholderEmoji, effect) {
    var wrap = document.createElement("div");
    wrap.className = "art-frame kenburns";
    var img = document.createElement("img");
    img.alt = alt;
    img.onerror = function () {
      img.remove();
      var magic = wrap.querySelector(".scene-magic");
      if (magic) magic.remove();
      var ph = document.createElement("div");
      ph.className = "art-placeholder";
      ph.textContent = placeholderEmoji || "🌙";
      wrap.appendChild(ph);
    };
    img.src = base + src;
    wrap.appendChild(img);
    addSceneEffect(wrap, effect);
    return wrap;
  }

  function renderPage(idx, dir) {
    renderCount++;
    cancelCountdown();
    stopSpeaking();
    current = idx;
    host.innerHTML = "";
    var page = pages[idx];
    trackProgress(idx);
    if (page.kind === "finale") readingThrough = false;

    var spreadEl = document.createElement("section");
    spreadEl.className = "spread " + (page.textPosition === "top" ? "text-top" : "text-bottom") +
      (dir === 1 ? " turning-next" : dir === -1 ? " turning-prev" : "");

    if (page.kind === "finale") {
      renderFinale(spreadEl);
    } else {
      spreadEl.appendChild(makeArt(page.image, page.alt, page.emoji, page.effect));

      var panel = document.createElement("div");
      panel.className = "text-panel";

      if (page.kicker) {
        var k = document.createElement("p");
        k.className = "spread-kicker";
        k.textContent = page.kicker;
        panel.appendChild(k);
      }
      var h = document.createElement("h2");
      h.className = "spread-title";
      h.textContent = page.title;
      panel.appendChild(h);

      var body = document.createElement("p");
      body.className = "story-text";
      page.spans = buildWordSpans(body, page.speakText, page.vocabMap);
      panel.appendChild(body);

      if (page.refrain) {
        var rf = document.createElement("p");
        rf.className = "refrain-line";
        rf.innerHTML = '<span class="say-with-me">✨ Say it with me</span>';
        rf.appendChild(document.createTextNode("“" + book.refrain + "”"));
        panel.appendChild(rf);
      }
      if (page.theEnd) {
        var te = document.createElement("p");
        te.className = "the-end";
        te.textContent = page.theEnd;
        panel.appendChild(te);
      }
      if (page.vocab && page.vocab.length) {
        var chips = document.createElement("div");
        chips.className = "vocab-chips";
        page.vocab.forEach(function (v) {
          var c = document.createElement("button");
          c.className = "vocab-chip";
          c.textContent = v.word;
          c.setAttribute("data-vocab", v.word.toLowerCase());
          chips.appendChild(c);
        });
        panel.appendChild(chips);
      }
      spreadEl.appendChild(panel);
    }

    host.appendChild(spreadEl);
    updateChrome();
    window.scrollTo({ top: 0, behavior: "instant" });

    // Warm the cache for the next page's art so the turn feels instant.
    var nextPage = pages[idx + 1];
    if (nextPage && nextPage.image) {
      var pre = new Image();
      pre.src = base + nextPage.image;
    }

    // Move focus to the new spread's heading so it doesn't silently drop to
    // <body> on every turn — but not on the very first render, which would
    // steal focus from wherever the page naturally starts.
    var titleEl = spreadEl.querySelector("h2");
    if (titleEl) {
      titleEl.setAttribute("tabindex", "-1");
      if (renderCount > 1) titleEl.focus({ preventScroll: true });
    }

    // Mid read-through, every page (turned by the countdown or by hand) reads itself.
    if (readingThrough && page.kind !== "finale") {
      var token = readToken;
      setTimeout(function () {
        if (readingThrough && current === idx && token === readToken) readPage();
      }, 450);
    }
    syncPlayButton();
  }

  // "Read all the way" = reached the last story spread (the finale is a bonus).
  function trackProgress(idx) {
    if (idx <= furthest) return;
    furthest = idx;
    if (renderCount > 1) track("story_page", { book: slug, spread: idx, pages: pages.length - 2 });
    if (!finished && renderCount > 1 && idx >= pages.length - 2) {
      finished = true;
      track("story_finish", { book: slug, title: book.title, pages: pages.length - 2, auto: readingThrough });
    }
  }

  function renderFinale(spreadEl) {
    var wrap = document.createElement("div");
    wrap.className = "finale";
    wrap.style.gridColumn = "1 / -1";

    var panel = document.createElement("div");
    panel.className = "text-panel";
    var h = document.createElement("h2");
    h.textContent = "🌙 Wonder Together";
    panel.appendChild(h);

    var intro = document.createElement("p");
    intro.className = "story-text";
    intro.textContent = "The story is over — but the wondering is just beginning. Talk about these together:";
    panel.appendChild(intro);

    var ul = document.createElement("ul");
    ul.className = "q-list";
    book.questions.forEach(function (q) {
      var li = document.createElement("li");
      li.textContent = q;
      ul.appendChild(li);
    });
    panel.appendChild(ul);

    if (book.lookAndFind) {
      var lf = document.createElement("p");
      lf.className = "look-find";
      lf.textContent = "🔎 Look and find: " + book.lookAndFind;
      panel.appendChild(lf);
    }

    var actions = document.createElement("div");
    actions.className = "finale-actions";
    var again = document.createElement("button");
    again.className = "cta";
    again.textContent = "📖 Read it again";
    again.addEventListener("click", function () { renderPage(0, -1); });
    var home = document.createElement("a");
    home.className = "cta ghost";
    home.href = "index.html";
    home.textContent = "🏠 Back to the bookshelf";
    var dream = document.createElement("a");
    dream.className = "cta ghost";
    dream.href = "index.html#suggest";
    dream.textContent = "💡 Dream up the next story";
    actions.appendChild(again);
    actions.appendChild(home);
    actions.appendChild(dream);
    panel.appendChild(actions);

    wrap.appendChild(panel);
    spreadEl.appendChild(wrap);
  }

  function updateChrome() {
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === pages.length - 1;
    var moons = moonsNav.querySelectorAll("button");
    for (var i = 0; i < moons.length; i++) {
      var isCurrent = i === current;
      moons[i].classList.toggle("current", isCurrent);
      moons[i].classList.toggle("done", i < current);
      if (isCurrent) moons[i].setAttribute("aria-current", "true");
      else moons[i].removeAttribute("aria-current");
    }
    var page = pages[current];
    playBtn.style.visibility = page.kind === "finale" ? "hidden" : "visible";

    readerState.books[slug] = { page: current, total: pages.length, lastRead: Date.now() };
    saveReaderState(readerState);
  }

  function go(dir) {
    var next = current + dir;
    if (next < 0 || next >= pages.length) return;
    renderPage(next, dir);
  }

  /* Play button: toggles a read-through (or one page when auto-turn is off). */
  function playCurrent() {
    if (pages[current].kind === "finale") return;
    if (speaking || readingThrough) { stopReadingThrough(); return; }
    readingThrough = turnDelay > 0;
    readPage();
  }

  function readPage() {
    var page = pages[current];
    var token = readToken;
    var onDone = function () {
      if (token !== readToken) return; // stopped or turned while finishing
      if (readingThrough && current < pages.length - 1) startCountdown();
      else readingThrough = false;
    };
    if (narration && page.audioId && narration[page.audioId]) {
      playNarration(page, onDone);
    } else {
      speakText(page.speakText + (page.refrain ? " … " + book.refrain : ""), onDone, page.spans);
    }
  }

  /* ---------- Page-turn countdown ----------
     When a page finishes reading, count down turnDelay seconds with a ring
     filling around the Next button, then turn. Next skips the wait;
     "Stay here" (or the pause button) ends the read-through. */
  var countdownTimer = null;
  var countdownEnds = 0;

  function startCountdown() {
    cancelCountdown();
    countdownEnds = Date.now() + turnDelay * 1000;
    nextBtn.classList.add("counting");
    countdownEl.hidden = false;
    tickCountdown();
    countdownTimer = setInterval(tickCountdown, 100);
  }

  function tickCountdown() {
    var left = countdownEnds - Date.now();
    if (left <= 0) { go(1); return; } // renderPage cancels the countdown
    var secs = Math.ceil(left / 1000);
    var text = (current === pages.length - 2 ? "Wonder time in " : "Next page in ") + secs + "…";
    if (countdownText.textContent !== text) countdownText.textContent = text;
    nextBtn.textContent = String(secs);
    nextBtn.style.setProperty("--turn-progress", (1 - left / (turnDelay * 1000)).toFixed(3));
  }

  function cancelCountdown() {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    countdownEl.hidden = true;
    countdownText.textContent = "";
    nextBtn.classList.remove("counting");
    nextBtn.style.removeProperty("--turn-progress");
    nextBtn.textContent = "▶";
  }

  /* ---------- Vocab popup ---------- */
  var pop = null;
  var popTrigger = null;
  function closePop() {
    if (!pop) return;
    pop.remove();
    pop = null;
    if (popTrigger) { popTrigger.focus(); popTrigger = null; }
  }
  function showVocab(word, triggerEl) {
    closePop();
    var entry = pages[current].vocabLookup && pages[current].vocabLookup[word];
    if (!entry) return;
    popTrigger = triggerEl;
    var anchorRect = triggerEl.getBoundingClientRect();
    pop = document.createElement("div");
    pop.className = "vocab-pop";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-modal", "true");
    pop.setAttribute("aria-labelledby", "vpWord");
    pop.innerHTML =
      '<button class="vp-close" aria-label="Close">✖</button>' +
      '<div class="vp-word" id="vpWord">✨ ' + entry.word + "</div>" +
      '<div class="vp-def">' + entry.definition + "</div>" +
      '<button class="vp-say">🔊 Say it</button>';
    document.body.appendChild(pop);
    var top = Math.min(anchorRect.bottom + 10, window.innerHeight - pop.offsetHeight - 16);
    var left = Math.min(Math.max(12, anchorRect.left), window.innerWidth - pop.offsetWidth - 12);
    pop.style.top = top + "px";
    pop.style.left = left + "px";
    var closeBtn = pop.querySelector(".vp-close");
    closeBtn.addEventListener("click", closePop);
    pop.querySelector(".vp-say").addEventListener("click", function () {
      sayVocab(entry);
    });
    sayVocab(entry);
    closeBtn.focus();
  }

  /* ---------- Events ---------- */
  prevBtn.addEventListener("click", function () { go(-1); });
  stayBtn.addEventListener("click", function () { stopReadingThrough(); playBtn.focus(); });
  nextBtn.addEventListener("click", function () { go(1); });
  playBtn.addEventListener("click", playCurrent);

  bigTextBtn.addEventListener("click", function () {
    var on = document.body.classList.toggle("big-text");
    this.setAttribute("aria-pressed", String(on));
    readerState.prefs.bigText = on;
    saveReaderState(readerState);
  });
  speedBtn.addEventListener("click", function () {
    speedIndex = (speedIndex + 1) % SPEEDS.length;
    syncSpeedButton();
    if (audio && !audio.paused) audio.playbackRate = SPEEDS[speedIndex].mult;
    delete readerState.prefs.slow; // superseded by speedIndex
    readerState.prefs.speedIndex = speedIndex;
    saveReaderState(readerState);
  });
  autoBtn.addEventListener("click", function () {
    turnDelay = TURN_DELAYS[(TURN_DELAYS.indexOf(turnDelay) + 1) % TURN_DELAYS.length];
    syncAutoButton();
    readerState.prefs.turnDelay = turnDelay;
    saveReaderState(readerState);
    // Takes effect mid-story without interrupting the voice: off finishes this
    // page and stops; a new delay picks up the current read or countdown.
    if (turnDelay === 0) {
      readingThrough = false;
      cancelCountdown();
    } else if (speaking) {
      readingThrough = true;
    } else if (countdownTimer) {
      startCountdown();
    }
    syncPlayButton();
  });

  host.addEventListener("click", function (e) {
    var t = e.target;
    if (t.classList && t.classList.contains("vocab-chip")) {
      showVocab(t.getAttribute("data-vocab"), t);
      return;
    }
    if (t.classList && t.classList.contains("w")) {
      var v = t.getAttribute("data-vocab");
      if (v) { showVocab(v, t); return; }
      var w = t.getAttribute("data-word");
      if (w) {
        t.classList.add("speaking");
        setTimeout(function () { t.classList.remove("speaking"); }, 900);
        sayWord(w);
      }
    }
  });
  host.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var t = e.target;
    // Only sparkle-word spans need this — vocab-chip buttons are native
    // <button>s and already fire click on Enter/Space.
    if (t.classList && t.classList.contains("w") && t.getAttribute("data-vocab")) {
      e.preventDefault();
      showVocab(t.getAttribute("data-vocab"), t);
    }
  });
  document.addEventListener("click", function (e) {
    if (pop && !pop.contains(e.target) && !(e.target.classList && (e.target.classList.contains("sparkle") || e.target.classList.contains("vocab-chip")))) closePop();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closePop(); stopReadingThrough(); return; }
    if (pop) return; // don't let arrow keys/space reach page navigation while the popup is open
    if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
    else if (e.key === " " && e.target === document.body) { e.preventDefault(); playCurrent(); }
  });

  /* Swipe */
  var touchX = null, touchY = null;
  document.addEventListener("touchstart", function (e) {
    touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener("touchend", function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    var dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy) * 1.6) go(dx < 0 ? 1 : -1);
    touchX = touchY = null;
  }, { passive: true });

  window.addEventListener("beforeunload", function () { if (synth) synth.cancel(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden) stopReadingThrough(); });

  /* ---------- Load ---------- */
  // Revised audio and its matching timing map must share a cache version.
  function bookAsset(path) {
    return base + path + (book && book.assetVersion ? "?v=" + encodeURIComponent(book.assetVersion) : "");
  }

  fetch(base + "book.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("book.json " + r.status); return r.json(); })
    .then(function (b) {
      book = b;
      document.title = b.title + " — Luna's Story Time";
      document.getElementById("readerTitle").textContent = b.title;

      pages.push({
        kind: "cover",
        audioId: "cover",
        title: b.title,
        kicker: b.subtitle,
        speakText: b.series === "dreamed-up-by-you"
          ? b.title + ". " + b.subtitle + "."
          : b.title + ". " + b.subtitle + ". Written with love by " + joinAuthors(b.authors) + ".",
        image: b.cover.image,
        effect: b.cover.effect,
        alt: "Cover: " + b.title,
        emoji: "🌙",
        textPosition: "bottom",
        vocab: [],
        vocabMap: {},
        vocabLookup: {}
      });

      b.spreads.forEach(function (s) {
        var vocabMap = {}, vocabLookup = {};
        (s.vocab || []).forEach(function (v) {
          var key = v.word.toLowerCase();
          vocabMap[key] = true;
          vocabLookup[key] = v;
          if (key.endsWith("s")) { vocabMap[key.slice(0, -1)] = true; vocabLookup[key.slice(0, -1)] = v; }
          else { vocabMap[key + "s"] = true; vocabLookup[key + "s"] = v; }
        });
        pages.push({
          kind: "spread",
          audioId: (s.number < 10 ? "0" : "") + s.number,
          number: s.number,
          title: s.title,
          kicker: "Page " + s.number + " of " + b.spreads.length,
          speakText: s.text,
          refrain: !!s.refrain,
          theEnd: s.theEnd,
          image: s.image,
          effect: s.effect,
          alt: "Illustration: " + s.title,
          emoji: "✨",
          textPosition: s.textPosition === "top" ? "top" : "bottom",
          vocab: s.vocab || [],
          vocabMap: vocabMap,
          vocabLookup: vocabLookup
        });
      });

      pages.push({ kind: "finale", title: "Wonder Together", textPosition: "bottom" });

      pages.forEach(function (p, i) {
        var btn = document.createElement("button");
        btn.textContent = p.kind === "cover" ? "🌕" : p.kind === "finale" ? "⭐" : "🌙";
        btn.setAttribute("aria-label", p.kind === "cover" ? "Cover" : p.kind === "finale" ? "Wonder together" : "Page " + p.number);
        btn.addEventListener("click", function () { renderPage(i, i > current ? 1 : -1); });
        moonsNav.appendChild(btn);
      });

      // Resume where we left off — unless that was the finale, in which case
      // the book is finished and we start back at the cover.
      var startPage = 0;
      var saved = readerState.books[slug];
      if (saved && typeof saved.page === "number") {
        var clamped = Math.max(0, Math.min(saved.page, pages.length - 1));
        if (clamped > 0 && pages[clamped].kind !== "finale") startPage = clamped;
      }
      track("story_open", { book: slug, title: b.title, pages: b.spreads.length, resumedAt: startPage });
      renderPage(startPage, 0);

      // Pre-generated narration is optional; the Web Speech voice covers its absence.
      fetch(bookAsset("narration/timings.json"))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (t) { narration = t; })
        .catch(function () { narration = null; });
      fetch(bookAsset("narration/words.json"))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (w) { wordSprite = w; })
        .catch(function () { wordSprite = null; });
    })
    .catch(function (err) {
      host.innerHTML = '<div class="text-panel"><h2 class="spread-title">Oh no!</h2>' +
        '<p class="story-text">This storybook couldn\'t be opened (' + err.message + "). " +
        '<a href="index.html">Back to the bookshelf</a>.</p></div>';
    });
})();
