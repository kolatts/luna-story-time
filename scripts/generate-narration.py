"""Generate per-page narration MP3s + word-boundary timings for a book using Azure AI Speech.

The narration text for each page MUST mirror js/reader.js exactly:
  - cover:  "<title>. <subtitle>. Written with love by <authors joined with ' and '>."
  - spread: spread.text, plus " … " + book.refrain when the spread has refrain: true
Word-boundary text offsets index into that exact string; the reader maps offsets
below len(speakText) to word spans and offsets beyond it to the refrain callout.

Usage:
  uv run --with azure-cognitiveservices-speech python scripts/generate-narration.py <book-slug> [...]
Env:
  SPEECH_KEY    - Azure Speech key (required)
  SPEECH_REGION - Azure region (default centralus)
  SPEECH_VOICE  - voice name (default en-US-AnaNeural)
"""
import json
import os
import sys
from pathlib import Path

import azure.cognitiveservices.speech as speechsdk

KEY = os.environ.get("SPEECH_KEY")
REGION = os.environ.get("SPEECH_REGION", "centralus")
VOICE = os.environ.get("SPEECH_VOICE", "en-US-AnaNeural")
if not KEY:
    sys.exit("SPEECH_KEY env var is required")


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


def synthesize(text, out_path):
    cfg = speechsdk.SpeechConfig(subscription=KEY, region=REGION)
    cfg.speech_synthesis_voice_name = VOICE
    cfg.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3
    )
    audio_cfg = speechsdk.audio.AudioOutputConfig(filename=str(out_path))
    synth = speechsdk.SpeechSynthesizer(speech_config=cfg, audio_config=audio_cfg)

    words = []

    def on_boundary(evt):
        if evt.boundary_type == speechsdk.SpeechSynthesisBoundaryType.Word:
            # audio_offset is in 100ns ticks
            words.append([round(evt.audio_offset / 10000), evt.text_offset, evt.word_length])

    synth.synthesis_word_boundary.connect(on_boundary)
    result = synth.speak_text_async(text).get()
    if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
        detail = ""
        if result.reason == speechsdk.ResultReason.Canceled:
            detail = result.cancellation_details.error_details
        raise RuntimeError(f"synthesis failed: {result.reason} {detail}")
    return words


def main():
    for slug in sys.argv[1:]:
        book_dir = Path("books") / slug
        book = json.loads((book_dir / "book.json").read_text(encoding="utf-8"))
        out_dir = book_dir / "narration"
        out_dir.mkdir(exist_ok=True)
        timings = {}
        total_chars = 0
        for page_id, text in pages_for(book):
            total_chars += len(text)
            mp3 = out_dir / f"{page_id}.mp3"
            timings[page_id] = synthesize(text, mp3)
            print(f"  {slug}/{page_id}: {mp3.stat().st_size // 1024}KB, {len(timings[page_id])} words")
        (out_dir / "timings.json").write_text(
            json.dumps(timings, separators=(",", ":")), encoding="utf-8"
        )
        print(f"{slug}: done, {total_chars} chars synthesized")


if __name__ == "__main__":
    main()
