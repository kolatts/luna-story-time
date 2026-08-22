#!/bin/bash
# Book 7 art fixes: surgical edits (--edit --no-style preserves composition) + two regens.
GEN="C:/Users/kolat/AppData/Roaming/Claude/local-agent-mode-sessions/5322baff-0dc6-4e92-92be-36e8cd55f88b/79f182ea-2a7f-4da6-8e83-b24bdd44f3e9/rpm/plugin_014te7xvrVyFj3shLozv3L1S/skills/image-generation/scripts/generate_image.py"
D=.claude/image-generation
edit () { # $1 slug  $2 instruction
  out="$D/260822-ce7-$1-edit"
  if ls "$out"/*.png >/dev/null 2>&1; then echo "SKIP $1"; return; fi
  echo "=== edit $1 ==="
  uv run "$GEN" "$2" --edit "$D/260822-ce7-$1/ce7-$1.png" --no-style -s 1024x1280 -q medium -o "$out/ce7-$1.png" || echo "FAILED $1"
}
regen () { # $1 slug-v2
  if ls "$D"/*-"$1"/*.png >/dev/null 2>&1; then echo "SKIP $1"; return; fi
  echo "=== regen $1 ==="
  uv run "$GEN" --prompt-file "$D/prompts-ce7/ce7-$1.txt" --slug "ce7-$1" -s 1024x1280 -q medium || echo "FAILED $1"
}
edit spread-03 "In the night sky seen through the round cottage window, replace the crescent moon with a perfectly round full moon, softly glowing pale silver against the stars. Change nothing else in the image."
edit spread-11 "Remove the small handwritten signature-like squiggle in the bottom right corner of the image entirely, painting over it with the same stone balcony floor and shadow that surrounds it. Change nothing else in the image."
regen spread-06-v2
regen spread-07-v2
echo "CE7 FIXES DONE"
