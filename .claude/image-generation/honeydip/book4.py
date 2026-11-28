"""Book Four of Honeydip's Christmas Mission, the finale. Text, vocab and image prompts in one place."""
from common import BOOK, DAY, EVE, FOUR, HOME, KIDS, NOKIDS, NOTOUCH, PJS, TINY, TRIO

POLE = ("Inside Santa's great hall at the North Pole: warm timber beams, glowing lanterns, garlands, shelves of toys, "
        "a big cozy red armchair, snow at tall frosted windows")
ELVES = ("several other tiny elves in GREEN and RED outfits (none of them in pink) hold small tidy notebooks; they are "
         "background characters")
SLED = "a shiny bright-red wooden sled with a rope at the front"

T = [
    ("Two sleeps to go",
     """With two sleeps to go, before anyone woke,
before the sun rose, before anyone spoke,
there was Hudson, in slippers, with dish soap and broom,
being GOOD, very loudly, all over the room.

He made every bed. (There were people inside.)
He washed every dish, and the clean ones beside.
He counted out loud, so the elf wouldn't miss:
"That's SEVEN! That's EIGHT! Did you write it? Write THIS!"
""",
     'bottom', ['hudson', 'honeydip'],
     [('slippers', 'soft, cozy shoes for wearing indoors'), ('broom', 'a brush on a long stick for sweeping the floor')],
     f"{HOME}, the kitchen very early, soft blue dawn light at the window and one warm lamp. Hudson, in forest-green "
     f"pajamas and slippers, sweeps the floor furiously with a big broom in one hand while holding up a soapy clean "
     f"plate in the other, calling out proudly, eager and frantic. A tall wobbly tower of freshly washed dishes "
     f"stands on the counter, soap bubbles floating. On the counter tiny Honeydip, just woken, sits up in a teacup "
     f"bed with a tiny blanket, rubbing one eye, baffled. {TINY}. {NOTOUCH}. Exactly Hudson and Honeydip, no other "
     f"characters.",
     None),

    ("Forty good things",
     """He folded the socks. He folded the cat.
(There isn't a cat. He'd have folded it flat.)
He watered the tree. He said "please" to the door.
He dusted his brothers. He counted some more.

By lunchtime his list had gone right down the page,
and his arms were like noodles. He looked twice his age.
He had forty good things. And he felt, when he'd done,
not a bit any better than back at thing one.
""",
     'top', ['hudson', 'glyden', 'sun'],
     [('folded', 'bent something over neatly, like a shirt or a sock'), ('noodles', 'long, soft, floppy pasta')],
     f"{HOME}, the living room. {DAY}. A funny scene: Hudson, looking worn out with droopy eyes and messy hair, "
     f"dusts the top of Glyden's head with a big fluffy feather duster while Glyden sits on the sofa trying to read "
     f"a picture book, annoyed; Sun, next to Glyden, already has a puff of dust on his nose and is giggling. Around "
     f"them are towers of neatly folded socks and a watering can beside the Christmas tree. A long paper list of "
     f"pencil tally marks (no letters, no writing) trails from Hudson's pocket down to the floor. Exactly three "
     f"boys: Hudson, Glyden and Sun. No elf, no fox, no reindeer, no Petals, no other people.",
     None),

    ("It doesn't work that way",
     """"How many?" he asked her. "How many till I'm
on the GOOD side for certain? I'm all out of time."
And Honeydip gently laid down her sharp lead.
"It doesn't work that way," she finally said.

"Then how DOES it work?" And the elf, who knew lots,
who knew twenty-four excellent elf hiding spots,
found she didn't know that. Santa's columns were two.
And both hers were full. And she hadn't a clue.
""",
     'bottom', ['hudson', 'honeydip'],
     [('gently', 'in a soft, kind way'), ('certain', 'very, very sure')],
     f"{HOME}, the kitchen table. {DAY}. Hudson sits slumped with his chin on his folded arms on the table, tired and "
     f"anxious, looking up at tiny Honeydip, who sits on the rim of the fruit bowl in front of him. She has laid her "
     f"pencil down and looks at {BOOK} lying open beside her, in which BOTH columns are full of tally marks to the "
     f"very bottom and exactly the same length; she scratches her head under her hat, kind but stumped. {TINY}. "
     f"{NOTOUCH}. Exactly Hudson and Honeydip, no other characters.",
     None),

    ("A seat saved",
     """Hudson fell fast asleep in the laundry, mid-fold,
with a sock on his ear. He was ten. He looked old.
And Petals came by, and she covered his feet
with a towel. And at supper, she saved him a seat.

She did that a lot. She had done it all year.
She'd say, "That one's Hudson's," and pat it. "Right here."
Nobody had asked her. Nobody knew why.
Some nights he sat in it. Some nights he walked by.
""",
     'top', ['hudson', 'petals'],
     [('laundry', 'clothes that are being washed, dried or folded'), ('supper', 'the meal you eat in the evening')],
     f"{HOME}, a cozy laundry corner in warm late-afternoon light. Hudson has fallen fast asleep sitting in a big "
     f"wicker laundry basket full of soft clean clothes, his head tipped back, mouth open, one sock draped over his "
     f"ear, a half-folded shirt in his lap. Little Petals stands on tiptoe beside the basket, carefully spreading a "
     f"striped towel over his feet like a blanket, her face serious and tender. Exactly Hudson and Petals, no other "
     f"characters.",
     'bond'),

    ("The last hiding place",
     """On the morning of Christmas Eve, soft fell the snow,
and they counted to ten for the last time. "Let's go!"
Not the teapot, the mailbox, the piano, the bread.
"She has run out of places," said Glyden. He said

it too soon. For up high, where a star ought to be,
on the tippy-top branch of the big Christmas tree,
stood the elf, arms out wide, shining pink in the light.
"Found by four," Petals said. And they were. And she's right.
""",
     'bottom', ['honeydip'] + KIDS,
     [('branch', 'an arm of a tree'), ('shining', 'giving off bright light')],
     f"{HOME}, the living room. {DAY}, snow falling softly outside. A tall Christmas tree fills the picture, and at "
     f"its very top, exactly where the star would be, stands tiny Honeydip with her arms and legs spread wide like a "
     f"star, glowing pink and gold, beaming. At the foot of the tree the four children stand close together looking "
     f"up and pointing, all four at once, delighted: little Petals rides on Hudson's shoulders. {TINY}. {NOTOUCH}. "
     f"No fox or reindeer visible. {FOUR}.",
     'starlight'),

    ("The goodbye",
     """Then it was time. Before Santa's sleigh flies,
an elf must report, and say all her goodbyes.
Four kids at the window stood up in a row,
with eight hands behind them. That's hard. You would know.

And Hudson hung back, by the wall, in the shade,
till Petals took hold of his sleeve, unafraid,
and tugged him up front, where the window was clear.
Then she blew one small kiss. And it got there, from here.
""",
     'top', KIDS + TRIO,
     [('report', 'tell someone everything you found out'), ('sleeve', 'the part of a shirt that covers your arm')],
     f"{HOME}, at a big living-room window. {EVE}, Christmas Eve, snow falling. On the windowsill, ready to leave, "
     f"tiny Honeydip sits on the back of Shiny the little reindeer with Sparkle the white baby fox on her lap and "
     f"her pink notebook under her arm, turning to wave goodbye with one white swirly-gloved hand, smiling but "
     f"misty-eyed. Facing her stand the four children in a row, each keeping one hand behind their back: Glyden and "
     f"Sun wave; little Petals holds Hudson by the sleeve of his hoodie, having pulled him to the front, and blows "
     f"a kiss with her free hand; Hudson gives a small shy wave. A tiny pink heart-shaped sparkle floats through "
     f"the air from Petals toward the elf. {TINY}. {NOTOUCH}. {FOUR}.",
     'starlight'),

    ("North",
     """Up, up, through the snow, went a reindeer, a fox,
and an elf, with a notebook as heavy as rocks.
Past the last chimney smoke, past the clouds, past the cold,
where the sky hangs in ribbons of green and of gold.

She practiced. "Sir. Hudson is bad. He is... good.
He is... both? There's no column for 'both'. And there should."
Shiny flew on. He had no advice.
(He has flown many elves. They all practice it twice.)
""",
     'bottom', TRIO,
     [('chimney', 'the tall pipe on a roof that lets smoke out'), ('practiced', 'tried something over and over to get it right')],
     f"Night sky high above the clouds, with glowing ribbons of green and gold northern lights and many stars. Shiny "
     f"the little reindeer gallops through the air trailing gold sparkles, drawn large and clear, with Honeydip "
     f"riding on his back and Sparkle the white baby fox asleep on her lap. Honeydip holds her small pink notebook "
     f"open in both hands and frowns at it, worried, talking to herself. Far below, tiny snowy rooftops with "
     f"chimney smoke. No sleigh. {NOKIDS}.",
     'starlight'),

    ("The line",
     """At the Pole, there's a hall with a very long line
of elves holding notebooks, all tidy and fine.
"All good," said the first. "Mostly good," said the next.
"One biter," said one. Santa nodded, unvexed.

Then: "Honeydip!" Up to the big chair she went,
with her hat on quite straight, and her knees slightly bent.
And Santa leaned down, and his eyes had a shine.
"Well? Four kids. What's the scoop? Is it good? Is it fine?"
""",
     'top', ['santa', 'honeydip'],
     [('tidy', 'neat, with everything in its place'), ('nodded', 'moved your head up and down to say yes')],
     f"{POLE}. Santa sits in the big red armchair, leaning down with a kind, twinkling smile and his hands on his "
     f"knees. On a little wooden footstool in front of him stands tiny Honeydip, very small beside him, clutching "
     f"her pink notebook to her chest, standing up straight, nervous, knees a little bent. Behind her, a long line "
     f"of waiting elves winds away across the hall: {ELVES}. Honeydip is the only one in pink. No children.",
     None),

    ("Both sides",
     """She opened her book. And she started to read.
"They shared every donut. They fought. They agreed.
One grabbed me. One fetched me a ladle. One said,
'It was me.' One saved seats. One gave hers up instead.

They went to a neighbor's. They shoveled. They sat.
They grabbed, and they shouted. They glazed Shiny. That's that."
She read the GOOD side. Then she read all the BAD.
They were just the same length. It was all that she had.
""",
     'bottom', ['honeydip', 'santa', 'shiny', 'sparkle'],
     [('ladle', 'a big deep spoon for scooping soup'), ('shoveled', 'scooped snow out of the way')],
     f"{POLE}. Close view: tiny Honeydip stands on a wooden footstool reading aloud from {BOOK}, held open wide in "
     f"both hands toward the viewer so both columns show: BOTH are packed with tally marks from top to bottom and "
     f"are exactly the same length. She looks troubled, one finger running down the page. Behind her, Santa listens "
     f"closely from his big red armchair, chin in his hand, eyes warm. At the foot of the stool Shiny the little "
     f"reindeer and Sparkle the white baby fox wait, watching her. No children, no other elves in this picture.",
     None),

    ("Rip",
     """Then Honeydip did what no elf's ever done.
She took hold of the page. And she tore it. In one.
Rip! Right down the middle. A gasp filled the hall.
"There aren't two columns. There's one. That is all."

"Every donut has a hole in it. That's what makes it a donut.
They're BOTH, sir. They're kids. And I thought you should know it.
They fight, and they mend, and say sorry, and then
they save seats. That's the full scoop. I'd say it again."
""",
     'top', ['honeydip', 'santa'],
     [('gasp', 'a quick, loud breath in, when you are surprised'), ('tore', 'pulled paper apart into pieces')],
     f"{POLE}. The big moment: tiny Honeydip stands tall on the wooden footstool, chin up, brave, and tears one page "
     f"of her notebook right down the middle with both hands, the two halves of the page flying apart with a little "
     f"burst of pink and gold sparkles; each torn half shows only pencil tally marks, no letters. Behind her, Santa "
     f"in his big red armchair throws his head back, starting to laugh with delight. In the background {ELVES}, "
     f"gasping with their hands over their mouths. Honeydip is the only one in pink. No children.",
     'starlight'),

    ("Santa laughs",
     """And Santa? He laughed. From his boots to his hat.
"I've waited all year for an elf to say that!
I never kept score. Not one mark. Not one day.
I can't give a present for points, anyway."

"Then why did you send me?" "So someone would know
who counts thumbs, who hears bells, who saves seats, who digs snow."
"And the columns?" "Oh, those," Santa said, with a wink.
"Elves do like a form. And it helps them to think."
""",
     'bottom', ['santa', 'honeydip', 'shiny', 'sparkle'],
     [('wink', 'shutting one eye quickly, like a friendly secret'), ('form', 'a paper with blanks to fill in')],
     f"{POLE}. Santa has scooped tiny Honeydip up to stand on the palm of his big white-gloved hand at the level of "
     f"his face, and he winks at her, laughing warmly, his cheeks rosy. Honeydip stands on his palm with her hands "
     f"on her hips, half laughing and half amazed. The two torn halves of the notebook page flutter down like "
     f"confetti. At Santa's boots, Shiny the little reindeer rings his gold bell and Sparkle the white baby fox "
     f"jumps for joy. (Santa is a grown-up, not a child, so he may hold her.) No children, no other elves in this "
     f"picture.",
     'bond'),

    ("Christmas morning",
     """On Christmas morning, before the first light,
before any ribbon or paper in sight,
four kids, in one quilt, at the top of the stair,
were not doing anything. All four were there.

For a minute, nobody ran for the tree.
There was Glyden, and Sun, and one small sleepy she,
and Hudson. All squished. And you'd miss it, you know,
if you blinked. It's a minute. It's quick. Then you go.
""",
     'top', KIDS,
     [('ribbon', 'a long, pretty strip for tying a bow'), ('squished', 'squeezed in close together')],
     f"{HOME}, the top of the wooden staircase in the dim blue light just before dawn, with a warm golden glow of "
     f"Christmas tree lights coming up from downstairs. The four children sit squished together in one sleepy, "
     f"happy heap on the top step, shoulder to shoulder, wrapped in one shared quilt: Glyden leaning on Hudson, Sun "
     f"yawning with his gap-toothed mouth, little Petals half asleep in Hudson's lap. {PJS}. No presents visible "
     f"yet. No elf, no fox, no reindeer. {FOUR}.",
     'starlight'),

    ("Not for Hudson",
     """Then down! To the tree! There were boxes and bows!
And Hudson read tags. "This is Sun's. And this goes
to Glyden. And Petals, here's yours." He was quick.
He was helpful. He smiled. It's a very old trick.

He handed out seven. He handed out ten.
He straightened the pile, and then straightened again.
He was sure there'd be nothing. He knew what he knew.
He'd not checked round the tree. But guess who did. Guess who.
""",
     'bottom', ['hudson', 'sun', 'glyden', 'petals'],
     [('tags', 'little labels that say who a present is for'), ('trick', 'a clever way of doing something')],
     f"{HOME}, the living room on Christmas morning, golden light, the Christmas tree with wrapped presents beneath "
     f"it. {PJS}. Hudson kneels by the tree busily handing a wrapped present to Sun with one hand and another to "
     f"Glyden with the other, wearing a brave, too-bright smile and not looking at the tree. Sun and Glyden hug "
     f"their presents happily. Behind the tree, little Petals crawls on hands and knees, only her back half and "
     f"feet showing, reaching toward one very long, large parcel wrapped in green paper with a red ribbon that is "
     f"hidden behind the tree. The gift tags are plain, with no writing. No elf, no fox, no reindeer. {FOUR}.",
     None),

    ("You don't earn a present",
     """She dragged it out, backwards. So long! And so wide!
With a tag, and an H, and a ribbon, red, tied.
"That's not mine," Hudson said. "I was bad. Look, I grabbed.
I threw. I was mean. And the donuts, I nabbed.

I did not earn that." And then Petals, who's three
(who is four, nearly four, any day, as you see),
said, "It's a PRESENT, silly." And rolled both her eyes.
""",
     'top', ['petals', 'hudson'],
     [('dragged', 'pulled something heavy along the floor'), ('earn', 'get something by working for it')],
     f"{HOME}, the living room on Christmas morning, golden light, beside the Christmas tree. Little Petals, in "
     f"lavender pajamas, has dragged out a very long, large parcel wrapped in green paper with a big red ribbon, "
     f"much longer than she is tall, and stands with one hand on it and the other on her hip, rolling her eyes with "
     f"a big-sister look even though she is the smallest. Hudson, in forest-green pajamas, stands in front of the "
     f"parcel with both hands held up as if to say 'not for me', his face astonished and about to cry happy tears. "
     f"The gift tag is plain, with no writing. Exactly Petals and Hudson, no other characters.",
     'bond'),

    ("The fast kind, for four",
     """A sled. It was red. It was just what he'd said:
the fast kind, for one, with a rope at its head.
And Hudson looked at it. And then, with a grin:
"It fits four if we squish. Come on. Everyone in."

And under the tree, in a box tied with pink,
were donuts. Thirteen. With a note, in pink ink:
"One more than you need. So there's always, you see,
one to give to somebody. Love, Honeydip. (Me.)"
""",
     'bottom', KIDS,
     [('sled', 'a board with runners for sliding over snow'), ('grin', 'a big, happy smile')],
     f"Bright sunny Christmas morning outdoors on a snowy hill beside the family's house, blue sky, sparkling snow. "
     f"All four children ride squished together on ONE sled, {SLED}, built for one, whooshing down the hill and "
     f"laughing: little Petals at the very front, then Sun, then Glyden holding his glasses on, and Hudson at the "
     f"back with his arms around all of them, grinning wider than anyone. They wear winter coats and woolly hats in "
     f"their own colors over their pajamas: Hudson forest green, Glyden blue, Sun sunny yellow, Petals lavender. "
     f"Snow sprays up behind the sled. No elf, no fox, no reindeer. {FOUR}.",
     'starlight'),

    ("The thirteenth donut",
     """The thirteenth went next door, on a plate, through the snow,
to a house with two chairs. And he came back in tow,
Mr. Bell, for his dinner. He brought his own chair.
(They had chairs. No one said so. They set it right there.)

And far in the north, with a notebook, brand-new,
with no columns at all (Santa said that would do),
sat an elf, drawing four little faces. And when
she was done, she wrote, "Last of November. Again."
""",
     'top', TRIO,
     [('plate', 'a flat dish you put food on'), ('faces', 'the fronts of heads, with eyes, a nose and a mouth')],
     f"A cozy little elf-sized room at the North Pole at night: a tiny wooden desk at a round frosted window with "
     f"green and gold northern lights outside, a glowing lantern, a tiny bed made from a teacup. Tiny Honeydip sits "
     f"at the desk with a brand-new notebook open in front of her, drawing with a pencil: on the page are four "
     f"simple smiling children's faces drawn in pencil in a row (one tall with a hoodie, one with round glasses, one "
     f"with a gap-toothed grin, one small with a braid), and no columns, no tally marks, no letters. She smiles "
     f"softly at the drawing, chin on one hand. On the desk beside her sits a snow globe holding a tiny house and a "
     f"tiny red sled, and one pink-frosted donut on a plate. Shiny the little reindeer sleeps on the rug and Sparkle "
     f"the white baby fox sleeps curled in a mitten. {NOKIDS}.",
     'starlight'),
]

