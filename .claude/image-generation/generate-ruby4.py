"""Generate Ruby book four art (cover + 16 spreads), skipping slugs that already have a master PNG."""
import concurrent.futures
import subprocess
from pathlib import Path

import sys
generator = Path.home() / '.claude/plugins/cache/kolatts-marketplace/imagile-dev-tools/1.1.0/skills/image-generation/scripts/generate_image.py'
if not generator.exists():
    generator = Path(sys.argv[1])
root = Path('.claude/image-generation')
names = sys.argv[2].split(',') if len(sys.argv) > 2 else ['cover'] + [f'spread-{n:02d}' for n in range(1, 17)]

def generate(name):
    slug = f'ruby4-{name}'
    if list(root.glob(f'*-{slug}/{slug}.png')):
        return f'{slug}: existing master'
    result = subprocess.run(['uv', 'run', str(generator), '--prompt-file', str(root / 'ruby-book-four-prompts' / f'{slug}.txt'),
                             '--slug', slug, '-s', '1024x1280', '-q', 'medium'], capture_output=True, text=True)
    return f'{slug}: exit {result.returncode} {result.stderr[-300:] if result.returncode else ""}'

with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    for line in pool.map(generate, names):
        print(line, flush=True)
