"""Build books/ruby-war-noir-and-the-spirit-dragon/book.json from its manuscript, and write the image prompt files.

The spread text comes straight from manuscript.md sections, so book.json text never drifts from it.
Run from the repo root: python .claude/image-generation/build-ruby9.py
"""
import json
import re
from pathlib import Path

root = Path('.')
SLUG = 'ruby-war-noir-and-the-spirit-dragon'
book_dir = root / 'books' / SLUG
prompt_dir = root / '.claude/image-generation/ruby-book-nine-prompts'
REFRAIN = "It's never too late to be kind."
REFRAIN_SPREADS = {8, 11, 14, 16}

manuscript = (book_dir / 'manuscript.md').read_text(encoding='utf-8')
sections = re.findall(r'^## (\d+)\. (.+?)\n\n(.*?)(?=\n## |\Z)', manuscript, flags=re.S | re.M)
assert len(sections) == 16, len(sections)

b8 = json.loads((root / 'books/ruby-nola-and-marron/book.json').read_text(encoding='utf-8'))
existing = {c['id']: c for c in b8['characters']}

GIGGLES = {
    'id': 'giggles',
    'name': 'Giggles',
    'sheet': ("Giggles: female baby spirit dragon the size of a small puppy, with a little bit of every other dragon in "
              "her. Rounded body of smooth scales in clear RAINBOW bands running from nose to tail: red head, orange "
              "neck, yellow shoulders, green middle, blue hips and a violet tail. A pearl-white belly with ONE small "
              "cherry-red heart-shaped patch on her chest; two orange cheek frills; a little collar of small green "
              "leaves around her neck; a row of small zigzag spikes down her back alternating yellow and silver; two "
              "tiny horns, ONE gold and ONE silver; two small wings with violet membranes; her curled violet tail ends "
              "in a small round glowing silver tip; large sparkling glittery pink eyes with gold flecks; four little "
              "legs; a wide open-mouthed giggling smile. A soft rainbow glitter shimmer rims her outline. Exactly one "
              "head. Dragon, never a human, never a bird, never a unicorn. Tiny rainbow firework sparkles only when "
              "specified."),
}

order = ['ruby', 'giggles', 'flame', 'pearl', 'sparks', 'crackle', 'luna', 'leaf', 'shinebright', 'lovee', 'starry',
         'nola-marron', 'black-hole', 'noir', 'war', 'grizzlemop']
characters = [GIGGLES if cid == 'giggles' else existing[cid] for cid in order]
sheets = {c['id']: c['sheet'] for c in characters}

NINE_IDS = ['flame', 'pearl', 'sparks', 'crackle', 'luna', 'leaf', 'shinebright', 'lovee', 'starry']
ALL_IDS = NINE_IDS + ['nola-marron', 'black-hole']
NINE = ("red Flame, white-blue Pearl, the YELLOW baby dragon with silver eyes Sparks, the SILVER baby dragon with "
        "yellow eyes Crackle, the baby BLACK dragon speckled with silver stars Luna, the slim upright baby GREEN leaf "
        "dragon Leaf with a jagged spiky leaf crest, the baby GREEN-AND-BLUE wish dragon with a glittering silver "
        "belly Shinebright with sea-green eyes, PINK-topped RED-bellied Lovee with pink wings, and Starry, who looks "
        "just like Shinebright but with glittery PINK eyes")
NM = ("the ONE two-headed baby dragon Nola and Marron (one glittery SILVER head with deep-blue eyes and one glittery "
      "GOLD head with chestnut-brown eyes on one body)")
BH = ("big Black Hole (the size of a large dog, smaller than Ruby, charcoal scales with lavender highlights and violet "
      "wings, with a gentle face: soft kind eyes and a closed-mouth smile, no grin, not mean)")
MEADOW = ("Bright sunny daytime on a green meadow lawn just outside the lavender-stone castle of Riverlight, blue sky, "
          "buttercups and daisies, a low lavender-stone wall with an open gate in the background")
EGG = ("the Spirit Egg: one big egg the size of a pumpkin whose smooth shell is banded in soft rainbow colors (red, "
       "orange, yellow, green, blue, violet) and sprinkled with tiny glittering firework-burst sparkles")
EGG_SHUT = ("the Spirit Egg, one big pumpkin-sized egg with a rainbow-banded shell, now dim and quiet: its colors are "
            "pale and faded, with no glow and no sparkles, shut tight, not cracked")
