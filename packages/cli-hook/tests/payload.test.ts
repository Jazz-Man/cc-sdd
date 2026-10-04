import { describe, expect, it } from "bun:test";
import { toHookInput } from "../src/core/payload.ts";

const PAYLOAD = {
  hook_event_name: "PreToolUse",
  tool_input: { command: "git push" },
  tool_name: "Bash",
};

describe("toHookInput", () => {
  it("narrows a Bash PreToolUse payload", () => {
    expect(toHookInput(PAYLOAD)).toEqual({
      command: "git push",
      hookEventName: "PreToolUse",
      toolName: "Bash",
    });
  });

  it("keeps a defined-but-empty command (not undefined)", () => {
    const parsed = toHookInput({ ...PAYLOAD, tool_input: { command: "" } });
    expect(parsed?.command).toBe("");
  });

  it("treats a non-string command field as absent", () => {
    const parsed = toHookInput({ ...PAYLOAD, tool_input: { command: 42 } });
    expect(parsed?.command).toBeUndefined();
  });

  it("returns null for non-object input", () => {
    const numericInput = 42;
    expect(toHookInput(numericInput)).toBeNull();
    expect(toHookInput("not json")).toBeNull();
    expect(toHookInput(null)).toBeNull();
    expect(toHookInput([1, 2])).toBeNull();
  });

  it("returns null when event or tool name is missing", () => {
    expect(toHookInput({})).toBeNull();
    expect(toHookInput({ tool_name: "Bash" })).toBeNull();
    expect(toHookInput({ hook_event_name: "PreToolUse" })).toBeNull();
  });
});
