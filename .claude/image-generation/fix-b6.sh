#!/bin/bash
# Book 6 art fixes: surgical edits (--edit --no-style preserves composition) + one regen.
GEN="C:/Users/kolat/AppData/Roaming/Claude/local-agent-mode-sessions/5322baff-0dc6-4e92-92be-36e8cd55f88b/79f182ea-2a7f-4da6-8e83-b24bdd44f3e9/rpm/plugin_014te7xvrVyFj3shLozv3L1S/skills/image-generation/scripts/generate_image.py"
D=.claude/image-generation
edit () { # $1 slug  $2 instruction
  out="$D/260819-b6-$1-edit"
  if ls "$out"/*.png >/dev/null 2>&1; then echo "SKIP $1"; return; fi
  echo "=== edit $1 ==="
  uv run "$GEN" "$2" --edit "$D/260819-b6-$1/b6-$1.png" --no-style -s 1024x1280 -q medium -o "$out/b6-$1.png" || echo "FAILED $1"
}
edit spread-11 "In the night sky seen through the open doorway, replace the golden crescent moon with a perfectly round full moon, softly glowing, matching the surrounding starry sky. Change nothing else in the image."
edit spread-13 "Remove the second blue-skinned girl on the left side of the image entirely (the smaller one holding a little brown pot) and fill that area with night garden — rose bushes, lavender, and deep indigo sky with soft gold sparkles, matching the surroundings. Keep the central blue girl holding the cracking, sprouting pot exactly as she is. Change nothing else in the image."
edit spread-14 "In the night sky at the top left, replace the golden crescent moon with a perfectly round full moon, softly glowing against the stars. Change nothing else in the image."
if ls "$D"/*-b6-spread-10-v2/*.png >/dev/null 2>&1; then echo "SKIP spread-10-v2"; else
  echo "=== regen spread-10-v2 ==="
  uv run "$GEN" --prompt-file "$D/prompts-b6/b6-spread-10-v2.txt" --slug "b6-spread-10-v2" -s 1024x1280 -q medium || echo "FAILED spread-10-v2"
fi
echo "B6 FIXES DONE"
