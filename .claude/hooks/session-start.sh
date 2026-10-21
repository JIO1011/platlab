#!/usr/bin/env bash
# SessionStart (ADR 0013): la orquestación y, si la sesión anterior dejó uno, su handoff, una sola vez.
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
cat .claude/orquestacion.md
handoff=$(git rev-parse --git-path claude-handoff.md 2>/dev/null) || exit 0
if [ -f "$handoff" ]; then
  printf '\n# Handoff de la sesión anterior\n\n'
  cat "$handoff"
  mv "$handoff" "$handoff.usado"
fi
