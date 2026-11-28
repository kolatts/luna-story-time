"""Book One of Honeydip's Christmas Mission. Text, vocab and image prompts in one place."""
from common import ALL7, BOOK, DAY, EVE, FOUR, HOME, KIDS, NOKIDS, NOTOUCH, PJS, TINY, TRIO

T = [
    # (title, text, textPosition, characters, vocab, imagePrompt, effect)
    ("The last night of November",
     """On the last night of November, when the snow came down slow,
and the moon made the rooftops and chimney tops glow,
a reindeer named Shiny came down through the night,
no bigger than a teapot, and twice as polite.

On his back rode an elf in a hat that was pink,
with a fox on her lap (who was snoring, I think).
"That's the house," said the elf. "The one with the swing.
Four kids, twenty-four days, and one little thing..."
""",
     'bottom', TRIO,
     [('polite', 'kind and careful with your manners'), ('glow', 'shine with a soft light')],
     f"Snowy night outdoors under a big round moon, soft snowflakes falling. Below, a cozy two-story family house with warm glowing windows, a snowy roof with a chimney, and a tree swing in the front yard. In the sky in the upper middle of the picture, flying down toward the house and drawn large and clear: Shiny the little reindeer galloping through the air trailing gold sparkles, with Honeydip riding on his back, one hand holding his collar and the other pointing at the house, a small pink notebook tucked under her arm, and Sparkle the white baby fox curled up asleep on her lap. No sleigh. {NOKIDS}.",
     'starlight'),

    ("The mission",
     """"...the mission!" said Honeydip, patting her book.
"Santa's own orders. Come on, have a look.
Job one: help the kids have MORE FUN. That's a breeze.
Job two: get the scoop. The FULL scoop, if you please."

"Are they good? Are they bad? Write it down, every bit,
in two tidy columns, and see where they fit."
She'd a pencil, a plan, and her lipstick just right
(she checked in a spoon). Then she waited for light.
""",
     'top', TRIO,
     [('mission', 'a special job someone sends you to do'), ('columns', 'rows that go up and down, side by side')],
     f"{HOME}, the kitchen at night, lit by moonlight through the window and one small warm lamp. On the wooden kitchen counter, large in the frame: Honeydip stands on tiptoe in front of a big shiny silver soup spoon propped against a mug, checking her pink lipstick in the spoon's curved reflection, a tiny pencil tucked behind her ear. On the counter at her feet lies her small pink notebook, open to two columns: a tiny gold star drawn at the top of the left column and a tiny grey rain cloud drawn at the top of the right column, and both columns completely BLANK below, no tally marks, no writing, no letters. The notebook is small, no bigger than her hand span. Shiny stands beside her looking patient, and Sparkle sleeps curled inside a red knitted mitten. {NOKIDS}.",
     None),

    ("Four kids",
     """Down the stairs in the morning came eight sleepy feet.
There was Hudson, who's ten, and was first to his seat.
There was Glyden, who's six, with his glasses askew.
There was Sun, who is five, with one sock and one shoe.

And last, holding on to the rail all the way,
came Petals, who's four, nearly four, any day.
Somewhere a grown-up said, "Coffee," and sighed.
And there in the fruit bowl, two bright eyes went wide.
""",
     'top', KIDS + ['honeydip'],
     [('askew', 'a little bit crooked'), ('sighed', 'let out a long, tired breath')],
     f"{HOME}. {DAY}. A wooden staircase comes down into the kitchen. Four sleepy children come down the stairs in a line: Hudson first, already at the bottom, yawning; then Glyden with his round glasses sitting crooked on his nose; then Sun wearing one sock and one shoe; and last, little Petals holding the stair rail with both hands. In the foreground on the kitchen table stands a steaming mug of coffee and a big wooden fruit bowl of bananas, tangerines and a green pear; peeking out between the fruit are just the pink hat, white pom-pom and two wide brown eyes of tiny Honeydip, mostly hidden. No fox or reindeer visible. {FOUR}.",
     None),

    ("In the fruit bowl",
     """Between a banana and two tangerines
sat the pinkest small person that anyone's seen:
pink hat and pink dress and pink boots with a curl,
white gloves with pink swirls, and a wave and a twirl.

"Good morning!" she said. And a spoon hit the floor.
Sun's mouth fell wide open. Then Glyden's. Then more.
"She TALKS," whispered Hudson. "She's real," Petals said,
as if she had known it all night in her bed.
""",
     'bottom', ['honeydip'] + KIDS,
     [('twirl', 'a quick spin all the way around'), ('swirls', 'curly, twisty shapes')],
     f"{HOME}, at the kitchen table. {DAY}. Close view of a big wooden fruit bowl on the table: tiny Honeydip stands up in the bowl between a banana and two tangerines, waving one white swirly-gloved hand and smiling brightly, mid-twirl. Around the table the four children stare at her in astonishment, mouths open: Sun and Glyden gaping, Hudson whispering behind his hand, and little Petals, chin just above the table edge, smiling calmly as if she always knew. All of the children's hands are flat on the near edge of the table or at their own cheeks, far from the bowl, with clear empty space all around the elf. A dropped spoon lies on the floor. {TINY}. {NOTOUCH}. No fox or reindeer visible. {FOUR}.",
     'starlight'),

    ("Two jobs",
     """"I'm Honeydip. Elf. From the North Pole. Hello.
I'm here until Christmas, and then I must go.
I've two jobs from Santa. The first one is FUN.
We'll play every day till December is done!"

"And the second?" asked Hudson. She straightened her hat.
"The second is paperwork. Never mind that."
And she slid her small notebook behind a green pear,
as if a whole notebook was not really there.
""",
     'top', ['honeydip', 'hudson', 'glyden', 'sun', 'petals'],
     [('paperwork', 'writing things down for a job, which grown-ups do a lot'),
      ('straightened', 'made something neat and not crooked')],
     f"{HOME}, at the kitchen table. {DAY}. Tiny Honeydip stands on the table beside the fruit bowl, straightening her pink hat with one hand with a very professional, innocent face, while her other hand sneakily slides a small pink notebook behind a green pear; the notebook still sticks out plainly. Hudson leans in with one eyebrow raised, curious about the notebook. Glyden, Sun and Petals sit at the table with their chins on their hands, delighted. {TINY}. {NOTOUCH}. No fox or reindeer visible. {FOUR}.",
     None),

    ("The one rule",
     """Then Petals reached out with one small sticky hand,
because pink things are huggable. You understand.
"STOP!" cried the elf. "There is one rule. Just one.
If a child ever touches me, magic is done."

"So talk to me, laugh with me, sit by my side,
but hands to yourselves." Petals's hands went to hide
behind her own back, where they wiggled and curled.
It's the hardest small rule in the whole wide world.
""",
     'bottom', ['honeydip', 'petals', 'hudson'],
     [('rule', 'something you must always do, or never do'), ('wiggled', 'moved with tiny, quick, squirmy moves')],
     f"{HOME}, at the kitchen table. {DAY}. Tiny Honeydip stands on the table holding up one white swirly-gloved hand like a little stop sign, kind but firm. Across from her, little Petals has pulled both of her hands behind her own back and squeezes them there, leaning forward and gazing at the elf with huge longing eyes, her chin at table height. Behind Petals, big brother Hudson watches with a small smile, his hands in his hoodie pocket. There is a clear gap of space between Petals and Honeydip. {TINY}. {NOTOUCH}. Exactly Honeydip, Petals and Hudson, no other characters. No fox and no reindeer anywhere in this picture.",
     None),

    ("Sparkle and Shiny",
     """Then out of a mitten left out on a chair
rolled a fluff-ball of white, with her nose in the air.
"That's Sparkle, my fox. She's a help, in her way."
(Sparkle ate a whole blueberry. Then looked away.)

"And Shiny, my reindeer. He's seen it all twice."
Shiny rang his gold bell, which is Shiny for "nice".
"Now THESE two," said Honeydip, "love a good pat."
So eight gentle hands made quite sure about that.
""",
     'top', ['sparkle', 'shiny', 'honeydip'] + KIDS,
     [('mitten', 'a warm glove with one big pocket for your fingers'), ('gentle', 'soft and careful')],
     f"{HOME}, the kitchen. {DAY}. On the kitchen table, Sparkle the fluffy white baby fox sits with a blueberry in her mouth and a guilty sideways look, while Sun and Glyden gently stroke her fur with one finger each. Beside her, Shiny the little reindeer stands calmly with his eyes half closed as Hudson and Petals softly pat his back; his gold bell swings. A red knitted mitten lies on a chair. Tiny Honeydip stands all by herself at the far LEFT end of the table, with a full arm's length of empty table between her and the nearest child, arms folded, smiling proudly; all four children are gathered at the RIGHT end of the table. A small bowl of blueberries on the table. {TINY}. The children touch only the fox and the reindeer. {NOTOUCH}. {FOUR}.",
     None),

    ("The game",
     """"Now. Job number one," said the elf. "Here's the game.
You close up your eyes, and you count, all the same,
to ten. And we hide, me and Sparkle and Shiny.
Then you find us. I warn you, we're clever. And tiny."

They covered their eyes. "One... two... three..." Petals said,
"...six... eleven... ten!" Then they lifted their heads.
The fruit bowl was empty. The mitten lay flat.
"I'll find them all FIRST!" Hudson said. And that's that.
""",
     'bottom', KIDS + TRIO,
     [('clever', 'quick at thinking up good ideas'), ('tiny', 'very, very small')],
     f"{HOME}, the kitchen. {DAY}. In the foreground the four children stand in a row with both hands pressed over their eyes, counting; little Petals peeks through her fingers with a grin. Behind their backs, unseen by them, the three tiny hiders tiptoe away across the floor in different directions: Honeydip with a finger to her lips, Sparkle scampering low, and Shiny stepping high and careful. {TINY}. {FOUR}.",
     None),

    ("Every kid for himself",
     """So Hudson ran left, and so Glyden ran right,
and Sun crawled in under the couch, out of sight.
"She's MINE!" "No, I'll find her!" "I looked in there, too!"
They bumped in the hallway. They stepped on a shoe.

They looked in the oven, the boots and the bread.
They looked in the bathtub and under each bed.
Three boys, in three rooms, in a terrible rush,
found one sock, and a button, and somebody's brush.
""",
     'top', ['hudson', 'glyden', 'sun'],
     [('hallway', 'the long part of a house with doors to the rooms'), ('bumped', 'knocked into something by accident')],
     f"{HOME}, the living room and hallway. {DAY}. A funny, busy scene of three brothers searching in a rush, each one alone and facing a different way: Hudson striding off to the left, pulling a sofa cushion up to look under it; Glyden dashing to the right, holding up a single sock he has found, glasses sliding down his nose; and Sun's legs and bottom sticking out from under the couch as he crawls beneath it. Boots and shoes are tipped over on the floor. Nobody is looking at anybody else. No elf, no fox, no reindeer and no Petals in this picture. Exactly three boys: Hudson, Glyden and Sun, each exactly once. No other people.",
     None),

    ("Wait for me",
     """And back in the hall, by the very first stair,
stood Petals. The others had all been right there,
and then they were gone, with their long, running legs.
"Wait for me," Petals said, to a row of coat pegs.

Now Hudson was winning. He knew that he was.
He was fastest and tallest and smartest, because
he was ten. But he stopped, with his hand on a door.
It was awfully quiet, to win, on that floor.
""",
     'bottom', ['petals', 'hudson'],
     [('quiet', 'with hardly any sound at all'), ('pegs', 'little hooks on a wall for hanging coats')],
     f"{HOME}, a long hallway. {DAY}. In the foreground, little Petals stands all alone at the bottom of the staircase beneath a row of coat pegs hung with winter coats and scarves, looking very small, her hands clasped, a little lost but not crying. Far down the hallway in the background, big brother Hudson has stopped with one hand on a door handle and is looking back over his shoulder toward her, his face thoughtful. A long empty stretch of floor lies between them. Exactly Petals and Hudson, no other characters, no elf.",
     None),

    ("Up high and down low",
     """So Hudson went back. And he knelt on the mat.
"You're too small to look high. I can help you with that."
And up Petals went, to his shoulders, to ride.
"You look up," Hudson said. "I'll look down. Side by side."

"Glyden! Sun! Over here! We'll go room by room,
all four." And they came, at a thundering zoom.
And nobody raced. And nobody won.
It was "What do YOU see?" It was, oddly, more fun.
""",
     'top', KIDS,
     [('knelt', 'got down on your knees'), ('shoulders', 'the tops of your arms, where a little kid can ride')],
     f"{HOME}, the living room. {DAY}. Hudson stands tall with little Petals riding on his shoulders, holding her ankles; she points up high with ONE hand, delighted, and her other hand rests on top of Hudson's hair. Petals has exactly two arms and exactly ONE braid, over one shoulder. Glyden and Sun run in to join them, Glyden pointing at something he has spotted, Sun cupping a hand to his ear to listen. All four are close together as one team, smiling. No elf, no fox, no reindeer visible in this picture. {FOUR}.",
     'bond'),

    ("A glitter and a jingle",
     """Then Glyden, whose glasses see more than they should,
said, "Glitter. On the flour jar. That's not where it stood."
And the lid gave a wiggle. And out came a nose,
a white one, with flour from whiskers to toes.

Then Sun, who hears everything, said, "That's a bell."
On the tree hung toy reindeer. One didn't hang well.
It was breathing. It blinked. It gave one little sigh.
"Found you, Shiny!" said Sun. Shiny rang his reply.
""",
     'bottom', ['glyden', 'sun', 'sparkle', 'shiny'],
     [('glitter', 'tiny shiny specks that sparkle'), ('whiskers', 'the long hairs beside an animal\'s nose')],
     f"{HOME}. {DAY}. A picture in two halves. Left half, in the kitchen: Glyden pushes up his round glasses and points at a big glass flour jar on the counter whose lid is lifting; Sparkle the white baby fox pokes her head out of the jar, dusted with white flour, blinking. Right half, by the Christmas tree: Sun points up and laughs at a branch where five small wooden toy reindeer ornaments hang in a row, and among them, pretending to be an ornament with his legs dangling, is Shiny the real little reindeer, looking embarrassed, his gold bell ringing. Exactly Glyden and Sun, each exactly once, plus Sparkle and Shiny. No Honeydip. No other people.",
     'starlight'),

    ("The highest place",
     """"But where's Honeydip?" So they looked high and low.
They looked where a careful small elf wouldn't go.
Then Petals, up high, where the tall people see,
said, "The teapot is wearing a hat. Look with me."

On the tippy-top cupboard, a teapot sat proud,
and a pom-pom poked out of the lid, like a cloud.
Off came the lid. There she was, pink and neat.
"Found by FOUR," said the elf. "Now THAT'S hard to beat."
""",
     'top', ['petals', 'hudson', 'honeydip', 'glyden', 'sun'],
     [('cupboard', 'a little closet with doors, for dishes and food'), ('proud', 'feeling very pleased and standing tall')],
     f"{HOME}, the kitchen. {DAY}. Little Petals rides high on Hudson's shoulders and points excitedly up at the flat TOP of a tall wooden kitchen cupboard with closed doors, right up near the ceiling, where a round blue teapot sits on the very top of the cupboard, above the doors, higher than Hudson's head (not on a shelf inside it). Glyden stands on a kitchen chair and lifts the teapot's lid with one hand, and tiny Honeydip pops up out of the teapot with her arms spread wide and a big laugh, her pink hat and white pom-pom showing. Sun cheers below with both arms in the air. {TINY}. {NOTOUCH}. No fox or reindeer visible. {FOUR}.",
     'starlight'),

    ("The first line in the book",
     """Oh, the cheering! The jumping! The pile on the floor
of two boys, and a third, and a girl, which makes four.
(Nobody touched her. She stood on a chair,
well back from the hugging, and fixed up her hair.)

Then out came her notebook. She licked her sharp lead.
There were two tidy columns, with words at the head.
Under GOOD she wrote one tidy line, straight and true.
Under BAD there was nothing. That column was new.
""",
     'bottom', KIDS + ['honeydip'],
     [('cheering', 'shouting happy sounds, like "Hooray!"'), ('tidy', 'neat, with everything in its place')],
     f"{HOME}, the living room. {DAY}. On the rug, the four children tumble together in one happy laughing hug-pile. In the foreground, safely apart on the seat of a wooden chair, tiny Honeydip stands making one small pencil mark in {BOOK}: there is exactly one tally mark under the gold star and nothing at all under the grey cloud. She looks pleased and professional. {TINY}. {NOTOUCH}. No fox or reindeer visible. {FOUR}.",
     None),

    ("Twenty-four sleeps",
     """That night on the windowsill, snug in the gloom,
three small ones looked out at the snow and the moon.
"Twenty-four sleeps," said the elf, with a yawn.
"And this job will be easy. They're good, dusk to dawn!

Did you see? Not one push. Not one pinch. Not one fight.
I'll fill the GOOD column by Saturday night."
Shiny looked at the fox. Sparkle looked at the floor.
They had both seen a few Decembers before.
""",
     'top', TRIO,
     [('windowsill', 'the little ledge at the bottom of a window'), ('yawn', 'a big sleepy breath with your mouth wide open')],
     f"{HOME}. {EVE}. On a wide wooden windowsill, with snow falling past a round moon outside the glass: tiny Honeydip sits wrapped in a knitted sock like a blanket, yawning happily and holding her closed pink notebook, very sure of herself. Beside her, Shiny the little reindeer and Sparkle the white baby fox exchange a sideways, knowing, doubtful look with each other. A string of fairy lights along the window frame. {NOKIDS}.",
     'starlight'),

    ("Ready or not",
     """So the house went to sleep, with its four in a row,
and the tree lights still on, and the hush of the snow.
And up on the sill, in her gloves with their swirl,
sat an elf who quite liked these three boys and one girl.

There were twenty-three hiding spots still left to find.
(She had twenty-two picked. She was slightly behind.)
And tomorrow they'd count, and they'd shout, as you ought:
""",
     'top', KIDS + ['honeydip'],
     [('hush', 'a soft, gentle quiet'), ('hiding', 'tucking yourself where nobody can see you')],
     f"{HOME}, the children's bedroom at night, soft moonlight and one small night-light, snow at the window. Four beds in a row with the four children fast asleep under quilts, biggest to smallest: Hudson, Glyden (his round glasses folded on the bedside table), Sun, and little Petals. The children wear cozy pajamas in their own colors: Hudson forest green, Glyden blue, Sun sunny yellow, Petals lavender. Glyden sleeps WITHOUT his glasses on; his one pair of glasses is on the table. Each child has exactly two hands. No fox and no reindeer anywhere in this picture. On the windowsill above them, tiny Honeydip sits with her chin in her swirly-gloved hands, watching over them with a soft, fond smile. {TINY}. {FOUR}.",
     'starlight'),
]

