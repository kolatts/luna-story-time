"""Shared canon for Honeydip's Christmas Mission: character sheets and prompt building blocks.

Source of truth for the words is books/honeydips-christmas-mission-series-bible.md.
"""

SERIES_ID = 'honeydips-christmas-mission'
SERIES_NAME = "Honeydip's Christmas Mission"
AUTHORS = ['Luna', 'Sunny']
STYLE_STRING = ("Painterly children's storybook illustration, soft watercolor and colored-pencil texture, visible "
                "brushwork, warm golden lamplight, generous sparkle and stardust trails, big expressive eyes, gentle "
                "rounded shapes, no harsh lines, no photorealism, no text in image.")
PALETTE = {"night": "#1B1B3A", "stone": "#B7A7D4", "gold": "#E8C46A", "hair": "#F2A9C4", "scale": "#4FA3A5",
           "ink": "#2A2140"}

SHEETS = {
    'honeydip': ("Honeydip: a tiny girl Christmas elf, only about as tall as a milk carton, small enough to sit inside "
                 "a fruit bowl, with peachy skin, pointed elf ears, big warm brown eyes with long eyelashes, round rosy "
                 "pink blush circles on her cheeks, pink lipstick, and honey-gold hair in two short braids tied with "
                 "tiny pink bows. She wears a classic Christmas hat in PINK with a fluffy white brim and a white "
                 "pom-pom; a PINK long-sleeved tunic dress with a fluffy white collar, cuffs and hem and a pink belt "
                 "with a small gold buckle; pink-and-white striped stockings; pink curly-toed boots; and WHITE gloves "
                 "printed with bold pink swirls (only the gloves have swirls). She is alive, lively and expressive, "
                 "never a stiff doll unless the scene says so. Never a red suit, never a white pointed collar."),
    'sparkle': ("Sparkle: a baby arctic fox, smaller than Honeydip, small enough to curl up in a cereal bowl, with very "
                "fluffy snow-white fur, glittery silver sparkles on her ear tips and on her big bushy tail, big "
                "ice-blue eyes, a tiny pink nose and rosy cheeks. An animal on four legs, no clothes."),
    'shiny': ("Shiny: a toy-sized young reindeer, a little taller than Honeydip at the antlers, with a caramel-brown "
              "coat, a fluffy cream chest, pale fawn spots on his back, small golden antlers that gleam softly, a pink "
              "collar with one round gold bell, a soft black nose (never red, never glowing), big brown eyes and a "
              "short fluffy tail. An animal on four legs."),
    'hudson': ("Hudson: a ten-year-old boy, the tallest of the four children by a full head, warm brown skin, thick "
               "straight dark-brown hair falling across his forehead, dark brown eyes, a forest-green hoodie and dark "
               "jeans."),
    'glyden': ("Glyden: a six-year-old boy, warm brown skin, short tousled dark-brown hair, round dark-rimmed glasses, "
               "dark brown eyes, a blue knit sweater and dark trousers."),
    'sun': ("Sun: a five-year-old boy, a little smaller than Glyden, warm brown skin, soft wavy dark-brown hair, dark "
            "brown eyes, a gap-toothed grin with one front tooth missing, a sunny yellow knit sweater and dark "
            "trousers."),
    'petals': ("Petals: a girl who is almost four, the smallest of the four children, warm brown skin, long dark-brown "
               "hair in one side braid tied with a small lavender bow, a lavender flower clip in her hair, big dark "
               "brown eyes, a short-sleeved lavender dress. She never wears pink."),
    'mr-bell': ("Mr. Bell: a gentle old man, the next-door neighbor, warm brown skin, a round kind face, a short white "
                "beard, thin soft white hair combed across the top of his head (not bald) and grey-white eyebrows, small gold-rimmed glasses, a mustard-yellow cardigan over a checked shirt, "
                "brown trousers and slippers. Slow and kind, a little lonely, a soft shy smile."),
    'santa': ("Santa: a big, warm, jolly grandfatherly man with rosy cheeks, twinkling kind eyes, a huge fluffy white "
              "beard, small round gold-rimmed glasses low on his nose, bare hands with no gloves, a red suit with white fur trim, a wide black belt and black boots. Gentle and laughing, never "
              "stern."),
}
NAMES = {'honeydip': 'Honeydip', 'sparkle': 'Sparkle', 'shiny': 'Shiny', 'hudson': 'Hudson', 'glyden': 'Glyden',
         'sun': 'Sun', 'petals': 'Petals', 'mr-bell': 'Mr. Bell', 'santa': 'Santa'}

KIDS = ['hudson', 'glyden', 'sun', 'petals']
TRIO = ['honeydip', 'sparkle', 'shiny']
ALL7 = KIDS + TRIO

# Prompt building blocks ------------------------------------------------------------------------------
HOME = ("Inside a cozy family home (an ordinary house, NOT a castle, no stone walls): wooden floors, soft rugs, "
        "cream walls, a Christmas tree with warm fairy lights, snow outside the windows")
DAY = "Bright cheerful winter morning daylight"
EVE = "Cozy evening, warm golden lamplight and glowing tree lights, dark blue snowy night at the window"
TINY = ("Scale: Honeydip, Sparkle and Shiny are TINY, toy-sized, far smaller than the children; Honeydip is only as "
        "tall as a milk carton, about as tall as a child's forearm is long")
NOTOUCH = "No child's hand or skin touches Honeydip anywhere in the picture"
FOUR = ("Count them: exactly four children (tall Hudson in green, Glyden in blue with round glasses, gap-toothed Sun "
        "in yellow, little Petals in lavender with one braid), each exactly once. No other children, no adults, no "
        "other people")
NOKIDS = "No children and no people in this picture"
PJS = ("The children wear cozy pajamas in their own colors instead of their usual clothes: Hudson forest green, "
       "Glyden blue (still wearing his round glasses), Sun sunny yellow, Petals lavender")
BOOK = ("her small pink hardback notebook (a little bound book, no spiral rings), the Scoop Book, open to two columns: a tiny gold star drawn at the top of the left "
        "column and a tiny grey rain cloud drawn at the top of the right column, with small pencil tally marks and no "
        "writing, no letters")

REF_PREAMBLE = ("Create a brand-new storybook illustration of the scene described below. The attached reference image "
                "is ONLY a character design guide, showing left to right the four children Hudson (tallest, green "
                "hoodie), Glyden (blue sweater, round glasses), Sun (yellow sweater, gap-toothed) and Petals (lavender "
                "dress, braid), and on the table Sparkle the white baby arctic fox, Honeydip the tiny pink elf, and "
                "Shiny the little reindeer. Match those character designs exactly, but do NOT copy the reference's "
                "room, table, composition or poses, and draw ONLY the characters the scene names. Scene: ")
