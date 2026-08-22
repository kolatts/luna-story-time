/* Luna's Story Time — landing page: parallax + bookshelf */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- Starfield --- */
  var starLayer = document.getElementById("starLayer");
  if (starLayer) {
    for (var i = 0; i < 70; i++) {
      var s = document.createElement("span");
      s.className = "star";
      var size = 1 + Math.random() * 2.6;
      s.style.width = size + "px";
      s.style.height = size + "px";
      s.style.left = Math.random() * 100 + "%";
      s.style.top = Math.random() * 100 + "%";
      s.style.animationDelay = Math.random() * 3 + "s";
      s.style.animationDuration = 2.2 + Math.random() * 3 + "s";
      starLayer.appendChild(s);
    }
  }

  /* --- Floating sparkles --- */
  var sparkleLayer = document.getElementById("sparkleLayer");
  if (sparkleLayer && !reduceMotion) {
    var glyphs = ["✦", "✧", "⋆", "✨", "🌙"];
    for (var j = 0; j < 14; j++) {
      var d = document.createElement("span");
      d.className = "drift";
      d.textContent = glyphs[j % glyphs.length];
      d.style.left = Math.random() * 100 + "%";
      d.style.fontSize = 0.6 + Math.random() * 1.2 + "rem";
      d.style.animationDuration = 9 + Math.random() * 14 + "s";
      d.style.animationDelay = -Math.random() * 20 + "s";
      sparkleLayer.appendChild(d);
    }
  }

  /* --- Parallax: scroll + gentle pointer drift --- */
  var layers = Array.prototype.slice.call(document.querySelectorAll(".hero-layer, .hero-content"));
  var pointerX = 0, pointerY = 0, ticking = false;

  function applyParallax() {
    ticking = false;
    var sc = window.scrollY || 0;
    layers.forEach(function (layer) {
      var depth = parseFloat(layer.getAttribute("data-depth") || "0.5");
      var ty = sc * (1 - depth) * 0.55;
      var tx = pointerX * (1 - depth) * 26;
      var tp = pointerY * (1 - depth) * 14;
      layer.style.transform = "translate3d(" + tx + "px," + (ty + tp) + "px,0)";
    });
  }
  function requestParallax() {
    if (!ticking) { ticking = true; requestAnimationFrame(applyParallax); }
  }
  if (!reduceMotion) {
    window.addEventListener("scroll", requestParallax, { passive: true });
    window.addEventListener("pointermove", function (e) {
      pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
      pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
      requestParallax();
    }, { passive: true });
    applyParallax();
  }

  /* --- Bookshelf from series.json (collapsible per series) --- */
  var shelf = document.getElementById("shelf");
  if (!shelf) return;

  var SHELF_STATE_KEY = "luna-shelves-v1";
  function loadShelfState() {
    try { return JSON.parse(localStorage.getItem(SHELF_STATE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveShelfState(state) {
    try { localStorage.setItem(SHELF_STATE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  fetch("books/series.json")
    .then(function (r) { if (!r.ok) throw new Error("series.json " + r.status); return r.json(); })
    .then(function (data) {
      var ordinals = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
      var shelfState = loadShelfState();
      data.series.forEach(function (series) {
        var block = document.createElement("section");
        block.className = "series-block";

        var collapsed = shelfState[series.id] === false; // stored value = expanded?
        var bodyId = "shelf-body-" + series.id;

        var head = document.createElement("button");
        head.type = "button";
        head.className = "series-head";
        head.setAttribute("aria-expanded", String(!collapsed));
        head.setAttribute("aria-controls", bodyId);
        head.innerHTML =
          '<span class="series-chevron" aria-hidden="true">⌄</span>' +
          '<span class="series-head-text"><span class="series-title">' + series.name + "</span>" +
          (series.description ? '<span class="series-sub">' + series.description + "</span>" : "") +
          "</span>" +
          '<span class="series-count">' + series.books.length + (series.books.length === 1 ? " book" : " books") + "</span>";
        block.appendChild(head);

        var body = document.createElement("div");
        body.className = "shelf-collapse" + (collapsed ? " collapsed" : "");
        body.id = bodyId;
        var inner = document.createElement("div");
        inner.className = "shelf-collapse-inner";
        body.appendChild(inner);

        head.addEventListener("click", function () {
          var nowCollapsed = !body.classList.contains("collapsed");
          body.classList.toggle("collapsed", nowCollapsed);
          head.setAttribute("aria-expanded", String(!nowCollapsed));
          shelfState[series.id] = !nowCollapsed;
          saveShelfState(shelfState);
        });

        var row = document.createElement("div");
        row.className = "shelf-row";
        series.books.forEach(function (book) {
          var card = document.createElement("article");
          card.className = "book-card";
          card.innerHTML =
            '<div class="cover-wrap"><img loading="lazy" alt="Cover of ' + book.title + '" src="' + book.cover + '"></div>' +
            '<div class="card-body">' +
            "<h3>" + book.title + "</h3>" +
            '<p class="sub">' + (book.subtitle || "") + "</p>" +
            '<span class="badge">Ages ' + book.ageRange + "</span>" +
            '<a class="read-btn" href="reader.html?book=' + encodeURIComponent(book.slug) + '">Read this story 🔊</a>' +
            "</div>";
          row.appendChild(card);
        });

        if (series.id === "castle-everstair") {
          var nextOrdinal = ordinals[series.books.length] || (series.books.length + 1);
          var soon = document.createElement("article");
          soon.className = "book-card coming-soon";
          soon.innerHTML =
            '<div class="cover-wrap">🌙…</div>' +
            '<div class="card-body"><h3>The next adventure</h3>' +
            '<p class="sub">Castle Everstair, Book ' + nextOrdinal + ' — coming soon.</p>' +
            '<span class="badge">Shhh, it’s still a dream</span></div>';
          row.appendChild(soon);
        }

        if (series.id === "dreamed-up-by-you") {
          var invite = document.createElement("article");
          invite.className = "book-card coming-soon";
          invite.innerHTML =
            '<div class="cover-wrap">💭</div>' +
            '<div class="card-body"><h3>Your idea could be the next story</h3>' +
            '<p class="sub">Tell us what should happen, and it might become a book right here.</p>' +
            '<a class="read-btn" href="#suggest">Dream up a story ✨</a></div>';
          row.appendChild(invite);
        }

        inner.appendChild(row);
        block.appendChild(body);
        shelf.appendChild(block);
      });
    })
    .catch(function (err) {
      shelf.innerHTML = "<p>The bookshelf is napping (" + err.message + "). Please try again.</p>";
    });

  /* --- The Playroom from games/games.json --- */
  var gamesShelf = document.getElementById("gamesShelf");
  if (gamesShelf) {
    fetch("games/games.json")
      .then(function (r) { if (!r.ok) throw new Error("games.json " + r.status); return r.json(); })
      .then(function (data) {
        var row = document.createElement("div");
        row.className = "shelf-row";
        (data.games || []).forEach(function (game) {
          var card = document.createElement("article");
          card.className = "book-card game-card";
          card.innerHTML =
            '<div class="cover-wrap"><img loading="lazy" alt="Cover of ' + game.title + '" src="' + game.cover + '"></div>' +
            '<div class="card-body">' +
            "<h3>" + game.title + "</h3>" +
            '<p class="sub">' + (game.subtitle || "") + "</p>" +
            (game.badge ? '<span class="badge">' + game.badge + "</span>" : "") +
            '<a class="read-btn" href="' + game.href + '">Play this game ✨</a>' +
            "</div>";
          var img = card.querySelector("img");
          img.addEventListener("error", function () {
            var wrap = card.querySelector(".cover-wrap");
            wrap.classList.add("cover-fallback");
            wrap.textContent = "🏰";
          });
          row.appendChild(card);
        });

        var soon = document.createElement("article");
        soon.className = "book-card coming-soon";
        soon.innerHTML =
          '<div class="cover-wrap">🧸…</div>' +
          '<div class="card-body"><h3>More games are brewing</h3>' +
          '<p class="sub">New ways to play in the world of Castle Everstair — coming soon.</p>' +
          '<span class="badge">Shhh, it’s still a dream</span></div>';
        row.appendChild(soon);

        gamesShelf.appendChild(row);
      })
      .catch(function (err) {
        gamesShelf.innerHTML = "<p>The toybox is napping (" + err.message + "). Please try again.</p>";
      });
  }
})();