BRAID = "War's black braid is comically super long, many times her height, trailing along the grass behind her"
DRESS_ALL = ("Ruby now wears her new bond dress instead of plum: a patchwork tunic dress stitched together from ten "
             "bright patches, one from each of her earlier dresses: ember red; waterfall blue with pearl-white trim; "
             "lemon yellow next to shining silver; midnight black sprinkled with tiny silver stars; spring green with "
             "pink flower petals; swirled sea-green and ocean-blue; rose pink with a red heart; shining gold; glittery "
             "silver-and-gold with tiny hourglasses; and charcoal with violet swirls; with small rainbow firework "
             "bursts sparkling across the patches, and soft golden boots")
RUBY_MARK = "crown and silver forehead mark visible"
PLUM = "Ruby in her normal PLUM tunic dress"
COUNT12 = ("Count them: twelve dragons in all = rainbow Giggles + nine small baby dragons + the two-headed "
           "silver-and-gold dragon + big Black Hole. Little Luna (small, black with silver stars) is a separate dragon "
           "from big Black Hole, and BOTH green-and-blue sisters Shinebright and Starry are there")

# number: (textPosition, characters, vocab, imagePrompt, effect)
S = {
    1: ('bottom', ['ruby'] + ALL_IDS, [('glowed', 'shone with a soft, warm light'), ('swirled', 'spun round and round')],
        f"{MEADOW}. {PLUM} stands in one big ring with her dragons, holding paws, paw in paw and tail in tail, the silver mark on her forehead glowing warm; {RUBY_MARK}. In the ring, each exactly once: exactly NINE puppy-sized baby dragons ({NINE}), plus {NM}, plus {BH}. From the dragons, ribbons of magic light swirl up into the air above the middle of the ring: a curl of warm fire, clear bubbles, gold sparks, silver moonbeams, green flowering vines, pink heart-lights and violet swirls, twisting together into one bright rainbow swirl. Count them: eleven dragons in all = nine small baby dragons + the two-headed silver-and-gold dragon + big Black Hole. Little Luna (puppy-sized, black with silver stars, moon-silver eyes) is a separate small dragon from big Black Hole, who is plain charcoal with NO star speckles and is no taller than Ruby. There are exactly TWO green-and-blue sister dragons, sitting side by side: Shinebright with sea-green eyes AND Starry with pink eyes. No egg yet. No other people. Main subject in lower two thirds.", 'bond'),
    2: ('bottom', ['ruby', 'shinebright', 'flame', 'pearl'], [('spirit', 'the happy, shining feeling inside you, and inside a team of friends'), ('prize', 'something you win and get to keep')],
        f"{MEADOW}. Floating just above the grass in the middle, glowing brightly, is {EGG}, with a soft rainbow glow and little rainbow firework sparkles popping around it; one tiny puff of warm flame and a few clear soap bubbles pop out beside the egg like giggles. {PLUM} kneels beside it with delighted wide eyes and open hands, {RUBY_MARK}. Beside her Shinebright points a paw at the egg, explaining; Flame and Pearl look on, amazed. Exactly Ruby, Shinebright, Flame and Pearl, no other characters, no hatched dragon.", 'starlight'),
    3: ('top', ['noir', 'war'], [('cruel', 'very unkind, in a way that hurts someone'), ('bonds', 'special friendships that hold hearts together')],
        "Bright daytime inside a gray, quiet, empty room of Noir's charcoal-and-gray stone palace, dull gray light, almost no color; flowering green vines hold the old stones together. Noir sits stiffly on a gray chair with her nose in the air, sniffing, and War sits slumped on the floor beside her with her arms crossed, grumbling; War's black braid is comically super long, lying in big loops across the floor. An empty dragon-sized cushion sits beside them. Through a big arched window behind them, far away over green hills, a bright rainbow-colored light flashes in the sky above a tiny distant lavender castle. Exactly Noir and War, no dragons, no Ruby, no other people.", None),
    4: ('bottom', ['ruby', 'noir', 'war', 'black-hole'], [('galore', 'lots and lots'), ('blinked', 'shut and opened your eyes very fast')],
        f"{MEADOW}. Noir and War have just stomped in through the open gate: War points an angry accusing finger at Ruby, shouting, and Noir stands tall behind her with a soft empty black sack over her arm, also pointing; {BRAID}. {PLUM} stands facing them, blinking in surprise with one hand on her own chest as if asking 'me?', {RUBY_MARK}. Beside Ruby stands {BH}, calm. Behind Ruby the rainbow-banded Spirit Egg glows softly on the grass. Exactly Ruby, Noir, War and Black Hole, no other dragons in this picture.", None),
    5: ('top', ['ruby', 'war', 'noir', 'flame', 'pearl', 'luna', 'leaf', 'lovee'], [('heaved', 'pulled as hard as you can'), ('chose', 'picked the one you wanted')],
        f"{MEADOW}, on a grassy green slope. A comic tug-of-war: War has looped her super long black braid like a rope around a ring of baby dragons, and she and Noir lean back and pull hard on it together, heels dug into the grass, grumpy determined faces. The ring is being pulled apart: {PLUM}, {RUBY_MARK}, and exactly five puppy-sized baby dragons (red Flame, white-blue Pearl, the baby BLACK dragon speckled with silver stars Luna, the slim upright baby GREEN leaf dragon Leaf, and PINK-topped RED-bellied Lovee with pink wings) reach for each other's paws as they slide apart, surprised and upset but not hurt. In the middle of the broken ring sits the rainbow-banded Spirit Egg. Comic and safe, nobody hurt. No other people.", None),
    6: ('bottom', ['ruby', 'flame', 'pearl', 'shinebright', 'nola-marron'], [('thread', 'a very thin string'), ('hummed', 'sang with your lips closed')],
        f"{MEADOW}. {PLUM} stands calmly with one hand tapping her own heart, speaking gently, {RUBY_MARK}. On the grass in front of her sits {EGG_SHUT}. Flame breathes a tiny warm puff on it, Pearl hums beside it, and the two-headed baby dragon (silver head and gold head) twirls a little silver sparkle at it, all three worried. Shinebright sits close, looking at the egg thoughtfully. Exactly Ruby, Flame, Pearl, Shinebright and the two-headed dragon. No Noir, no War.", None),
    7: ('top', ['black-hole', 'noir', 'war', 'ruby'], [('rumbled', 'said in a deep, low voice'), ('kindly', 'in a gentle, caring way')],
        f"{MEADOW}. {BH} pads forward and stands firmly but gently between Noir and War on one side and Ruby on the other, facing Noir and War; he is calm, serious and kind, one paw raised a little as if saying 'no'. Noir reaches both hands greedily toward the egg; War stands beside her, {BRAID}. Behind Black Hole, {PLUM} kneels and hugs {EGG_SHUT} protectively; the egg is plain, with nothing on it (no crown, no tiara, no jewelry on the egg). Ruby's tiny gold crown stays on her own head and her silver forehead mark is visible. Black Hole is no taller than Ruby. Exactly Black Hole, Noir, War and Ruby, no baby dragons.", None),
    8: ('bottom', ['black-hole', 'pearl', 'noir', 'war'], [('listened', 'paid attention to what someone was saying'), ('unkind', 'not gentle or caring')],
        f"{MEADOW}. Close, gentle scene: {BH} sits in the grass speaking softly and honestly to Noir and War, looking up at them with kind, sad eyes, one paw on his own chest. Little Pearl peeks out shyly from behind his front leg, a bit frightened. Noir and War stand listening, their angry faces just starting to turn unsure and surprised; {BRAID}. Exactly Black Hole, Pearl, Noir and War. No Ruby in this picture.", None),
    9: ('top', ['ruby', 'war', 'noir', 'flame', 'pearl', 'sparks', 'crackle', 'luna', 'leaf', 'lovee'], [('trembling', 'shaking because you are scared'), ('peeking', 'taking a quick little look')],
        f"{MEADOW}. War stands in the front, looking down at her own two open hands with a shocked, sad face, her eyes wide and her lip wobbling, not scowling; her super long braid lies dropped on the grass. Beside her Noir looks down at the soft empty black sack in her hands, her face no longer stern but troubled and ashamed. Across from them {PLUM} stands with her arms spread protectively, {RUBY_MARK}, and hiding behind her in a row, peeking out with big frightened eyes and trembling, are exactly seven puppy-sized baby dragons, each exactly once: red Flame, white-blue Pearl, the YELLOW baby dragon with silver eyes Sparks, the SILVER baby dragon with yellow eyes Crackle, the baby BLACK dragon speckled with silver stars Luna, the slim upright baby GREEN leaf dragon Leaf, and PINK-topped RED-bellied Lovee with pink wings. No other people.", None),
    10: ('bottom', ['war', 'noir', 'ruby', 'black-hole', 'pearl'], [('sorry', "what you say when you wish you hadn't hurt someone"), ('bossed', 'told someone what to do, over and over')],
         f"{MEADOW}, soft late-afternoon golden light. War stands with her head bowed and her hands open at her sides, saying sorry, her face sad and sincere, not scowling; her super long braid lies dropped on the grass. Beside her Noir kneels in the grass with her head bowed and one hand on her heart, saying sorry, her face soft and sorrowful, not stern; her empty black sack lies dropped on the grass. Facing them, {PLUM} listens with a gentle, serious face, {RUBY_MARK}; {BH} sits beside Ruby, and little Pearl peeks from behind Ruby's skirt. Tender, quiet mood. Exactly War, Noir, Ruby, Black Hole and Pearl.", None),
    11: ('top', ['noir', 'pearl', 'ruby', 'war', 'flame', 'luna'], [('forgive', 'to stop being upset with someone who said sorry'), ('nuzzled', 'rubbed softly with a nose, like a snuggle')],
         f"{MEADOW}, soft late-afternoon golden light. Noir kneels in the grass, and little Pearl stands in front of her nuzzling Noir's open hand; Noir looks down at Pearl with a surprised, tearful, gentle smile, not stern. {PLUM} stands beside them smiling warmly with one hand on War's shoulder, {RUBY_MARK}; War smiles a small shy, relieved smile, not scowling; {BRAID}. Flame and the baby BLACK dragon speckled with silver stars Luna creep out from behind a bush toward them. On the grass beside Ruby the rainbow-banded Spirit Egg glows brightly again and wiggles, with a little rainbow sparkle popping above it. Exactly Noir, Pearl, Ruby, War, Flame and Luna.", 'starlight'),
    12: ('bottom', ['giggles', 'ruby'], [('fizzed', 'made lots of tiny, bubbly pops'), ('collar', 'a ring that goes around a neck')],
         f"{MEADOW}, soft golden late-afternoon light. In the center, a rainbow-banded eggshell bursts open in a joyful burst of small rainbow firework sparkles like flowers, pieces of rainbow shell flying, and out tumbles Giggles in mid-air, laughing with her mouth wide open, wings spread. Below her {PLUM} throws her arms up in delight, {RUBY_MARK}. Exactly Giggles and Ruby, no other characters. Giggles appears exactly once.", 'starlight'),
    13: ('top', ['ruby', 'giggles'], [('patch', 'a small piece of cloth sewn onto something'), ('stitched', 'sewn together with thread')],
         f"{MEADOW}, golden late-afternoon light. Ruby holds out her open palm and Giggles presses her little red nose into it. {DRESS_ALL}. Tiny rainbow firework sparkles fizz above both of Ruby's hands. Ruby beams, {RUBY_MARK}, rainbow hair. Exactly Ruby and Giggles, no other characters.", 'bond'),
    14: ('bottom', ['giggles', 'noir', 'war', 'ruby'], [('sparks', 'tiny dots of bright light'), ('edge', 'the very outside part')],
         f"{MEADOW}, golden sunset light. Giggles hovers in the air, giggling, and two small rainbow sparks have floated from her to Noir and War: a small glowing rainbow-colored heart-shaped light shines on Noir's chest and another on War's chest, over their hearts. Noir looks down at her heart-light in wonder with a soft, happy smile, not stern; War holds out one hand shyly toward Ruby with a hopeful smile, not scowling; {BRAID}. {DRESS_ALL}. Ruby opens both arms wide to them, laughing with joy, {RUBY_MARK}. Exactly Giggles, Noir, War and Ruby.", 'starlight'),
    15: ('top', ['ruby', 'giggles'] + ALL_IDS + ['noir', 'war', 'grizzlemop'], [('piled', 'climbed on top of each other in a heap'), ('grin', 'a big, happy smile')],
         f"Night on the lawn outside the lavender-stone castle of Riverlight, warm golden lantern glow, and big rainbow fireworks bursting in the indigo sky. In the middle of the lawn stands the big chair: a huge, wide lavender-stone-and-gold throne with a plum cushion, much too big for one child. Piled happily all over it, each exactly once: Ruby in the middle, {RUBY_MARK}; War sitting beside Ruby, laughing, not scowling, a small rainbow heart-light glowing on her chest, her super long black braid hanging down off the chair across the grass; Noir perched on the arm of the chair, smiling warmly, not stern, a small rainbow heart-light glowing on her chest; Giggles on Ruby's lap, giggling up at the fireworks; exactly NINE puppy-sized baby dragons on the cushion, arms and back of the chair ({NINE}); {NM} on the top of the chair back; and {BH} curled at the foot of the chair. Big shaggy chestnut-brown Grizzlemop stands beside the chair, grinning. {DRESS_ALL}. {COUNT12}. No other people.", 'starlight'),
    16: ('top', ['ruby', 'giggles'] + ALL_IDS + ['noir', 'war'], [('bloomed', 'opened up bright, like a flower'), ('cozy', 'warm, soft and snug')],
         f"Cozy lavender-stone bedroom at night, warm golden lantern glow. Through the big window, far away over dark hills, a small distant palace with a tall tower glows in every rainbow color. {DRESS_ALL}. Ruby lies asleep on pillows in a big bed, happy, {RUBY_MARK}, rainbow hair; War sleeps beside her, peaceful and smiling, not scowling, a small rainbow heart-light glowing softly on her chest. Noir sits on the edge of the bed tucking a soft blanket around them with a gentle, loving smile, not stern, a small rainbow heart-light glowing softly on her chest. Curled all around on the bed asleep, each exactly once: rainbow Giggles snuggled under Ruby's arm; exactly NINE puppy-sized baby dragons ({NINE}); {NM}; and {BH} asleep at the foot of the bed. {COUNT12}. No other people.", 'starlight'),
}

