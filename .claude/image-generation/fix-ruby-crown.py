"""Redraw Ruby's crown and forehead mark on one page from the canonical reference.

Masked gpt-image edit with [page, reference] as inputs, then composite ONLY the masked
rectangle (feathered) back onto the original, so the rest of the page is untouched.
Keep the box off Ruby's eyes: the model shifts faces a few px and leaves ghost eyes.

Usage: uv run --with pillow python .claude/image-generation/fix-ruby-crown.py <page.png> <x0,y0,x1,y1> <slug> [--mark-only|--crown-only|--clear-noir]
--clear-noir erases a forehead mark the model wrongly gave Noir (no reference image).
Writes .claude/image-generation/<date>-<slug>/<slug>.png (raw edit) and <slug>-composite.png.
"""
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

GENERATOR = Path.home() / '.claude/plugins/cache/kolatts-marketplace/imagile-dev-tools/1.1.0/skills/image-generation/scripts/generate_image.py'
REFERENCE = Path('.claude/image-generation/261010-ruby-canon-reference/ruby-canon-reference.png')
ROOT = Path('.claude/image-generation')

CROWN = ("the crown is a tiny simple gold crown with exactly three rounded ball-tipped points and one small round ruby-red gem "
         "on the middle point, narrow, only about one third the width of her head")
MARK = ("the forehead mark is a small flat silver birthmark shaped like an upright side-view dragon silhouette (head at top, "
        "curled tail at bottom), centered on her forehead just above the eyebrows, about as tall as her eye, flat on the skin, "
        "not a jewel, not a letter, not a symbol, not a tiara")

page, box, slug = Path(sys.argv[1]), [int(v) for v in sys.argv[2].split(',')], sys.argv[3]
mode = sys.argv[4] if len(sys.argv) > 4 else ''
if mode == '--mark-only':
    what, spec = "ONLY Ruby's forehead mark", MARK
elif mode == '--crown-only':
    what, spec = "ONLY Ruby's crown", CROWN
else:
    what, spec = "ONLY Ruby's crown and her forehead mark", f"{CROWN}; {MARK}"

inputs = [str(page), str(REFERENCE)]
prompt = (f"Image 1 is a finished storybook page; image 2 is the character reference for the rainbow-haired girl Ruby. In image 1, "
          f"redraw {what} so they match image 2 exactly in design and in size relative to her head: {spec}. Keep the crown sitting "
          f"where it is on her head. Keep her face, eyes, eyebrows, hair, pose and everything else in image 1 exactly unchanged, "
          f"painted in image 1's soft watercolor and colored-pencil style. No text.")
if mode == '--clear-noir':
    inputs = [str(page)]
    prompt = ("In this storybook page, erase the small silver mark on the forehead of the black-haired woman with the tall silver "
              "crown, leaving plain smooth forehead skin that matches her face. Keep her eyes, eyebrows, hair, crown and everything "
              "else exactly unchanged, in the same soft watercolor and colored-pencil style. No text.")

original = Image.open(page).convert('RGBA')
mask = Image.new('RGBA', original.size, (0, 0, 0, 255))
ImageDraw.Draw(mask).rectangle(box, fill=(0, 0, 0, 0))
scratch = ROOT / 'ruby-crown-fix-masks'
scratch.mkdir(exist_ok=True)
mask_path = scratch / f'{slug}-mask.png'
mask.save(mask_path)

before = set(ROOT.glob(f'*-{slug}*'))
result = subprocess.run(['uv', 'run', str(GENERATOR), prompt, '--edit', *inputs, '--mask', str(mask_path),
                         '--no-style', '--slug', slug, '-s', f'{original.width}x{original.height}', '-q', 'medium'],
                        capture_output=True, text=True)
if result.returncode:
    sys.exit(f'edit failed: {result.stderr[-600:]}')
run_dir = sorted(set(ROOT.glob(f'*-{slug}*')) - before)[-1]
edited = Image.open(next(run_dir.glob('*.png'))).convert('RGBA').resize(original.size)

feather = Image.new('L', original.size, 0)
pad = 6
ImageDraw.Draw(feather).rectangle([box[0] + pad, box[1] + pad, box[2] - pad, box[3] - pad], fill=255)
feather = feather.filter(ImageFilter.GaussianBlur(pad))
composite = Image.composite(edited, original, feather).convert('RGB')
out = run_dir / f'{slug}-composite.png'
composite.save(out)
print(out)
