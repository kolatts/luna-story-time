"""Generate narration assets for a book using Azure AI Speech (en-US-AnaNeural).

Per book (books/<slug>/narration/):
  <page>.mp3 + timings.json  - full-page narration with word-boundary offsets
  words.mp3 + words.json     - one audio sprite of every unique tappable word;
                               words.json maps word -> [startMs, durationMs]
  vocab/<word>.mp3           - "Word! <definition>" for each sparkle-word popup

The page narration text MUST mirror js/reader.js exactly:
  - cover:  "<title>. <subtitle>. Written with love by <authors joined with ' and '>."
  - spread: spread.text, plus " … " + book.refrain when the spread has refrain: true
The word sprite uses the same tokenization as reader.js (split on whitespace,
strip leading/trailing non-letters, lowercase) so every data-word resolves.

Existing page MP3s are skipped (delete them to force regeneration); words.mp3
and vocab files are always rebuilt (they're cheap).

Usage:
  uv run --with azure-cognitiveservices-speech python scripts/generate-narration.py <book-slug> [...]
Env:
  SPEECH_KEY    - Azure Speech key (required)
  SPEECH_REGION - Azure region (default centralus)
  SPEECH_VOICE  - voice name (default en-US-AnaNeural)
"""
import html
import json
import os
import re
import sys
from pathlib import Path

import azure.cognitiveservices.speech as speechsdk

KEY = os.environ.get("SPEECH_KEY")
REGION = os.environ.get("SPEECH_REGION", "centralus")
VOICE = os.environ.get("SPEECH_VOICE", "en-US-AnaNeural")
if not KEY:
    sys.exit("SPEECH_KEY env var is required")

WORD_CHUNK = 250  # words per synthesis request


def make_config():
    cfg = speechsdk.SpeechConfig(subscription=KEY, region=REGION)
    cfg.speech_synthesis_voice_name = VOICE
    cfg.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3
    )
    return cfg


def pages_for(book):
    yield "cover", (
        f"{book['title']}. {book['subtitle']}. "
        f"Written with love by {' and '.join(book['authors'])}."
    )
    for s in book["spreads"]:
        text = s["text"]
        if s.get("refrain"):
            text += " … " + book["refrain"]
        yield f"{s['number']:02d}", text


def strip_punct(w):
    """Mirror of reader.js stripPunct."""
    return re.sub(r"^[^A-Za-z']+|[^A-Za-z']+$", "", w).lower()


def synthesize_page(text, out_path):
    """Full-page narration to file, returning [[ms, charOffset, wordLen], ...]."""
    audio_cfg = speechsdk.audio.AudioOutputConfig(filename=str(out_path))
    synth = speechsdk.SpeechSynthesizer(speech_config=make_config(), audio_config=audio_cfg)
    words = []

    def on_boundary(evt):
        if evt.boundary_type == speechsdk.SpeechSynthesisBoundaryType.Word:
            words.append([round(evt.audio_offset / 10000), evt.text_offset, evt.word_length])

    synth.synthesis_word_boundary.connect(on_boundary)
    check(synth.speak_text_async(text).get())
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


def ssml_wrap(inner):
    return (
        f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">'
        f'<voice name="{VOICE}">{inner}</voice></speak>'
    )


def unique_words(book):
    seen, ordered = set(), []
    for _, text in pages_for(book):
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
    for slug in sys.argv[1:]:
        book_dir = Path("books") / slug
        book = json.loads((book_dir / "book.json").read_text(encoding="utf-8"))
        out_dir = book_dir / "narration"
        out_dir.mkdir(exist_ok=True)

        timings_path = out_dir / "timings.json"
        timings = json.loads(timings_path.read_text(encoding="utf-8")) if timings_path.exists() else {}
        for page_id, text in pages_for(book):
            mp3 = out_dir / f"{page_id}.mp3"
            if mp3.exists() and page_id in timings:
                continue
            timings[page_id] = synthesize_page(text, mp3)
            print(f"  {slug}/{page_id}: {mp3.stat().st_size // 1024}KB, {len(timings[page_id])} words")
        timings_path.write_text(json.dumps(timings, separators=(",", ":")), encoding="utf-8")

        build_word_sprite(book, out_dir)
        build_vocab_audio(book, out_dir)
        print(f"{slug}: done")


if __name__ == "__main__":
    main()
