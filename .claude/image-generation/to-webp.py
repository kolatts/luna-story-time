"""Convert book PNGs to web-friendly WebP (quality 82). Run after generation."""
import sys
from pathlib import Path
from PIL import Image

for src in sys.argv[1:]:
    p = Path(src)
    if not p.exists():
        print(f"missing: {p}"); continue
    img = Image.open(p).convert("RGB")
    out = p.with_suffix(".webp")
    img.save(out, "WEBP", quality=82, method=6)
    print(f"{p.name}: {p.stat().st_size//1024}KB -> {out.name}: {out.stat().st_size//1024}KB")
