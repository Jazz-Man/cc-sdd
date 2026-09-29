import type { SyncHookJSONOutput } from "@anthropic-ai/claude-agent-sdk";
import { parseCommand } from "./core/ast.ts";
import { parseHookInput } from "./core/payload.ts";
import type { Policy } from "./core/policy.ts";
import { filesystemPolicy } from "./policies/filesystem.ts";
import { gitReadonlyPolicy } from "./policies/git-readonly.ts";
import { noDepsPolicy } from "./policies/no-deps.ts";

// Fixed registry order (owner's priority): first non-null decision wins (spec §4).
const POLICIES: Policy[] = [filesystemPolicy, noDepsPolicy, gitReadonlyPolicy];

export function runHook(raw: string): SyncHookJSONOutput | null {
  try {
    const payload = parseHookInput(raw);
    if (payload === null) return null;
    if (payload.hookEventName !== "PreToolUse") return null;
    if (payload.toolName !== "Bash" || payload.command === undefined) {
      return null;
    }
    const cmd = parseCommand(payload.command);
    if (cmd === null) return null;
    for (const policy of POLICIES) {
      const result = policy.check(cmd);
      if (result !== null) return result;
    }
    return null;
  } catch {
    return null; // fail-open: a broken guard must not break Bash usage
  }
}

if (import.meta.main) {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk: string) => {
    raw += chunk;
  });
  process.stdin.on("end", () => {
    const result = runHook(raw);
    if (result !== null) {
      process.stdout.write(`${JSON.stringify(result)}\n`);
    }
  });
}
