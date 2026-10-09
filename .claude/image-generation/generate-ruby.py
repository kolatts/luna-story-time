"""Generate missing Ruby art, retaining prompt manifests and PNG masters locally."""
import concurrent.futures
import subprocess
import sys
from pathlib import Path

generator = Path.home() / '.codex/plugins/cache/claude-cowork/imagile-dev-tools/1.4.0/skills/image-generation/scripts/generate_image.py'
root = Path('.claude/image-generation')

def generate(number):
    slug = f'ruby1-spread-{number:02d}'
    if list(root.glob(f'*-{slug}/{slug}.png')):
        return f'{slug}: existing master'
    result = subprocess.run([sys.executable, str(generator), '--prompt-file', str(root / 'ruby-book-one-prompts' / f'{slug}.txt'), '--slug', slug, '-s', '1024x1280', '-q', 'medium'], capture_output=True, text=True)
    return f'{slug}: exit {result.returncode}\n{result.stdout}\n{result.stderr}'

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    for result in pool.map(generate, range(1, 17)):
        print(result, flush=True)
