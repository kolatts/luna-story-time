"""Generate narration assets for a book using Azure AI Speech (en-US-AnaNeural).

Per book (books/<slug>/narration/):
  <page>.mp3 + timings.json  - full-page narration with word-boundary offsets
  words.mp3 + words.json     - one audio sprite of every unique tappable word;
                               words.json maps word -> [startMs, durationMs]
  vocab/<word>.mp3           - "Word! <definition>" for each sparkle-word popup

The page narration text MUST mirror js/reader.js exactly:
  - cover:  "<title>. <subtitle>. Written with love by <authors joined with ' and '>."
            (dreamed-up-by-you books drop the "Written with love" sentence)
  - spread: spread.text, plus " … " + book.refrain when the spread has refrain: true
The word sprite uses the same tokenization as reader.js (split on whitespace,
strip leading/trailing non-letters, lowercase) so every data-word resolves.

Multi-voice pages
-----------------
If books/<slug>/voices.json exists, the pages it lists are spoken by their
characters instead of by Ana alone. Each page is a list of segments
({"voice": <cast id>, "text": ...}) whose texts concatenate to the page text
byte-for-byte. Every segment is synthesized separately with the voice and
prosody from scripts/voice-cast.json, then the MP3s are concatenated (ffmpeg
when available, byte-splice otherwise — all segments share one output format,
so the frames splice cleanly).

The artifact contract is unchanged: still one <page>.mp3 per page and one
timings.json of [audioMs, charOffsetIntoPageText, wordLength]. Segment word
boundaries are mapped back into the page text by scanning forward from the
segment's known start offset, and shifted by the running audio duration of the
preceding segments. Pages with no voices.json entry keep their Ana audio and
are never regenerated.

Existing page MP3s, words.mp3 and vocab files are left alone unless they are
missing or --force is passed. Voiced pages are also regenerated when their mp3
is older than the book's voices.json.

Usage:
  uv run --with azure-cognitiveservices-speech python scripts/generate-narration.py [--force] <book-slug> [...]
Env:
  SPEECH_KEY    - Azure Speech key (required)
  SPEECH_REGION - Azure region (default centralus)
  SPEECH_VOICE  - narrator voice name (default: the cast's "narrator" voice)
"""
import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import azure.cognitiveservices.speech as speechsdk

KEY = os.environ.get("SPEECH_KEY")
REGION = os.environ.get("SPEECH_REGION", "centralus")
if not KEY:
    sys.exit("SPEECH_KEY env var is required")

CAST = json.loads((Path(__file__).with_name("voice-cast.json")).read_text(encoding="utf-8"))
NARRATOR = CAST["narrator"]["voice"]
VOICE = os.environ.get("SPEECH_VOICE", NARRATOR)

WORD_CHUNK = 250  # words per synthesis request


def cast_entry(voice_id):
    entry = CAST.get(voice_id)
    if not isinstance(entry, dict) or "voice" not in entry:
        raise RuntimeError(f"voice id {voice_id!r} is not cast in scripts/voice-cast.json")
    return entry


def make_config(voice=None):
    cfg = speechsdk.SpeechConfig(subscription=KEY, region=REGION)
    cfg.speech_synthesis_voice_name = voice or VOICE
    cfg.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3
    )
    return cfg


def pages_for(book):
    # Dreamed Up By You covers credit the dreamer via the subtitle alone;
    # Castle Everstair covers keep the "Written with love by" line. Must
    # mirror reader.js speakText exactly.
    if book.get("series") == "dreamed-up-by-you":
        yield "cover", f"{book['title']}. {book['subtitle']}.", {}
    else:
        yield "cover", (
            f"{book['title']}. {book['subtitle']}. "
            f"Written with love by {' and '.join(book['authors'])}."
        ), {}
    for s in book["spreads"]:
        text = s["text"]
        if s.get("refrain"):
            text += " … " + book["refrain"]
        # Optional per-spread heteronym fixes, e.g. {"read": "rɛd"} (IPA) to force
        # past tense. Applied to narration only; displayed text is untouched.
        yield f"{s['number']:02d}", text, s.get("pronunciations", {})


def strip_punct(w):
    """Mirror of reader.js stripPunct."""
    return re.sub(r"^[^A-Za-z']+|[^A-Za-z']+$", "", w).lower()


