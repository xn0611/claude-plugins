#!/usr/bin/env bash
# Link every skill (except deprecated/) into ~/.claude/skills and ~/.agents/skills.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
for DEST in "$HOME/.claude/skills" "$HOME/.agents/skills"; do
  mkdir -p "$DEST"
  while IFS= read -r -d '' md; do
    src="$(dirname "$md")"; name="$(basename "$src")"; target="$DEST/$name"
    if [ -e "$target" ] && [ ! -L "$target" ]; then echo "skip $target (real folder)"; continue; fi
    ln -sfn "$src" "$target"; echo "linked $name -> $src ($DEST)"
  done < <(find "$REPO/skills" -name SKILL.md -not -path '*/deprecated/*' -print0)
done
