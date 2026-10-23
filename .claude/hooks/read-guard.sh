#!/usr/bin/env bash
# Lectura acotada de código (ADR 0013): leer sin rango un .ts o .tsx de más de 300 líneas se rechaza,
# con Read o con cat por Bash, en la sesión principal y en los agentes. Se ubica con codebase-memory
# (search_graph, get_code_snippet) o se lee solo el rango (offset y limit, o sed -n).
set -u
input=$(cat)
reject() {
  echo "Rechazado (ADR 0013): $1 tiene $2 líneas. Ubica la función con codebase-memory (get_code_snippet) o lee solo el rango." >&2
  exit 2
}
check() {
  case "$1" in *.ts | *.tsx) ;; *) return 0 ;; esac
  local file=$1
  [ -f "$file" ] || file="${CLAUDE_PROJECT_DIR:-.}/$1"
  [ -f "$file" ] || return 0
  local lines
  lines=$(wc -l <"$file")
  [ "$lines" -le 300 ] || reject "$1" "$lines"
}
case $(jq -r '.tool_name // ""' <<<"$input") in
  Read)
    [ -z "$(jq -r '.tool_input.offset // .tool_input.limit // empty' <<<"$input")" ] || exit 0
    check "$(jq -r '.tool_input.file_path // ""' <<<"$input")"
    ;;
  Bash)
    # Los argumentos de cada cat del comando (tras ; & | o al inicio).
    command=$(jq -r '.tool_input.command // ""' <<<"$input")
    while read -r file; do check "$file"; done < <(
      grep -oE '(^|[;&|]|&&)[[:space:]]*cat([[:space:]]+[^;&|<>[:space:]]+)+' <<<"$command" |
        sed -E 's/^[;&|[:space:]]*cat//' | tr ' ' '\n' | grep -E '\.tsx?$' || true
    )
    ;;
esac
exit 0