def synthesize_page(text, out_path, prons=None):
    """Full-page narration to file, returning [[ms, charOffset, wordLen], ...].

    Without pronunciation overrides this speaks plain text and trusts Azure's
    text_offset (offsets into `text`, which reader.js highlights against).
    With overrides it speaks SSML (phoneme tags), where text_offset would point
    into the SSML string instead — so offsets are rebuilt by matching each
    boundary's word to the next occurrence in the plain text, in order.
    """
    audio_cfg = speechsdk.audio.AudioOutputConfig(filename=str(out_path))
    synth = speechsdk.SpeechSynthesizer(speech_config=make_config(), audio_config=audio_cfg)
    words = []
    if not prons:
        def on_boundary(evt):
            if evt.boundary_type == speechsdk.SpeechSynthesisBoundaryType.Word:
                words.append([round(evt.audio_offset / 10000), evt.text_offset, evt.word_length])

        synth.synthesis_word_boundary.connect(on_boundary)
        check(synth.speak_text_async(text).get())
        return words

    inner = escape_with_prons(text, prons)
    bounds = []

    def on_ssml_boundary(evt):
        if evt.boundary_type == speechsdk.SpeechSynthesisBoundaryType.Word:
            bounds.append([round(evt.audio_offset / 10000), evt.text])

    synth.synthesis_word_boundary.connect(on_ssml_boundary)
    check(synth.speak_ssml_async(ssml_wrap(inner)).get())

    cursor = 0
    for ms, w in bounds:
        idx = text.find(w, cursor)
        if idx < 0:  # paranoia: never leave a highlight gap silently
            raise RuntimeError(f"boundary word {w!r} not found after offset {cursor} in page text")
        words.append([ms, idx, len(w)])
        cursor = idx + len(w)
    return words


def synthesize_bytes(ssml):
    """SSML -> (mp3 bytes, [[startMs, durMs] per word boundary], totalMs)."""
    synth = speechsdk.SpeechSynthesizer(speech_config=make_config(), audio_config=None)
    bounds = []

    def on_boundary(evt):
        if evt.boundary_type == speechsdk.SpeechSynthesisBoundaryType.Word:
            bounds.append([
                round(evt.audio_offset / 10000),
                round(evt.duration.total_seconds() * 1000),
            ])

    synth.synthesis_word_boundary.connect(on_boundary)
    result = check(synth.speak_ssml_async(ssml).get())
    total_ms = round(result.audio_duration.total_seconds() * 1000)
    return result.audio_data, bounds, total_ms


def check(result):
    if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
        detail = ""
        if result.reason == speechsdk.ResultReason.Canceled:
            detail = result.cancellation_details.error_details
        raise RuntimeError(f"synthesis failed: {result.reason} {detail}")
    return result


def ssml_wrap(inner, voice=None):
    return (
        f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">'
        f'<voice name="{voice or VOICE}">{inner}</voice></speak>'
    )


def escape_with_prons(text, prons=None):
    """XML-escape `text`, wrapping any pronunciation-override word in <phoneme>."""
    inner = html.escape(text)
    for word, ipa in (prons or {}).items():
        inner = re.sub(
            r"\b" + re.escape(html.escape(word)) + r"\b",
            f'<phoneme alphabet="ipa" ph="{ipa}">{html.escape(word)}</phoneme>',
            inner,
        )
    return inner


# ---------------------------------------------------------------- multi-voice

# MPEG-2 Layer III frame header table, enough to walk Audio24Khz48KBitRateMonoMp3.
_MP2_L3_BITRATES = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
_MP2_RATES = [22050, 24000, 16000]
_SAMPLES_PER_FRAME = 576


def mp3_duration_ms(data):
    """Exact duration of an MPEG-2 Layer III stream by walking its frames.

    Azure's reported audio_duration ignores the encoder padding that each
    separately-synthesized segment carries, so summing it would drift the word
    highlight later and later through a spliced page. Frame counting measures
    what actually ends up in the file, which is what the reader plays.
    """
    i = total_ms = 0
    n = len(data)
    while i + 4 <= n:
        if data[i] == 0xFF and (data[i + 1] & 0xE0) == 0xE0:
            h = data[i:i + 4]
            version, layer = (h[1] >> 3) & 3, (h[1] >> 1) & 3
            bitrate = _MP2_L3_BITRATES[(h[2] >> 4) & 0xF]
            rate_idx, padding = (h[2] >> 2) & 3, (h[2] >> 1) & 1
            if version in (0, 2) and layer == 1 and bitrate and rate_idx != 3:
                sample_rate = _MP2_RATES[rate_idx] // (2 if version == 0 else 1)
                total_ms += _SAMPLES_PER_FRAME * 1000 / sample_rate
                i += (72 * bitrate * 1000) // sample_rate + padding
                continue
        i += 1
    return round(total_ms)