BOOK4 = {
    'number': 4,
    'ordinal': 'Four',
    'slug': 'honeydip-and-the-full-scoop',
    'title': 'Honeydip and the Full Scoop',
    'refrain': 'Christmas is a gift, not a prize.',
    'refrain_spreads': {11, 14, 16},
    'the_end': 'The End — until the last night of next November.',
    'spreads': T,
    'prompt_fixes': {
        8: ("Santa wears small round gold-rimmed glasses and has bare hands. Honeydip is TINY next to him, no taller "
            "than his hand is long, and her notebook has a pink cover. Each background elf has exactly two hands."),
        11: ("Santa wears small round gold-rimmed glasses and has bare hands, no gloves. His red coat is whole and "
             "clean, with no scraps, patches or tears on it. Exactly two torn half-pages flutter in the air beside "
             "them, each showing pencil tally marks."),
        14: ("Hudson wears matching forest-green pajamas printed with small gold stars, top and bottoms (not a "
             "hoodie, not plaid). Petals wears lavender long-sleeved pajamas."),
        6: ("Hudson and Petals stand side by side at the FRONT of the group, the two children nearest the window "
            "and the elf. Petals's hand visibly grips the sleeve of Hudson's green hoodie at his wrist. Glyden and "
            "Sun stand just behind them. Honeydip has her small pink notebook tucked under her arm."),
        9: ("Honeydip is TINY next to Santa: she is no taller than Santa's hand is long, shorter than his boot, and "
            "her whole body is smaller than his beard. The footstool she stands on is small and low. Her notebook "
            "has a pink cover."),
        10: ("Honeydip is TINY next to Santa: no taller than Santa's hand is long, shorter than his boot. No fox and "
             "no reindeer in this picture. In the background there are exactly THREE other elves, small and far "
             "away, in green and red, each with exactly two arms and two hands, both hands pressed over their own "
             "mouth; they hold nothing."),
    },
    'cover_chars': ['honeydip', 'santa', 'shiny', 'sparkle'],
    'cover_prompt': (
        f"{POLE}. Generous open space across the upper third of the picture (warm timber beams hung with garlands "
        f"and glowing lanterns). In the lower middle, tiny Honeydip stands on a wooden footstool, proudly holding "
        f"her small pink notebook up high over her head with both hands, with a brave, happy grin. Beside her "
        f"stand Shiny the little reindeer and Sparkle the white baby fox. Behind her, large and warm, Santa leans "
        f"forward in his big red armchair, smiling down at her with twinkling eyes. No children, no other elves."),
    'cover_effect': 'starlight',
    'questions': [
        "Hudson did forty good things and did not feel any better. Why do you think that was?",
        "Honeydip tore the page in half and said the kids were both. What do you think she meant?",
        "Petals said, \"It's a present, silly.\" What is the difference between a present and a prize?",
        "Petals saves Hudson a seat and never keeps score. Grown-ups, who saved a seat for you?",
    ],
    'look_and_find': "Find the sled built for one with four kids on it. Then look at Honeydip's new notebook: whose faces did she draw?",
}
