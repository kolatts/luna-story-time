# Luna's Story Time 🌙

Magical, read-aloud children's storybooks for little dreamers — a static site, no build step.

**Live site:** https://kolatts.github.io/luna-story-time/

## Features
- 🔊 **Read to me** — warm neural narration (Azure "Ana" voice, pre-generated per page) with per-word highlighting synced from word-boundary timings; Web Speech API fallback when narration files are absent
- 👆 **Tap any word** to hear it spoken
- ✨ **Sparkle words** — tappable vocabulary with kid-friendly definitions
- ⏱ **Auto page-turn** — press play and it reads the whole book, counting down (3, 5 or 10 seconds) before each page turn; tap ⏱ to change the wait or switch it off, remembered on this device
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

## Usage tracking
`js/track.js` sends a few cookieless custom events (story opened / page reached / read to
the end, idea form seen / clicked / sent, game opened / played) straight to the
`luna-storytime-ai` Application Insights resource. Only `kolatts.github.io` reports; add
`?track=1` to a local URL to send `env=dev` test events. No cookies or localStorage, just a
random per-tab id in sessionStorage.

The **Luna's Story Time — Usage** workbook (`analytics/usage-workbook.bicep`) compares the
last 14 days with the 14 before. Find it in the Azure portal under `luna-storytime-ai` →
Workbooks. Redeploy after editing:
```
az deployment group create --subscription "Imagile Paid" -g imagile-organization -f analytics/usage-workbook.bicep
```
