#!/bin/sh
# sdd-skill-gate.sh - PreToolUse(Skill) + UserPromptExpansion gate for /sdd:* invocations.
#
# Two invocation paths, one check:
#   - the model calls the Skill tool with an sdd-namespaced skill ->
#     PreToolUse fires with tool_input carrying the skill name;
#   - the user types /sdd:<name> directly -> PreToolUse does NOT fire on
#     that path; UserPromptExpansion fires with command_name instead.
# Both normalize to the bare skill name and run bin/sdd-phase, which
# verifies the skill's phase precondition from beans (read-only).
# A failing precondition blocks the invocation: exit 2, and the sdd-phase
# diagnosis (stderr) becomes the block/denial reason - it names the fixing
# /sdd:<name> command. Non-sdd skills and commands pass through (exit 0).
set -eu

input=$(cat)

skill=""
command_name=$(printf '%s\n' "$input" | sed -n 's/.*"command_name":[ ]*"\([^"]*\)".*/\1/p')
if [ -n "$command_name" ]; then
    case $command_name in
        sdd:*) skill=${command_name#sdd:} ;;
    esac
else
    tool_skill=$(printf '%s\n' "$input" | sed -n 's/.*"skill":[ ]*"\([^"]*\)".*/\1/p')
    case $tool_skill in
        sdd:*) skill=${tool_skill#sdd:} ;;
    esac
fi
[ -n "$skill" ] || exit 0

plugin_root=${CLAUDE_PLUGIN_ROOT:-$(dirname "$0")/..}
diag=$("$plugin_root/bin/sdd-phase" "$skill" 2>&1) || {
    printf '%s\n' "$diag" >&2
    exit 2
}
exit 0
