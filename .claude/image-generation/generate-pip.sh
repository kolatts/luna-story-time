#!/bin/bash
GEN="/home/runner/.claude/plugins/cache/kolatts-marketplace/imagile-dev-tools/1.4.0/skills/image-generation/scripts/generate_image.py"
P=.claude/image-generation/prompts-pip
for f in $P/pip-cover.txt $P/pip-spread-*.txt; do
  slug=$(basename "$f" .txt)
  if ls .claude/image-generation/*-"$slug"/*.png >/dev/null 2>&1; then echo "SKIP $slug"; continue; fi
  echo "=== $slug ==="
  uv run "$GEN" --prompt-file "$f" --slug "$slug" -s 1024x1280 -q medium || echo "FAILED $slug"
done
echo "ALL DONE"
