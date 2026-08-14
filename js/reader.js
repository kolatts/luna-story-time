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

  var host = document.getElementById("spreadHost");
  var moonsNav = document.getElementById("progressMoons");
  var playBtn = document.getElementById("playBtn");
  var prevBtn = document.getElementById("prevBtn");
  var nextBtn = document.getElementById("nextBtn");

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
    speaking = false;
    playBtn.textContent = "🔊";
    playBtn.setAttribute("aria-label", "Read this page to me");
    clearHighlights();
  }

  function clearHighlights() {
    var lit = host.querySelectorAll(".w.speaking");
    for (var i = 0; i < lit.length; i++) lit[i].classList.remove("speaking");
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
      clearHighlights();
      if (onDone) onDone();
    };
    u.onerror = function () {
      speaking = false;
      playBtn.textContent = "🔊";
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
    img.src = base + src;
    img.onerror = function () {
      img.remove();
      var ph = document.createElement("div");
      ph.className = "art-placeholder";
      ph.textContent = placeholderEmoji || "🌙";
      wrap.appendChild(ph);
    };
    wrap.appendChild(img);
    return wrap;
  }

  function renderPage(idx, dir) {
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
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });

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
    actions.appendChild(again);
    actions.appendChild(home);
    panel.appendChild(actions);

    wrap.appendChild(panel);
    spreadEl.appendChild(wrap);
  }

  function updateChrome() {
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === pages.length - 1;
    var moons = moonsNav.querySelectorAll("button");
    for (var i = 0; i < moons.length; i++) {
      moons[i].classList.toggle("current", i === current);
      moons[i].classList.toggle("done", i < current);
    }
    var page = pages[current];
    playBtn.style.visibility = page.kind === "finale" ? "hidden" : "visible";
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
    speakText(page.speakText + (page.refrain ? " … " + book.refrain : ""), function () {
      if (autoMode && current < pages.length - 1) {
        setTimeout(function () { if (autoMode) go(1); }, 900);
      }
    }, page.spans);
  }

  /* ---------- Vocab popup ---------- */
  var pop = null;
  function closePop() { if (pop) { pop.remove(); pop = null; } }
  function showVocab(word, anchorRect) {
    closePop();
    var entry = pages[current].vocabLookup && pages[current].vocabLookup[word];
    if (!entry) return;
    pop = document.createElement("div");
    pop.className = "vocab-pop";
    pop.setAttribute("role", "dialog");
    pop.innerHTML =
      '<button class="vp-close" aria-label="Close">✖</button>' +
      '<div class="vp-word">✨ ' + entry.word + "</div>" +
      '<div class="vp-def">' + entry.definition + "</div>" +
      '<button class="vp-say">🔊 Say it</button>';
    document.body.appendChild(pop);
    var top = Math.min(anchorRect.bottom + 10, window.innerHeight - pop.offsetHeight - 16);
    var left = Math.min(Math.max(12, anchorRect.left), window.innerWidth - pop.offsetWidth - 12);
    pop.style.top = top + "px";
    pop.style.left = left + "px";
    pop.querySelector(".vp-close").addEventListener("click", closePop);
    pop.querySelector(".vp-say").addEventListener("click", function () {
      speakWord(entry.word + ". " + entry.definition);
    });
    speakWord(entry.word);
  }

  /* ---------- Events ---------- */
  prevBtn.addEventListener("click", function () { go(-1); });
  nextBtn.addEventListener("click", function () { go(1); });
  playBtn.addEventListener("click", playCurrent);

  document.getElementById("bigTextBtn").addEventListener("click", function () {
    var on = document.body.classList.toggle("big-text");
    this.setAttribute("aria-pressed", String(on));
  });
  document.getElementById("speedBtn").addEventListener("click", function () {
    slow = !slow;
    this.setAttribute("aria-pressed", String(slow));
  });
  document.getElementById("autoBtn").addEventListener("click", function () {
    autoMode = !autoMode;
    this.setAttribute("aria-pressed", String(autoMode));
    if (autoMode && !speaking) playCurrent();
    if (!autoMode) stopSpeaking();
  });

  host.addEventListener("click", function (e) {
    var t = e.target;
    if (t.classList && t.classList.contains("vocab-chip")) {
      showVocab(t.getAttribute("data-vocab"), t.getBoundingClientRect());
      return;
    }
    if (t.classList && t.classList.contains("w")) {
      var v = t.getAttribute("data-vocab");
      if (v) { showVocab(v, t.getBoundingClientRect()); return; }
      var w = t.getAttribute("data-word");
      if (w) {
        t.classList.add("speaking");
        setTimeout(function () { t.classList.remove("speaking"); }, 900);
        speakWord(w);
      }
    }
  });
  document.addEventListener("click", function (e) {
    if (pop && !pop.contains(e.target) && !(e.target.classList && (e.target.classList.contains("sparkle") || e.target.classList.contains("vocab-chip")))) closePop();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
    else if (e.key === " " && e.target === document.body) { e.preventDefault(); playCurrent(); }
    else if (e.key === "Escape") { closePop(); stopSpeaking(); }
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
        title: b.title,
        kicker: b.subtitle,
        speakText: b.title + ". " + b.subtitle + ". Written with love by " + b.authors.join(" and ") + ".",
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

      renderPage(0, 0);
    })
    .catch(function (err) {
      host.innerHTML = '<div class="text-panel"><h2 class="spread-title">Oh no!</h2>' +
        '<p class="story-text">This storybook couldn\'t be opened (' + err.message + "). " +
        '<a href="index.html">Back to the bookshelf</a>.</p></div>';
    });
})();
