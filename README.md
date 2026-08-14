# Luna's Story Time 🌙

Magical, read-aloud children's storybooks for little dreamers — a static site, no build step.

**Live site:** https://kolatts.github.io/luna-story-time/

## Features
- 🔊 **Read to me** — Web Speech API narration with per-word highlighting
- 👆 **Tap any word** to hear it spoken
- ✨ **Sparkle words** — tappable vocabulary with kid-friendly definitions
- 📖✨ **Storytime mode** — reads every page and turns them automatically
- 🌙 **Wonder Together** — discussion questions + look-and-find after every book
- Mobile/tablet/desktop responsive, parallax landing page, painted-storybook art

## Adding a book
Use the `add-story` skill in `.claude/skills/add-story/` — it captures the whole pipeline
(manuscript → `book.json` → artwork via the image-generation skill → playtest → deploy).
Short version: add a folder under `books/<slug>/` with a `book.json` (see the schema in
the first book) and 4:5 images in `images/`, then list the book in `books/series.json`.

## Local preview
Any static server works, e.g. `python -m http.server 8080`.
