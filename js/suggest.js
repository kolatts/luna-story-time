/* Luna's Story Time — story suggestion form */
(function () {
  "use strict";

  var form = document.getElementById("suggestForm");
  if (!form) return;

  var isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  var API_BASE = isLocal
    ? "http://localhost:7071/api"
    : "https://luna-storytime-functions.azurewebsites.net/api";

  /* Cloudflare Turnstile (skipped during local playtests — the API skips
     verification too when no secret is configured) */
  var TURNSTILE_SITEKEY = "0x4AAAAAAC8hdd6wCVRVf8YH";
  var turnstileWidgetId = null;
  window.onTurnstileReady = function () {
    if (isLocal || !window.turnstile) return;
    turnstileWidgetId = window.turnstile.render("#suggestTurnstile", {
      sitekey: TURNSTILE_SITEKEY,
      theme: "dark"
    });
  };

  var ideaEl = document.getElementById("suggestIdea");
  var nameEl = document.getElementById("suggestName");
  var locationEl = document.getElementById("suggestLocation");
  var statusEl = document.getElementById("suggestStatus");
  var button = form.querySelector("button[type=submit]");

  function setStatus(message, kind) {
    statusEl.textContent = message;
    statusEl.className = "form-status" + (kind ? " " + kind : "");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var idea = ideaEl.value.trim();
    if (idea.length < 3) {
      setStatus("Tell us a little more about your story idea first!", "error");
      ideaEl.focus();
      return;
    }

    var turnstileToken = "";
    if (!isLocal) {
      turnstileToken = (window.turnstile && turnstileWidgetId !== null)
        ? window.turnstile.getResponse(turnstileWidgetId)
        : "";
      if (!turnstileToken) {
        setStatus("One moment — the magic gate is still checking. Try again in a second.", "error");
        return;
      }
    }

    button.disabled = true;
    setStatus("Sending your idea to the castle…");

    fetch(API_BASE + "/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idea: idea,
        name: nameEl.value.trim(),
        location: locationEl.value.trim(),
        website: form.elements.website.value,
        turnstileToken: turnstileToken
      })
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (body) {
          if (!r.ok || !body.ok) {
            var err = new Error(body.message || "");
            err.friendly = !!body.message;
            throw err;
          }
        });
      })
      .then(function () {
        var thanks = document.createElement("p");
        thanks.className = "suggest-thanks";
        thanks.textContent = "🦉 Your idea is flying to the castle! Maybe one day it will be a story on this shelf.";
        form.replaceWith(thanks);
      })
      .catch(function (err) {
        setStatus(err.friendly
          ? err.message
          : "The castle owls are napping — please try again in a moment.", "error");
        button.disabled = false;
        if (!isLocal && window.turnstile && turnstileWidgetId !== null) {
          try { window.turnstile.reset(turnstileWidgetId); } catch (e) { /* not rendered */ }
        }
      });
  });
})();
