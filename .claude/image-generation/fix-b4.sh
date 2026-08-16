#!/bin/bash
# Book 4 art fixes: surgical edits (--edit --no-style preserves composition) + one regen.
GEN="C:/Users/kolat/AppData/Roaming/Claude/local-agent-mode-sessions/5322baff-0dc6-4e92-92be-36e8cd55f88b/79f182ea-2a7f-4da6-8e83-b24bdd44f3e9/rpm/plugin_014te7xvrVyFj3shLozv3L1S/skills/image-generation/scripts/generate_image.py"
D=.claude/image-generation
edit () { # $1 slug  $2 instruction
  out="$D/260816-b4-$1-edit"
  if ls "$out"/*.png >/dev/null 2>&1; then echo "SKIP $1"; return; fi
  echo "=== edit $1 ==="
  uv run "$GEN" "$2" --edit "$D/260816-b4-$1/b4-$1.png" --no-style -s 1024x1280 -q medium -o "$out/b4-$1.png" || echo "FAILED $1"
}
edit cover "Remove the small face and arms from the full moon so it is a plain, round, glowing full moon with soft craters and no facial features. Change nothing else in the image."
edit spread-02 "In the night sky seen through the window, replace the crescent moon with a small perfectly round glowing full moon. Change nothing else in the image."
edit spread-03 "In the night sky at the top of the image, replace the golden crescent moon with a small perfectly round glowing full moon. Change nothing else in the image."
edit spread-06 "Turn the two small children standing in the glowing archway doorway into dark featureless silhouettes — simple soft dark shapes of small children against the bright doorway light, no faces, no hair color, no clothing detail visible. Change nothing else in the image."
edit spread-07 "In the night sky seen through the tall arched window, replace the crescent moon with a small perfectly round glowing full moon. Change nothing else in the image."
edit spread-09 "Make the small painted mark on the puppy's forehead a single thin line of pure glossy black ink — jet black, not red, not brown, clearly ink and not a wound. Change nothing else in the image."
edit spread-13 "In the sky visible above through the falling rain, replace the golden crescent moon with a perfectly round glowing full moon bearing one very faint thin hairline mark. Also make the golden fairy wing the pink-haired girl holds over the puppy clearly attached to the girl's own back, one of her own wings stretched protectively over the puppy, not a separate object held in her hand. Change nothing else in the image."
edit spread-14 "In the rainy sky at the top left, replace the crescent moon with a perfectly round glowing full moon bearing one very faint thin hairline mark. Change nothing else in the image."
edit spread-16 "Move the blue soup bowl and the spoon from the floor up onto the wooden table, placing the half-finished bowl of soup with its spoon beside it on the table in front of the nearest chair, and pull that chair back from the table just a little as if someone quietly got up and left. Keep the faint water drops on the floor. Change nothing else in the image."
# Full regen for spread 8 (duplicate character + moon orb can't be edited away cleanly)
if ! ls "$D"/*-b4-spread-08-v2/*.png >/dev/null 2>&1; then
  echo "=== regen spread-08 v2 ==="
  uv run "$GEN" --prompt-file "$D/prompts-b4/b4-spread-08-v2.txt" --slug b4-spread-08-v2 -s 1024x1280 -q medium || echo "FAILED spread-08-v2"
fi
echo "B4 FIXES DONE"