COVER_CHARS = ['ruby', 'giggles', 'war', 'noir']
COVER_PROMPT = ("Golden sunset on the green meadow lawn outside the lavender-stone castle of Riverlight, with generous open "
                "sky across the upper third where a few soft rainbow fireworks sparkle. "
                f"{DRESS_ALL}. Ruby stands in the middle, smiling, {RUBY_MARK}, holding Giggles in her arms; Giggles "
                "giggles with her mouth open. Standing close on one side of Ruby is War, smiling a shy happy smile, not "
                "scowling, her black braid comically super long and trailing on the grass; on the other side is Noir, "
                "smiling warmly, not stern. Each of them has a small glowing rainbow-colored heart-shaped light on her "
                "chest. Exactly Ruby, Giggles, War and Noir, no other characters.")
CONCEPT_PROMPT = ("Character concept portrait on a plain soft lavender background: Giggles standing on all four legs in a "
                  "three-quarter view, whole body visible from nose to tail tip, wings half open, giggling. Exactly one "
                  "dragon, no other characters.")

spreads = []
for num, title, body in sections:
    n = int(num)
    pos, chars, vocab, prompt, effect = S[n]
    text = body.strip()
    assert REFRAIN not in text
    for word, _ in vocab:
        assert word.lower() in text.lower(), (n, word)
    spread = {'number': n, 'title': title.strip(), 'text': text, 'image': f'images/{n:02d}.webp',
              'textPosition': pos, 'characters': chars,
              'vocab': [{'word': w, 'definition': d} for w, d in vocab], 'imagePrompt': prompt}
    if n in REFRAIN_SPREADS:
        spread['refrain'] = True
    if effect:
        spread['effect'] = effect
    if n == 16:
        spread['theEnd'] = 'The End — twelve dragons, thirteen heads, two new friends, and one big cuddle.'
    spreads.append(spread)

