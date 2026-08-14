---
name: add-story
description: Add a new storybook to Luna's Story Time — turns a manuscript into a book.json, generates on-model artwork with the image-generation skill, playtests, and deploys. Use when the user provides a new story/manuscript, asks to add a book, create book two, regenerate spread art, or edit an existing book's text or images.
---

# Add a story to Luna's Story Time

Luna's Story Time is a static, no-build site (vanilla JS) published to GitHub Pages from the `main` branch of `kolatts/luna-story-time`. Live at https://kolatts.github.io/luna-story-time/. The site reads `books/series.json` for the bookshelf and `books/<slug>/book.json` for each book — **adding a book means adding a folder; no site code changes needed.**

## Pipeline overview

1. Manuscript → `books/<slug>/book.json`
2. Artwork → `imagile-dev-tools:image-generation` skill → `books/<slug>/images/`
3. Register in `books/series.json`
4. Playtest locally in the browser
5. Commit, push to `main` — GitHub Pages redeploys automatically. Verify live.

## 1. book.json

Copy the schema from `books/princess-moon-and-the-nevershine-lantern/book.json`. Rules:

- `slug`: kebab-case, matches the folder name.
- `spreads[].text`: plain text, `\n` for line breaks, `\n\n` between stanzas. **Strip markdown emphasis** (`*word*` → `word`).
- The book's repeating refrain goes ONLY in the top-level `refrain` field; on spreads where it appears, set `"refrain": true` (do not duplicate the line in `text`). The reader renders it as a styled "Say it with me" callout and appends it to narration.
- `spreads[].textPosition`: `"top"` or `"bottom"` — alternate so the layout varies; use `"top"` when the image's focal subject is in the lower half.
- `spreads[].vocab`: 1–2 "sparkle words" per spread, each `{word, definition}` with a definition a 4-year-old understands. Pick words actually present in that spread's text (matching is case-insensitive, simple s-plural aware).
- `characters[].sheet`: verbatim visual description; these get appended to image prompts so characters stay on-model. Never paraphrase an existing character's sheet — reuse it exactly across books.
- `questions`: 4 gentle discussion prompts; `lookAndFind`: one seek-and-find sentence.
- Last spread may carry `"theEnd": "The End — ..."`.
- Keep `imagePrompt` (scene description WITHOUT character sheets or style) on every spread and the cover, so any image can be regenerated later.

**Proofread**: delegate a subagent to diff book.json text against the manuscript word-by-word and to check JSON validity/consistency (spread numbers, image paths, character ids). Preserve authorial voice — quirky rhymes and invented words are intentional; only fix true typos, and confirm with the user if a change to the manuscript's words seems needed.

## 2. Artwork

Use the `imagile-dev-tools:image-generation` skill (OpenAI Images API). The global art style lives in `.claude/image-generation/style.md` and is auto-appended to every prompt — don't restate it in prompts, and don't change it without the user asking (visual consistency across books is the product).

- Per-spread prompt = `spreads[].imagePrompt` + the `sheet` of every character in `spreads[].characters`.
- Size **1024x1280** (4:5 portrait) for cover + spreads, quality `medium` (≈$0.07/image; a 17-image book ≈ $1.20). Only use `high` for the landing hero or if the user asks.
- Slugs `spread-01`…`spread-16`, `cover`. Generate with a background bash loop over prompt files (see `.claude/image-generation/generate-all.sh` for the pattern — it skips already-generated slugs, so re-running is safe).
- **Convert to WebP for the site** — the generated PNGs are ~2.5 MB; the site serves WebP (~200 KB). Run `uv run --with pillow python .claude/image-generation/to-webp.py <pngs...>` and copy results to `books/<slug>/images/01.webp`…`16.webp` and `cover.webp`. book.json image paths use `.webp`. Original PNGs stay in the run folders as the archival record (don't commit multi-MB PNGs into `books/`).
- **Review every image** (Read tool) for: character on-model (wings/tail/crown/colors), no text/letters baked into the art, nothing frightening for ages 4–8, and the scene matching the spread. Regenerate misses; for small fixes use `--edit` on the existing PNG.
- **Prompt pitfalls learned the hard way**: character names that are animal words get literalized (a "Cottontail" became a rabbit — say "the young jaguar cub" in prompts, and add "no rabbits/no other animals" when burned); very dark scenes can come back as a solid black frame (reword to make the light sources explicit); the model loves adding uninvited background animals to nature scenes. `.claude/image-generation/make-prompts.py` builds prompt files straight from a book.json (imagePrompt + sheets).
- Cover art should leave open sky/space in the upper third (site may overlay the title later).

## 3. Register the book

Append to `books/series.json` under the right series (create a new series entry if needed): `slug`, `title`, `subtitle`, `ageRange`, `cover` path. Remove/keep the "coming soon" card logic alone — it's generated in `js/main.js`.

## 4. Playtest

Serve locally (`python -m http.server 8080`) and check with browser tools, at mobile (375px), tablet (768px), and desktop widths:

- Bookshelf shows the new cover; card links to `reader.html?book=<slug>`.
- Every page renders: art loads (no 🌙 placeholder), text matches, sparkle words glow and pop definitions, refrain callout appears on the right spreads.
- Read-aloud plays and highlights words (needs a real browser voice; headless CI may lack voices — verify manually or via the Browser pane, not just playwright).
- Storytime mode auto-advances; prev/next, moons nav, swipe, arrow keys work.
- Nothing overflows horizontally on mobile.

## 5. Deploy

```bash
git add -A && git commit -m "Add <title> (book N)" && git push
```

GitHub Pages serves `main` @ `/ (root)` — no build step, no action needed. Wait ~1 minute, then verify the live URL in a browser (bookshelf + open the new book + read a page aloud). The site must never require a build step; keep everything static and relative-pathed (no leading `/` in URLs — it's hosted under `/luna-story-time/`).

## Voice & content guardrails

- Stories are for ages 4–8: dramatic is fine, frightening/gory is not.
- Definitions and questions address the child directly, warm and simple.
- Keep the manuscript's line breaks and stanza structure exactly — the rhythm is the point.
