#!/usr/bin/env bash
# PreToolUse guard (Edit|Write|MultiEdit|NotebookEdit): refuse to modify the MAIN
# checkout's source while a feature worktree exists. This repo's workflow (AGENTS.md
# "Dev flow — one feature, one worktree") is strictly one-feature-one-worktree — the main
# checkout must never be edited directly during feature work. This catches the classic
# slip: the shell cwd resets to the main checkout and an absolute /…/hack/app/… path gets
# edited by mistake.
#
# Portable: paths are derived from git, nothing is hardcoded. A file inside a linked
# worktree resolves to that worktree's toplevel (git treats it as its own working tree),
# so only edits whose toplevel IS the main worktree are guarded, and only when at least
# one linked worktree exists.

input="$(cat)"
fp="$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.filePath // .tool_input.notebook_path // empty' 2>/dev/null)"
[ -z "$fp" ] && exit 0

# git context is the file's parent dir (exists for both existing and new files);
# `git -C` needs a directory, never a file path.
ctx="$(dirname "$fp")"

root="$(git -C "$ctx" rev-parse --show-toplevel 2>/dev/null)"
[ -z "$root" ] && exit 0

# The main worktree is the first entry of `worktree list`.
main="$(git -C "$root" worktree list --porcelain 2>/dev/null | awk '/^worktree /{print $2; exit}')"
[ -z "$main" ] && exit 0

# File lives inside a LINKED worktree (its toplevel differs from main) → allow.
[ "$root" != "$main" ] && exit 0

# Only guard the source trees; everything else in main (AGENTS.md, docs/, .claude/, …) is fine.
rel="${fp#"$main"/}"
case "$rel" in
  app/*|spec/*|lib/*|config/*|db/*|bin/*|scripts/*|content/*|public/*) ;;
  *) exit 0 ;;
esac

# Only block when a feature worktree actually exists (>1 total worktrees).
count="$(git -C "$main" worktree list --porcelain 2>/dev/null | grep -c '^worktree ')"
[ "${count:-0}" -le 1 ] && exit 0

reason="Blocked edit to the MAIN checkout: ${rel}. A feature worktree is active — edit the copy under .claude/worktrees/<name>/${rel} instead. Feature work must never touch the main checkout (see AGENTS.md, \"Dev flow\")."
printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":%s}}\n' \
  "$(printf '%s' "$reason" | jq -R -s '.')"
exit 0