book = {
    'series': 'ruby-and-the-dragon-bonds', 'ageRange': '4-8', 'styleString': b8['styleString'],
    'slug': SLUG, 'bookNumber': 9, 'title': 'Ruby, War, Noir, and the Spirit Dragon',
    'subtitle': 'Book Nine of Ruby and the Dragon Bonds', 'authors': ['Luna', 'Sunny'], 'refrain': REFRAIN,
    'palette': b8['palette'], 'characters': characters,
    'cover': {'image': 'images/cover.webp', 'imagePrompt': COVER_PROMPT, 'effect': 'starlight'},
    'spreads': spreads,
    'questions': [
        "Noir and War thought they were the nice ones. Have you ever thought you were being nice, and then found out it didn't feel nice to somebody else?",
        "Black Hole told them a hard, true thing as kindly as he could. Who tells you the truth in a kind way?",
        "War and Noir said just what they were sorry for. What makes a sorry feel real to you?",
        "Ruby forgave them, and the big chair turned out to be big enough for everyone. Who could you make room for?",
    ],
    'lookAndFind': "Giggles has a little bit of every dragon. Can you find Flame's orange frills, Lovee's red heart, and Luna's glowing tail on her?",
    'assetVersion': 'ruby9-1',
}
(book_dir / 'book.json').write_text(json.dumps(book, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

prompt_dir.mkdir(parents=True, exist_ok=True)
def write_prompt(name, prompt, chars):
    parts = [prompt] + [sheets[c] for c in chars]
    (prompt_dir / f'ruby9-{name}.txt').write_text(' '.join(parts), encoding='utf-8')
for s in spreads:
    write_prompt(f"spread-{s['number']:02d}", s['imagePrompt'], s['characters'])
write_prompt('cover', COVER_PROMPT, COVER_CHARS)
write_prompt('concept-giggles', CONCEPT_PROMPT, ['giggles'])
print('book.json and 18 prompts written')