BOOK1 = {
    'number': 1,
    'ordinal': 'One',
    'slug': 'honeydip-and-the-house-of-four',
    'title': 'Honeydip and the House of Four',
    'refrain': 'Ready or not, we look together!',
    'refrain_spreads': {11, 13, 16},
    'the_end': 'The End — for today. Twenty-four sleeps to go.',
    'spreads': T,
    'prompt_fixes': {
        8: ("The three hiders are TINY on the floor: Honeydip is no taller than Hudson's shoe is long, far below "
            "every child's knee, like a milk carton standing on the floor; Shiny is the same height as Honeydip; "
            "Sparkle is smaller than both, smaller than a child's shoe. The children tower over them."),
    },
    'cover_chars': ['honeydip', 'shiny', 'sparkle'] + KIDS,
    'cover_prompt': (
        f"{HOME}. {DAY}. Generous open space across the upper third of the picture (a plain cream wall and the top of a softly glowing Christmas tree). In the lower middle, on a kitchen table, a big wooden fruit bowl with tiny Honeydip standing in it between a banana and two tangerines, waving one white swirly-gloved hand, with Shiny the little reindeer and Sparkle the white baby fox standing on the table on either side of the bowl. Behind the table the four children lean in with delighted faces, hands kept behind their backs. {TINY}. {NOTOUCH}. {FOUR}."),
    'cover_effect': 'starlight',
    'questions': [
        "The first hunt went badly when every kid looked alone. What is something you do better with somebody else?",
        "Hudson was winning, and then he stopped. Why do you think he went back for Petals?",
        "The kids can talk to Honeydip but never touch her. What is something you love without holding on to it?",
        "Honeydip thinks her job will be easy. Grown-ups, has a job ever turned out harder than it looked on day one?",
    ],
    'look_and_find': "Honeydip hid in the teapot. Go back and find where Sparkle and Shiny were hiding, and count the coat pegs in the hall.",
}
