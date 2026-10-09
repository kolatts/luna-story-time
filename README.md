# Luna's Story Time 🌙

Magical, read-aloud children's storybooks for little dreamers — a static site, no build step.

**Live site:** https://kolatts.github.io/luna-story-time/

## Features
- 🔊 **Read to me** — warm neural narration (Azure "Ana" voice, pre-generated per page) with per-word highlighting synced from word-boundary timings; Web Speech API fallback when narration files are absent
- 👆 **Tap any word** to hear it spoken
- ✨ **Sparkle words** — tappable vocabulary with kid-friendly definitions
- 📖✨ **Storytime mode** — reads every page and turns them automatically
- 🌙 **Wonder Together** — discussion questions + look-and-find after every book
- Mobile/tablet/desktop responsive, parallax landing page, painted-storybook art
- Ruby's Dragon Bonds stories add brief cinematic embers, bubbles, and violet magic on page turns; reduced-motion preferences disable them.

## Adding a book
Use the `add-story` skill in `.agents/skills/add-story/` — it captures the whole pipeline
(manuscript → `book.json` → artwork via the image-generation skill → playtest → deploy).
Short version: add a folder under `books/<slug>/` with a `book.json` (see the schema in
the first book) and 4:5 images in `images/`, then list the book in `books/series.json`.

Optional `effect` on a cover or spread selects `embers`, `bubbles`, `vortex`,
`bond` (fire and water), or `starlight`. Effects stay inside the illustration,
finish within five seconds, and never intercept taps. Omit it for plain artwork.

## Local preview
`python -m http.server` lacks HTTP Range support, so narration/word-sprite audio seeking
silently fails locally (it works fine on GitHub Pages). Serve with:
```
uv run --with rangehttpserver python -m RangeHTTPServer 8080
```
If 8080 is occupied, use `8765 --bind 127.0.0.1` and open
`http://127.0.0.1:8765/`. Push `main` to publish through GitHub Pages, then verify
the live bookshelf and reader at the link above.
