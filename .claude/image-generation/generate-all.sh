#!/bin/bash
GEN="C:/Users/kolat/AppData/Roaming/Claude/local-agent-mode-sessions/5322baff-0dc6-4e92-92be-36e8cd55f88b/79f182ea-2a7f-4da6-8e83-b24bdd44f3e9/rpm/plugin_014te7xvrVyFj3shLozv3L1S/skills/image-generation/scripts/generate_image.py"
P=.claude/image-generation/prompts
for f in $P/spread-*.txt $P/cover.txt; do
  slug=$(basename "$f" .txt)
  if ls .claude/image-generation/*-"$slug"/*.png >/dev/null 2>&1; then echo "SKIP $slug"; continue; fi
  echo "=== $slug ==="
  uv run "$GEN" --prompt-file "$f" --slug "$slug" -s 1024x1280 -q medium || echo "FAILED $slug"
done
if ! ls .claude/image-generation/*-hero/*.png >/dev/null 2>&1; then
  echo "=== hero ==="
  uv run "$GEN" --prompt-file $P/hero.txt --slug hero -s 1792x1024 -q high || echo "FAILED hero"
fi
echo "ALL DONE"
