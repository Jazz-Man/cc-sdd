export interface ParsedHookInput {
  command: string | undefined;
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
  const toolInput = obj.tool_input;
  let command: string | undefined;
  if (
    toolInput !== null &&
    typeof toolInput === "object" &&
    typeof (toolInput as Record<string, unknown>).command === "string"
  ) {
    command = (toolInput as Record<string, unknown>).command as string;
  }
  return {
    command,
    hookEventName: obj.hook_event_name,
    toolName: obj.tool_name,
  };
}
