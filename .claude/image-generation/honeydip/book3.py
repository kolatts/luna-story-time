"""Book Three of Honeydip's Christmas Mission. Text, vocab and image prompts in one place."""
from common import BOOK, DAY, EVE, FOUR, HOME, KIDS, NOKIDS, NOTOUCH, TINY

# Honeydip after the touch: this replaces her normal sheet on the spreads listed in sheet_overrides.
GREY_SHEET = ("Honeydip, in this picture ONLY, has lost all her color and her magic: she is a tiny girl Christmas elf about as tall as a milk carton, with pointed elf ears and two short braids, wearing a Christmas hat with a fluffy brim and pom-pom, a long-sleeved tunic dress with fluffy trim, striped stockings, curly-toed boots and gloves, but EVERYTHING about her is pale GREY, like a soft pencil drawing: grey hat, grey dress, grey stockings, grey boots, grey hair, grey face, no pink anywhere on her, no blush, no lipstick, no swirls on her gloves. She lies or sits completely stiff and still like a little cloth doll, eyes closed, peaceful, not hurt, not frightening.")
GREY = ("Honeydip is completely pale GREY from hat to boots, with no pink at all, stiff and still like a little doll with her eyes closed (peaceful, not hurt)")
PART_SHEET = ("Honeydip, in this picture ONLY, is getting her color back a little at a time: she is a tiny girl Christmas elf about as tall as a milk carton, pointed elf ears, two short braids. Her Christmas hat with its fluffy white brim and pom-pom is PINK again, her cheeks have round rosy pink blush circles again, and ONE of her white gloves has its bold pink swirls back; everything else about her (dress, stockings, boots, hair, her other glove) is still pale GREY like a pencil drawing.")
PEEK_SHEET = ("Honeydip, in this picture ONLY, is hidden down inside the basket: all that shows of her is the top of her "
              "Christmas hat poking over the basket rim. The hat is pale GREY like a pencil drawing, and the round fluffy "
              "pom-pom at its tip is bright PINK. Do not draw her face or body.")
BASKET = "a small wicker basket lined with a red knitted mitten"
COATS = ("The children wear winter coats and woolly hats in their own colors over their usual clothes: Hudson forest green, Glyden blue (with his round glasses), Sun sunny yellow, Petals lavender")
BELL_HOME = ("Inside Mr. Bell's small, tidy, old-fashioned living room next door: faded wallpaper, a radio on a side table, thin winter sunlight through lace curtains, and TWO matching armchairs side by side at the window")

