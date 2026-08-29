/* Luna's Story Time — storybook reader
 * Read-aloud via the Web Speech API with word-level highlighting,
 * tap-a-word pronunciation, sparkle-word definitions, and storytime auto-advance.
 */
(function () {
  "use strict";

  var params = new URLSearchParams(location.search);
  var slug = params.get("book") || "princess-moon-and-the-nevershine-lantern";
  var base = "books/" + slug + "/";

  var book = null;
  var pages = [];        // cover page + spreads + finale
  var current = 0;
  var slow = false;
  var autoMode = false;
  var speaking = false;
  var renderCount = 0;   // used to skip the initial-load focus steal

  var host = document.getElementById("spreadHost");
  var moonsNav = document.getElementById("progressMoons");
  var playBtn = document.getElementById("playBtn");
  var prevBtn = document.getElementById("prevBtn");
  var nextBtn = document.getElementById("nextBtn");
  var bigTextBtn = document.getElementById("bigTextBtn");
  var speedBtn = document.getElementById("speedBtn");
  var autoBtn = document.getElementById("autoBtn");

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

  // Storytime/auto mode is deliberately never restored — a page that starts
  // talking on load is startling, and it's the one toggle with audible side effects.
  if (readerState.prefs.bigText) {
    document.body.classList.add("big-text");
    bigTextBtn.setAttribute("aria-pressed", "true");
  }
  if (readerState.prefs.slow) {
    slow = true;
    speedBtn.setAttribute("aria-pressed", "true");
  }

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
    if (synth) synth.cancel();
    if (audio) { audio.pause(); audio.removeAttribute("src"); audio.load(); }
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (segTimer) { clearTimeout(segTimer); segTimer = null; }
    if (spriteAudio) spriteAudio.pause();
    if (vocabAudio) vocabAudio.pause();
    speaking = false;
    playBtn.textContent = "🔊";
    playBtn.setAttribute("aria-label", "Read this page to me");
    clearHighlights();
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
    audio.src = base + "narration/" + page.audioId + ".mp3";
    audio.playbackRate = slow ? 0.75 : 1;

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
      playBtn.textContent = "🔊";
      playBtn.setAttribute("aria-label", "Read this page to me");
      clearHighlights();
      if (onDone) onDone();
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
    playBtn.textContent = "⏸";
    playBtn.setAttribute("aria-label", "Stop reading");
    rafId = requestAnimationFrame(tick);
  }

  function speakText(text, onDone, wordSpans) {
    if (!synth) { if (onDone) onDone(); return; }
    synth.cancel();
    var u = new SpeechSynthesisUtterance(text);
    if (chosenVoice) u.voice = chosenVoice;
    u.rate = slow ? 0.72 : 0.92;
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
      playBtn.textContent = "🔊";
      playBtn.setAttribute("aria-label", "Read this page to me");
      clearHighlights();
      if (onDone) onDone();
    };
    u.onerror = function () {
      speaking = false;
      playBtn.textContent = "🔊";
      playBtn.setAttribute("aria-label", "Read this page to me");
      clearHighlights();
    };
    speaking = true;
    playBtn.textContent = "⏸";
    playBtn.setAttribute("aria-label", "Stop reading");
    synth.speak(u);
  }

  function speakWord(word) {
    if (!synth) return;
    var wasAuto = autoMode;
    autoMode = false; // a tapped word shouldn't trigger page-advance chains
    synth.cancel();
    var u = new SpeechSynthesisUtterance(word);
    if (chosenVoice) u.voice = chosenVoice;
    u.rate = 0.75;
    u.pitch = 1.1;
    u.onend = function () { autoMode = wasAuto; };
    synth.speak(u);
  }

  /* Say one word with the Ana voice via the word sprite; browser voice fallback. */
  function sayWord(word) {
    if (speaking) stopSpeaking();
    var seg = wordSprite && wordSprite[word];
    if (!seg) { speakWord(word); return; }
    if (!spriteAudio) {
      spriteAudio = new Audio(base + "narration/words.mp3");
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
    if (speaking) stopSpeaking();
    if (!vocabAudio) { vocabAudio = new Audio(); vocabAudio.preload = "auto"; }
    var key = stripPunct(entry.word);
    vocabAudio.onerror = function () { speakWord(entry.word + ". " + entry.definition); };
    vocabAudio.src = base + "narration/vocab/" + key + ".mp3";
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

  function makeArt(src, alt, placeholderEmoji) {
    var wrap = document.createElement("div");
    wrap.className = "art-frame kenburns";
    var img = document.createElement("img");
    img.alt = alt;
    img.onerror = function () {
      img.remove();
      var ph = document.createElement("div");
      ph.className = "art-placeholder";
      ph.textContent = placeholderEmoji || "🌙";
      wrap.appendChild(ph);
    };
    img.src = base + src;
    wrap.appendChild(img);
    return wrap;
  }

  function renderPage(idx, dir) {
    renderCount++;
    stopSpeaking();
    current = idx;
    host.innerHTML = "";
    var page = pages[idx];

    var spreadEl = document.createElement("section");
    spreadEl.className = "spread " + (page.textPosition === "top" ? "text-top" : "text-bottom") +
      (dir === 1 ? " turning-next" : dir === -1 ? " turning-prev" : "");

    if (page.kind === "finale") {
      renderFinale(spreadEl);
    } else {
      spreadEl.appendChild(makeArt(page.image, page.alt, page.emoji));

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

    if (autoMode && page.kind !== "finale") {
      setTimeout(function () { if (autoMode && current === idx) playCurrent(); }, 450);
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

  function playCurrent() {
    var page = pages[current];
    if (page.kind === "finale") return;
    if (speaking) { stopSpeaking(); return; }
    var onDone = function () {
      if (autoMode && current < pages.length - 1) {
        setTimeout(function () { if (autoMode) go(1); }, 900);
      }
    };
    if (narration && page.audioId && narration[page.audioId]) {
      playNarration(page, onDone);
    } else {
      speakText(page.speakText + (page.refrain ? " … " + book.refrain : ""), onDone, page.spans);
    }
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
  nextBtn.addEventListener("click", function () { go(1); });
  playBtn.addEventListener("click", playCurrent);

  bigTextBtn.addEventListener("click", function () {
    var on = document.body.classList.toggle("big-text");
    this.setAttribute("aria-pressed", String(on));
    readerState.prefs.bigText = on;
    saveReaderState(readerState);
  });
  speedBtn.addEventListener("click", function () {
    slow = !slow;
    this.setAttribute("aria-pressed", String(slow));
    if (audio && !audio.paused) audio.playbackRate = slow ? 0.75 : 1;
    readerState.prefs.slow = slow;
    saveReaderState(readerState);
  });
  autoBtn.addEventListener("click", function () {
    autoMode = !autoMode;
    this.setAttribute("aria-pressed", String(autoMode));
    if (autoMode && !speaking) playCurrent();
    if (!autoMode) stopSpeaking();
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
    if (e.key === "Escape") { closePop(); stopSpeaking(); return; }
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
  document.addEventListener("visibilitychange", function () { if (document.hidden) stopSpeaking(); });

  /* ---------- Load ---------- */
  fetch(base + "book.json")
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
          : b.title + ". " + b.subtitle + ". Written with love by " + b.authors.join(" and ") + ".",
        image: b.cover.image,
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
      renderPage(startPage, 0);

      // Pre-generated narration is optional; the Web Speech voice covers its absence.
      fetch(base + "narration/timings.json")
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (t) { narration = t; })
        .catch(function () { narration = null; });
      fetch(base + "narration/words.json")
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
