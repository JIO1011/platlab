#!/usr/bin/env bash
# PreToolUse de Agent (ADR 0013, 21-10-2026): la sesión principal implementa lo delicado en línea.
# Delegar a platlab-implementer exige que el usuario cree .git/claude-delegar.
input=$(cat)
type=$(jq -r '.tool_input.subagent_type // empty' <<<"$input")
[ "$type" = platlab-implementer ] || exit 0
[ -f "${CLAUDE_PROJECT_DIR}/.git/claude-delegar" ] && exit 0
echo "Rechazado (ADR 0013): lo delicado lo implementas tú en línea. Delegar a platlab-implementer requiere que el usuario cree .git/claude-delegar. Si el contexto pesa, parte la entrega y cierra con commit antes de /clear." >&2
exit 2
