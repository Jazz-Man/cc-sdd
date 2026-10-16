import process from "node:process";
import type { SyncHookJSONOutput } from "@cc-sdd/agent-types";
import { parseCommand } from "./core/ast.ts";
import { toHookInput } from "./core/payload.ts";
import type { Policy } from "./core/policy.ts";
import { filesystemPolicy } from "./policies/filesystem/policy.ts";
import { gitReadonlyPolicy } from "./policies/git-readonly.ts";
import { noDepsPolicy } from "./policies/no-deps.ts";
import { noInlineScriptsPolicy } from "./policies/no-inline-scripts.ts";

// Registry order is fixed: the first non-null decision wins. Absolutes
// (deny-only hard rules) run before the filesystem zone policy.
const POLICIES: Policy[] = [
  noDepsPolicy, // absolutes first: deny-only, owner's hard rules
  gitReadonlyPolicy,
  noInlineScriptsPolicy,
  filesystemPolicy, // v2: deny | ask, runs last
];

export function runHook(input: unknown): SyncHookJSONOutput | null {
  try {
    const payload = toHookInput(input);
    if (payload === null) {
      return null;
    }
    if (payload.hookEventName !== "PreToolUse") {
      return null;
    }
    if (payload.toolName !== "Bash" || payload.command === undefined) {
      return null;
    }
    const cmd = parseCommand(payload.command);
    if (cmd === null) {
      return null;
    }
    const projectRoot = process.env.CLAUDE_PROJECT_DIR ?? payload.cwd;
    for (const policy of POLICIES) {
      const result = policy.check(cmd, {
        cwd: payload.cwd,
        projectRoot,
      });
      if (result !== null) {
        return result;
      }
    }
    return null;
  } catch {
    return null; // fail-open: a broken guard must not break Bash usage
  }
}
