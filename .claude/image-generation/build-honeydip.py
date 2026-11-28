"""Build a Honeydip's Christmas Mission book from its spec in .claude/image-generation/honeydip/bookN.py.

One spec file holds the verse, vocab and image prompts, so manuscript.md, book.json and the prompt
files can never drift apart. Run from the repo root:

    python .claude/image-generation/build-honeydip.py 1 [2 3 4]
"""
import importlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE / 'honeydip'))
import common as C  # noqa: E402

ROOT = HERE.parent.parent


def build(n):
    book = getattr(importlib.import_module(f'book{n}'), f'BOOK{n}')
    slug = book['slug']
    book_dir = ROOT / 'books' / slug
    prompt_dir = HERE / f'honeydip-book-{n}-prompts'
    (book_dir / 'images').mkdir(parents=True, exist_ok=True)
    prompt_dir.mkdir(parents=True, exist_ok=True)
    refrain = book['refrain']
    subtitle = f"Book {book['ordinal']} of {C.SERIES_NAME}"
    assert len(book['spreads']) == 16, len(book['spreads'])

    used = []
    spreads = []
    ms = [f"# {book['title']}", '', f"*{subtitle}*", f"*Written with love by {' and '.join(C.AUTHORS)}.*", '',
          f"**Refrain:** {refrain} (Spreads {', '.join(str(x) for x in sorted(book['refrain_spreads']))}.)", '']
    for i, (title, text, pos, chars, vocab, prompt, effect) in enumerate(book['spreads'], 1):
        text = text.strip('\n')
        assert refrain not in text, i
        lines = [ln for ln in text.split('\n') if ln.strip()]
        want = 7 if i in book.get('short_spreads', set()) or (i in book['refrain_spreads'] and len(lines) == 7) else 8
        assert len(lines) == want, (i, len(lines))
        if i in book.get('prompt_fixes', {}):  # corrections learned from art review
            prompt = prompt + ' IMPORTANT: ' + book['prompt_fixes'][i]
        low = text.lower()
        for word, _ in vocab:
            assert word.lower() in low, (i, word)
        for c in chars:
            assert c in C.SHEETS, (i, c)
            if c not in used:
                used.append(c)
        spread = {'number': i, 'title': title, 'text': text, 'image': f'images/{i:02d}.webp', 'textPosition': pos,
                  'characters': chars, 'vocab': [{'word': w, 'definition': d} for w, d in vocab],
                  'imagePrompt': prompt}
        if i in book['refrain_spreads']:
            spread['refrain'] = True
        if effect:
            spread['effect'] = effect
        if i == 16:
            spread['theEnd'] = book['the_end']
        spreads.append(spread)
        ms += [f'## {i}. {title}', '', text, '']
        write_prompt(prompt_dir, n, f'spread-{i:02d}', prompt, chars, book.get('sheet_overrides', {}).get(i))
    for c in book['cover_chars']:
        if c not in used:
            used.append(c)
    write_prompt(prompt_dir, n, 'cover', book['cover_prompt'], book['cover_chars'])

    order = [c for c in C.SHEETS if c in used]
    data = {
        'series': C.SERIES_ID, 'ageRange': '4-8', 'styleString': C.STYLE_STRING, 'slug': slug,
        'bookNumber': n, 'title': book['title'], 'subtitle': subtitle, 'authors': C.AUTHORS, 'refrain': refrain,
        'palette': C.PALETTE,
        'characters': [{'id': c, 'name': C.NAMES[c], 'sheet': C.SHEETS[c]} for c in order],
        'cover': {'image': 'images/cover.webp', 'imagePrompt': book['cover_prompt'], 'effect': book['cover_effect']},
        'spreads': spreads, 'questions': book['questions'], 'lookAndFind': book['look_and_find'],
        'assetVersion': f'honeydip{n}-2',
    }
    (book_dir / 'book.json').write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    (book_dir / 'manuscript.md').write_text('\n'.join(ms), encoding='utf-8')
    print(f'book {n}: {slug}: book.json, manuscript.md and 17 prompts written')


def write_prompt(prompt_dir, n, name, prompt, chars, honeydip_sheet=None):
    # honeydip_sheet replaces her normal (pink) sheet on pages where she has lost her color.
    parts = [C.REF_PREAMBLE + prompt] + [honeydip_sheet if (c == 'honeydip' and honeydip_sheet) else C.SHEETS[c]
                                         for c in chars]
    (prompt_dir / f'honeydip{n}-{name}.txt').write_text(' '.join(parts), encoding='utf-8')


for arg in sys.argv[1:] or ['1']:
    build(int(arg))
