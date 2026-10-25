#!/usr/bin/env bash
# Creates an isolated checkout for one feature, so several chats can work
# side by side without touching each other's files.
#
#   scripts/new-worktree.sh search-matching 3001
#
# -> .claude/worktrees/search-matching on branch feature/search-matching,
#    with .env.local copied and dependencies installed.
# (`claude --worktree <name>` does the same and copies .env.local via
#  .worktreeinclude, but you still need `npm ci` inside it.)
set -euo pipefail

name="${1:?usage: scripts/new-worktree.sh <feature-name> [port]}"
port="${2:-3001}"
root="$(git rev-parse --show-toplevel)"
dir="$root/.claude/worktrees/$name"

git -C "$root" worktree add -b "feature/$name" "$dir" main
if [ -f "$root/.env.local" ]; then
  cp "$root/.env.local" "$dir/.env.local"
else
  echo "warning: no .env.local in $root — copy .env.local.example and fill it in" >&2
fi
(cd "$dir" && npm ci --no-audit --no-fund)

echo
echo "Ready. Start the app for this feature with:"
echo "  cd $dir && PORT=$port npm run dev"
