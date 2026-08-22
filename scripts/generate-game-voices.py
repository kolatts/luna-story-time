"""Generate spoken dialogue for the Castle Life game using Azure AI Speech.

Ana narrates the game the same way she narrates the books; each companion gets a
voice shaped with SSML prosody so they read as young animals rather than adults.
Dirt is deliberately absurd: canon gives him "a deep whistling voice" and a "wide
slow smile", so a jaguar cub rumbles like a bass-baritone grandfather.

Writes game/voices/:
  <companion>/01.mp3 .. 04.mp3   - dialogue[], index-aligned with game/world.json
  <companion>/revisit.mp3        - the "you came back" line
  narrator/<key>.mp3             - milestone lines (see NARRATOR_LINES)
  manifest.json                  - what the engine loads; lists only files on disk

Companion text comes from game/world.json so the lines never drift out of sync;
the spoken text excludes the "Name: " prefix, which the engine adds at display
time. Existing clips are skipped unless --force.

Usage:
  uv run --with azure-cognitiveservices-speech python scripts/generate-game-voices.py [--force]
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
WORLD = ROOT / "game" / "world.json"
OUT = ROOT / "game" / "voices"

NARRATOR_VOICE = "en-US-AnaNeural"

# voice, pitch, rate  — see game/SPEC-VOICES.md for the casting rationale
CAST = {
    "babylady":   ("en-US-AvaNeural",    "+28%", "+12%"),
    "cottontail": ("en-US-JaneNeural",   "+12%", "+4%"),
    "winds":      ("en-US-AndrewNeural", "+22%", "+15%"),
    "dirt":       ("en-US-DavisNeural",  "-28%", "-16%"),
}

NARRATOR_LINES = {
    "intro":   "Welcome to Castle Everstair. Walk with the arrow keys, "
               "and press the sparkle button to gather.",
    "welcome": "Welcome back, Princess Moon. Your castle has been waiting.",
    "recipe":  "A new recipe! Have a look in your crafting book.",
    "crafted": "You made something lovely.",
    "room":    "A new room is open. Go and see what it looks like.",
    "friend":  "You made a new friend.",
    "placed":  "It looks lovely right there.",
    "full":    "Your satchel is getting full of sparkly things.",
}

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
    world = json.loads(WORLD.read_text(encoding="utf-8"))
    companions = world.get("companions", {})

    jobs = []  # (rel_path, text, voice, pitch, rate, label)
    for key, line in NARRATOR_LINES.items():
        jobs.append((f"narrator/{key}.mp3", line, NARRATOR_VOICE, None, None, f"narrator/{key}"))

    for cid, cfg in CAST.items():
        comp = companions.get(cid)
        if not comp:
            sys.exit(f"companion {cid!r} missing from world.json")
        voice, pitch, rate = cfg
        for i, line in enumerate(comp.get("dialogue", []), start=1):
            jobs.append((f"{cid}/{i:02d}.mp3", line, voice, pitch, rate, f"{cid} line {i}"))
        if comp.get("revisit"):
            jobs.append((f"{cid}/revisit.mp3", comp["revisit"], voice, pitch, rate,
                         f"{cid} revisit"))

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
        if not 800 <= ms <= 15000:
            flag += "  <-- odd duration"
        print(f"  ok    {rel:<26} {voice:<20} pitch={pitch or '0%':<6} "
              f"{ms:>6}ms {size:>7}B{flag}")
        made += 1

    # Manifest lists only what actually exists, so a partial run still boots the game.
    manifest = {
        "narrator": {"voice": NARRATOR_VOICE, "lines": {}},
        "companions": {},
    }
    for key in NARRATOR_LINES:
        if (OUT / f"narrator/{key}.mp3").exists():
            manifest["narrator"]["lines"][key] = f"narrator/{key}.mp3"
    for cid, (voice, _p, _r) in CAST.items():
        comp = companions.get(cid, {})
        lines = []
        for i in range(1, len(comp.get("dialogue", [])) + 1):
            rel = f"{cid}/{i:02d}.mp3"
            if (OUT / rel).exists():
                lines.append(rel)
        entry = {"voice": voice, "lines": lines}
        revisit = f"{cid}/revisit.mp3"
        if (OUT / revisit).exists():
            entry["revisit"] = revisit
        manifest["companions"][cid] = entry

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )

    print(f"\n{made} generated, {skipped} skipped, {len(failures)} failed -> {OUT}")
    if failures:
        sys.exit("failed: " + ", ".join(failures))


if __name__ == "__main__":
    main()
