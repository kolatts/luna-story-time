"""Generate spoken lines for The Great Present Peek using Azure AI Speech.

Ana narrates the game the same way she narrates the books; each guest speaks
with the voice and SSML prosody defined in scripts/voice-cast.json — the one
casting file every generator shares, so a character sounds the same wherever
they speak. Never repoint an id at a different voice without regenerating
every clip that uses it.

Line text comes from peek/voice-lines.json (the single source of truth):
  narrator: {intro, floor, party, spotted, best}  - one line each
  speakers: {<id>: {<key>: [line, ...], ...}}     - e.g. winds.spotted[], babylady.yip[]

Writes peek/voices/:
  narrator/<key>.mp3           - narrator lines
  <speaker>/<key>-<nn>.mp3     - nn = 01..N, index-aligned with voice-lines.json
  manifest.json                - what the engine loads; lists only files on disk

Existing clips are skipped unless --force.

Usage:
  uv run --with azure-cognitiveservices-speech python scripts/generate-peek-voices.py [--force]
Env:
  SPEECH_KEY    - Azure Speech key (required)
  SPEECH_REGION - Azure region (default centralus)
"""
import html
import json
import os
import sys
from pathlib import Path

import azure.cognitiveservices.speech as speechsdk

KEY = os.environ.get("SPEECH_KEY")
REGION = os.environ.get("SPEECH_REGION", "centralus")
if not KEY:
    sys.exit("SPEECH_KEY env var is required")

ROOT = Path(__file__).resolve().parent.parent
LINES_FILE = ROOT / "peek" / "voice-lines.json"
OUT = ROOT / "peek" / "voices"

CAST_FILE = ROOT / "scripts" / "voice-cast.json"


def load_cast():
    """id -> (voice, pitch, rate) from the shared casting file.

    Keys starting with "_" are comments. A missing pitch/rate means "no prosody
    wrapper at all", which is how the narrator has always been synthesized —
    keeping every existing clip bit-for-bit reproducible.
    """
    raw = json.loads(CAST_FILE.read_text(encoding="utf-8"))
    cast = {}
    for cid, entry in raw.items():
        if cid.startswith("_") or not isinstance(entry, dict):
            continue
        voice = entry.get("voice")
        if not voice:
            sys.exit(f"voice-cast.json: {cid!r} has no voice")
        cast[cid] = (voice, entry.get("pitch"), entry.get("rate"))
    return cast


CAST = load_cast()
if "narrator" not in CAST:
    sys.exit("voice-cast.json must cast 'narrator'")
NARRATOR_VOICE, NARRATOR_PITCH, NARRATOR_RATE = CAST["narrator"]

MIN_BYTES = 4096


def make_config():
    cfg = speechsdk.SpeechConfig(subscription=KEY, region=REGION)
    cfg.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3
    )
    return cfg


def ssml_for(text, voice, pitch=None, rate=None):
    inner = html.escape(text)
    if pitch or rate:
        inner = (
            f'<prosody pitch="{pitch or "+0%"}" rate="{rate or "+0%"}">{inner}</prosody>'
        )
    return (
        '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">'
        f'<voice name="{voice}">{inner}</voice></speak>'
    )


def synthesize(ssml, out_path):
    """SSML -> mp3 on disk. Returns (bytes_written, duration_ms)."""
    synth = speechsdk.SpeechSynthesizer(speech_config=make_config(), audio_config=None)
    result = synth.speak_ssml_async(ssml).get()
    if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
        detail = ""
        if result.reason == speechsdk.ResultReason.Canceled:
            detail = result.cancellation_details.error_details
        raise RuntimeError(f"synthesis failed for {out_path.name}: {result.reason} {detail}")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(result.audio_data)
    return len(result.audio_data), round(result.audio_duration.total_seconds() * 1000)


def main():
    force = "--force" in sys.argv
    data = json.loads(LINES_FILE.read_text(encoding="utf-8"))
    narrator_lines = data.get("narrator", {})
    speakers = data.get("speakers", {})

    jobs = []  # (rel_path, text, voice, pitch, rate, label)
    for key, line in narrator_lines.items():
        jobs.append((f"narrator/{key}.mp3", line, NARRATOR_VOICE, NARRATOR_PITCH,
                     NARRATOR_RATE, f"narrator/{key}"))

    # voice-lines.json is the source of truth for *what* is spoken;
    # voice-cast.json for *how*.
    for sid, groups in speakers.items():
        if sid not in CAST:
            sys.exit(f"speaker {sid!r} is not cast in {CAST_FILE.name}")
        voice, pitch, rate = CAST[sid]
        for key, lines in groups.items():
            if not isinstance(lines, list):
                sys.exit(f"speaker {sid!r} key {key!r} must be a list of lines")
            for i, line in enumerate(lines, start=1):
                jobs.append((f"{sid}/{key}-{i:02d}.mp3", line, voice, pitch, rate,
                             f"{sid} {key} {i}"))

    made = skipped = 0
    failures = []
    for rel, text, voice, pitch, rate, label in jobs:
        path = OUT / rel
        if path.exists() and not force:
            print(f"  skip  {rel}")
            skipped += 1
            continue
        try:
            size, ms = synthesize(ssml_for(text, voice, pitch, rate), path)
        except Exception as exc:  # keep going; report everything at the end
            print(f"  FAIL  {rel}: {exc}")
            failures.append(rel)
            continue
        flag = ""
        if size < MIN_BYTES:
            flag = "  <-- suspiciously small"
        if not 300 <= ms <= 8000:
            flag += "  <-- odd duration"
        print(f"  ok    {rel:<28} {voice:<22} pitch={pitch or '0%':<6} "
              f"{ms:>6}ms {size:>7}B{flag}")
        made += 1

    # Manifest lists only what actually exists, so a partial run still boots the game.
    manifest = {"narrator": {}, "speakers": {}}
    for key in narrator_lines:
        rel = f"narrator/{key}.mp3"
        if (OUT / rel).exists():
            manifest["narrator"][key] = rel
    for sid, groups in speakers.items():
        entry = {}
        for key, lines in groups.items():
            clips = []
            for i in range(1, len(lines) + 1):
                rel = f"{sid}/{key}-{i:02d}.mp3"
                if (OUT / rel).exists():
                    clips.append(rel)
            if clips:
                entry[key] = clips
        manifest["speakers"][sid] = entry

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )

    print(f"\n{made} generated, {skipped} skipped, {len(failures)} failed -> {OUT}")
    if failures:
        sys.exit("failed: " + ", ".join(failures))


if __name__ == "__main__":
    main()
