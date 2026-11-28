# Honeydip's Christmas Mission — series bible

Read this before writing or illustrating any Honeydip book. It outranks per-book prompts.
Planned, built and published 2026-11-28 with Sunny. Four books, ending at Christmas. All four are
live (text, art, narration). Each book's verse, vocab and picture prompts live in ONE spec file,
`.claude/image-generation/honeydip/bookN.py`; `build-honeydip.py N` writes `manuscript.md`,
`book.json` and the prompt files from it, so edit the spec, never the outputs.

Format follows *Ruby and the Dragon Bonds*: 16 spreads plus a cover per book, rhymed quatrains,
one refrain per book stored in the top-level `refrain` field, sparkle words, four questions, a
look-and-find, Ana narration. Ages 4–8. Build each one with the `add-story` skill.

## Release

All four books went live together on 2026-11-28 (commit 7d5e238, GitHub Pages). The first plan was
one a week through December; Sunny chose to publish the finished series at once. The story days
still run across the month: Book One is the last night of November and the first morning of
December, Book Two the first week, Book Three the middle of December, Book Four December 23 to
Christmas morning.

## Canon

- **Honeydip** is a girl elf from the North Pole. Santa sent her on a mission with two jobs: help
  the kids have more fun, and get "the full scoop" on whether they have been good or bad.
- **The mission** starts on the last day of November and she must stay until just before Christmas
  to get the full scoop. She flies home on Christmas Eve, before Santa's sleigh leaves.
- **She is alive in front of the kids.** She moves, talks, laughs and plays while they watch.
  (Sunny's retcon, 2026-11-28: the first idea was that she only moved when eyes were closed. That
  is gone. Never write her as frozen when watched.)
- **The game:** Honeydip hides and the four kids hunt for her *together*. It is plain hide-and-seek
  with a very small, very clever hider. Sparkle and Shiny hide too, so there are three to find.
- **The one rule: the kids never touch Honeydip.** They can talk to her, play beside her and pass
  her things on a spoon. A child's touch drains elf magic.
- **What a touch does:** her pink fades to pale grey from the hat down, and she goes as still and
  quiet as a doll. She cannot move, hide or fly. She can manage a tiny whisper.
- **What brings the pink back:** kindness that asks for nothing back. It returns a little at a time,
  hat tip first.
- **The Scoop Book** is her little notebook with two columns, Good and Bad. She fills both all
  December. In Book Four she tears the page in half.
- **Sparkle** is her arctic fox (she) and **Shiny** is her reindeer (he). They came with her as
  helpers. The kids can see them and play the hiding game with them. *Proposed:* they do not talk
  in words. Sparkle yips and sniffs, Shiny rings his bell, and both understand everything. The no-touch rule is Honeydip's; whether the
  kids may pet Sparkle and Shiny is still open (see Open decisions).
- **The house** has four kids who get along. That is the baseline: they play the game as one team.
  The donut fight in Book Two is the first crack, Book Three is the break, and the ending puts them
  back together stronger.
  - **Hudson**, 10, the big brother.
  - **Glyden**, 6, a boy.
  - **Sun**, 5, a boy.
  - **Petals**, almost 4, the only girl and the littlest.
- **Donuts** run through the whole series. Honeydip is named for one. She brings a box of twelve
  North Pole donuts in Book Two, the kids carry donuts to a neighbor in Book Three, and a donut is
  part of the last gift in Book Four.
- **Grown-ups** stay off-frame, the way the cook does in the Ruby books. Santa is the one exception
  (Book Four only; see Open decisions).

### Guardrails

- **Santa is real in these books, and so is Honeydip.** Hudson's trouble is never doubt. No line,
  picture or question may hint that Santa or the elf is pretend. Hudson's reasons are the three
  below and nothing else.
- **Hudson's three reasons** (Sunny chose all three, stacked): he is sure the donut fight put him on
  the Bad side; so he is sure his one big present is gone; so he tells himself he is too big for elf
  games anyway. "I don't even like Christmas anymore" is shame wearing a grumpy face.
- **Stay original.** Honeydip is our own character. Never use the words "scout elf" or "on the
  shelf", never give her a red suit with a white collar, never borrow lines from any published elf
  book. Shiny never has a glowing red nose.
