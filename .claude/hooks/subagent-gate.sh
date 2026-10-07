#!/usr/bin/env bash
# Puerta al terminar un implementador (ADR 0013): tipos, lint, fronteras y código muerto.
# La primera vez bloquea (exit 2) para que el agente corrija; la segunda lo deja terminar y avisa.
set -u
input=$(cat)
agent=$(jq -r '.agent_type // ""' <<<"$input")
active=$(jq -r '.stop_hook_active // false' <<<"$input")

case "$agent" in
  platlab-implementer | platlab-ui-implementer | platlab-assistant) ;;
  *) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
git status --porcelain --untracked-files=all | grep -qE '\.(ts|tsx|js|mjs|cjs)$' || exit 0

out=""
failed=""
for c in typecheck lint deps knip; do
  if ! r=$(pnpm -s "$c" 2>&1); then
    failed+=" $c"
    out+="pnpm $c falló:"$'\n'"$(tail -n 20 <<<"$r")"$'\n'
  fi
done
[ -z "$out" ] && exit 0

if [ "$active" = "true" ]; then
  jq -n --arg m "Puerta de $agent: siguen fallando:$failed" '{systemMessage: $m}'
  exit 0
fi
printf 'Antes de terminar, corrige estos fallos o, si no te corresponden, repórtalos en tu entrega:\n%s' "$out" >&2
exit 2
