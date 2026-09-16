#!/bin/bash
GEN="C:/Users/kolat/.claude/plugins/cache/kolatts-marketplace/imagile-dev-tools/1.1.0/skills/image-generation/scripts/generate_image.py"
D=.claude/image-generation
edit () { # $1 slug  $2 instruction
  out="$D/260916-b8-$1-edit"
  if ls "$out"/*.png >/dev/null 2>&1; then echo "SKIP $1"; return; fi
  uv run "$GEN" "$2" --edit "$D/260916-b8-$1/b8-$1.png" --no-style -s 1024x1280 -q medium -o "$out/b8-$1.png" >/dev/null 2>&1 && echo "OK $1" || echo "FAILED $1"
}
edit spread-13 "Recolor the small winged mermaid-puppy sitting on the rock beside the blue girl so that the puppy is entirely a smooth soft matte blue — fur, ears, wings and mermaid tail all the same blue as the girl's skin. Change nothing else in the image." &
edit spread-14 "Recolor the small winged mermaid-puppy in the middle of the stairs so that the puppy is entirely a smooth soft matte blue — fur, ears, wings and mermaid tail all blue, like a puppy painted gently blue. Change nothing else in the image." &
edit spread-15 "Make one of the puppy's two long curly ears a soft pale blue color, as if it had been dyed blue and is fading; the rest of the puppy stays golden-cream. Change nothing else in the image." &
wait
echo "B8 FIXES DONE"
