"""Redraw Leaf on one page so she matches Book Four's Leaf (the canonical design).

Same approach as fix-ruby-crown.py: masked gpt-image edit with [page, reference] as inputs, then
composite ONLY the masked rectangle (feathered) back onto the original.

Usage: uv run --with pillow python .claude/image-generation/fix-leaf.py <page.png> <x0,y0,x1,y1> <slug> [--nomask]
--nomask edits the whole page (the model can see Leaf, so it won't erase her) and still composites only the box;
use it when the masked edit keeps erasing her.
Writes .claude/image-generation/<date>-<slug>/<slug>.png (raw edit) and <slug>-composite.png.
"""
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

GENERATOR = Path.home() / '.claude/plugins/cache/kolatts-marketplace/imagile-dev-tools/1.1.0/skills/image-generation/scripts/generate_image.py'
ROOT = Path('.claude/image-generation')
REFERENCE = ROOT / 'leaf-reference.png'
BOOK4 = Path('books/ruby-and-the-leafy-egg/images')


def build_reference():
    """Leaf from the Book Four cover and spread 16, side by side on one canvas."""
    tiles = [Image.open(BOOK4 / 'cover.webp').crop((400, 590, 730, 960)),
             Image.open(BOOK4 / '16.webp').crop((220, 650, 420, 900)).resize((296, 370))]
    ref = Image.new('RGB', (sum(t.width for t in tiles), max(t.height for t in tiles)), 'white')
    x = 0
    for t in tiles:
        ref.paste(t, (x, 0))
        x += t.width
    ref.save(REFERENCE)


if not REFERENCE.exists():
    build_reference()

page, box, slug = Path(sys.argv[1]), [int(v) for v in sys.argv[2].split(',')], sys.argv[3]
nomask = '--nomask' in sys.argv[4:]
prompt = ("Image 1 is a finished storybook page; image 2 is the character reference for Leaf, the baby GREEN leaf dragon. "
          "In image 1, redraw ONLY the baby green leaf dragon so she is the same character as image 2: a slim, upright, small "
          "puppy-sized dragon with a small dragon head and short snout (not round, not chubby, not a blob), soft sage-to-spring "
          "green scales with lighter leaf-vein lines, a jagged crest of small spiky green leaves running from the top of her head "
          "down her neck and back, a ruff of small pointed leaves around her neck, two small brown twig horns, petal-pink eyes, "
          "leaf-shaped veined green wings folded at her back, a pale green belly, and a curled tail ending in a leaf tip. "
          "No big leaf ears or floppy leaves on the sides of her head. The transparent masked area of image 1 MUST contain "
          "exactly one baby green leaf dragon, fully drawn and clearly visible; never erase her, never leave the area empty, "
          "and never draw a black dragon there. Keep her in the same spot, facing the same way, doing the "
          "same thing, at about the same size. Keep everything else in image 1 exactly unchanged, in image 1's soft watercolor "
          "and colored-pencil style. No text.")

original = Image.open(page).convert('RGBA')
mask = Image.new('RGBA', original.size, (0, 0, 0, 255))
ImageDraw.Draw(mask).rectangle(box, fill=(0, 0, 0, 0))
scratch = ROOT / 'ruby-crown-fix-masks'
scratch.mkdir(exist_ok=True)
mask_path = scratch / f'{slug}-mask.png'
mask.save(mask_path)

before = set(ROOT.glob(f'*-{slug}*'))
result = subprocess.run(['uv', 'run', str(GENERATOR), prompt, '--edit', str(page), str(REFERENCE),
                         *([] if nomask else ['--mask', str(mask_path)]),
                         '--no-style', '--slug', slug, '-s', f'{original.width}x{original.height}', '-q', 'medium'],
                        capture_output=True, text=True)
if result.returncode:
    sys.exit(f'edit failed: {result.stderr[-600:]}')
run_dir = sorted(set(ROOT.glob(f'*-{slug}*')) - before)[-1]
edited = Image.open(next(run_dir.glob('*.png'))).convert('RGBA').resize(original.size)

feather = Image.new('L', original.size, 0)
pad = 8
ImageDraw.Draw(feather).rectangle([box[0] + pad, box[1] + pad, box[2] - pad, box[3] - pad], fill=255)
feather = feather.filter(ImageFilter.GaussianBlur(pad))
composite = Image.composite(edited, original, feather).convert('RGB')
out = run_dir / f'{slug}-composite.png'
composite.save(out)
print(out)