- **One meaning of Christmas per book**, shown through what happens, never as a lesson line:
  being together, giving instead of getting, helping someone outside the house, and a gift you do
  not have to earn.

## Books

1. ***Honeydip and the House of Four***. Meaning: **being together.**
   Refrain: "Ready or not, we look together!"
   On the last night of November, Honeydip rides in on Shiny with Sparkle on her lap and her Scoop
   Book under her arm. In the morning the kids find a tiny pink elf sitting in the fruit bowl, and
   she talks. She tells them her two jobs, the game and the one rule. Petals reaches out and stops
   just in time. The first hunt goes badly because each kid races off alone and wants to win.
   Hudson, who is the best finder, slows down and lifts Petals up to look on the high shelf, and
   they find all three hiders as a team. Honeydip writes her first line in the Good column. Hudson
   is at his best in this book, on purpose, so that readers love him before he falls.

2. ***Honeydip and the Dozen Donuts***. Meaning: **giving instead of getting.**
   Refrain: "A donut shared is twice as sweet."
   To help with the fun, Honeydip sets out a box of twelve North Pole donuts. Twelve donuts and four
   kids is three each, but Hudson says the biggest kid gets the most and Petals says the littlest
   does. They grab, they shout, a donut hits the floor and Sparkle runs off with it. Honeydip's
   pencil hovers, and for the first time she writes in the Bad column. Hudson sees her do it. He
   ends up with the biggest pile and it does not taste like anything. Petals gives away her last
   donut first; then everyone is handing donuts to everyone, Shiny gets one on an antler, and the
   kids are a team again. Last picture: all four laughing, and Hudson looking over their heads at
   the Scoop Book.

3. ***Honeydip and the Trouble in the Trash***. Meaning: **helping someone outside the house.**
   Refrain: "Kindness brings the color back."
   Hudson cannot stop thinking about the Bad column. No good list means no big present, and elf
   games are for babies anyway. "I don't even like Christmas anymore." That night, with the others
   asleep and Sparkle and Shiny curled up in Petals's slipper, he finds Honeydip on the counter
   writing in her book, and he snatches her up to throw her away. **His grab is the touch.** She
   goes grey and still in his hand before she can say a word, which is why she never dodges or
   calls for help. His anger turns to fright. He drops her in the kitchen trash and shuts the lid,
   hiding what he did more than throwing her out. (Because she now moves and talks, the stilling has
   to be instant. Never draw or write him grabbing a struggling, talking elf.) In the morning
   the other three hunt and hunt and nobody is hiding. Sparkle sniffs her out and Shiny rings his
   bell at the bin. Honeydip is grey and still. The kids lift her out with oven mitts and a soup
   ladle, never a bare hand. Hudson tells the truth. Honeydip whispers what brings elf magic back,
   and Hudson is the one who thinks of the neighbor who is alone this year. The four kids carry over
   a plate of donuts and stay to help. With each kind thing the pink creeps back: hat tip, cheeks,
   one swirly glove. Hudson says a sorry that names the thing ("I'm sorry I threw you away"), and
   she is all pink again and already hiding. The Bad column got a great deal longer in this book,
   and nobody mentions it.

4. ***Honeydip and the Full Scoop***. Meaning: **a gift you don't have to earn.**
   Refrain: "Christmas is a gift, not a prize."
   Two days to go. Hudson tries to earn his way back: he makes every bed, washes dishes nobody
   asked him to wash and counts his good deeds out loud, and it wears him out. Honeydip tells him
   gently that it does not work that way, but she is not sure herself, because Santa asked for two
   columns and both of hers are full. On Christmas Eve the kids say goodbye without a hug, and she
   flies north on Shiny with Sparkle on her lap. In front of Santa she looks at her page and tears
   it in half. "They're both. They fight, they say sorry, and they love each other. That's the full
   scoop." Santa laughs. He was never keeping score; he sent her so someone would truly know them.
   Christmas morning: before a single present is opened the four kids are in one pile, and there is
   a present for Hudson, who was sure there would not be. Honeydip has left one last thing for the
   four of them to share. **The series ends here.**

