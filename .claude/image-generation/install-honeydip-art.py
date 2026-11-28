"""Convert a Honeydip book's master PNGs to WebP and install them in books/<slug>/images/.

For each page the newest version wins: honeydipN-spread-07-v3 beats -v2 beats the base run.
Pin a specific version with name=suffix, for example spread-07=v2 or spread-07=base.

Usage, from the repo root:
    uv run --with pillow python .claude/image-generation/install-honeydip-art.py <book-number> [name=suffix ...]
"""
import importlib
import re
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE / 'honeydip'))
n = int(sys.argv[1])
pins = dict(a.split('=') for a in sys.argv[2:])
slug = getattr(importlib.import_module(f'book{n}'), f'BOOK{n}')['slug']
out_dir = HERE.parent.parent / 'books' / slug / 'images'
out_dir.mkdir(parents=True, exist_ok=True)

for name in ['cover'] + [f'spread-{i:02d}' for i in range(1, 17)]:
    base = f'honeydip{n}-{name}'
    found = {}
    for png in HERE.glob(f'*-{base}*/{base}*.png'):
        m = re.fullmatch(re.escape(base) + r'(?:-v(\d+))?', png.stem)
        if m:
            found[int(m.group(1) or 1)] = png
    assert found, f'no master for {base}'
    pin = pins.get(name)
    version = 1 if pin == 'base' else int(pin[1:]) if pin else max(found)
    src = found[version]
    dst = out_dir / ('cover.webp' if name == 'cover' else f'{int(name[-2:]):02d}.webp')
    Image.open(src).convert('RGB').save(dst, 'WEBP', quality=82, method=6)
    print(f'{dst.name} <- {src.parent.name} ({dst.stat().st_size // 1024} KB)')
