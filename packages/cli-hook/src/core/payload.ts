import type { PreToolUseHookInput } from "@cc-sdd/agent-types";

function stringField(
  ti: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const v = ti[key];
    if (typeof v === "string") {
      return v;
    }
  }
  return undefined;
}

export interface ParsedHookInput {
  command: string | undefined;
  // Field availability mirrors the SDK contract: BaseHookInput.cwd is a
  // required string on every hook payload.
  cwd: PreToolUseHookInput["cwd"];
  filePath: string | undefined; // tool_input.file_path / notebook_path
  hookEventName: string;
  toolName: string;
}

// Narrow the runtime-parsed hook payload (Bun.stdin.json() output) into a
// typed shape, or null when it is not a hook payload we can reason about
// (fail-open starts here). Nothing parses text: the runtime already did.
export function toHookInput(data: unknown): ParsedHookInput | null {
  if (data === null || typeof data !== "object") {
    return null;
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.hook_event_name !== "string") {
    return null;
  }
  if (typeof obj.tool_name !== "string") {
    return null;
  }
  let command: string | undefined;
  let filePath: string | undefined;
  const toolInput = obj.tool_input;
  if (toolInput !== null && typeof toolInput === "object") {
    const ti = toolInput as Record<string, unknown>;
    command = stringField(ti, "command");
    filePath = stringField(ti, "file_path", "notebook_path");
  }
  // cwd is a required field of the SDK's PreToolUseHookInput (BaseHookInput);
  // a payload without a usable cwd is not a payload we can reason about.
  const { cwd } = obj;
  if (typeof cwd !== "string" || cwd === "") {
    return null;
  }
  return {
    command,
    cwd,
    filePath,
    hookEventName: obj.hook_event_name,
    toolName: obj.tool_name,
  };
}
