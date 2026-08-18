#!/bin/bash
# Book 5 art fixes: surgical edits (--edit --no-style preserves composition) + three regens.
GEN="C:/Users/kolat/AppData/Roaming/Claude/local-agent-mode-sessions/5322baff-0dc6-4e92-92be-36e8cd55f88b/79f182ea-2a7f-4da6-8e83-b24bdd44f3e9/rpm/plugin_014te7xvrVyFj3shLozv3L1S/skills/image-generation/scripts/generate_image.py"
D=.claude/image-generation
edit () { # $1 slug  $2 instruction
  out="$D/260817-b5-$1-edit"
  if ls "$out"/*.png >/dev/null 2>&1; then echo "SKIP $1"; return; fi
  echo "=== edit $1 ==="
  uv run "$GEN" "$2" --edit "$D/260817-b5-$1/b5-$1.png" --no-style -s 1024x1280 -q medium -o "$out/b5-$1.png" || echo "FAILED $1"
}
edit spread-02 "In the night sky at the top left, remove the golden crescent moon entirely and fill that area with plain starry night sky and soft clouds matching the surrounding sky. Change nothing else in the image."
edit spread-11 "Make both crowns solid rich amethyst-purple metal with no gold parts — the pink-haired girl's crown and the puppy's crown both clearly purple. Also make the pink-haired girl's mermaid tail gleaming solid gold from waist to fin, like her wings. Keep her pearl necklace with its gold crescent pendant and the puppy's pearl collar exactly as they are. Change nothing else in the image."
edit spread-12 "Remove the crown from the large fluffy pink dog so the pink dog wears no crown at all. Make the pink-haired girl's crown solid rich amethyst-purple metal with no gold parts, and make her mermaid tail and the tan puppy's mermaid tail gleaming solid gold. Keep both pearl necklaces exactly as they are. Change nothing else in the image."
edit spread-14 "Two fixes. First: the tall hooded grey figure at the top left must wear a smooth dark carved storm-cloud-creature mask with two small carved fangs at its frown, round dark eye-holes, a thin hairline crack down one cheek, and a small tipped-sideways crescent scratched above the brow — clearly a carved mask, never a real face. Second: make the pink-haired girl's crown solid rich amethyst-purple metal with no gold parts. Change nothing else in the image."
edit spread-16 "Two fixes. First: the figure standing in the dark doorway must not show any face — give her a smooth dark carved storm-cloud-creature mask with two small carved fangs at its frown, round dark eye-holes, a thin hairline crack down one cheek, and a small tipped-sideways crescent scratched above the brow, plus a charcoal-grey hooded cloak and long storm-grey hair. Second: there are two long-black-haired girls near the bottom right — keep the one writing in an open book at the table, and remove the OTHER one seated on the chair at the far bottom right corner with her hands folded in her lap, leaving her wooden chair empty and the tiled floor visible, matching the surroundings. Change nothing else in the image."
for v2 in spread-05-v2 spread-13-v2 spread-15-v2; do
  if ls "$D"/*-b5-$v2/*.png >/dev/null 2>&1; then echo "SKIP $v2"; continue; fi
  echo "=== regen $v2 ==="
  uv run "$GEN" --prompt-file "$D/prompts-b5/b5-$v2.txt" --slug "b5-$v2" -s 1024x1280 -q medium || echo "FAILED $v2"
done
echo "B5 FIXES DONE"
