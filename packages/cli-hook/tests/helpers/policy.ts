import { parseCommand } from "../../src/core/ast.ts";
import type { Policy, PolicyCheckResult } from "../../src/core/policy.ts";

// Shared policy-test harness: parse a command, run it through a policy with a
// fake project cwd, and pull the deny reason out of the PreToolUse output.
export function policyCheck(
  policy: Policy,
  command: string,
  cwd = "/proj",
  projectRoot = cwd,
): PolicyCheckResult {
  const cmd = parseCommand(command);
  if (cmd === null) {
    return null;
  }
  return policy.check(cmd, { cwd, projectRoot });
}

export function decisionOf(result: PolicyCheckResult): "deny" | "ask" | null {
  const out = result?.hookSpecificOutput;
  if (out?.hookEventName !== "PreToolUse") {
    return null;
  }
  const d = out.permissionDecision;
  if (d === "deny" || d === "ask") {
    return d;
  }
  return null;
}

export function reasonOf(result: PolicyCheckResult): string | undefined {
  const out = result?.hookSpecificOutput;
  if (out?.hookEventName === "PreToolUse") {
    return out.permissionDecisionReason;
  }
  return undefined;
}
