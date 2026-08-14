"""Emit per-spread image prompt files from a book.json (imagePrompt + character sheets).

Usage: python make-prompts.py <book.json> <out-dir> <slug-prefix>
Creates <out-dir>/<prefix>-spread-NN.txt and <out-dir>/<prefix>-cover.txt
"""
import json
import sys
from pathlib import Path

book_path, out_dir, prefix = sys.argv[1], Path(sys.argv[2]), sys.argv[3]
book = json.loads(Path(book_path).read_text(encoding="utf-8"))
sheets = {c["id"]: c["sheet"] for c in book["characters"]}
out_dir.mkdir(parents=True, exist_ok=True)

def write(name, prompt, char_ids):
    parts = [prompt] + [sheets[c] for c in char_ids if c in sheets]
    (out_dir / f"{prefix}-{name}.txt").write_text(" ".join(parts), encoding="utf-8")

for s in book["spreads"]:
    write(f"spread-{s['number']:02d}", s["imagePrompt"], s.get("characters", []))

cover_chars = [c["id"] for c in book["characters"][:3]]
write("cover", book["cover"]["imagePrompt"], cover_chars)
print(f"wrote {len(book['spreads']) + 1} prompt files to {out_dir}")
