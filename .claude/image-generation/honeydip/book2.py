"""Book Two of Honeydip's Christmas Mission. Text, vocab and image prompts in one place."""
from common import BOOK, DAY, EVE, FOUR, HOME, KIDS, NOKIDS, NOTOUCH, PJS, TINY, TRIO

DONUTS = ("donuts of many kinds: white-frosted, pink-frosted with rainbow sprinkles, sugar-dusted, chocolate-topped")
GOLD = "one special honey-dipped donut that shines golden"

T = [
    ("Five mornings",
     """For five days, every morning, they counted to ten,
and they found her, and cheered her, and found her again:
in a boot, in a drawer, in the snow-globe's small town,
in the piano (which played when she tried to climb down).

And each night, in her notebook, the GOOD side grew long.
And the BAD side stayed empty. "I can't have been wrong!"
said the elf. "They are perfect! Job two is all done.
So tomorrow," she said, "is for job number one."
""",
     'bottom', ['honeydip'] + KIDS,
     [('empty', 'with nothing inside'), ('cheered', 'shouted happy sounds, like "Hooray!"')],
     f"{HOME}, the living room. {DAY}. An upright piano with its top lid propped open; tiny Honeydip is climbing out "
     f"of the top of the piano with one foot stepping on the keys, caught and laughing, little music notes of gold "
     f"sparkle floating up. The four children stand around the piano pointing up at her and cheering, having just "
     f"found her. A snow globe and a winter boot sit on the piano top. {TINY}. {NOTOUCH}. No fox or reindeer visible. "
     f"{FOUR}.",
     'starlight'),

    ("Twelve donuts",
     """She was up before sunrise. She worked through the dark,
with a whisk, and a spoon, and a small magic spark.
And there on the table, when morning came creeping,
sat a box, tied with ribbon, and Sparkle (still sleeping).

Twelve North Pole donuts! Twelve rings in a row!
Some frosted like rooftops in new-fallen snow,
some sprinkled, some sugared, some chocolate-topped,
and one honey-dipped, golden. (At that one, hearts stopped.)
""",
     'top', TRIO,
     [('whisk', 'a kitchen tool for mixing things up fast'), ('ribbon', 'a long, pretty strip for tying a bow')],
     f"{HOME}, the kitchen just before sunrise, soft blue dawn light at the window and one warm lamp. On the kitchen "
     f"table sits a big open pastry box with a pink ribbon, holding a dozen {DONUTS}, in two neat rows of six, and "
     f"in the middle of the box {GOLD}. Tiny Honeydip stands proudly on the table beside the box with flour on her "
     f"nose and a tiny whisk in her hand, a few gold magic sparkles around the donuts. Sparkle the white baby fox "
     f"sleeps curled against the box, and Shiny the little reindeer sniffs the air with interest. {NOKIDS}.",
     'starlight'),

    ("Three each",
     """"DONUTS!" The kitchen was all socks and cheer.
Sun held his up. "It's got a HOLE in it! Here!"
"They ALL do," said Honeydip. "Sun, don't you know it?
Every donut has a hole in it. That's what makes it a donut."

Then Glyden, who's six, and is quick with a sum,
counted twelve on his fingers (and used Petals's thumb).
"Twelve donuts, four kids. That is three each. No more."
And that should have been that. But here's what's in store...
""",
     'bottom', ['sun', 'glyden', 'petals', 'hudson', 'honeydip'],
     [('sum', 'what you get when you add numbers up'), ('hole', 'an empty space in the middle of something')],
     f"{HOME}, at the kitchen table. {DAY}. The four children crowd happily around a big open pastry box of {DONUTS}. "
     f"Sun holds one sprinkled donut up to his face and peeks through its hole with one eye, grinning his gap-toothed "
     f"grin. Glyden counts on his fingers, borrowing little Petals's thumb to finish the count, and Petals giggles. "
     f"Hudson reaches eagerly toward the box. Tiny Honeydip sits on the rim of the fruit bowl, swinging her legs, "
     f"pleased with herself. {TINY}. {NOTOUCH}. No fox or reindeer visible. {FOUR}.",
     None),

    ("Biggest and littlest",
     """"I'm the BIGGEST," said Hudson. "I'm ten. So that's why
I need more. I need five. I'm a much bigger guy."
"I'm the LITTLEST," said Petals. "I've growing to do!
So I need the most. More than him. More than you."

Now, you may have heard this, right where you are sitting,
in your very own kitchen: the biggest-and-littling.
It has gone on for years. It has never been won.
And it wasn't won then. It had only begun.
""",
     'top', ['hudson', 'petals', 'glyden', 'sun'],
     [('growing', 'getting bigger, a little every day'), ('begun', 'started')],
     f"{HOME}, at the kitchen table. {DAY}. A funny face-off across the open box of donuts: tall Hudson stands on one "
     f"side with his arms folded and his chin up, and tiny Petals stands on a kitchen chair on the other side with "
     f"her fists on her hips and her chin up, so that she is nearly as tall as he is, both stubborn. Between them in "
     f"the box, {GOLD} sits among the other donuts. Behind them Glyden and Sun look at each other and roll their "
     f"eyes. No elf, no fox, no reindeer in this picture. {FOUR}.",
     None),

    ("Mine",
     """For they both saw the gold one. They both made a dive.
"That one's MINE! I am ten!" "It is MINE! I am... five!"
(She is not. She is three.) And they pulled, left and right,
and the honey-dipped donut stretched out, long and tight.

"Stop!" shouted Glyden. "There's plenty!" cried Sun.
But nobody listens when grabbing's begun.
The box tipped. The ribbon flew. Sprinkles went wide.
And the elf on the fruit bowl just watched, open-eyed.
""",
     'bottom', ['hudson', 'petals', 'glyden', 'sun', 'honeydip'],
     [('dive', 'a fast jump toward something'), ('plenty', 'more than enough for everyone')],
     f"{HOME}, at the kitchen table. {DAY}. A comic tug-of-war: Hudson and little Petals each grip one side of the "
     f"same golden honey-dipped donut and pull, so the donut stretches long between them like taffy, both with "
     f"scrunched determined faces. The pastry box is tipping over, donuts sliding, a pink ribbon and rainbow "
     f"sprinkles flying through the air. Glyden holds up both hands shouting stop, and Sun points at all the other "
     f"donuts. On the rim of the fruit bowl, tiny Honeydip watches with wide shocked eyes and both gloved hands on "
     f"her cheeks. Comic, nobody hurt. {TINY}. {NOTOUCH}. No fox or reindeer visible. {FOUR}.",
     None),

    ("Splat",
     """Then SNAP went the donut. And up, through the air,
went one half, and it landed in Sun's wavy hair.
The other half, spinning, came down with a SPLAT,
and a white streak of fox took good care of that.

There was glaze on the ceiling. There was glaze on a chair.
There was glaze on a reindeer, who simply stood there
and sighed. And the kitchen went quiet and small.
And a brother and sister both looked at the wall.
""",
     'top', ['sun', 'sparkle', 'shiny', 'hudson', 'petals'],
     [('glaze', 'the shiny, sugary coat on a donut'), ('ceiling', 'the top of a room, way up over your head')],
     f"{HOME}, the kitchen. {DAY}. The funny, quiet moment after a mess. Sun stands blinking with half a golden glazed "
     f"donut stuck on top of his wavy hair. Sparkle the white baby fox dashes away across the floor with the other "
     f"half of the donut in her mouth, a white blur. Shiny the little reindeer stands very still on the table with a "
     f"big drip of shiny glaze on his back, eyes closed, sighing. Blobs of glaze drip from the ceiling lamp and a "
     f"chair. Hudson and little Petals stand apart with their empty sticky hands at their sides, each staring away "
     f"at a different wall, ashamed. Exactly Sun, Hudson and Petals, plus the fox and the reindeer; no Glyden and no "
     f"elf in this picture. No other people.",
     None),

    ("The pencil",
     """Now Honeydip's pencil came out, and it stopped.
It hovered. It wobbled. It very near dropped.
"I LIKE them," she whispered. "I don't want to write it."
But a scoop is a scoop, and you cannot un-sight it.

So under the BAD, in that column so clean,
she made two small marks. They were small. They were seen.
For Hudson looked up, just as kids sometimes do,
at the wrong time exactly. And Hudson saw two.
""",
     'bottom', ['honeydip', 'hudson'],
     [('hovered', 'stayed in the air without landing'), ('wobbled', 'shook a little from side to side')],
     f"{HOME}, the kitchen. {DAY}. Close view on the rim of the fruit bowl: tiny Honeydip sits with {BOOK} on her "
     f"knees; there are many tally marks under the gold star, and she is sadly, reluctantly drawing exactly two "
     f"small tally marks under the grey cloud, biting her lip, her eyebrows worried. In the background, tall Hudson "
     f"has turned his head and is looking straight at the notebook, his face falling as he sees what she is "
     f"marking. {TINY}. {NOTOUCH}. Exactly Honeydip and Hudson, no other characters.",
     None),

    ("All mine, then",
     """Something dropped in his tummy, like a stone down a well.
It should have come out as "I'm sorry." Oh, well.
It came out as "FINE!" and it came out as "MINE!"
and he scooped up a pile of them: eight, in a line.

He stomped up the stairs with his arms piled high,
and he sat on the top step, with nobody by.
Three kids in the kitchen. Three donuts. One each.
And a brother upstairs, who was just out of reach.
""",
     'top', ['hudson', 'glyden', 'sun', 'petals'],
     [('scooped', 'picked up a whole lot in one go'), ('stomped', 'walked with loud, heavy, grumpy steps')],
     f"{HOME}, the kitchen with the wooden staircase. {DAY}. Hudson stomps up the stairs with his back half turned, "
     f"hugging a tall wobbly stack of donuts in both arms, his face red and scowling. Down at the kitchen table "
     f"Glyden, Sun and little Petals sit and watch him go, each with exactly one donut on a small plate in front of "
     f"them, looking surprised and a little sad. The pastry box on the table is nearly empty. No elf, no fox, no "
     f"reindeer in this picture. {FOUR}.",
     None),

    ("The pile",
     """Now here is a thing about eight donuts, stacked:
they look very fine. That's a true donut fact.
He bit into chocolate. He bit into pink.
He bit into sugar. And what do you think?

They all tasted like nothing. Not one of them. None.
Not the frosted, the sprinkled. He'd technically won.
He had eight of the donuts. Each one was all his.
And that is how quiet a top stair is.
""",
     'bottom', ['hudson'],
     [('stacked', 'piled up, one on top of another'), ('quiet', 'with hardly any sound at all')],
     f"{HOME}, the top of the wooden staircase, a dim quiet upstairs landing with a small window showing grey snowy "
     f"sky. Hudson sits all alone on the top step with a big pile of donuts on his knees and beside him, one donut "
     f"in his hand with a single bite taken out of it. He is not enjoying it: he chews slowly and stares at "
     f"nothing, glum and lonely. The long empty staircase stretches down below him. Exactly Hudson, alone, no other "
     f"characters.",
     None),

    ("Petals goes first",
     """Down below, Petals looked at her one, on her plate:
pink frosting, and sprinkles (she counted them: eight).
She looked up the stairs. Then she slid off her chair,
and she climbed, with her donut held high in the air.

It's a long way to climb when your legs are so small.
One step. And one more. With one hand on the wall.
"You look sad," Petals said, and she held out her treat.
"Have mine." It was licked, but still mostly complete.
""",
     'top', ['petals', 'hudson'],
     [('frosting', 'the sweet, creamy topping on a treat'), ('climb', 'go up, step by step')],
     f"{HOME}, the wooden staircase seen from the side. {DAY}. Little Petals climbs the stairs all by herself, one "
     f"hand flat on the wall for balance and the other holding one pink-frosted sprinkled donut up high like a "
     f"treasure, her face serious and kind. At the top of the stairs sits Hudson with his pile of donuts, looking "
     f"down at her in surprise. The stairs look very big and she looks very small. Exactly Petals and Hudson, no "
     f"other characters.",
     None),

    ("Half",
     """Now what do you do, with a pile on your knees,
when the littlest one says, "Have mine, if you please"?
Hudson looked at his eight. Hudson looked at her one.
And his ears went all hot, and the stone came undone.

"I can't take your donut." He broke his in two.
"Here. Half is for me, and the big half's for you."
And they sat on the top step, two halves and one whole,
and it tasted like something. Right down to the hole.
""",
     'bottom', ['hudson', 'petals'],
     [('half', 'one of two pieces that make a whole thing'), ('whole', 'all of something, with no part missing')],
     f"{HOME}, the top of the wooden staircase, now with warm golden light coming through the small window. Hudson "
     f"and little Petals sit side by side on the top step, shoulder to shoulder. Hudson has broken a chocolate donut "
     f"in two and is handing the bigger half to Petals with a soft, sorry smile; Petals beams up at him, her own "
     f"pink sprinkled donut safe in her lap. The pile of donuts sits forgotten beside them. Tender and warm. Exactly "
     f"Hudson and Petals, no other characters.",
     'bond'),

    ("Round and round",
     """Then down came the pile, and oh, what a sight!
Hudson gave two to Glyden. "No, YOU take a bite!"
said Glyden, and gave them to Sun, who said, "Here!"
and gave one to Petals, and one to the deer.

(Shiny wore his on an antler. He'd say
it was not on purpose. It stayed there all day.)
And Sparkle crept back, with some glaze on her chin,
and the half she had borrowed. She nudged it back in.
""",
     'top', KIDS + ['shiny', 'sparkle', 'honeydip'],
     [('antler', 'one of the branchy horns on a reindeer\'s head'), ('nudged', 'gave a soft little push')],
     f"{HOME}, at the kitchen table. {DAY}. A joyful, silly scene of everybody giving donuts to everybody: Hudson "
     f"hands two donuts to Glyden, Glyden passes one on to Sun, and Sun holds one out to little Petals, all four "
     f"laughing. On the table, Shiny the little reindeer stands proudly with a pink-frosted donut hooked over one "
     f"golden antler like a hat, and Sparkle the white baby fox, glaze on her chin, nudges a half-eaten piece of "
     f"golden donut back into the pastry box with her nose, looking sorry. Tiny Honeydip claps from the rim of the "
     f"fruit bowl. {TINY}. {NOTOUCH}. {FOUR}.",
     'starlight'),

    ("The last one",
     """When the giving was done, Glyden counted once more.
"We each got LESS donut than we had before,
and it feels like MORE donut. That sum isn't right."
"It's a North Pole sum," said the elf, with delight.

And one was left over. "You have it." "No, you!"
Four kids, and one donut, and no one would chew.
So they put it beside a cold cup, on a plate,
for someone who'd said "Coffee". (That someone was late.)
""",
     'bottom', ['glyden', 'hudson', 'sun', 'petals', 'honeydip'],
     [('counted', 'said the numbers, one, two, three, to find how many'), ('giving', 'handing something of yours to someone else')],
     f"{HOME}, the kitchen counter. {DAY}. The four children stand on tiptoe in a row at the kitchen counter and, all "
     f"together, carefully set down a small plate holding one last white-frosted donut next to a mug of coffee that "
     f"has gone cold, as a present for a grown-up who is not there. Glyden scratches his head, puzzling over his "
     f"sums; Hudson steadies the plate; Sun and Petals grin. Tiny Honeydip stands on the counter beside the mug, "
     f"hands clasped, charmed. {TINY}. {NOTOUCH}. No fox or reindeer visible. {FOUR}.",
     None),

    ("A scoop is a scoop",
     """That night, the elf wrote, and she wrote, and she wrote.
The GOOD side ran down to the foot of the note:
one mark for each half, and each "Here!" and "No, you!"
She ran out of room, so she drew them small, too.

Then she looked at the BAD side. Two marks. There they sat.
Her pencil had an eraser. She looked hard at that.
But Santa said columns. And Santa said true.
So she left them. It wasn't what she'd wished to do.
""",
     'top', ['honeydip'],
     [('eraser', 'the soft end of a pencil that rubs marks away'), ('columns', 'rows that go up and down, side by side')],
     f"{HOME}. {EVE}. On a wooden windowsill, snow falling outside the dark window. Tiny Honeydip sits cross-legged "
     f"with {BOOK} open in front of her: the column under the gold star is crowded full of tally marks from top to "
     f"bottom, and the column under the grey cloud has exactly two small tally marks. She holds her pencil upside "
     f"down, with its pink eraser end hovering just above those two marks, looking at them with a torn, wistful "
     f"face. Exactly Honeydip, alone. {NOKIDS}.",
     None),

    ("Over their heads",
     """Downstairs, by the tree, in the last of the light,
four kids told the glaze-on-the-ceiling tale right
from the start, and they laughed till they fell in a heap.
(There is still glaze up there. It is there now, to keep.)

But Hudson, mid-laugh, with a smile on his face,
looked over their heads, to a high, quiet place,
where a small pink notebook lay shut, on a sill.
Two marks. He could see them. He's seeing them still.
""",
     'bottom', KIDS,
     [('heap', 'a big, messy pile'), ('sill', 'the little ledge at the bottom of a window')],
     f"{HOME}, the living room by the Christmas tree. {EVE}. Glyden, Sun and little Petals roll on the rug in a "
     f"laughing heap, Sun pointing up at the ceiling. Hudson sits with them, still smiling, but his eyes have "
     f"drifted up and away over their heads toward a high windowsill in the background, where a small closed pink "
     f"notebook lies with a tiny pencil beside it. His smile is fading into worry. No elf, no fox, no reindeer in "
     f"this picture. {FOUR}.",
     None),

    ("Nineteen sleeps",
     """"Nineteen sleeps," said the elf, on the sill, in the gloom.
"That went well!" Shiny looked at the glaze on the room.
And Sparkle, still sticky, said nothing at all.
And one boy lay awake, with his face to the wall.

But the box was all empty. And every last bite
had been given by somebody else. So tonight,
if there's someone beside you, and something to eat:
""",
     'top', ['hudson', 'honeydip', 'shiny', 'sparkle'],
     [('sticky', 'gooey, so that things cling to you'), ('awake', 'not asleep')],
     f"{HOME}, the children's bedroom at night, soft moonlight and one small night-light, snow at the window. In the "
     f"nearest bed Hudson lies awake under his quilt in forest-green pajamas, on his side, facing the wall, his eyes "
     f"wide open and worried. On the windowsill behind him sit the three tiny friends: Honeydip chatting cheerfully "
     f"with her arms spread, Shiny the little reindeer looking at her with a doubtful face, and Sparkle the white "
     f"baby fox licking glaze off her own paw. An empty pastry box with a pink ribbon sits on the floor. {TINY}. "
     f"Exactly one child, Hudson; no other children, no other people.",
     'starlight'),
]

