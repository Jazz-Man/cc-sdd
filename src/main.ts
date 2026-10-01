import process from "node:process";
import { runHook } from "./run-hook.ts";

// Stdin entrypoint for the PreToolUse hook: the runtime parses the payload
// (Bun.stdin.json()), the router decides, the decision (if any) goes to
// stdout. Any rejection — malformed or empty stdin — is a silent allow.
try {
  const input: unknown = await Bun.stdin.json();
  const result = runHook(input);
  if (result !== null) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  }
} catch {
  // fail-open: a broken payload must not break Bash usage
}
