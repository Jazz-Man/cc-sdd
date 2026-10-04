import type { SyncHookJSONOutput } from "@anthropic-ai/claude-agent-sdk";
import type { ParsedCommand } from "./ast.ts";

export type PolicyCheckResult = SyncHookJSONOutput | null;

// A policy inspects a parsed Bash command and either decides (deny/ask/allow
// JSON out) or returns null for "no opinion". Policies are pure functions;
// the router (main.ts) owns the order and the first decision wins.
export interface Policy {
  check: (cmd: ParsedCommand) => PolicyCheckResult;
  name: string;
}
