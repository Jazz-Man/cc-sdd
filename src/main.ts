import process from "node:process";
import { runHook } from "./run-hook.ts";

// Stdin entrypoint for the PreToolUse hook: read the payload, print the
// decision (if any), exit silently when the command is allowed.
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
