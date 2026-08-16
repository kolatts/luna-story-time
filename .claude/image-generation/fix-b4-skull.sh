#!/bin/bash
# Author feedback: skull must read as HAIR (like spread 6), never as robe markings.
GEN="C:/Users/kolat/AppData/Roaming/Claude/local-agent-mode-sessions/5322baff-0dc6-4e92-92be-36e8cd55f88b/79f182ea-2a7f-4da6-8e83-b24bdd44f3e9/rpm/plugin_014te7xvrVyFj3shLozv3L1S/skills/image-generation/scripts/generate_image.py"
D=.claude/image-generation
INSTR="Fix the old witch's skull effect: remove the skull-face pattern from her black robe entirely — her ragged black robe must be plain, with no skull, no face, no markings of any kind. Instead, her floor-length black HAIR, hanging as a long curtain over her shoulder and down her back, catches the light so that its falling strands clearly form the shape of a large skull — two round eye sockets, a jaw, a wide grin — visibly made of individual hair strands, exactly like a skull hiding inside long black hair. Keep her pose, her face, all other characters, and everything else in the scene unchanged."
edit () { # $1 slug  $2 src-png
  out="$D/260816-b4-$1-skullfix"
  if ls "$out"/*.png >/dev/null 2>&1; then echo "SKIP $1"; return; fi
  echo "=== skullfix $1 ==="
  uv run "$GEN" "$INSTR" --edit "$2" --no-style -s 1024x1280 -q medium -o "$out/b4-$1.png" || echo "FAILED $1"
}
edit spread-08 "$D/260816-b4-spread-08-v2/b4-spread-08-v2.png"
edit spread-09 "$D/260816-b4-spread-09-edit/b4-spread-09.png"
edit spread-10 "$D/260816-b4-spread-10/b4-spread-10.png"
echo "SKULL FIXES DONE"