BOOK2 = {
    'number': 2,
    'ordinal': 'Two',
    'slug': 'honeydip-and-the-dozen-donuts',
    'title': 'Honeydip and the Dozen Donuts',
    'refrain': 'A donut shared is twice as sweet.',
    'refrain_spreads': {11, 13, 16},
    'the_end': 'The End — for today. Nineteen sleeps to go.',
    'spreads': T,
    'prompt_fixes': {
        2: ("The box holds EXACTLY twelve donuts: two rows, six donuts in the top row and six donuts in the bottom "
            "row, no third row. Count them: 6 + 6 = 12. Shiny the reindeer is small, only a little taller than the "
            "elf."),
        3: ("Tiny Honeydip sits on the rim of a WOODEN fruit bowl at the far end of the table, with clear empty "
            "table all around her; no child's hand is anywhere near her. Everyone wears socks, no shoes."),
        6: ("The golden donut has snapped into two C-shaped HALVES: one half-ring (a C shape, not a full ring) sits "
            "on Sun's hair, and the fox carries the other half-ring (a C shape, not a full ring) in her mouth. No "
            "whole golden donut anywhere. The fox and the reindeer are TINY toy-sized creatures: Sparkle is smaller "
            "than Hudson's shoe, and Shiny, standing on the table, is no taller than a coffee mug and a half, far "
            "smaller than little Petals's head."),
        7: ("Only Honeydip and Hudson are in this picture: no fox, no reindeer, nothing else sitting in the bowl. "
            "Honeydip is tiny, no taller than a banana, sitting on the rim of a WOODEN fruit bowl; Hudson's head is "
            "many times bigger than her whole body. Exactly two tally marks under the grey cloud."),
        9: ("It is daytime: the small window shows pale grey daylight and snow, not night. Hudson sits on the very "
            "TOP step: behind him is a flat landing floor and a wall, with NO more steps going up. Beside him is a "
            "small stack of exactly eight donuts, no more."),
        11: ("It is daytime, golden afternoon sun, not night. They sit on the very TOP step of the staircase: behind "
             "them is a flat upstairs landing and a wall, no steps going up behind them, no Christmas tree nearby; "
             "the stairs go DOWN in front of them. Hudson holds TWO separate pieces of one chocolate donut, one "
             "piece in each hand, and holds the bigger piece out to Petals."),
        13: ("Tiny Honeydip stands on the counter on the FAR side of the coffee mug, behind it, away from the "
             "children, with clear empty counter between her and every child's hand. Her braids hang on her own "
             "shoulders and touch no one."),
        14: ("Under the grey cloud there are EXACTLY two tally marks, two short pencil strokes, no more. She holds "
             "the pencil upside down with its pink eraser tip pointing DOWN, hovering just above those two marks; "
             "the pencil's sharp point is up in the air."),
        15: ("The closed pink notebook lies on a high windowsill in the upper RIGHT corner of the picture. Hudson "
             "sits at the left of the heap with his head turned to the right and his eyes looking up at the "
             "notebook, directly at it. Every shoe and foot clearly belongs to one of the four children."),
    },
    'cover_chars': ['honeydip', 'hudson', 'petals', 'glyden', 'sun', 'sparkle', 'shiny'],
    'cover_prompt': (
        f"{HOME}, at the kitchen table. {DAY}. Generous open space across the upper third of the picture (a plain "
        f"cream wall and a window with falling snow). On the table a big open pastry box with a pink ribbon, holding EXACTLY twelve donuts in two rows, six in the top row and six in the bottom row (6 + 6 = 12, no more): {DONUTS}, with {GOLD} among them. Tiny Honeydip stands on the edge of the box presenting the donuts "
        f"with a proud sweep of her swirly-gloved hand. Behind the table the four children lean in with huge hungry "
        f"smiles: Hudson and little Petals both have their eyes fixed on the golden donut. Shiny the little reindeer "
        f"and Sparkle the white baby fox peek over the table edge. {TINY}. {NOTOUCH}. {FOUR}."),
    'cover_effect': 'starlight',
    'questions': [
        "Hudson said the biggest should get the most, and Petals said the littlest should. What do you think is fair?",
        "Hudson had the biggest pile, and it didn't taste like anything. Why do you think that was?",
        "Petals gave her only donut away first. Who goes first at being kind in your house?",
        "Honeydip could have rubbed out the two marks, and she didn't. Grown-ups, would you have?",
    ],
    'look_and_find': "Glaze went everywhere! Can you find it on the ceiling, on a chair, and on a reindeer? And where did the last donut end up?",
}
