#!/usr/bin/env bash
# Guardia de los implementadores antes de cada herramienta (ADR 0013).
# Ninguno confirma, sube, abre PR ni toca sus propias puertas; los agentes Sonnet no editan lo delicado.
# La sesión principal y los demás agentes pasan sin revisar.
set -u
export LC_ALL=C
input=$(cat)
agent=$(jq -r '.agent_type // ""' <<<"$input")

case "$agent" in
  platlab-implementer) sonnet="" ;;
  platlab-ui-implementer | platlab-assistant) sonnet=1 ;;
  *) exit 0 ;;
esac

case $(jq -r '.tool_name // ""' <<<"$input") in
  Bash)
    # git o gh al empezar un comando (también tras ; & | ( { o `), con opciones globales como -C <ruta>.
    close='(^|[;&|({`])[[:space:]]*([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+)*(git([[:space:]]+(-[Cc][[:space:]]+[^[:space:]]+|--?[A-Za-z][-A-Za-z]*(=[^[:space:]]+)?))*[[:space:]]+(commit|push)|gh[[:space:]]+pr[[:space:]]+(create|merge))([^-[:alnum:]_]|$)'
    if jq -r '.tool_input.command // ""' <<<"$input" | grep -qE "$close"; then
      echo "Rechazado (ADR 0013): confirmar, subir y abrir PR le corresponde a la sesión principal. Deja los cambios sin confirmar y repórtalos en tu entrega." >&2
      exit 2
    fi
    ;;
  Edit | Write | NotebookEdit)
    path=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // ""' <<<"$input")
    rel=$(realpath -m --relative-to="${CLAUDE_PROJECT_DIR:-$PWD}" -- "$path")
    if [[ $rel =~ ^\.claude/(hooks/|settings[^/]*\.json$) ]]; then
      echo "Rechazado (ADR 0013): $rel define las puertas de los subagentes; solo la cambia la sesión principal. Si una puerta te bloquea sin motivo, repórtalo." >&2
      exit 2
    fi
    if [ -n "$sonnet" ] && [[ $rel =~ ^(supabase|apps/server|packages/contracts|packages/modules)/ ]]; then
      echo "Rechazado (ADR 0013): $rel es lógica delicada y le corresponde a platlab-implementer. No lo cambies por otra vía: detente y repórtalo como «Bloqueo»." >&2
      exit 2
    fi
    ;;
esac
exit 0
