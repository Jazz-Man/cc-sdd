import { describe, expect, it } from "bun:test";
import { parseHookInput } from "../src/core/payload.ts";

const PAYLOAD = {
  hook_event_name: "PreToolUse",
  tool_input: { command: "git push" },
  tool_name: "Bash",
};

describe("parseHookInput", () => {
  it("parses a Bash PreToolUse payload", () => {
    expect(parseHookInput(JSON.stringify(PAYLOAD))).toEqual({
      command: "git push",
      hookEventName: "PreToolUse",
      toolName: "Bash",
    });
  });

  it("keeps a defined-but-empty command (not undefined)", () => {
    const parsed = parseHookInput(
      JSON.stringify({ ...PAYLOAD, tool_input: { command: "" } }),
    );
    expect(parsed?.command).toBe("");
  });

  it("treats a non-string command field as absent", () => {
    const parsed = parseHookInput(
      JSON.stringify({ ...PAYLOAD, tool_input: { command: 42 } }),
    );
    expect(parsed?.command).toBeUndefined();
  });

  it("returns null for invalid JSON", () => {
    expect(parseHookInput("{not json")).toBeNull();
  });

  it("returns null when event or tool name is missing", () => {
    expect(parseHookInput("{}")).toBeNull();
    expect(parseHookInput(JSON.stringify({ tool_name: "Bash" }))).toBeNull();
  });
});
