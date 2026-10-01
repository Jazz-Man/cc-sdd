import type {
  PreModelSwitchHookSpecificOutput,
  PreToolUseHookSpecificOutput,
  SyncHookJSONOutput,
} from "@anthropic-ai/claude-agent-sdk";

type HookSpecificOutput = NonNullable<SyncHookJSONOutput["hookSpecificOutput"]>;

export type Permission = "allow" | "deny" | "ask";

// Only events whose SDK output type carries permissionDecision are valid
// here (see HOOK_EVENTS in sdk.d.ts for the full event list); the SDK union
// is the source of truth, so new permission-bearing events widen this
// automatically.
export type PermissionEvent = Extract<
  HookSpecificOutput,
  { permissionDecision?: unknown }
>["hookEventName"];

// The port of ~/.claude/hooks/deny.sh's emitter: one place builds the
// hookSpecificOutput contract every policy returns. Overloads (not a
// generic Extract) because TypeScript cannot assign an object literal to a
// deferred conditional type — the if-narrowed body is the cast-free shape.
export function decision(
  permission: Permission,
  reason: string,
): { hookSpecificOutput: PreToolUseHookSpecificOutput };
export function decision(
  permission: Permission,
  reason: string,
  hookEventName: "PreModelSwitch",
): { hookSpecificOutput: PreModelSwitchHookSpecificOutput };
export function decision(
  permission: Permission,
  reason: string,
  hookEventName: PermissionEvent = "PreToolUse",
): SyncHookJSONOutput {
  const fields = {
    permissionDecision: permission,
    permissionDecisionReason: reason,
  };
  // biome-ignore lint/security/noSecrets: SDK event name, not a secret
  if (hookEventName === "PreModelSwitch") {
    return { hookSpecificOutput: { hookEventName, ...fields } };
  }
  return { hookSpecificOutput: { hookEventName: "PreToolUse", ...fields } };
}

export function deny(reason: string): {
  hookSpecificOutput: PreToolUseHookSpecificOutput;
} {
  return decision("deny", reason);
}