Themes for the add-story skill's "vary the source" rule: Book One, presence and joy; Book Two,
generosity and letting go of the bigger share; Book Three, love your neighbor; Book Four, grace.

## Layers for the grown-up reading aloud

Sunny's ask (2026-11-28): layer in lots of nuance so adults enjoy reading these. A four-year-old
should get a full story from the surface. The adult should get a second one underneath, and it must
never be explained. Write every book against this list.

**The second story in each character**

- **Honeydip is on her first big job, with a form that does not fit real life.** Two columns, a
  boss who wants "the full scoop", a deadline. Any adult who has filled in a review form knows her
  problem by Book Two. Her arc is the parent's arc too: she arrives to keep score and leaves
  knowing four children. Santa's last line is for the grown-up: he never wanted a tally, he wanted
  them known.
- **Hudson is ten, the last year a child is all the way inside Christmas.** He is half out the
  door and it frightens him, so he says he is too big. Adults will hear "I don't even like it
  anymore" as what it is. Never have another character diagnose him. Let Petals, who is almost
  four, simply keep saving him a seat.
- **Hudson's Book Four tally of good deeds is adult perfectionism in miniature:** counting out
  loud, doing more, getting more tired, feeling no better. Play it for comedy first.
- **The no-touch rule is about loving something without gripping it.** The kids love Honeydip all
  month with their hands behind their backs, and the goodbye in Book Four has no hug. The Ruby
  series said "a hand can hold without holding tight"; this is its quieter cousin. Parents of a
  ten-year-old will feel it.
- **The neighbor in Book Three is alone this year, and the book never says why.** Show it in the
  picture: two chairs, one coat on the hook. The kids do not ask. The adult reading will know.
- **Petals gives first, every time.** The littlest one teaches, and no one in the book notices.
- **The grown-ups of the house are just off the page and clearly tired:** a mug of coffee gone
  cold, a half-wrapped box, a roll of tape stuck to a slipper. December as parents live it.
  (Never use this to wink that the elf is pretend. See Guardrails.)

**Lines that land twice**

- The donut is the series' image for a person: **"Every donut has a hole in it. That's what makes
  it a donut."** Seed it lightly in Book Two as a joke and pay it off in Book Four when Honeydip
  tears the page, because nobody on her list is all one column.
- "The full scoop", "glazed over", "a dozen" and "one more than you need" should each work as
  plain kid words and as something drier for the adult.
- Each book gets **one** line written for the grown-up, placed mid-book and never as the last line,
  never flagged. Book Two's is the pile that "didn't taste like anything". Book Three's is that
  nobody mentions how long the Bad column got.
- The fairness fight (biggest gets most; littlest gets most) should sound exactly like the one in
  the reader's own kitchen.

**Comedy for the reader, not at the kids**

- Honeydip is a little vain and very professional: she checks her lipstick in the back of a spoon
  before a hiding place, and she takes notes during chaos.
- Sparkle and Shiny are the dry coworkers. Sparkle has no principles where donuts are concerned.
  Shiny has seen many Decembers and sighs like it.
- Use understatement. The narrator stays calm while things fall apart.

**Rewards for the twentieth read**

- The sleep count that closes each book: twenty-four, nineteen, eleven, then Christmas. (An advent
  calendar was the first idea, but the art style forbids numerals.)
- The tree gains ornaments book to book, and the snow outside gets deeper.
- The Scoop Book's two columns visibly grow, and by Book Three they are the same length.
- In Book One, Hudson lifts Petals to the high shelf. In Book Four, find a way for her to lift him.

**Rules that keep it honest**

- No lesson lines. The meaning is allowed out loud in exactly two places per book: the refrain
  (it is the "say it with me" line, and kids need it) and, in Book Four only, Honeydip's report,
  Santa's answer, and Petals's "It's a PRESENT, silly" (which sets up the refrain). Everywhere else, if an adult could underline the moral, cut it and let the
  picture carry it. The donut-hole line is a joke about donuts until Book Four makes it more.
- Leave the adult the last step of every thought.
- One of each book's four `questions` is one the grown-up will want to answer too.

