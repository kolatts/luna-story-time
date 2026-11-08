"""Build books/ruby-nola-and-marron/book.json from its manuscript, and write the image prompt files.

The spread text comes straight from manuscript.md sections, so book.json text never drifts from it.
Run from the repo root: python .claude/image-generation/build-ruby8.py
"""
import json
import re
from pathlib import Path

root = Path('.')
book_dir = root / 'books/ruby-nola-and-marron'
prompt_dir = root / '.claude/image-generation/ruby-book-eight-prompts'
REFRAIN = 'Two can do if they work together.'
REFRAIN_SPREADS = {9, 10, 14, 16}

manuscript = (book_dir / 'manuscript.md').read_text(encoding='utf-8')
sections = re.findall(r'^## (\d+)\. (.+?)\n\n(.*?)(?=\n## |\Z)', manuscript, flags=re.S | re.M)
assert len(sections) == 16, len(sections)

b7 = json.loads((root / 'books/ruby-and-the-dream-dragon/book.json').read_text(encoding='utf-8'))
b4 = json.loads((root / 'books/ruby-and-the-leafy-egg/book.json').read_text(encoding='utf-8'))
existing = {c['id']: c for c in b7['characters']}
existing['grizzlemop'] = next(c for c in b4['characters'] if c['id'] == 'grizzlemop')

NOLA_MARRON = {
    'id': 'nola-marron',
    'name': 'Nola and Marron',
    'sheet': ("Nola and Marron: ONE puppy-sized baby dragon with TWO HEADS on two short necks sharing ONE rounded "
              "body, four little legs, two wings and one curled tail. Both heads are girls. The dragon is split "
              "cleanly down the middle: one head and that half of the body, one wing and that half of the tail are "
              "glittery shimmering SILVER scales (Nola, the time dragon: large deep-blue eyes, two tiny silver horns, "
              "an eager excited expression); the other head and that half of the body, the other wing and that half "
              "of the tail are glittery shimmering GOLD scales (Marron, the friendship dragon: large warm "
              "chestnut-brown eyes, two tiny gold horns, a kind patient expression). The silver and gold meet in a "
              "neat line down the chest, belly and tail; the tail tip is half silver, half gold. Smooth glittery "
              "scales like frost and sunshine, soft and rounded, no zigzag spikes, no lightning, not metal armor. "
              "Exactly two heads on one body, never two separate dragons. Dragon, never a human, never a bird."),
}

order = ['ruby', 'nola-marron', 'flame', 'pearl', 'sparks', 'crackle', 'luna', 'leaf', 'shinebright', 'lovee',
         'starry', 'black-hole', 'noir', 'war', 'grizzlemop']
characters = [NOLA_MARRON if cid == 'nola-marron' else existing[cid] for cid in order]
sheets = {c['id']: c['sheet'] for c in characters}

NINE_IDS = ['flame', 'pearl', 'sparks', 'crackle', 'luna', 'leaf', 'shinebright', 'lovee', 'starry']
NINE = ("red Flame, white-blue Pearl, the YELLOW baby dragon with silver eyes Sparks, the SILVER baby dragon with "
        "yellow eyes Crackle, the baby BLACK dragon speckled with silver stars Luna, the slim upright baby GREEN leaf "
        "dragon Leaf with a jagged spiky leaf crest, the baby GREEN-AND-BLUE wish dragon with a glittering silver "
        "belly Shinebright with sea-green eyes, PINK-topped RED-bellied Lovee with pink wings, and Starry, who looks "
        "just like Shinebright but with glittery PINK eyes")
TOWER = ("inside the top room of Noir's charcoal-and-violet stone clock tower: huge turning brass gears, a swinging "
         "pendulum, two big bronze bells, and the back of a giant round glowing clock face with simple tick marks only "
         "(no numbers, no numerals, no letters); bright sunny daylight glows through the clock face and arched windows, "
         "and Leaf's flowering green vines hold the old stones together")
EGG = ("the Clock Egg: ONE double egg made of two big eggs fused tightly together side by side, one egg glittery "
       "SILVER and the other glittery GOLD, together about the size of a pumpkin")
HALF = ("the half-hatched baby dragon: her glittery SILVER half has burst out of the silver eggshell (one silver baby "
        "dragon head with large deep-blue eyes and two tiny silver horns, one silver wing, one silver front leg), while "
        "the other half of her body is still sealed inside the unbroken glittery GOLD half of the egg joined at her "
        "side, so she looks like a silver baby dragon wearing half a gold egg. Only ONE head is visible, the silver one")
DRESS_TM = ("Ruby now wears her new bond dress instead of plum: a tunic dress split down the middle, one half glittery "
            "SILVER and the other half glittery GOLD, sprinkled all over with a pattern of tiny hourglasses and tiny "
            "pairs of hands holding each other, with soft golden boots")
