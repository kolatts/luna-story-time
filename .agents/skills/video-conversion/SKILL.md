---
name: video-conversion
description: Convert Luna Story Time books into illustrated read-along videos with series music, thumbnails, timed captions, Git-tracked assets, and optional YouTube publishing. Use for converting stories, making the next video batch, or publishing story videos.
---

# Luna Story Time video conversion

Work in the Luna repository (normally `C:/Code/luna-story-time`). This is an offline production
pipeline alongside the static website; the website must retain its no-build deployment.
Use `video/channel.json` for destination identity and playlists. The real channel is
**Luna Story Time / @LunaStoryTimeByImagile / UCjQzlYdsaZ5SGAORPidZ7PA**. Imagile's own
channel is a different destination. Never upload if Studio displays another channel.

## Select and plan

Read `books/series.json`, the selected `books/<slug>/book.json`, and `video/books/<slug>/publishing.json`
if it exists. Only `castle-everstair` and `ruby-and-the-dragon-bonds` are eligible; never include
`dreamed-up-by-you`. Preserve manuscript words, line breaks, refrains, and existing voices.

From the repository root:

```powershell
uv run --with pillow python scripts/convert-story-video.py next --series castle-everstair
uv run --with pillow python scripts/convert-story-video.py next --series ruby-and-the-dragon-bonds
uv run --with pillow python scripts/convert-story-video.py plan --slug <slug>
```

For “one next story each,” choose the first unconverted book in catalog order for each series.
Check the publishing ledger and Studio before uploading: a retry must not create a duplicate.
Use caller-selected output/work folders outside the repository for frames, temporary audio,
logs, and candidate renders. Stable deliverables belong under `video/` only after validation.

## Produce music and video

Prerequisites: `uv`, FFmpeg/FFprobe, Pillow, Windows Georgia fonts. Music uses the existing local
ACE-Step/ComfyUI backend in `C:/Code/claude-video-editor/tools`; override with `--backend-tools`
if necessary. Check `http://127.0.0.1:8188/system_stats`. If startup is needed, use the installed
official ComfyUI entrypoint in a hidden window. Do not restart an active server, silently use
a paid API, or put credentials in Git. See `scripts/story-video-music.json` for series palettes.

```powershell
uv run python scripts/story-video-music.py --book <slug> --out <music-dir>/score.mp3 --plan-only
uv run python scripts/story-video-music.py --book <slug> --out <music-dir>/score.mp3
uv run --with pillow python scripts/convert-story-video.py render --slug <slug> --out <output-dir> --work <work-dir> --music <music-dir>/score.mp3
```

Reuse `video/assets/music/<series-id>/theme.mp3` unchanged at the opening and ending; do not
generate a new series identity per book. Castle favors felt piano and gentle strings; Ruby
favors nylon guitar, piano, and woodwinds. Generate short varied arrangements, measure and
trim silent gaps, and crossfade clean excerpts. Record prompts, seeds, clean windows, source
hashes, and repeats honestly. Independent generations do not reliably repeat a melody.
Do not discard minutes of useful music repeatedly just because one window contains a gap.

Render sequentially on this workstation. The renderer contains artwork without cropping,
splits long text into readable cards, uses existing word timings, and preserves the refrain
composition from `generate-narration.py`. Critical timing invariants: FFconcat still-image
inputs need a **1000-fps time base** before 24-fps output; page lengths round narration plus
0.8 seconds up to whole frames; assemble PCM narration and encode AAC once. Default PNG
timing and per-page AAC caused measurable drift in the pilots. Keep decoder/encoder thread
caps and fatal decode errors enabled.
Manifest source-hash keys must use repo-relative **forward slashes** (`Path.as_posix()`),
including on Windows; the independent second-book test caught a renderer/verifier mismatch here.

For an existing unmixed render, use `convert-story-video.py mix --video <mp4> --music <score>
--out <final.mp4>` rather than rerendering every frame. The approved mix keeps voice intact,
music at 0.2 gain with a 90-Hz high-pass and sidechain ducking, and a −1.5-dBFS limiter.

