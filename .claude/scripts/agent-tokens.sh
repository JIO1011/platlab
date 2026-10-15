#!/usr/bin/env bash
# Uso de tokens de un agente (ADR 0013, 14-10-2026): una sola vez, al final, nunca en un monitor.
# Uso: agent-tokens.sh <transcripción.jsonl>; imprime solo contadores.
f="$1"
jq -rs '
  [ .[] | select(.type=="assistant" and .message.usage != null) | {id: .message.id, u: .message.usage} ]
  | unique_by(.id) as $m
  | ($m | length) as $turns
  | ($m | map(.u.input_tokens // 0) | add // 0) as $in
  | ($m | map(.u.cache_creation_input_tokens // 0) | add // 0) as $cw
  | ($m | map(.u.cache_read_input_tokens // 0) | add // 0) as $cr
  | ($m | map(.u.output_tokens // 0) | add // 0) as $out
  | ($m | last | .u | (.input_tokens // 0) + (.cache_creation_input_tokens // 0) + (.cache_read_input_tokens // 0)) as $ctx
  | "turnos=\($turns) contexto_actual=\($ctx) entrada=\($in) cache_escrita=\($cw) cache_leida=\($cr) salida=\($out)"
' "$f"
