#!/usr/bin/env bash
# Guardia de los implementadores antes de cada herramienta (ADR 0013).
# Ninguno confirma, sube, abre PR ni toca sus propias puertas o la etapa; los agentes Sonnet no editan lo delicado.
# En la etapa de cambios (sin .git/claude-fase = cierre), ninguno corre pruebas.
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
    command=$(jq -r '.tool_input.command // ""' <<<"$input")
    if grep -qE "$close" <<<"$command"; then
      echo "Rechazado (ADR 0013): confirmar, subir y abrir PR le corresponde a la sesión principal. Deja los cambios sin confirmar y repórtalos en tu entrega." >&2
      exit 2
    fi
    if grep -q 'claude-fase' <<<"$command"; then
      echo "Rechazado (ADR 0013): la etapa de la entrega la marca la sesión principal." >&2
      exit 2
    fi
    # pnpm/npm/yarn/npx con un script o binario de pruebas, o vitest, supabase test y playwright test sueltos.
    tests='(^|[;&|({`"'"'"'])[[:space:]]*([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+)*((pnpm|npm|yarn|npx|pnpx)([[:space:]]+[^;&|[:space:]]+)*[[:space:]]+(test|test:db|test:int|e2e|check|vitest|playwright[[:space:]]+test)|([^;&|[:space:]]*/)?(vitest|supabase[[:space:]]+test|playwright[[:space:]]+test))([^-[:alnum:]_:]|$)'
    fase=$(cd "${CLAUDE_PROJECT_DIR:-.}" && cat "$(git rev-parse --git-path claude-fase)" 2>/dev/null)
    if [ "$fase" != cierre ] && grep -qE "$tests" <<<"$command"; then
      echo "Rechazado (ADR 0013): en la etapa de cambios nadie corre pruebas hasta que el usuario apruebe. Escríbelas o ajústalas y repórtalas en tu entrega." >&2
      exit 2
    fi
    ;;
  Edit | Write | NotebookEdit)
    path=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // ""' <<<"$input")
    rel=$(realpath -m --relative-to="${CLAUDE_PROJECT_DIR:-$PWD}" -- "$path")
    if [[ $rel =~ ^(\.claude/(hooks/|settings[^/]*\.json$)|\.git/) ]]; then
      echo "Rechazado (ADR 0013): $rel define las puertas de los subagentes; solo la cambia la sesión principal. Si una puerta te bloquea sin motivo, repórtalo." >&2
      exit 2
    fi
    if [ -n "$sonnet" ] && [[ $rel =~ ^(supabase|apps/server|packages/contracts|packages/modules)/ ]]; then
      echo "Rechazado (ADR 0013): $rel es lógica delicada y le corresponde a la sesión principal. No lo cambies por otra vía: detente y repórtalo como «Bloqueo»." >&2
      exit 2
    fi
    ;;
esac
exit 0
