#!/bin/bash
GEN="C:/Users/kolat/AppData/Roaming/Claude/local-agent-mode-sessions/5322baff-0dc6-4e92-92be-36e8cd55f88b/79f182ea-2a7f-4da6-8e83-b24bdd44f3e9/rpm/plugin_014te7xvrVyFj3shLozv3L1S/skills/image-generation/scripts/generate_image.py"
for f in .claude/image-generation/prompts-ce7/ce7-*.txt; do
  slug=$(basename "$f" .txt)
  if ls .claude/image-generation/*-"$slug"/*.png >/dev/null 2>&1; then echo "SKIP $slug"; continue; fi
  echo "=== $slug ==="
  uv run "$GEN" --prompt-file "$f" --slug "$slug" -s 1024x1280 -q medium || echo "FAILED $slug"
done
echo "CE7 ALL DONE"