def synthesize_segment(text, voice_id, prons=None):
    """One segment -> (mp3 bytes, [[msIntoSegment, word], ...], durationMs)."""
    entry = cast_entry(voice_id)
    inner = escape_with_prons(text, prons)
    pitch, rate = entry.get("pitch"), entry.get("rate")
    if pitch or rate:
        inner = f'<prosody pitch="{pitch or "+0%"}" rate="{rate or "+0%"}">{inner}</prosody>'
    synth = speechsdk.SpeechSynthesizer(
        speech_config=make_config(entry["voice"]), audio_config=None
    )
    bounds = []

    def on_boundary(evt):
        if evt.boundary_type == speechsdk.SpeechSynthesisBoundaryType.Word:
            bounds.append([round(evt.audio_offset / 10000), evt.text])

    synth.synthesis_word_boundary.connect(on_boundary)
    result = check(synth.speak_ssml_async(ssml_wrap(inner, entry["voice"])).get())
    audio = result.audio_data
    return audio, bounds, mp3_duration_ms(audio)


def concat_mp3(chunks, out_path):
    """Write the segment MP3s as one file, preferring ffmpeg's stream copy."""
    if shutil.which("ffmpeg"):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            parts = []
            for i, data in enumerate(chunks):
                p = tmp / f"{i:03d}.mp3"
                p.write_bytes(data)
                parts.append(p)
            listing = tmp / "list.txt"
            listing.write_text(
                "".join(f"file '{p.as_posix()}'\n" for p in parts), encoding="utf-8"
            )
            proc = subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
                 "-i", str(listing), "-c", "copy", str(out_path)],
                capture_output=True, text=True,
            )
            if proc.returncode == 0 and out_path.exists() and out_path.stat().st_size:
                return
            print(f"    ffmpeg concat failed ({proc.stderr.strip()[:120]}); byte-splicing")
    with open(out_path, "wb") as f:
        for data in chunks:
            f.write(data)


def synthesize_voiced_page(page_text, segments, out_path, prons=None):
    """Segmented page -> mp3 on disk, returning [[ms, charOffset, wordLen], ...].

    Offsets index into `page_text` (what reader.js highlights against): each
    segment's boundary words are located inside that segment's own slice and
    shifted by the slice's start, so a word repeated elsewhere on the page can
    never steal the highlight. Times are shifted by the running audio duration.
    """
    joined = "".join(s["text"] for s in segments)
    if joined != page_text:
        raise RuntimeError(
            f"segment concatenation does not reproduce the page text "
            f"({len(joined)} chars vs {len(page_text)})"
        )
    chunks, timings = [], []
    seg_start, cum_ms = 0, 0
    for seg in segments:
        text = seg["text"]
        if text.strip():
            audio, bounds, dur_ms = synthesize_segment(text, seg["voice"], prons)
            chunks.append(audio)
            cursor = 0
            for ms, word in bounds:
                idx = text.find(word, cursor)
                if idx < 0:  # paranoia: never leave a highlight gap silently
                    raise RuntimeError(
                        f"boundary word {word!r} not found after offset {cursor} "
                        f"in segment {seg['voice']!r}"
                    )
                timings.append([cum_ms + ms, seg_start + idx, len(word)])
                cursor = idx + len(word)
            cum_ms += dur_ms
        seg_start += len(text)
    timings.sort(key=lambda t: t[0])
    concat_mp3(chunks, out_path)
    # One spliced file must hold exactly the frames of its parts. Byte-splicing
    # is exact; ffmpeg prepends a single 24ms Xing/LAME header frame, which
    # shifts every highlight by one frame and is inaudible. Anything larger
    # means audio was lost or duplicated and the highlight would drift.
    actual = mp3_duration_ms(out_path.read_bytes())
    if abs(actual - cum_ms) > 150:
        raise RuntimeError(
            f"{out_path.name}: concatenated audio is {actual}ms but the segments "
            f"sum to {cum_ms}ms — the splice lost or duplicated audio"
        )
    return timings