## Decisions made (Sunny said "improvise and make the remaining calls", 2026-11-28)

Any of these can be changed; the cost is a text edit plus regenerating that page's narration and art.

- **Titles and refrains.** One: *Honeydip and the House of Four*, "Ready or not, we look together!"
  Two: *Honeydip and the Dozen Donuts*, "A donut shared is twice as sweet." Three: *Honeydip and
  the Trouble in the Trash*, "Kindness brings the color back." Four: *Honeydip and the Full Scoop*,
  "Christmas is a gift, not a prize."
- **Glyden** is spelled as Sunny typed it. Not yet confirmed.
- **Petals** is "four, nearly four, any day"; the narrator also teases that she is three.
- The kids may pet Sparkle and Shiny. The no-touch rule is Honeydip's alone.
- Sparkle and Shiny do not talk. Sparkle yips and sniffs; Shiny rings his bell and sighs.
- **The neighbor is Mr. Bell**, an old man next door with two chairs at his window and one coat on
  the hook. He comes to Christmas dinner in Book Four, carrying a chair of his own.
- **Hudson's big present** is a red sled, "the fast kind, for one". He gets exactly that, and puts
  all four of them on it.
- **Honeydip's last gift** is a box of thirteen donuts: "One more than you need. So there's always,
  you see, one to give to somebody." The thirteenth goes to Mr. Bell.
- **Santa** is drawn in full, warm and laughing, in Book Four spreads 8–11 and on its cover.
- Honeydip's new notebook has no columns, and she writes "Last of November. Again." She is coming back.
- Authors are Luna and Sunny on all four. If Mommy helped, change `AUTHORS` in
  `.claude/image-generation/honeydip/common.py`, rebuild, and regenerate each `cover.mp3`.
- In Book Three the kids find Honeydip the next morning; the garbage truck idea was dropped as too
  frightening.

## Characters

Sunny and Luna picked the looks from five concepts: the four kids from concept E, and Honeydip,
Sparkle and Shiny from concept A. The combined image is the series reference,
`books/honeydip-reference.webp` (master PNG in
`.claude/image-generation/261128-honeydip-family-reference-v2/`). The verbatim sheets are in
`.claude/image-generation/honeydip/common.py` and in every `book.json`; never paraphrase them.

- **Honeydip:** milk-carton tall, peachy skin, pointed ears, rosy blush circles, pink lipstick,
  honey-gold braids with pink bows; PINK Christmas hat with white brim and pom-pom; PINK tunic dress
  with white fur trim and a gold-buckled pink belt; pink-and-white striped stockings; pink curly
  boots; WHITE gloves with pink swirls, and only the gloves have swirls.
- **Sparkle:** fluffy snow-white baby arctic fox, glittery ear tips and tail, ice-blue eyes, pink nose.
- **Shiny:** toy-sized caramel reindeer, cream chest, pale fawn spots, golden antlers, pink collar
  with one gold bell, black nose.
- **Hudson, 10:** tallest by a head, straight dark hair across his forehead, forest-green hoodie.
- **Glyden, 6:** short dark hair, round dark-rimmed glasses, blue sweater.
- **Sun, 5:** soft wavy dark hair, gap-toothed grin, sunny yellow sweater.
- **Petals, almost 4:** smallest, one side braid with a lavender bow, flower clip, lavender dress.
  Never pink.
- **Mr. Bell:** white beard, gold-rimmed glasses, mustard cardigan. **Santa:** classic, kind, never stern.

## Art invariants (check every image as a SET)

1. **Honeydip's outfit:** pink hat, pink costume, white gloves with pink swirls. Swirls appear on
   the gloves only. Blush and lipstick in every image.
2. **Scale:** Honeydip is milk-carton tall next to the kids in every image. Shiny is a little
   taller than she is at the antlers, and Sparkle is smaller than both.
3. **No touching:** outside Book Three's grab, no image shows a child's bare skin touching
   Honeydip. Mitts, ladles, spoons and trays are fine.
4. **The fade (Book Three only):** her hat, costume and cheeks go pale grey, and her pose is stiff
   like a doll. The pink returns in order: hat tip, cheeks, one glove's swirls, then everything.
   Track which stage each spread is at and check the set in sequence.
