#!/usr/bin/env python3
"""Create a read-along score from the allowlisted Luna Storytime catalog.

Example:
  python scripts/story-video-music.py --book baby-jag-cottontail-and-the-deep-dark-sea \
      --out work/music/baby-jag/score.mp3
  python scripts/story-video-music.py --book ruby-sparks-and-crackle \
      --out work/music/ruby-sparks/score.mp3 --plan-only

Each score uses three local ACE-Step arrangements, clean windows, and recorded crossfaded
repeats to reach the book's whole-frame narration-plus-hold duration. The exact canonical
series theme file is reused at the opening and ending. No remote or paid backend is used.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT_DIR = Path(__file__).resolve().parent
CONFIG_PATH = SCRIPT_DIR / "story-video-music.json"
CONFIG = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
BOOKS_ROOT = ROOT / "books"
SERIES_INDEX = BOOKS_ROOT / "series.json"
BACKEND_TOOLS_DEFAULT = CONFIG["backend"]["default_tools_path"]
BACKEND_TOOLS_ENV = CONFIG["backend"]["tools_env"]
TAKE_COUNT = int(CONFIG["generation"]["take_count"])
TAKE_SECONDS = float(CONFIG["generation"]["take_seconds"])
CROSSFADE_S = float(CONFIG["mix"]["crossfade_s"])
MIN_WINDOW_S = float(CONFIG["generation"]["min_clean_window_s"])
MAX_USE_S = float(CONFIG["generation"]["max_window_use_s"])
TARGET_LUFS = float(CONFIG["mix"]["target_lufs"])
PEAK_CEILING_DBFS = float(CONFIG["mix"]["peak_ceiling_dbfs"])
PAGE_HOLD_S = float(CONFIG["duration"]["page_hold_s"])
FPS = int(CONFIG["duration"]["fps"])
NEGATIVE = CONFIG["generation"]["negative_prompt"]


def run(cmd: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if check and p.returncode:
        raise RuntimeError(
            f"Command failed ({p.returncode}): {' '.join(cmd[:16])}\n"
            f"{(p.stderr or p.stdout)[-2500:]}"
        )
    return p


def stdout(cmd: list[str]) -> str:
    return run(cmd).stdout.strip()


def probe(path: Path) -> float:
    return float(stdout([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=nw=1:nk=1", str(path),
    ]))


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def select_seed(slug: str, requested: int | None) -> tuple[int, dict]:
    """Keep explicit seeds exact; otherwise derive a stable, per-book seed base."""
    base = int(CONFIG["generation"]["seed_base"])
    slug_digest = hashlib.sha256(slug.encode("utf-8")).hexdigest()
    if requested is not None:
        return int(requested), {
            "mode": "explicit",
            "requested_seed": int(requested),
            "selected_seed": int(requested),
            "book_slug_sha256": slug_digest,
        }
    bits = int(CONFIG["generation"]["book_seed_hash_bits"])
    offset = int.from_bytes(bytes.fromhex(slug_digest[:8]), "big") & ((1 << bits) - 1)
    selected = base + offset
    return selected, {
        "mode": "stable_book_derived",
        "configured_base_seed": base,
        "book_seed_offset": offset,
        "selected_seed": selected,
        "book_slug_sha256": slug_digest,
        "rule": f"configured base seed + first {bits} slug-hash bits",
    }


def load_book_catalog() -> dict[str, dict]:
    """Derive eligible books from the canonical series index and validate each book manifest."""
    series_index = json.loads(SERIES_INDEX.read_text(encoding="utf-8"))
    catalog: dict[str, dict] = {}
    present_series = set()
    for listed_series in series_index.get("series", []):
        series_id = listed_series.get("id")
        if series_id not in CONFIG["series"]:
            continue
        present_series.add(series_id)
        for listed_book in listed_series.get("books", []):
            slug = listed_book.get("slug", "")
            if not slug or Path(slug).name != slug:
                raise ValueError(f"Invalid book slug in {SERIES_INDEX}: {slug!r}")
            manifest_path = BOOKS_ROOT / slug / "book.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            if manifest.get("slug") != slug or manifest.get("series") != series_id:
                raise ValueError(
                    f"Book index/manifest mismatch for {slug}: expected series {series_id!r}."
                )
            catalog[slug] = {
                "title": manifest.get("title", listed_book.get("title", slug)),
                "series_id": series_id,
            }
    missing = set(CONFIG["series"]) - present_series
    if missing:
        raise ValueError(f"Configured music series missing from {SERIES_INDEX}: {sorted(missing)}")
    return catalog


BOOK_CATALOG = load_book_catalog()


def book_config(slug: str) -> tuple[dict, dict]:
    if slug not in BOOK_CATALOG:
        choices = ", ".join(sorted(BOOK_CATALOG))
        raise ValueError(f"Book {slug!r} is not allowlisted. Eligible books: {choices}")
    book = BOOK_CATALOG[slug]
    return book, CONFIG["series"][book["series_id"]]


def narration_pages(slug: str) -> list[dict]:
    folder = BOOKS_ROOT / slug / "narration"
    files = [folder / "cover.mp3"] + sorted(folder.glob("[0-9][0-9].mp3"))
    if len(files) < 2 or not files[0].is_file():
        raise FileNotFoundError(f"Expected cover and numbered narration MP3s in {folder}")
    pages = []
    cursor = 0.0
    for path in files:
        if not path.is_file():
            raise FileNotFoundError(path)
        audio_s = probe(path)
        frame_s = math.ceil((audio_s + PAGE_HOLD_S) * FPS - 1e-9) / FPS
        hold_s = frame_s - audio_s
        pages.append({
            "file": path.relative_to(ROOT).as_posix(),
            "duration_s": round(audio_s, 6),
            "hold_s": round(hold_s, 6),
            "frame_total_s": round(frame_s, 6),
            "start_s": round(cursor, 6),
            "end_s": round(cursor + frame_s, 6),
            "sha256": sha256(path),
        })
        cursor += frame_s
    return pages


def locate_theme(series: dict, out: Path, assets_root: Path | None) -> Path:
    relative = Path(series["theme_asset"])
    candidates: list[Path] = []
    if assets_root:
        candidates.append(assets_root / relative)
        candidates.append(assets_root / relative.relative_to(Path("video/assets/music")))
    # The usual output is under <project>/work/music/...; find its project root without
    # assuming a dated workspace path.
    for ancestor in (out.parent, *out.parent.parents):
        candidates.append(ancestor / relative)
    candidates.append(ROOT / relative)
    for candidate in candidates:
        if candidate.is_file():
            return candidate.resolve()
    # If the output is below a work/ directory, report the adjacent project asset path
    # even before the parent imports the canonical theme into that project.
    for ancestor in (out.parent, *out.parent.parents):
        if ancestor.name.lower() == "work":
            return (ancestor.parent / relative).resolve()
    return (assets_root / relative if assets_root else ROOT / relative).resolve()


def clean_windows(path: Path) -> tuple[float, list[tuple[float, float]], list[dict]]:
    """Find usable spans by dropping quiet windows and leaving small safety margins."""
    duration = probe(path)
    p = run([
        "ffmpeg", "-hide_banner", "-nostats", "-i", str(path),
        "-af", f"silencedetect=n={CONFIG['generation']['silence_threshold_db']}dB:"
               f"d={CONFIG['generation']['silence_min_s']}",
        "-f", "null", "-",
    ], check=False)
    log = p.stderr + p.stdout
    events = [(float(t), kind) for kind, t in re.findall(
        r"silence_(start|end):\s*([0-9.]+)", log
    )]
    windows: list[tuple[float, float]] = []
    cursor = float(CONFIG["generation"]["edge_trim_s"])
    for t, kind in events:
        if kind == "start":
            end = t - float(CONFIG["generation"]["silence_margin_s"])
            if end - cursor >= MIN_WINDOW_S:
                windows.append((round(cursor, 3), round(end, 3)))
        else:
            cursor = t + float(CONFIG["generation"]["silence_margin_s"])
    end = duration - float(CONFIG["generation"]["edge_trim_s"])
    if end - cursor >= MIN_WINDOW_S:
        windows.append((round(cursor, 3), round(end, 3)))
    windows = [(a, b) for a, b in windows if b - a >= MIN_WINDOW_S]
    return duration, windows, [{"time_s": t, "event": k} for t, k in events]


def start_comfy_hidden() -> None:
    """Start the local ComfyUI batch without opening a minimized or visible console."""
    install = Path(os.environ.get(
        CONFIG["backend"]["install_root_env"], CONFIG["backend"]["install_root_default"]
    ))
    batch = install / CONFIG["backend"]["launch_batch"]
    if not batch.is_file():
        raise RuntimeError(f"Local ComfyUI launcher not found: {batch}")
    # Start-Process -WindowStyle Hidden keeps the GPU server hidden (never minimized).
    flags = getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000) if os.name == "nt" else 0
    def ps_quote(value: str) -> str:
        return "'" + value.replace("'", "''") + "'"
    command = (
        "Start-Process -FilePath " + ps_quote(str(batch)) +
        " -WorkingDirectory " + ps_quote(str(install)) + " -WindowStyle Hidden"
    )
    subprocess.Popen(
        ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
        cwd=str(install), creationflags=flags,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def load_backend(backend_tools: Path):
    if not backend_tools.is_dir():
        raise RuntimeError(f"Backend tools directory is missing: {backend_tools}")
    tools_s = str(backend_tools.resolve())
    if tools_s not in sys.path:
        sys.path.insert(0, tools_s)
    try:
        from acestep_local import AceStepLocal
    except ImportError as e:
        raise RuntimeError(
            f"Could not import local ACE-Step backend from {backend_tools}. "
            "Set --backend-tools or LUNA_VIDEO_BACKEND_TOOLS."
        ) from e
    backend = AceStepLocal()
    if not backend.is_up():
        start_comfy_hidden()
        deadline = time.time() + float(CONFIG["backend"]["startup_timeout_s"])
        while time.time() < deadline and not backend.is_up():
            time.sleep(3)
    if not backend.is_up():
        raise RuntimeError(
            "Local ComfyUI did not become ready. No remote or paid backend fallback is configured."
        )
    return backend


def prompt_for(series: dict, arc: dict) -> str:
    return (
        series["prompt"].rstrip()
        + " Arrangement: " + arc["description"].rstrip()
        + f". Around {series['bpm']} BPM, instrumental. " + NEGATIVE
    )


def make_plan(slug: str, out: Path, pages: list[dict], theme: Path, seed: int) -> dict:
    book, series = book_config(slug)
    target = round(sum(p["frame_total_s"] for p in pages), 6)
    if len(series["arrangements"]) != TAKE_COUNT:
        raise ValueError(f"{series['name']} must define exactly {TAKE_COUNT} arrangements.")
    takes = []
    for i, arc in enumerate(series["arrangements"][:TAKE_COUNT]):
        take_seed = seed + (i + 1) * int(CONFIG["generation"]["seed_stride"])
        takes.append({
            "take": i + 1,
            "duration_request_s": TAKE_SECONDS,
            "seed": take_seed,
            "bpm": series["bpm"],
            "keyscale": series["keyscale"],
            "prompt": prompt_for(series, arc),
            "arrangement": arc["id"],
        })
    return {
        "book": slug,
        "title": book["title"],
        "series": series["name"],
        "series_id": book["series_id"],
        "target_duration_s": target,
        "duration_rule": (
            f"Each cover/page is narration duration + {PAGE_HOLD_S}s, rounded up to a {FPS}fps frame."
        ),
        "narration_pages": pages,
        "selected_seed": seed,
        "seed_base": seed,
        "theme": {
            "file": str(theme),
            "sha256": sha256(theme) if theme.is_file() else None,
            "exists": theme.is_file(),
            "use": "Same canonical recording reused at score start and end.",
        },
        "backend": {
            "name": "ACE-Step 1.5 via local ComfyUI",
            "tools_directory": str(Path(
                os.environ.get(BACKEND_TOOLS_ENV, BACKEND_TOOLS_DEFAULT)
            ).resolve()),
            "paid_or_remote_fallback": False,
        },
        "take_plan": takes,
        "crossfade_s": CROSSFADE_S,
        "target_lufs": TARGET_LUFS,
        "peak_ceiling_dbfs": PEAK_CEILING_DBFS,
        "score_out": str(out),
        "plan_out": str(out.with_name(out.stem + ".plan.json")),
        "provenance_note": (
            "Three 55-second local arrangements provide clean source windows. The plan records "
            "every selected window and its repeat index; all joins use crossfades. The canonical "
            "theme is a separate local asset, not generated by this command."
        ),
    }


def arrangement_parts(plan: dict, takes: list[dict], theme_duration: float) -> list[dict]:
    target = float(plan["target_duration_s"])
    theme_len = min(float(CONFIG["generation"]["theme_use_s"]), theme_duration)
    if theme_len < float(CONFIG["generation"]["min_theme_s"]):
        raise RuntimeError(f"Canonical theme is too short ({theme_duration:.2f}s): {plan['theme']['file']}")
    windows = [(take, window) for take in takes for window in take["clean_windows"]]
    if not windows:
        raise RuntimeError("No clean music windows are available.")
    parts = [{
        "kind": "theme", "source": plan["theme"]["file"], "start_s": 0.0,
        "duration_s": theme_len, "repeat_index": 0,
    }]
    # Two themes contribute 2*T and K+1 joins subtract crossfades. The middle windows
    # therefore need exactly D - 2*T + xf net seconds, where each part adds len-xf.
    remaining_net = target - (2 * theme_len - CROSSFADE_S)
    window_i = 0
    repeat_counts: dict[str, int] = {}
    max_part = MAX_USE_S
    min_part = float(CONFIG["generation"]["min_part_s"])
    while remaining_net > 1e-6:
        take, window = windows[window_i % len(windows)]
        window_i += 1
        a, b = window
        capacity = min(b - a, max_part)
        span = min(capacity, remaining_net + CROSSFADE_S)
        if span < min_part:
            overrun = (min_part - CROSSFADE_S) - remaining_net
            if not parts[-1].get("kind") == "score" or parts[-1]["duration_s"] - overrun < min_part:
                raise RuntimeError("Cannot fill the final score remainder without a too-short music segment.")
            parts[-1]["duration_s"] = round(parts[-1]["duration_s"] - overrun, 6)
            remaining_net += overrun
            span = min_part
        key = take["file"]
        repeat_index = repeat_counts.get(key, 0)
        repeat_counts[key] = repeat_index + 1
        parts.append({
            "kind": "score", "source": take["file"], "take": take["take"],
            "seed": take["seed"], "start_s": round(a, 3),
            "duration_s": round(span, 3), "repeat_index": repeat_index,
        })
        remaining_net -= span - CROSSFADE_S
    parts.append({
        "kind": "theme", "source": plan["theme"]["file"],
        "start_s": 0.0, "duration_s": theme_len, "repeat_index": 1,
    })
    plan["arrangement"] = parts
    plan["repeat_policy"] = "Clean music windows are reused in catalog order until the target length is filled; repeats are recorded above."
    return parts


def build_score(plan: dict, takes: list[dict], out: Path) -> dict:
    from gen_music import normalize_clip
    theme_path = Path(plan["theme"]["file"])
    parts = arrangement_parts(plan, takes, probe(theme_path))
    cmd = ["ffmpeg", "-y", "-hide_banner", "-v", "error"]
    for part in parts:
        cmd += ["-ss", f"{part['start_s']:.3f}", "-t", f"{part['duration_s']:.3f}",
                "-i", part["source"]]
    graph = []
    for i in range(len(parts)):
        graph.append(f"[{i}:a]aformat=sample_rates=48000:channel_layouts=stereo[s{i}]")
    label = "[s0]"
    for i in range(1, len(parts)):
        out_label = "[assembled]" if i == len(parts) - 1 else f"[xf{i}]"
        graph.append(f"{label}[s{i}]acrossfade=d={CROSSFADE_S}:c1=qsin:c2=qsin{out_label}")
        label = out_label
    duration = float(plan["target_duration_s"])
    graph.append(
        f"{label}apad,atrim=duration={duration:.6f},"
        f"afade=t=in:st=0:d={CONFIG['mix']['opening_fade_s']}:curve=qsin,"
        f"afade=t=out:st={max(0.0, duration-CONFIG['mix']['ending_fade_s']):.6f}:"
        f"d={CONFIG['mix']['ending_fade_s']}:curve=qsin,"
        f"alimiter=limit={CONFIG['mix']['limiter_peak']}[mix]"
    )
    out.parent.mkdir(parents=True, exist_ok=True)
    run(cmd + [
        "-filter_complex", ";".join(graph), "-map", "[mix]", "-t", f"{duration:.6f}",
        "-c:a", "libmp3lame", "-q:a", "2", str(out),
    ])
    lufs, peak = normalize_clip(str(out), TARGET_LUFS, PEAK_CEILING_DBFS)
    actual = probe(out)
    if abs(actual - duration) > 0.15:
        raise RuntimeError(f"Score duration mismatch: expected {duration:.3f}s, got {actual:.3f}s")
    scan = run([
        "ffmpeg", "-hide_banner", "-nostats", "-i", str(out),
        "-af", "silencedetect=n=-60dB:d=5", "-f", "null", "-",
    ], check=False)
    silences = [float(x) for x in re.findall(r"silence_start:\s*([0-9.]+)", scan.stderr + scan.stdout)]
    interior = [t for t in silences if 1.5 < t < actual - 2.0]
    if interior:
        raise RuntimeError(f"Score has internal silence spans beginning at {interior}")
    plan.update({
        "actual_duration_s": round(actual, 6),
        "loudness_lufs": lufs,
        "peak_dbfs": peak,
        "internal_silence_starts_s": silences,
        "score_sha256": sha256(out),
    })
    return plan


def generate(slug: str, out: Path, seed: int, backend_tools: Path,
             theme: Path, plan: dict) -> dict:
    if not theme.is_file():
        raise FileNotFoundError(
            f"Canonical series theme is missing: {theme}. Import it to video/assets/music first."
        )
    backend = load_backend(backend_tools)
    plan["backend"]["device"] = backend.device_info()
    book, series = book_config(slug)
    work_dir = out.parent / (out.stem + ".takes")
    work_dir.mkdir(parents=True, exist_ok=True)
    take_records = []
    for take_spec, arc in zip(plan["take_plan"], series["arrangements"]):
        attempts = []
        accepted = None
        # One alternate seed is enough to avoid losing a usable take to one dropout.
        for attempt in range(int(CONFIG["generation"]["attempts_per_take"])):
            take_seed = int(take_spec["seed"]) + attempt * int(CONFIG["generation"]["retry_seed_stride"])
            raw_path = work_dir / f"take-{take_spec['take']:02d}-seed-{take_seed}.mp3"
            prompt = take_spec["prompt"]
            audio = backend.generate(
                prompt, int(TAKE_SECONDS * 1000), seed=take_seed,
                bpm=int(series["bpm"]), keyscale=series["keyscale"],
            )
            raw_path.write_bytes(audio)
            take_duration, windows, events = clean_windows(raw_path)
            attempts.append({
                "file": raw_path.name, "sha256": sha256(raw_path), "seed": take_seed,
                "prompt": prompt, "duration_s": round(take_duration, 3),
                "clean_windows_s": windows, "silence_events": events,
            })
            if windows:
                accepted = {
                    "take": take_spec["take"], "file": str(raw_path),
                    "file_name": raw_path.name, "sha256": sha256(raw_path),
                    "seed": take_seed, "prompt": prompt, "arrangement": arc["id"],
                    "duration_s": round(take_duration, 3), "clean_windows": windows,
                    "silence_events": events, "attempts": attempts,
                }
                break
        if accepted is None:
            raise RuntimeError(
                f"Take {take_spec['take']} produced no clean window of at least {MIN_WINDOW_S}s "
                f"after {len(attempts)} attempts. Source attempts remain in {work_dir}."
            )
        take_records.append(accepted)
        print(f"Take {accepted['take']}/{TAKE_COUNT}: {len(accepted['clean_windows'])} clean window(s), "
              f"seed {accepted['seed']}", flush=True)
    plan["takes"] = take_records
    plan.pop("take_plan", None)
    plan["theme"]["sha256"] = sha256(theme)
    plan = build_score(plan, take_records, out)
    plan_path = out.with_name(out.stem + ".plan.json")
    plan_path.write_text(json.dumps(plan, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return plan


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--book", required=True, choices=sorted(BOOK_CATALOG))
    ap.add_argument("--out", required=True, type=Path, help="Exact output score MP3 path.")
    ap.add_argument("--seed", type=int, default=None,
                    help="Exact seed base. If omitted, a stable per-book seed is derived.")
    ap.add_argument("--backend-tools", type=Path, default=None,
                    help="External local ACE-Step tools directory. Defaults to LUNA_VIDEO_BACKEND_TOOLS or the documented C: path.")
    ap.add_argument("--assets-root", type=Path, default=None,
                    help="Optional directory that contains video/assets/music.")
    ap.add_argument("--plan-only", action="store_true",
                    help="Print the duration, theme, seed and prompt plan without starting ComfyUI.")
    args = ap.parse_args()
    slug = args.book
    book, series = book_config(slug)
    out = args.out.expanduser().resolve()
    pages = narration_pages(slug)
    theme = locate_theme(series, out, args.assets_root)
    backend_tools = args.backend_tools or Path(os.environ.get(BACKEND_TOOLS_ENV, BACKEND_TOOLS_DEFAULT))
    selected_seed, seed_derivation = select_seed(slug, args.seed)
    plan = make_plan(slug, out, pages, theme, selected_seed)
    plan["seed_derivation"] = seed_derivation
    plan["backend"]["tools_directory"] = str(backend_tools.resolve())
    if args.plan_only:
        print(json.dumps(plan, indent=2, ensure_ascii=False))
        return 0
    print(f"Generating {book['title']} ({plan['target_duration_s']:.3f}s) with local ACE-Step.", flush=True)
    completed = generate(slug, out, selected_seed, backend_tools, theme, plan)
    print(json.dumps({
        "score": str(out),
        "plan": str(out.with_name(out.stem + ".plan.json")),
        "duration_s": completed["actual_duration_s"],
        "loudness_lufs": completed["loudness_lufs"],
        "peak_dbfs": completed["peak_dbfs"],
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