def probe_duration_ms(path):
    """Duration of an mp3 per ffprobe, or None when ffprobe isn't on PATH."""
    if not shutil.which("ffprobe"):
        return None
    proc = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True,
    )
    if proc.returncode != 0 or not proc.stdout.strip():
        return None
    return round(float(proc.stdout.strip()) * 1000)


def load_voices(book_dir):
    path = book_dir / "voices.json"
    if not path.exists():
        return {}, None
    doc = json.loads(path.read_text(encoding="utf-8"))
    return doc.get("spreads", {}), path


def unique_words(book):
    seen, ordered = set(), []
    for _, text, _prons in pages_for(book):
        for token in re.findall(r"\S+", text):
            w = strip_punct(token)
            if w and w not in seen:
                seen.add(w)
                ordered.append(w)
    return ordered


def build_word_sprite(book, out_dir):
    words = unique_words(book)
    sprite = out_dir / "words.mp3"
    mapping = {}
    base_ms = 0
    with open(sprite, "wb") as f:
        for i in range(0, len(words), WORD_CHUNK):
            chunk = words[i : i + WORD_CHUNK]
            inner = '<break time="300ms"/>'.join(html.escape(w) for w in chunk)
            audio, bounds, total_ms = synthesize_bytes(ssml_wrap(inner))
            if len(bounds) != len(chunk):
                raise RuntimeError(
                    f"word sprite boundary mismatch: {len(bounds)} boundaries for {len(chunk)} words"
                )
            f.write(audio)
            for w, (start, dur) in zip(chunk, bounds):
                mapping[w] = [base_ms + start, dur]
            base_ms += total_ms
    (out_dir / "words.json").write_text(
        json.dumps(mapping, separators=(",", ":")), encoding="utf-8"
    )
    print(f"  words.mp3: {sprite.stat().st_size // 1024}KB, {len(words)} unique words")


def build_vocab_audio(book, out_dir):
    vocab_dir = out_dir / "vocab"
    vocab_dir.mkdir(exist_ok=True)
    count = 0
    for s in book["spreads"]:
        for v in s.get("vocab", []):
            key = strip_punct(v["word"])
            text = f"{v['word']}! {v['definition']}."
            inner = f'{html.escape(v["word"])}!<break time="350ms"/>{html.escape(v["definition"])}.'
            audio, _, _ = synthesize_bytes(ssml_wrap(inner))
            (vocab_dir / f"{key}.mp3").write_bytes(audio)
            count += 1
    print(f"  vocab/: {count} definition clips")


def main():
    args = sys.argv[1:]
    force = "--force" in args
    slugs = [a for a in args if not a.startswith("--")]
    for slug in slugs:
        book_dir = Path("books") / slug
        book = json.loads((book_dir / "book.json").read_text(encoding="utf-8"))
        out_dir = book_dir / "narration"
        out_dir.mkdir(exist_ok=True)
        voiced, voices_path = load_voices(book_dir)
        voices_mtime = voices_path.stat().st_mtime if voices_path else 0

        timings_path = out_dir / "timings.json"
        timings = json.loads(timings_path.read_text(encoding="utf-8")) if timings_path.exists() else {}
        for page_id, text, prons in pages_for(book):
            mp3 = out_dir / f"{page_id}.mp3"
            segments = voiced.get(page_id)
            fresh = mp3.exists() and page_id in timings
            if segments:
                fresh = fresh and mp3.stat().st_mtime >= voices_mtime
            if fresh and not force:
                continue
            if segments:
                timings[page_id] = synthesize_voiced_page(text, segments, mp3, prons)
                who = ", ".join(dict.fromkeys(
                    s["voice"] for s in segments if s["voice"] != "narrator"))
                label = f", {len(segments)} segments ({who})"
            else:
                timings[page_id] = synthesize_page(text, mp3, prons)
                label = ""
            print(f"  {slug}/{page_id}: {mp3.stat().st_size // 1024}KB, "
                  f"{len(timings[page_id])} words{label}")
        timings_path.write_text(json.dumps(timings, separators=(",", ":")), encoding="utf-8")

        # Teaching aids, not performance: always Ana, and never rebuilt in place
        # (the reader's tap-a-word timings are baked into words.json).
        if force or not (out_dir / "words.mp3").exists() or not (out_dir / "words.json").exists():
            build_word_sprite(book, out_dir)
        if force or not (out_dir / "vocab").exists():
            build_vocab_audio(book, out_dir)
        print(f"{slug}: done")


if __name__ == "__main__":
    main()
