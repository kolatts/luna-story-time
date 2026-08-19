/* Luna's Story Time — story suggestion form */
(function () {
  "use strict";

  var form = document.getElementById("suggestForm");
  if (!form) return;

  var API_BASE =
    location.hostname === "localhost" || location.hostname === "127.0.0.1"
      ? "http://localhost:7071/api"
      : "https://luna-storytime-functions.azurewebsites.net/api";

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

    button.disabled = true;
    setStatus("Sending your idea to the castle…");

    fetch(API_BASE + "/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idea: idea,
        name: nameEl.value.trim(),
        location: locationEl.value.trim(),
        website: form.elements.website.value
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
      });
  });
})();
