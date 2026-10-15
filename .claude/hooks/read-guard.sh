#!/usr/bin/env bash
# Lectura acotada de código (ADR 0013, 14-10-2026): un Read sin rango de un .ts o .tsx de más de
# 300 líneas se rechaza, en la sesión principal y en los agentes. Se ubica con codebase-memory
# (search_graph, get_code_snippet) o se lee solo el rango con offset y limit.
set -u
input=$(cat)
file=$(jq -r '.tool_input.file_path // ""' <<<"$input")
case "$file" in *.ts | *.tsx) ;; *) exit 0 ;; esac
[ -z "$(jq -r '.tool_input.offset // .tool_input.limit // empty' <<<"$input")" ] || exit 0
[ -f "$file" ] || exit 0
lines=$(wc -l <"$file")
if [ "$lines" -gt 300 ]; then
  echo "Rechazado (ADR 0013): $file tiene $lines líneas. Ubica la función con codebase-memory (get_code_snippet) o lee solo el rango con offset y limit." >&2
  exit 2
fi
