# Ruby and the Dragon Bonds — series bible

Read this before writing or illustrating any Ruby book. It outranks per-book prompts.
Dreamed up by Luna; written by Luna, Sunny, and Mommy.

## Canon

- **Riverlight** is Ruby's kingdom. Ruby hatched from a pearly egg as a talking, walking girl. She
  counts her age in days (zero in Book One, eight in Book Two).
- **There is no king.** Ruby's papa passed away before Book One. This is backstory only and is
  **never said or shown on the page**; no book mentions the king. (Retcon, 2026-10-10: Book One
  spread 2 used to have "the king, her papa" speak; the cook speaks those lines now.)
- **The cook** is the kind grown-up who helps Ruby learn (pancakes, patience and math). Always
  off-frame so far.
- **Noir** (stepmother) and **War** (stepsister, about eight) live in their own kingdom across the
  far hills, in a charcoal-and-violet palace with a dark tower. They want Ruby's big chair and any
  dragon they can keep. **Black Hole**, their dragon, swallows things into a purple-rimmed swirl and
  sneezes them back out when tickled. A sneeze is how he's beaten every time so far.
- **The silver mark** on Ruby's forehead means she will lead Riverlight. It tingles when a dragon
  egg is ready, or nearly ready, nearby.
- **Bonds**: a dragon chooses Ruby, presses its nose to her palm, and her dress transforms. The
  bond is not a leash. Dragons choose to stay. A bond travels with Ruby even when the dragon stays
  home.
  - Flame (fire): ember-red dress, warm fire in her hands. Book One.
  - Pearl (water): waterfall-blue dress with pearl-white trim, bubbles in her hands, a breathing
    bubble underwater. Book One.
  - Sparks and Crackle (lightning, twin sisters, ONE shared bond): dress half lemon yellow, half
    shining silver, gold sparkles crackling at her fingertips. A dragon's own sparks never hurt the
    one it has chosen. Book Two.
- **The big chair** (the throne) is still too big. Ruby will grow into it when she's ready.

## Books

1. *Ruby and the Egg Nobody Owned*: refrain "A hand can hold without holding tight." Ruby frees
   Pearl's egg from Noir's chest, puts down her crown to catch it, and lets Pearl choose.
2. *Ruby, Sparks and Crackle*: refrain "Good things hatch when they're ready." The Thunder Egg
   has always been in the hilltop pond between the kingdoms (it was the "thunder" at the end of
   Book One). Ruby waits underwater while Noir and War demand it hatch. The twins zap the water,
   the sparks tickle Black Hole, and his sneeze soaks Noir and War.

## Open threads

- The cook's name and story.
- Where dragon eggs come from, and how many more Ruby's mark will find.
- What Noir does next. She has now lost two dragons to Ruby.

## Art invariants (check every image as a SET)

1. **Ruby's crown** is always the same: a tiny simple gold crown with exactly three ball-tipped
   points and one small round ruby-red gem on the middle point, about one third the width of her
   head. It is never a tiara, never five points, never jeweled all over, never large, and that
   applies on her head, on a rug, falling, or on a table. Reference:
   `books/ruby-crown-and-mark-reference.webp`.
2. **Ruby's forehead mark** is always the same: a small flat silver upright side-view dragon
   silhouette (head at top, curled tail at bottom), centered just above the eyebrows, about as tall
   as one of her eyes. It is never a fleur-de-lis, starburst, gem or filigree.
3. Ruby is always a four-year-old human child: no wings, horns, tail or scales. Her
   transformations change only her dress and hand magic.
4. Twins: always name species and colors per dragon ("the YELLOW baby dragon with silver eyes",
   "the SILVER baby dragon with yellow eyes"). The word "twins" alone renders two identical human
   girls.
5. No king, no father figure and no adult guardian shadows in any Ruby art.

**Fixing drift:** for crown/mark drift, run a masked `--edit` with the page PNG plus the reference
image as a second input, masked to the crown/forehead only, then composite just the masked region
back onto the original. Keep masks off the eyes, because the model shifts faces slightly, and a
mask that covers an eye leaves a ghost eye or eyebrow.
