# Books — voice the dialogue, keep Ana narrating

Today every word of every book is Ana (`scripts/generate-narration.py`). We want the **quoted dialogue
spoken by the character who says it**, using the same voices they have in the game, while everything
outside the quotes stays Ana exactly as it is now.

Casting is `scripts/voice-cast.json` — the single source of truth shared with the game. Read it; do
not hardcode voices. If a speaking character has no entry, add one (see `_unassigned` in that file).

## The hard constraint: the artifact contract must not change

`js/reader.js` must keep working untouched. Per book, `narration/` keeps exactly today's shape:

- `<page>.mp3` — one file per page, now possibly multi-voice
- `timings.json` — `{ "<page>": [[audioMs, charOffsetIntoPageText, wordLength], ...] }`
- `words.mp3` / `words.json` / `vocab/*.mp3` — **unchanged, still Ana** (tap-a-word and vocab popups
  are teaching aids, not performance)

So `charOffset` must still index into the *page text* the reader renders, and `audioMs` must be the
offset into the concatenated page audio. Getting this right is the whole job: a drifting highlight is
worse than a single-voice reading.

## Attribution: `books/<slug>/voices.json` (new file)

Do not edit `book.json`. Write a sibling file per book:

```jsonc
{
  "slug": "dirt-and-the-blue-sisters-pot",
  "spreads": {
    "02": [
      { "voice": "narrator",   "text": "Cottontail bounced in, all spots and hurry.\n" },
      { "voice": "cottontail", "text": "\"Come on, come ON! Come meet my dirt friend!\"\n" },
      { "voice": "moon",       "text": "\"Your friend named Dirt?\"\n" },
      { "voice": "cottontail", "text": "\"My dirt friend. You'll see.\"\n" },
      { "voice": "narrator",   "text": "\n Down in the garden, a garden bed rumpled. ..." }
    ]
  }
}
```

Rules for segmentation:
- **Concatenating every segment's `text` in order must reproduce the page's `text` byte-for-byte**
  (including newlines and the `" … " + refrain` suffix on refrain spreads, exactly as
  `pages_for()` builds it today). Assert this in code; a mismatch is a hard failure.
- Split only at quote boundaries. A speech tag ("said Baby Lady", "whistled Dirt") stays with the
  **narrator** segment, not the character — the character speaks only what is inside the quotes.
- Attribute from the text itself: the speech tag, or unambiguous context (a reply in a two-hander, a
  line whose content only one character could say). If a quote is genuinely ambiguous, leave it
  `narrator` rather than guessing — an unvoiced line is fine, a wrong voice is not.
- Choral lines ("they said at exactly the same time") stay `narrator`.
- Spreads with no dialogue may be omitted entirely; they keep their existing Ana audio and are not
  regenerated.
- The `cover` page is always pure narrator and is never segmented.

## Generation

Extend `scripts/generate-narration.py` (keep it working exactly as today for books with no
`voices.json`):

- When `voices.json` exists for a book, build each listed page by synthesizing **each segment
  separately** with its cast voice + prosody (SSML), then concatenating.
- Rebuild `timings.json` for those pages: for each segment, collect word boundaries relative to the
  segment, map each boundary word to its position in the page text by scanning forward from a cursor
  (the same "find the next occurrence in order" technique the script already uses for the SSML path,
  seeded at the segment's known start offset), and add the cumulative audio duration of all preceding
  segments to `audioMs`.
- Concatenate audio with **ffmpeg** if it is on PATH (`-f concat` or `-i "concat:..."` with
  `-c copy`); otherwise fall back to byte-concatenating the MP3 payloads. Every segment must be
  synthesized at the same output format the script already uses
  (`Audio24Khz48KBitRateMonoMp3`) so frames splice cleanly.
- Only regenerate pages that appear in `voices.json`. Leave every other page's mp3 untouched.
- `--force` still forces; without it, skip pages whose mp3 is newer than the book's `voices.json`.

## Scope

All 7 books under `books/` that have a `book.json`. Work book by book, newest first
(`poodle-hairs-and-the-mermaids-tale` first) so partial progress is still useful.

## Verify (per book, and report the numbers)

1. Segment concatenation equals page text — assert for every segmented page.
2. `timings.json` for regenerated pages: strictly non-decreasing `audioMs`; every `charOffset +
   wordLength` within the page text's length; the word at each `charOffset` matches the boundary word
   that produced it (case/punctuation-insensitive). Report any page failing this.
3. Audio duration ≈ sum of segment durations (within ~150 ms), and the mp3 plays: decode with ffprobe
   if available and confirm the reported duration matches the last timing entry within ~1.5 s.
4. Spot-check in the browser with playwright-cli: open
   `reader.html?book=<slug>`, press play on a segmented spread, and assert the highlighted word
   (`.w.speaking`) advances and that its text matches the word the timing says should be active at
   that moment. Do this for at least two different books.
5. Confirm `words.mp3`, `words.json` and `vocab/` are byte-identical to before (they must not be
   regenerated).
