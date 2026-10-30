# Story video conversion

The maintained workflow is `.agents/skills/video-conversion/SKILL.md`. It covers catalog selection, the approved read-along layout, series music, thumbnails, QA, Git archiving, and publishing to the existing Luna channel.

Run `uv run --with pillow python scripts/convert-story-video.py --help` and `uv run python scripts/story-video-music.py --help` for production commands. `next --series castle-everstair` or `next --series ruby-and-the-dragon-bonds` selects the next unconverted book.

Keep intermediate frames and WAVs outside the repository. Archive validated source assets, MP4s, captions, music, metadata, and publishing records under `video/`. Channel and playlist IDs live in `video/channel.json`; the first two books were published on October 29, 2026.

Rendering stays independent from the static website. Browser publishing requires the correct signed-in Luna channel and authorization for the publication task.