DRESS_BH = ("Ruby now wears a new bond dress instead of plum: deep charcoal with a soft lavender shimmer and swirling "
            "violet patterns around the skirt and hem, with soft golden boots")
RUBY_MARK = "crown and silver forehead mark visible"

# number: (textPosition, characters, vocab, imagePrompt, effect)
S = {
    1: ('bottom', ['ruby'] + NINE_IDS, [('tingled', 'felt a tiny, fizzy prickle'), ('tumbling', 'rolling and falling over and over, just for fun')],
        f"Bright sunny daytime on a green hill in Riverlight covered in yellow buttercups, blue sky. Ruby in her normal PLUM tunic dress stands still with one hand touching the silver mark on her forehead, looking toward faraway hills where a tall dark charcoal-and-violet tower with a big round clock face stands on the horizon. Around her exactly NINE puppy-sized baby dragons tumble and roll in the buttercups, each exactly once: {NINE}. {RUBY_MARK}. No other people. Main subject in lower two thirds.", None),
    2: ('bottom', ['noir', 'war'], [('arguing', 'saying "No, MY way!" back and forth'), ('cobwebs', 'old dusty spider webs')],
        f"{TOWER.replace('top room', 'clock room')}, with dusty cobwebs. On a stone ledge behind the clock face sits {EGG}, puffing tiny silver sparkles from the silver side and tiny gold sparkles from the gold side as if two voices are talking. Noir leans in through a little wooden door, grinning slyly at the egg, and War peeks over her shoulder, eager. Exactly Noir and War, no Ruby, no dragons, no other people.", None),
    3: ('top', ['ruby', 'grizzlemop'] + NINE_IDS, [('shuffled', 'walked slowly, sliding your feet'), ('tiptoed', 'walked very quietly on the tips of your toes')],
        f"A winding spiral stone staircase inside a charcoal-and-violet stone tower, lit by warm daylight from narrow windows, flowering green vines holding the stones together. Grizzlemop the big shaggy chestnut-brown mop-haired monster leads the way upward, smiling, one fuzzy paw holding a finger to his lips for quiet. Ruby in her normal PLUM tunic dress tiptoes behind him, {RUBY_MARK}, and exactly NINE puppy-sized baby dragons tiptoe and flutter quietly behind her, each exactly once: {NINE}. No other people. Main subject in lower two thirds.", None),
    4: ('bottom', ['ruby'] + NINE_IDS, [('pendulum', 'a weight that swings back and forth inside a clock')],
        f"{TOWER}. On a stone ledge sits {EGG}; the silver half glows bright and fizzy, the gold half glows warm and soft, with little silver and gold puffs above each half like two voices. Ruby in her normal PLUM tunic dress kneels beside it, listening with wide curious eyes, {RUBY_MARK}. Exactly NINE puppy-sized baby dragons peek around the gears, each exactly once: {NINE}. Count them: exactly nine small dragons, only two of them green-and-blue (Shinebright and Starry), never three. No other people, no hatched dragon yet.", None),
    5: ('top', ['ruby', 'noir', 'war', 'black-hole'], [('bossy', 'always telling others what to do'), ('remembered', 'thought about something from before')],
        f"{TOWER}. Noir kneels beside {EGG}, whispering slyly to it with a hand cupped by her mouth; War points greedily at the GOLD half. Black Hole stands a little behind them, NOT grinning, head low, looking down at the floor, unsure and thoughtful. Across the room Ruby in her normal PLUM tunic dress reaches out one hand, calling 'don't listen!', {RUBY_MARK}. The silver half of the egg glows bright and impatient. Main subject in lower two thirds. Exactly Ruby, Noir, War and Black Hole, no baby dragons in this picture.", None),
    6: ('bottom', ['ruby'], [('steer', 'make something go the way you want it to go')],
        f"{TOWER}. In the middle of the room, {HALF}. She is tipping and spinning in a wobbly circle in the air with one silver wing flapping, a swirl of silver sparkle magic and bits of silver eggshell around her. Ruby in her normal PLUM tunic dress reaches up toward her, worried, {RUBY_MARK}. No other characters in this picture.", None),
    7: ('top', ['war', 'black-hole'], [('blur', 'so fast you can\'t see it clearly'), ('wobbly', 'shaky, tipping from side to side')],
        f"{TOWER.replace('bright sunny daylight glows', 'light flickers')}, but time has gone wild: the clock face's hands are a spinning blur, gears whirl with motion streaks, and through the arched windows a sun and a round full moon both streak across the sky. Vines burst into flowers. In the middle spins {HALF}, wrapped in a big wild whirl of silver sparkle magic. War stands with a funny surprised face as her black braid has grown super long and piles in big loops on the floor around her boots. Black Hole's tail twirls round and round in a dizzy spiral, his eyes swirly and dizzy. The whole room tilts playfully. Comic and safe, nobody hurt. No Ruby, no other characters in this picture.", 'vortex'),
    8: ('bottom', ['ruby', 'noir', 'war'], [('hurrying', 'going fast because you want to be quick')],
        f"{TOWER}. Noir holds open a soft black sack toward {HALF}. War hugs the gold half of the egg tightly with a stubborn face, and one warm chestnut-brown eye peeks sadly out of a tiny crack in the gold shell. Ruby in her normal PLUM tunic dress kneels gently between them, speaking kindly to the little dragon, {RUBY_MARK}. Exactly Ruby, Noir, War and the half-hatched dragon, no other dragons.", None),
    9: ('top', ['ruby'], [('patient', 'happy to wait without fussing'), ('different', 'not the same')],
        f"Close, gentle scene {TOWER.split(':')[0]}, light from an arched window where a sun and a round full moon hang side by side in the sky. Ruby in her normal PLUM tunic dress sits on the stone floor holding {HALF} in her lap; the silver head turns lovingly toward the gold shell, where one warm chestnut-brown eye peeks out of a little crack, smiling. Ruby smiles warmly, {RUBY_MARK}. Soft, tender, hopeful mood. No other characters.", None),
    10: ('bottom', ['ruby', 'grizzlemop'] + NINE_IDS, [('together', 'with each other')],
         f"{TOWER}. Everyone holds on in one big ring, paw in paw and tail in tail: Ruby in her normal PLUM tunic dress, {RUBY_MARK}, big shaggy chestnut-brown Grizzlemop, and exactly NINE puppy-sized baby dragons, each exactly once: {NINE}. In the center of the ring floats {HALF}, and a warm GOLD glow pours out of the gold shell and flows around the whole ring, making everyone shine. No Noir, no War, no other people.", 'bond'),
    11: ('top', ['nola-marron', 'war'], [('gathered', 'brought things back close together'), ('gently', 'softly and carefully')],
         f"{TOWER}. The gold half of the eggshell cracks open and Marron's GOLD head with warm chestnut-brown eyes pops out, completing the two-headed baby dragon; the silver head and the gold head nuzzle cheek to cheek, happy. Strands of silver sparkle magic float back toward the silver head like a kite string reeling home. The clock face is calm again. In the background War scowls, her black braid still comically super long, trailing past her boots across the floor. Bits of silver and gold eggshell on the floor. Exactly the two-headed dragon and War, no other characters.", None),
    12: ('bottom', ['ruby', 'nola-marron'] + NINE_IDS, [('nuzzle', 'rub noses or cheeks softly, like a snuggle'), ('shimmered', 'sparkled and shined')],
         f"{TOWER}. Ruby holds out both hands: the two-headed baby dragon presses her SILVER nose to Ruby's left palm and her GOLD nose to Ruby's right palm at the same time. {DRESS_TM}. Soft silver sparkles dance in her left hand and a warm gold glow fills her right hand. Ruby beams, {RUBY_MARK}, rainbow hair. Exactly NINE puppy-sized baby dragons cheer around them, each exactly once: {NINE}. No other people.", 'bond'),
    13: ('top', ['ruby', 'black-hole', 'noir', 'war', 'nola-marron'] + NINE_IDS, [('choose', 'pick the one you want')],
         f"{TOWER}. Big Black Hole, the size of a large dog and much bigger than the baby dragons, stands on one side, his dark swirl magic closing up into a tiny puff of purple starlight; his eyes are wide and soft now, no grin, gentle and wondering, as a warm GOLD glow from the two-headed baby dragon touches his nose like a kiss. Behind him Noir points and shouts, furious, and War stamps her foot, her braid still very long. Black Hole stands OUTSIDE the ring, alone, not touching anyone, a little apart. {DRESS_TM}. Facing him, Ruby, {RUBY_MARK}, holds paws in a ring with the two-headed baby dragon (silver head and gold head) and exactly NINE puppy-sized baby dragons, each exactly once: {NINE}; the ring has one clear empty gap just Black Hole's size, facing him. Noir and War stand behind Black Hole. No Grizzlemop, no other people.", 'vortex'),
    14: ('bottom', ['ruby', 'black-hole', 'nola-marron'], [('grabbing', 'snatching something quickly'), ('rumbled', 'said in a deep, low voice')],
         f"{TOWER}. Black Hole lowers his head with a gentle closed-mouth smile and soft eyes, no grin, and presses his nose to Ruby's open palm. {DRESS_BH}. Small soft violet swirls spin in Ruby's palms like tiny whirlpools. Ruby smiles warmly up at him, {RUBY_MARK}, rainbow hair. The two-headed baby dragon (silver head and gold head) cheers beside her. Exactly Ruby, Black Hole and the two-headed dragon.", 'bond'),
    15: ('bottom', ['ruby', 'noir', 'war', 'black-hole', 'nola-marron'], [('stomped', 'walked with big, heavy, grumpy steps'), ('sigh', 'a long, slow, sad breath')],
         f"Late golden afternoon outside Noir's charcoal-and-violet palace with its tall clock tower, flowering vines on the stones. In the sky above, a big clear soap-like bubble floats away carrying Ruby in a deep charcoal dress with lavender shimmer and violet swirls, waving kindly, {RUBY_MARK}, with Black Hole and the two-headed baby dragon (silver head and gold head) flying beside the bubble and a few small baby dragons as tiny shapes behind. In a lower palace window, War leans on the sill looking up at the bubble with a small sad, wondering face, one hand half raised as if starting to wave, her black braid super long and hanging down over the sill. Behind her in the room Noir turns away grumpily, arms crossed. Main subject: War in the window and the bubble above.", None),
    16: ('top', ['ruby', 'nola-marron', 'black-hole'] + NINE_IDS, [('cuddle', 'a big, cozy hug')],
         f"Cozy lavender-stone bedroom at night, warm golden lantern glow and starry window. {DRESS_TM}. Ruby lies on pillows, sleepy and happy, {RUBY_MARK}, rainbow hair. Curled around her, each exactly once: the two-headed baby dragon with one silver head and one gold head snuggled under her arm, and exactly NINE puppy-sized baby dragons: {NINE}. Black Hole, bigger than the baby dragons, sleeps peacefully curled at the foot of the bed with a gentle smile. Count them: eleven dragons in all = the two-headed silver-and-gold dragon + nine small baby dragons + big Black Hole. Little Luna (small, black with silver stars) is a separate dragon from big Black Hole, and BOTH green-and-blue sisters Shinebright and Starry are there side by side. No other people.", 'starlight'),
}

