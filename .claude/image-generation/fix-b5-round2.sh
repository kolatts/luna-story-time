#!/bin/bash
GEN="C:/Users/kolat/AppData/Roaming/Claude/local-agent-mode-sessions/5322baff-0dc6-4e92-92be-36e8cd55f88b/79f182ea-2a7f-4da6-8e83-b24bdd44f3e9/rpm/plugin_014te7xvrVyFj3shLozv3L1S/skills/image-generation/scripts/generate_image.py"
D=.claude/image-generation
edit2 () { # $1 src-png  $2 out-dir  $3 instruction
  if ls "$2"/*.png >/dev/null 2>&1; then echo "SKIP $2"; return; fi
  echo "=== edit2 $2 ==="
  uv run "$GEN" "$3" --edit "$1" --no-style -s 1024x1280 -q medium -o "$2/$(basename $1)" || echo "FAILED $2"
}
edit2 "$D/260817-b5-spread-12-edit/b5-spread-12.png" "$D/260817-b5-spread-12-edit2" "Add a small solid amethyst-purple metal crown on top of the tan puppy's head, matching the style of the pink-haired girl's purple crown. Change nothing else in the image."
edit2 "$D/260817-b5-spread-14-edit/b5-spread-14.png" "$D/260817-b5-spread-14-edit2" "Make the pink-haired girl's mermaid tail gleaming solid gold from waist to fin, and make the tan puppy's mermaid tail gleaming solid gold as well. Keep both purple crowns and both pearl necklaces exactly as they are. Change nothing else in the image."
edit2 "$D/260817-b5-spread-13-v2/b5-spread-13-v2.png" "$D/260817-b5-spread-13-v2-edit" "Make the pink-haired girl's tall crown solid amethyst-purple metal with no gold parts, and make her mermaid tail gleaming solid gold from waist to fin, and make the tan puppy's mermaid tail gleaming solid gold as well. Keep the puppy's small purple crown and both pearl necklaces exactly as they are. Change nothing else in the image."
echo "ROUND2 DONE"