5. **Four kids, exactly once each.** Name all four with their colors in every group prompt and add
   "Count them: four children" plus "no other children, no other people".
6. **The Scoop Book** has no writing the reader can see (the global style forbids letters). Show
   the two columns with a gold star at the top of one and a small grey cloud at the top of the
   other, and tally marks beneath.
7. **Donuts:** when a number matters (twelve in the box), say the number and "count them".
8. **The house, not a castle.** `.claude/image-generation/style.md` is appended to every prompt and
   leans toward indigo night and lavender stone. Every prompt must say where and when: "inside a
   cozy family home, warm lamplight, Christmas tree, bright winter morning" or "snowy night seen
   through the window". Do not edit style.md.
9. **Grown-ups** are never in frame, not even as shadows, except Santa in Book Four.
10. **Every picture is generated with the reference image attached** (`generate-honeydip.py` passes
   it through `--edit`). The prompt opens by saying the reference is a design guide only and that
   the room, poses and composition must not be copied. This held all seven characters on-model far
   better than sheets alone. Regenerate a page with
   `python .claude/image-generation/generate-honeydip.py <generator.py> <book> spread-07 --suffix v2`.
11. **The grey elf** has her own sheets in `honeydip/book3.py` (`GREY_SHEET`, `PART_SHEET`), swapped in
   per spread by `sheet_overrides`, because her normal sheet says pink.
12. **What the first art review caught (2026-11-28), so prompts can avoid it next time.** Independent
   reviewers failed 24 of 68 first-pass pictures; all were regenerated and pass.
   - The model cannot count donuts unless told the layout: "two rows, six in each, 6 + 6 = 12" worked;
     "a dozen in two rows of six" gave fifteen.
   - Two hand actions for one child ("points and shades her eyes") produced a third hand. One action each.
   - Sparkle and Shiny appear uninvited whenever the scale sentence names them. Say "no fox and no
     reindeer in this picture" on pages they are not in.
   - Honeydip grows next to Santa. Say "no taller than Santa's hand is long, shorter than his boot".
   - "At the top of a cupboard" was drawn as the top shelf inside it; say "on the flat top, above the
     doors, near the ceiling".
   - "Top step" needs "a flat landing behind, no steps going up".
   - Tally counts need "EXACTLY two", and an empty notebook needs its own sentence, because the shared
     notebook description mentions tally marks.
   - Corrections live in each spec's `prompt_fixes`, appended to the prompt as "IMPORTANT: ...".
   - Small drift left in place: the Scoop Book's cover and binding vary, the fruit bowl and kitchen
     cabinets change between pages, and Hudson's pajamas differ between night scenes.
13. **Narration** times out if it runs while images are generating. Run it afterwards, and if a run
   fails partway, delete that book's `narration/vocab` folder before retrying or the script skips it.
14. **Proofread before narrating.** An independent read of the four manuscripts found three real errors
   (a refrain with no rhyme partner, donut counts that contradicted the page before, donuts carried
   to Mr. Bell from a box the last book had emptied) and a dozen five-beat lines. Narration had to be
   re-recorded. Also: a sparkle word must appear as a whole word; "worry's" does not light up `worry`.
15. **Final consistency audit (2026-11-28).** Two more reviewers compared all 68 final pictures with the
   reference, character by character. The four kids, Honeydip, Sparkle and Shiny were on-model on every
   page. Six pages were regenerated: Santa without his glasses or wearing gloves (Book Four 8, 11),
   Hudson's Christmas pajamas (Book Four 14), Mr. Bell drawn bald (Book Three 13), and the tiny trio
   drawn too large (Book One 8, Book Two 6). Santa's and Mr. Bell's sheets now say glasses, bare hands
   and "not bald". Left as is: Petals's braid is mirrored on a few pages.
16. **Editorial pass.** An editor's read judged the scripts funny and distinct but found Book Three
   explaining itself. The fixes: nobody in the book says what brings the pink back ("Not one of them
   thought about pink"), Hudson's confession names what he did instead of diagnosing himself, and
   Honeydip leads her report with the donut line. Keep to this: when a line explains a feeling, replace
   it with what the character did.