COVER_PROMPT = ("Late golden afternoon on a stone balcony of a charcoal-and-violet clock tower, a giant round glowing clock "
                "face with simple tick marks only (no numbers, no letters) behind, generous open sky across the upper "
                f"third. {DRESS_TM}. Ruby smiles, {RUBY_MARK}, and holds the two-headed baby dragon in her arms: one "
                "glittery SILVER head with deep-blue eyes and one glittery GOLD head with chestnut-brown eyes, nuzzling "
                "her cheeks. Soft silver sparkles and a warm gold glow drift around them, with bits of silver and gold "
                "eggshell on the balcony. Exactly Ruby and the two-headed dragon, no other characters.")

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
        spread['theEnd'] = 'The End — and eleven dragons, twelve heads, one big cuddle.'
    spreads.append(spread)

book = {
    'series': 'ruby-and-the-dragon-bonds', 'ageRange': '4-8', 'styleString': b7['styleString'],
    'slug': 'ruby-nola-and-marron', 'bookNumber': 8, 'title': 'Ruby, Nola and Marron',
    'subtitle': 'Book Eight of Ruby and the Dragon Bonds', 'authors': ['Luna', 'Sunny'], 'refrain': REFRAIN,
    'palette': b7['palette'], 'characters': characters,
    'cover': {'image': 'images/cover.webp', 'imagePrompt': COVER_PROMPT, 'effect': 'starlight'},
    'spreads': spreads,
    'questions': [
        "Nola loves to go fast, and Marron loves to wait. Are you more of a fast one or a waiting one?",
        "Nola and Marron were arguing, but they both wanted the very same thing. Have you ever argued with someone and found out you wanted the same thing?",
        "Who is someone very different from you who makes a great team with you?",
        "Black Hole decided to stop grabbing and hold on with friends instead. What helped him choose?",
    ],
    'lookAndFind': "Find the tiny hourglasses on Ruby's new dress. Can you count all twelve heads on Ruby's eleven dragons?",
    'assetVersion': 'ruby8-1',
}
(book_dir / 'book.json').write_text(json.dumps(book, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

prompt_dir.mkdir(parents=True, exist_ok=True)
def write_prompt(name, prompt, chars):
    # The half-hatched spreads describe the dragon inline; her full sheet would contradict it.
    parts = [prompt] + [sheets[c] for c in chars]
    (prompt_dir / f'ruby8-{name}.txt').write_text(' '.join(parts), encoding='utf-8')
for s in spreads:
    write_prompt(f"spread-{s['number']:02d}", s['imagePrompt'], s['characters'])
write_prompt('cover', COVER_PROMPT, ['ruby', 'nola-marron'])
print('book.json and 17 prompts written')