T = [
    ("Halfway there",
     """By the middle of December, the snow was knee-deep,
and the tree had more glitter, and Sun lost more sleep,
and the game was still on: in the oven mitt! There!
In the mailbox! The bread box! The big comfy chair!

But Hudson looked slower. And Hudson looked less.
He would say, "You go on," and you'd never quite guess
he was looking, instead, with a frown, at a book.
Two marks, under BAD. He just couldn't not look.
""",
     'bottom', ['glyden', 'sun', 'petals', 'honeydip', 'hudson'],
     [('glitter', 'tiny shiny specks that sparkle'), ('frown', 'a worried or grumpy look, with your eyebrows down')],
     f"{HOME}, the kitchen. {DAY}, deep snow outside the window. In the foreground Glyden, Sun and little Petals cheer and point at a quilted oven mitt hanging on a hook, where tiny Honeydip pops out of the mitt laughing, found. In the background, apart from the others, Hudson leans against the doorframe with his hands in his hoodie pocket, not joining in, frowning toward a windowsill where a small closed pink notebook lies. {TINY}. {NOTOUCH}. No fox or reindeer visible. {FOUR}.",
     None),

    ("A stone in a well",
     """Now a worry's a thing that can grow in the night.
It went: "I was bad. And she wrote it. That's right.
So I'm on the BAD list. So there'll be no sled."
(A red one. The fast kind. He'd asked for it. Red.)

"So who needs a sled? And who needs a tree?
And elf games are baby games. Too small for me."
And then, to his cereal, quiet and small:
"I don't even like Christmas anymore. At all."
""",
     'top', ['hudson'],
     [('sled', 'a board with runners for sliding over snow'), ('cereal', 'crunchy breakfast food you eat in a bowl with milk')],
     f"{HOME}, the kitchen table. Grey, dim winter morning light. Hudson sits alone at the table, slumped, chin on one fist, stirring a bowl of cereal with a spoon and glaring gloomily into it. Above his head floats a soft dreamy thought bubble showing a shiny red wooden sled with a ribbon on it, fading and breaking apart at the edges. Behind him the Christmas tree twinkles, ignored. Exactly Hudson, alone, no other characters.",
     None),

    ("Everybody asleep",
     """That night, the whole house was as still as a stone.
Three kids were asleep. Hudson lay there, alone
with his thoughts, which were loud. And the fox and the deer
were asleep in a slipper, with no one to hear.

So nobody saw him creep down, stair by stair,
to the kitchen. A night-light. And look who was there:
on the counter, with pencil and notebook and all,
sat the elf, writing something. So pink. And so small.
""",
     'bottom', ['hudson', 'honeydip'],
     [('creep', 'walk very slowly and quietly'), ('counter', 'the long flat top in a kitchen where food is made')],
     f"{HOME}, the kitchen at night, dark blue shadows, one small warm night-light glowing on the counter and moonlight on the snow outside the window. On the kitchen counter, in the pool of warm light, tiny Honeydip sits happily writing in her small pink notebook with a pencil, humming, her back half turned, bright pink and unaware. In the dark doorway at the bottom of the stairs stands Hudson in forest-green pajamas, watching her with an angry, hurt frown and clenched fists. A clear distance between them. {TINY}. {NOTOUCH}. Exactly Hudson and Honeydip, no other characters.",
     None),

    ("The grab",
     """"You're writing more BAD things!" He didn't think twice.
He didn't think once. And it wasn't nice.
He snatched her right up in his bare, angry hand,
to throw her away. That was all that he planned.

But the moment he touched her, before she could speak,
the pink left her hat. Then the pink left her cheek.
The pink left her dress, and her boots, and was gone.
And she lay, like a small, quiet doll, grey as dawn.
""",
     'top', ['hudson', 'honeydip'],
     [('snatched', 'grabbed something very fast'), ('doll', 'a toy that looks like a little person')],
     f"{HOME}, the kitchen at night, one small warm night-light. Hudson, in forest-green pajamas, stands holding out his open palm and staring down at it in sudden shock, his mouth open, his anger gone. Lying flat on his open palm is tiny Honeydip, who has just turned grey: {GREY}. Rising off her into the dark air is a drifting cloud of pink sparkle dust, her color floating away. Her small pink notebook and pencil lie dropped on the counter. Quiet and sad, not violent, not scary. Exactly Hudson and Honeydip, no other characters.",
     None),

    ("The lid",
     """Now Hudson stood frozen. His heart gave a jump.
And the anger went out of him, all in one lump.
"I didn't... I only... wake UP!" But she lay
just as still as before. And as grey. And as grey.

There was nobody watching. There was no one to tell.
There's a place for a thing that has not gone too well.
The trash can. The lid. And he shut it up tight,
and he ran up the stairs, and he lay there all night.
""",
     'bottom', ['hudson'],
     [('frozen', 'so surprised or scared that you cannot move'), ('lid', 'the top that closes a box or a can')],
     f"{HOME}, the kitchen at night, one small warm night-light, long blue shadows. Hudson, in forest-green pajamas, crouches beside a clean white kitchen trash can with a step pedal and gently lowers its lid with both hands, looking back over his shoulder with wide, frightened, guilty eyes. The elf is NOT visible (she is inside the can). The small pink notebook and pencil lie on the counter above. An orange peel on the floor. Exactly Hudson, alone, no other characters, no elf visible.",
     None),

    ("Nobody hiding",
     """"...eight, nine, TEN!" In the morning, three kids opened eyes.
"Ready or not!" And they looked, high and wise,
together, the way that they'd learned how to do:
in the teapot, the flour, the left winter shoe.

No hat. And no pom-pom. No giggle. No clue.
"She's GOOD today," Glyden said. "Too good," Sun said, too.
And Hudson sat stirring his cereal round.
"I'm too big for that game," he said, eyes on the ground.
""",
     'top', ['glyden', 'sun', 'petals', 'hudson'],
     [('clue', 'a little hint that helps you find something'), ('stirring', 'mixing round and round with a spoon')],
     f"{HOME}, the kitchen. {DAY}. Glyden, Sun and little Petals search together as a team: Glyden holds up the lid of a round blue teapot and peers inside, Sun shakes out a winter boot, and Petals looks under a tea towel, all three puzzled. At the kitchen table behind them Hudson sits hunched over a bowl of cereal, stirring it and staring down, not looking at anyone, guilty. In the corner of the kitchen stands a clean white trash can with its lid shut. No elf, no fox, no reindeer visible. {FOUR}.",
     None),

    ("A sniff and a bell",
     """Then Sparkle woke up, and her nose gave a twitch.
She sniffed at the floor. She sniffed at a switch.
She sniffed to the trash can. She sat. And she cried,
a thin little fox cry. And Shiny, beside,

rang his bell at the lid. Rang it loud. Rang it long.
"The TRASH?" Glyden said. "But that's wrong. That's all wrong."
He lifted the lid. And beneath an old peel
lay the elf, grey all over, from hat-tip to heel.
""",
     'bottom', ['sparkle', 'shiny', 'glyden', 'honeydip'],
     [('twitch', 'a tiny, quick wiggle'), ('sniffed', 'smelled with quick little breaths')],
     f"{HOME}, the kitchen. {DAY}. Glyden holds open the lid of a clean white kitchen trash can and looks down into it with a shocked face. Inside, resting on clean crumpled paper beside one orange peel, lies tiny Honeydip: {GREY}. Her face is calm, with a small gentle closed-mouth smile, no tears and no marks under her eyes, like a sleeping doll. On the floor in front of the can, Sparkle the white baby fox sits with her ears down, whimpering (no big tears), and Shiny the little reindeer, who is small, only as tall as the trash can's foot pedal is from the floor to Glyden's knee, stands with his head lifted, ringing his gold bell. Gentle and sad, not dirty, not scary. Exactly one child, Glyden, plus the fox, the reindeer and the grey elf. No other people.",
     None),

    ("Mitts and a ladle",
     """"Don't touch her!" said Glyden. "Remember the rule!"
So Sun got the soup ladle. Sun's nobody's fool.
And Glyden wore oven mitts, one on each fist,
and Petals brought a tea towel. (Nothing was missed.)

They scooped her, they lifted, they laid her down flat
on the towel, on the table. And that, friends, was that.
No pink. And no wave. And no twirl. Not a peep.
And Petals's hands, behind Petals, squeezed deep.
""",
     'top', ['sun', 'glyden', 'petals', 'honeydip'],
     [('ladle', 'a big deep spoon for scooping soup'), ('towel', 'a soft cloth for drying things')],
     f"{HOME}, at the kitchen table. {DAY}. A careful, serious little rescue: Sun holds a big silver soup ladle in both hands and gently lowers tiny Honeydip, who lies in the bowl of the ladle, onto a clean folded checked tea towel on the table; {GREY}. Glyden, wearing a big quilted oven mitt on each hand, steadies the edge of the towel. Little Petals stands close with both of her hands squeezed tight behind her own back, looking at the elf with huge worried eyes. {TINY}. {NOTOUCH}: only the ladle, the mitts and the towel touch her. Exactly three children: Sun, Glyden and Petals. No Hudson, no other people.",
     None),

    ("It was me",
     """There are sentences heavy as stones in a sack.
There are some you can't say, and then can't take back
the not-saying. Hudson stood up from his chair.
"It was me." And the words hung right there, in the air.

"I grabbed her. I touched her. I shut down the lid.
And I let you all look for her. That's what I did."
His brothers just stared. And nobody yelled.
And Petals said, "Oh." Took his hand. And she held.
""",
     'bottom', ['hudson', 'petals', 'glyden', 'sun', 'honeydip'],
     [('sentences', 'groups of words that say a whole thought'), ('stared', 'looked for a long time without looking away')],
     f"{HOME}, at the kitchen table. {DAY}. Hudson stands with his head bowed and his shoulders down, telling the truth, eyes shut tight, one fist at his side. Little Petals stands beside him holding his HAND, his open hand clasped in both of her small hands, hand in hand (not his arm), looking up at him kindly. Glyden and Sun stare at him from across the table, surprised and quiet, not angry. On the table between them, on a folded checked tea towel, lies tiny Honeydip with her arms straight at her sides (hands NOT folded on her chest), with a small gentle closed-mouth smile: {GREY}. Beside the towel sit Sparkle the white baby fox and Shiny the little reindeer, both small, keeping watch. {TINY}. {NOTOUCH}. {FOUR}.",
     None),

    ("A whisper",
     """Then a sound, like a mouse in a mitten, came through.
The elf's mouth was moving! One whisper. Then two.
They all leaned in close (hands behind them, of course).
"Kind... ness..." she breathed, in a voice small and hoarse.

"For you?" Glyden asked. "No." "For Santa?" "No. No."
"Then who?" But her whisper was all out of go.
"Out... side," was the last of it. One tiny grin.
"Somebody outside," said Sun. "Where to begin?"
""",
     'top', KIDS + ['honeydip'],
     [('whisper', 'a very soft, quiet way of talking'), ('hoarse', 'scratchy and rough, like a sore throat')],
     f"{HOME}, at the kitchen table. {DAY}. All four children lean in close around a folded checked tea towel on the table, every one of them with both hands held behind their own back, listening hard, ears turned toward the towel. On the towel lies tiny Honeydip, pale GREY from hat to boots with no pink at all, still lying stiff like a little doll with her arms at her sides, but her eyes are HALF OPEN, sleepy and soft, looking up at the children, and her mouth is open in a small round 'o', whispering; a tiny curl of soft gold sparkle rises from her mouth like a breath. Beside the towel sit Sparkle the white baby fox and Shiny the little reindeer, both small, ears pricked. {TINY}. {NOTOUCH}. {FOUR}.",
     None),

    ("Two chairs",
     """And Hudson, who'd looked at one book for a week,
looked out of the window. And started to speak.
"Next door, Mr. Bell has two big window chairs.
And he sits in his own. And there's no one in theirs."

So they packed up four donuts, store-bought, on a plate,
and with mitts tucked the elf in a basket. "Sit straight,"
said Petals, to her. And then out the four go,
with a fox and a reindeer, through knee-deep new snow.
""",
     'bottom', KIDS + ['sparkle', 'shiny', 'honeydip'],
     [('basket', 'a carrier woven out of thin sticks, with a handle'), ('tucked', 'put somewhere snug and safe')],
     f"Bright snowy winter day outdoors, deep fresh snow, blue sky. The four children walk in a line through knee-deep snow across a front yard toward the small neat house next door, which has a snowy porch and a big front window. {COATS}. Hudson leads, carrying a plate of four donuts covered with a cloth; Glyden carries {BASKET} by its handle, and tucked inside the basket, only her grey hat and grey face showing, sits tiny Honeydip, pale GREY with no pink at all, still as a doll. Sun and little Petals follow, Petals lifting her knees high. Sparkle the white baby fox bounds through the snow beside them and Shiny the little reindeer trots ahead. {TINY}. {NOTOUCH}. {FOUR}.",
     None),

    ("Mr. Bell",
     """Knock, knock. And a shuffle. A click. And a face
with a white beard, and eyebrows all over the place.
"Well," said Mr. Bell. "Well, well. Four at my door."
"We brought donuts," said Hudson. And looked at the floor.

Inside, on a hook, hung one coat. Only one.
Two cups by the sink. And a kettle. The sun
came in thin through the curtains. "Come in, then," he said.
"I'd only have talked to the radio instead."
""",
     'top', ['mr-bell', 'hudson', 'glyden', 'sun', 'petals'],
     [('shuffle', 'a slow, sliding kind of walk'), ('kettle', 'a pot with a spout for boiling water for tea')],
     f"The open front door of a small neat house, seen from inside its hallway, snowy bright daylight outside. Mr. Bell stands holding the door open, surprised and slowly starting to smile, his glasses pushed up on top of his head and his white eyebrows bushy. On the snowy doorstep stand the four children. {COATS}. Hudson holds out a plate of four donuts and looks shyly at the floor; Glyden holds {BASKET} (the elf is tucked down inside and not visible). In the hallway beside the door there is a row of coat hooks with exactly ONE coat hanging on it and all the other hooks empty. Exactly five people: Mr. Bell and the four children (tall Hudson, Glyden with round glasses, Sun, little Petals), each exactly once. No fox, no reindeer visible.",
     None),

    ("The other chair",
     """So Hudson dug out the whole walk with a spade.
And Glyden found glasses that someone mislaid.
(On his head. Mr. Bell's. It is always the head.)
And Sun fixed the lights that had tangled instead.

And Petals climbed into the second big chair,
and listened. A long while since someone sat there.
And down in the basket, where nobody spied,
a pom-pom turned pink. Just the tip. Just one side.
""",
     'bottom', ['mr-bell', 'petals', 'glyden', 'sun', 'hudson', 'honeydip'],
     [('spade', 'a tool for digging, like a small shovel'), ('tangled', 'twisted up in a messy knot')],
     f"{BELL_HOME}. Mr. Bell sits in one armchair, telling a story with his hands, laughing, his glasses back on his nose; little Petals sits in the other armchair, far too big for her, her feet sticking straight out, listening with her whole face. Glyden stands beside Mr. Bell, proud. On the rug, Sun untangles a long string of colored Christmas lights. Through the big window behind them, outside in the snow, Hudson in his green winter coat shovels the front path with a spade. In the bottom corner of the picture, on a side table, sits {BASKET}; the elf is tucked down inside it so that ONLY the pointed top of her hat sticks up over the basket rim (her face and body are hidden inside). The hat is pale grey, but the round fluffy pom-pom at its tip is bright hot PINK, the only pink thing in the basket, with one tiny pink sparkle beside it. Exactly five people: Mr. Bell and the four children, each exactly once. No fox, no reindeer visible.",
     'starlight'),

    ("Back comes the pink",
     """Not one of them thought about pink. Not a bit.
Sun thought about lights, and which bulb wasn't lit.
And Hudson thought only of snow, and his toes.
But down in the basket, the pink slowly rose.

The shoveling pinked up the whole of her hat.
The lights did her cheeks. Then the glasses, at that,
did one glove: the swirls curled back in, like the frost.
Then she yawned, as if nothing had ever been lost.
""",
     'top', ['honeydip', 'sparkle', 'shiny'],
     [('bulb', 'the little glass part of a light that glows'), ('frost', 'the thin, sparkly ice on a cold morning')],
     f"Close view of {BASKET} sitting on a side table in a warm old-fashioned living room with faded flowered wallpaper (no stone walls), blinking colored Christmas lights reflected softly behind it. Tiny Honeydip sits up inside the basket, halfway back to herself: her hat is PINK again with its white brim and pom-pom, her cheeks have their round rosy blush again, and one glove shows bold pink swirls, but her dress, her stockings, her boots and her other glove are still pale grey, and ALL of her hair, fringe and both braids, is still pale GREY (not blonde, not gold). Her eyes are open, sleepy and surprised, and she is yawning and stretching her arms, pink sparkle dust swirling back into her. Sparkle the white baby fox and Shiny the little reindeer peer over the basket rim at her, overjoyed. {NOKIDS}.",
     'starlight'),

    ("The sorry",
     """At home, in the dusk, Hudson knelt by the chair
where the basket was sitting. She still had, right there,
on her dress, one grey patch, like the last bit of night.
"I'm sorry I grabbed you. That wasn't all right.

I'm sorry I threw you away, and I hid.
I'm sorry." And that was the last thing he did
before the grey went. She sat up. She was PINK.
"Accepted," said Honeydip. "Now. Let me think..."
""",
     'bottom', ['hudson', 'honeydip', 'petals', 'glyden', 'sun'],
     [('dusk', 'the end of the day, when the sky gets dim'), ('knelt', 'got down on your knees')],
     f"{HOME}, the living room. {EVE}. Hudson kneels on the rug in front of a wooden chair, his hands flat on his own knees, his face honest and sorry. Standing up in {BASKET} on the seat of the chair is tiny Honeydip, fully PINK again from hat to boots with her white swirly gloves, bright and alive, a burst of pink and gold sparkles around her, smiling warmly down at him with one hand on her heart. Behind Hudson, Glyden, Sun and little Petals watch with happy, relieved faces, Petals clapping. {TINY}. {NOTOUCH}. No fox or reindeer visible. {FOUR}.",
     'bond'),

    ("Eleven sleeps",
     """"...the trash can is TAKEN. I've hidden there now.
Don't look there again." And she gave a small bow,
and was gone, in a blink, to a new hiding spot.
And four kids, together, yelled, "Ready or not!"

That night, in her notebook, she counted, and frowned.
Both sides were the same, from the top to the ground.
And nobody mentioned it. She shut the book tight.
"Eleven more sleeps," said the elf. "Well. Good night."
""",
     'top', ['honeydip', 'shiny', 'sparkle'],
     [('bow', 'bending forward to say thank you'), ('frowned', 'made a worried face, with your eyebrows down')],
     f"{HOME}. {EVE}. On a wooden windowsill, snow falling outside the dark window, a string of fairy lights. Tiny Honeydip, fully pink again, sits holding {BOOK}: now BOTH columns are equally full of tally marks from top to bottom, exactly the same length. She looks from one column to the other with a puzzled, thoughtful frown, tapping her pencil on her chin. Beside her Shiny the little reindeer dozes and Sparkle the white baby fox sleeps curled against her. {NOKIDS}.",
     'starlight'),
]

