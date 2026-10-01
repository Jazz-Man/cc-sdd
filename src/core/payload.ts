export interface ParsedHookInput {
  command: string | undefined;
  hookEventName: string;
  toolName: string;
}

// Read the hook's stdin JSON into a typed shape, or null when it is not a
// hook payload we can reason about (fail-open starts here).
export function parseHookInput(raw: string): ParsedHookInput | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
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
