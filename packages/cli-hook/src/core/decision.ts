import type { PreToolUseHookSpecificOutput } from "@cc-sdd/agent-types";

export type Permission = "allow" | "deny" | "ask";

// The port of ~/.claude/hooks/deny.sh's emitter: one place builds the
// hookSpecificOutput contract every policy returns. PreToolUse only — the
// guard is a PreToolUse hook and no other event carries a decision here.
export function decision(
  permission: Permission,
  reason: string,
): { hookSpecificOutput: PreToolUseHookSpecificOutput } {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: permission,
      permissionDecisionReason: reason,
    },
  };
}

export function deny(reason: string): {
  hookSpecificOutput: PreToolUseHookSpecificOutput;
} {
  return decision("deny", reason);
}