BOOK3 = {
    'number': 3,
    'ordinal': 'Three',
    'slug': 'honeydip-and-the-trouble-in-the-trash',
    'title': 'Honeydip and the Trouble in the Trash',
    'refrain': 'Kindness brings the color back.',
    'refrain_spreads': {13, 14, 16},
    'the_end': 'The End — for today. Eleven sleeps to go.',
    'spreads': T,
    'prompt_fixes': {
        13: ("Mr. Bell has thin soft white hair across the top of his head (he is NOT bald) and grey-white eyebrows, "
             "with his gold-rimmed glasses on his nose."),
    },
    'sheet_overrides': {4: GREY_SHEET, 7: GREY_SHEET, 8: GREY_SHEET, 9: GREY_SHEET, 10: GREY_SHEET, 11: GREY_SHEET,
                        13: PEEK_SHEET, 14: PART_SHEET},
    'cover_chars': ['honeydip', 'sparkle', 'shiny', 'hudson', 'glyden', 'sun', 'petals'],
    'cover_prompt': (
        f"{HOME}, the kitchen. {DAY}. Generous open space across the upper third of the picture (a plain cream wall and a window with falling snow). In the lower middle stands a clean white kitchen trash can with its lid propped open, and peeking up over its rim with a cheeky grin and a banana peel on top of her pink hat is tiny Honeydip, fully pink, waving one white swirly-gloved hand. Sparkle the white baby fox sniffs at the can and Shiny the little reindeer rings his gold bell beside it. Around the can the four children crouch and stare in surprise, hands on their knees: Hudson looks sheepish, and Sun holds a soup ladle. {TINY}. {NOTOUCH}. {FOUR}."),
    'cover_effect': 'starlight',
    'questions': [
        "Hudson thought he was already on the bad list, so he stopped trying. Have you ever felt like that?",
        "When Hudson said, \"It was me,\" nobody yelled, and Petals held his hand. What helps you tell the truth?",
        "Honeydip's color came back when the kids helped Mr. Bell. Who near you might like a visit?",
        "Hudson's sorry said exactly what he was sorry for. Grown-ups, when did someone last say sorry to you like that?",
    ],
    'look_and_find': "At Mr. Bell's house, can you find the one coat on its hook and the two chairs at the window? And watch Honeydip's pom-pom: when does it turn pink?",
}