## Thumbnail and QA

Use the image-generation skill with the selected book's existing cover/spread art as references.
Create a 16:9 thumbnail with consistent characters, large short story-title typography, a quiet
READ ALONG label, and no clickbait. Preserve the exact title in video metadata even if the
thumbnail abbreviates it. Save the original generated image and prompt; export a 1280×720 JPG
under 2 MB for upload. Reuse the established indigo/cream/gold channel style and moon-and-dragon
logo; do not redesign channel branding for each conversion.

```powershell
uv run --with pillow python scripts/test-story-video.py
uv run --with pillow python scripts/convert-story-video.py verify --slug <slug> --dir <output-dir>
uv run --with pillow python scripts/convert-story-video.py metadata --slug <slug> --out <output-dir>/youtube-metadata.json
```

The metadata command creates a draft. Read the manuscript and enrich that draft with a short,
accurate story summary, full author credits, series/book number, and the library link before
publishing. A bare subtitle is not a finished video description.

Verify the complete final file decodes; video/audio/manifest/caption durations agree within a
frame; all 17 pages and manuscript/refrain words survive; text fits; no art is missing; and the
score has no unexpected internal silence. Inspect a contact sheet containing every page and
spot-check the final page, highlighting, joins, and voice/music balance. Do not equate numerical
audio checks with a human listening review. Fix failed checks before publishing.

## Archive and publish

Archive validated assets in Git:

- `video/channel.json`: destination and playlist IDs.
- `video/assets/brand/`: logo, banner, their masters and generation prompts.
- `video/assets/music/<series-id>/`: canonical theme and provenance.
- `video/books/<slug>/`: `video.mp4`, `captions.srt`, `thumbnail.jpg`, thumbnail master/prompt,
  `manifest.json`, `score.mp3`, music plan and used source takes, `youtube-metadata.json`,
  and `publishing.json` (video ID, URL, playlist, status, and publication date).

Keep approved final MP4s and small reusable source assets in ordinary Git. Check individual
files stay below the remote's size limit; do not introduce Git LFS without considering GitHub
Pages and remote support. Ignore frame caches, WAV intermediates, failed candidates, cookies,
tokens, and local credentials. Stage explicit paths, review the asset inventory and hashes,
and follow the user's review/commit checkpoint. Do not push `main` merely to archive media:
that branch also deploys the site. A Git commit is separate from YouTube publishing.

Converting alone does not authorize publishing. When the user requests publishing or an
end-to-end channel test (as in the second batch), complete it through verified public URLs.
Use an available YouTube connector if sufficient; otherwise use the signed-in Chrome Studio
with computer use. Read the browser's file-upload guidance and use the file chooser API.

1. Confirm Luna channel identity. Upload the final MP4; keep it private while editing.
2. Set the exact title, book number, warm description, authors, library URL, and AI assistance
   disclosure. Set English, made-for-kids, no paid promotion, and AI-use disclosure. Upload
   the custom thumbnail and exact timed SRT. Prefer supplied captions to automatic text.
3. Add only the matching series playlist; sort series oldest-first. Channel defaults are also
   made-for-kids. Cards/end screens and comments may be unavailable for children's content.
4. Check processing and copyright status; publish when authorized. Verify a published/public
   state and the actual watch URL, thumbnail and playlist. Save a screenshot and update
   `publishing.json` immediately. If interrupted, inspect that ID and Studio before retrying.

The channel has already completed account and custom-thumbnail verification. If Google requests
new verification, leave the exact screen for the owner and continue independent local work.
Don't recreate accounts, ask for secrets in chat, or stop after an attempted upload.

## Extending the story flow

After adding a canonical story, invoke this skill when video conversion is requested. New books
are selected from the catalog rather than added to a hardcoded pilot list. Leave reader-submitted
stories excluded. Report produced artifacts, QA results, actual publication URLs, Git commit IDs,
and any remaining blocker distinctly; never describe an uploaded private draft as public.
