#!/bin/sh
# sdd-write-guard.sh - PreToolUse(Edit|Write) tracker-integrity guard.
#
# Enforces the plugin's tracking invariants at write time:
#   - .beans/** files are beans-CLI territory - agents change bean state
#     via `beans update`, never by editing the tracker files (the human
#     may, outside Claude);
#   - documents under .sdd/ never gain checkbox lists - the plan and its
#     progress live in the bean graph (statuses + blockedByIds edges),
#     never in documents.
# A violation blocks the write: exit 2, stderr carries the reason.
# Everything else passes through (exit 0). Read-only itself.
set -eu

input=$(cat)

file_path=$(printf '%s\n' "$input" | sed -n 's/.*"file_path":[ ]*"\([^"]*\)".*/\1/p')
[ -n "$file_path" ] || exit 0

case "$file_path" in
    */.beans/*)
        echo "sdd write-guard: $file_path is a bean file - bean state changes go through the beans CLI (beans update), never file edits" >&2
        exit 2
        ;;
esac

case "$file_path" in
    */.sdd/*)
        if printf '%s\n' "$input" | grep -q -- '- \[ \]\|- \[x\]'; then
            echo "sdd write-guard: checkbox list written to $file_path - the plan and its progress live in the bean graph (statuses + blockedByIds), never in documents" >&2
            exit 2
        fi
        ;;
esac

exit 0
