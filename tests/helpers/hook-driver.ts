import { deny, findViolation } from "../../src/index.ts";

// Mirrors the (not-yet-enabled) stdin entrypoint of src/index.ts: read the
// PreToolUse JSON payload from stdin and emit the deny decision on stdout.
let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk: string) => {
  raw += chunk;
});
process.stdin.on("end", () => {
  let payload: {
    hook_event_name?: string;
    tool_name?: string;
    tool_input?: { command?: string };
  };
  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    process.exit(0);
  }
  if (payload.hook_event_name !== "PreToolUse") process.exit(0);
  if (payload.tool_name !== "Bash") process.exit(0);
  if (payload.tool_input?.command === undefined) process.exit(0);

  const reason = findViolation(payload.tool_input.command);
  if (reason) {
    process.stdout.write(`${JSON.stringify(deny(reason))}\n`);
  }
  process.exit(0);
});
