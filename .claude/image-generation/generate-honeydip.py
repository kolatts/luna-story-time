"""Generate Honeydip book art (cover + 16 spreads), skipping names that already have a master PNG.

Every image is generated with the series reference image attached (via --edit) so the seven
recurring characters stay on-model; the prompt tells the model to copy designs, not the scene.

Usage, from the repo root:
    python .claude/image-generation/generate-honeydip.py <generator.py> <book-number> [name,name,...] [--suffix v2]
"""
import concurrent.futures
import subprocess
import sys
from pathlib import Path

generator = Path(sys.argv[1])
n = int(sys.argv[2])
args = sys.argv[3:]
suffix = ''
if '--suffix' in args:
    suffix = '-' + args[args.index('--suffix') + 1]
    args = args[:args.index('--suffix')]
root = Path('.claude/image-generation')
REFERENCE = root / '261128-honeydip-family-reference-v2' / 'honeydip-family-reference-v2.png'
names = args[0].split(',') if args else ['cover'] + [f'spread-{i:02d}' for i in range(1, 17)]


def generate(name):
    base = f'honeydip{n}-{name}'
    slug = base + suffix
    if list(root.glob(f'*-{slug}/{slug}.png')):
        return f'{slug}: existing master'
    result = subprocess.run(
        ['uv', 'run', str(generator), '--prompt-file', str(root / f'honeydip-book-{n}-prompts' / f'{base}.txt'),
         '--edit', str(REFERENCE), '--slug', slug, '-s', '1024x1280', '-q', 'medium'],
        capture_output=True, text=True)
    return f'{slug}: exit {result.returncode} {(result.stderr or result.stdout)[-300:] if result.returncode else ""}'


with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    for line in pool.map(generate, names):
        print(line, flush=True)
