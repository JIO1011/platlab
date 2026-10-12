#!/usr/bin/env bash
# Puertas de los subagentes de PlatLab (ADR 0013).
# Al empezar: guarda el contenido de lo delicado y de la interfaz con cambios (agentes Sonnet)
# y le da al revisor de UI el paquete de PlatLab.
# Al terminar: lo delicado que un agente Sonnet cambió por cualquier vía, las capturas del
# implementador de UI y tipos, lint, fronteras y código muerto. La primera vez que algo falla
# bloquea (exit 2) para que el agente corrija o reporte; la segunda lo deja terminar y avisa.
set -u
export LC_ALL=C
input=$(cat)
event=$(jq -r '.hook_event_name // ""' <<<"$input")
agent=$(jq -r '.agent_type // ""' <<<"$input")
id=$(jq -r '.agent_id // "sin-id"' <<<"$input")
active=$(jq -r '.stop_hook_active // false' <<<"$input")

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

delicate='^(supabase|apps/server|packages/contracts|packages/modules)/'
ui='^(apps/web/src|apps/console/src|packages/ui/src)/.*\.(tsx|css)$'
shots=apps/web/.impeccable/review
state=$(git rev-parse --git-path claude-agents)
base="$state/$id"

reviewer='Paquete de PlatLab. Construcción guiada por código que refina un sistema existente: no hay diseño de referencia (comp), tarjeta QUALITY BAR, .impeccable/build/state.json, spec ni semilla, y las comprobaciones que los exigen no aplican ni son hallazgos. El contrato de dirección es DESIGN.md y el ADR 0010 de docs/05_decisiones.md; PRODUCT.md enlaza a los documentos de producto. Las capturas están en apps/web/.impeccable/review/ como desktop-<pantalla>.png, mobile-<pantalla>.png y tablet-<pantalla>.png: mandan las que nombra el brief, y un par desktop/mobile de la misma pantalla es un juego completo de vistas. Las reglas del dominio están por encima del estilo: nada de UI optimista sobre existencias ni de «deshacer» en movimientos confirmados, y el color solo comunica un estado, siempre con texto.'

# «<hash> <ruta>» de cada archivo con cambios sin confirmar en lo delicado y en la interfaz.
snapshot() {
  git status --porcelain=v1 -z --untracked-files=all -- supabase apps/server packages/contracts \
    packages/modules apps/web/src apps/console/src packages/ui/src |
    while IFS= read -r -d '' entry; do
      path=${entry:3}
      [[ ${entry:0:2} == *[RC]* ]] && IFS= read -r -d '' _
      if [ -f "$path" ]; then echo "$(git hash-object -- "$path") $path"; else echo "borrado $path"; fi
    done | sort
}

case "$event:$agent" in
  SubagentStart:platlab-ui-implementer | SubagentStart:platlab-assistant)
    mkdir -p "$state" && find "$state" -type f -mtime +2 -delete
    snapshot >"$base"
    exit 0
    ;;
  SubagentStart:impeccable-finish-reviewer)
    jq -n --arg c "$reviewer" '{hookSpecificOutput: {hookEventName: "SubagentStart", additionalContext: $c}}'
    exit 0
    ;;
  SubagentStop:platlab-implementer | SubagentStop:platlab-ui-implementer | SubagentStop:platlab-assistant) ;;
  *) exit 0 ;;
esac

out=""
failed=""

# Rutas que cambiaron desde que el agente empezó (o desde su última parada), por cualquier vía.
changed=""
[ -f "$base" ] && changed=$(comm -3 "$base" <(snapshot) | sed 's/^\t//' | cut -d' ' -f2- | sort -u)

lane=$(grep -E "$delicate" <<<"$changed")
if [ -n "$lane" ]; then
  failed+=" carril ($(paste -sd' ' <<<"$lane"))"
  out+="Cambiaste lógica delicada, que le corresponde a platlab-implementer (ADR 0013):"$'\n'"$lane"$'\n'
  out+="No lo deshagas por tu cuenta: repórtalo como «Bloqueo». Si lo cambió otro agente en paralelo o una regeneración (pnpm db:types), dilo."$'\n'
fi

if [ "$agent" = platlab-ui-implementer ] && grep -qE "$ui" <<<"$changed"; then
  desktop=$(find "$shots" -maxdepth 1 -name 'desktop*.png' -newer "$base" -print -quit 2>/dev/null)
  mobile=$(find "$shots" -maxdepth 1 -name 'mobile*.png' -newer "$base" -print -quit 2>/dev/null)
  if [ -z "$desktop" ] || [ -z "$mobile" ]; then
    failed+=" capturas"
    out+="Cambiaste la interfaz y faltan capturas nuevas en $shots: al menos una desktop-<pantalla>.png y una mobile-<pantalla>.png (360–390 px) del estado real. Si no aplican, explica por qué en tu entrega."$'\n'
  fi
fi

if git status --porcelain --untracked-files=all | grep -qE '\.(ts|tsx|js|mjs|cjs)$'; then
  for c in typecheck lint deps knip; do
    if ! r=$(pnpm -s "$c" 2>&1); then
      failed+=" $c"
      out+="pnpm $c falló:"$'\n'"$(tail -n 20 <<<"$r")"$'\n'
    fi
  done
fi

if [ -z "$out" ] || [ "$active" = "true" ]; then
  # Nueva línea base por si el agente sigue con SendMessage.
  [ -f "$base" ] && snapshot >"$base"
  [ -n "$out" ] && jq -n --arg m "Puerta de $agent: siguen fallando:$failed" '{systemMessage: $m}'
  exit 0
fi
printf 'Antes de terminar, corrige estos fallos o, si no te corresponden, repórtalos en tu entrega:\n%s' "$out" >&2
exit 2
