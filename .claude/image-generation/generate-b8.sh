#!/bin/bash
# Book 8 — Princess Moon and the Purse of Maybes
gen_one() {
  f="$1"
  GEN="C:/Users/kolat/.claude/plugins/cache/kolatts-marketplace/imagile-dev-tools/1.1.0/skills/image-generation/scripts/generate_image.py"
  slug=$(basename "$f" .txt)
  if ls .claude/image-generation/*-"$slug"/*.png >/dev/null 2>&1; then echo "SKIP $slug"; return; fi
  echo "=== $slug ==="
  uv run "$GEN" --prompt-file "$f" --slug "$slug" -s 1024x1280 -q medium >/dev/null 2>&1 \
    && echo "OK $slug" || echo "FAILED $slug"
}
export -f gen_one
ls .claude/image-generation/prompts-b8/b8-*.txt | xargs -P 4 -I{} bash -c 'gen_one "$@"' _ {}
echo "B8 ALL DONE"
