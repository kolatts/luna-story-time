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

  /* --- Bookshelf from series.json --- */
  var shelf = document.getElementById("shelf");
  if (!shelf) return;

  fetch("books/series.json")
    .then(function (r) { if (!r.ok) throw new Error("series.json " + r.status); return r.json(); })
    .then(function (data) {
      data.series.forEach(function (series) {
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
          shelf.appendChild(card);
        });
      });
      var soon = document.createElement("article");
      soon.className = "book-card coming-soon";
      soon.innerHTML =
        '<div class="cover-wrap">🌙…</div>' +
        '<div class="card-body"><h3>The next adventure</h3>' +
        '<p class="sub">Castle Everstair, Book Four — coming soon.</p>' +
        '<span class="badge">Shhh, it’s still a dream</span></div>';
      shelf.appendChild(soon);
    })
    .catch(function (err) {
      shelf.innerHTML = "<p>The bookshelf is napping (" + err.message + "). Please try again.</p>";
    });
})();
