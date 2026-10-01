import { describe, expect, it } from "bun:test";
import { parseHookInput } from "../src/core/payload.ts";

const PAYLOAD = {
  // biome-ignore lint/style/useNamingConvention: wire-format key (hook payload contract)
  hook_event_name: "PreToolUse",
  // biome-ignore lint/style/useNamingConvention: wire-format key (hook payload contract)
  tool_input: { command: "git push" },
  // biome-ignore lint/style/useNamingConvention: wire-format key (hook payload contract)
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
      // biome-ignore lint/style/useNamingConvention: wire-format key (hook payload contract)
      JSON.stringify({ ...PAYLOAD, tool_input: { command: "" } }),
    );
    expect(parsed?.command).toBe("");
  });

  it("treats a non-string command field as absent", () => {
    const parsed = parseHookInput(
      // biome-ignore lint/style/useNamingConvention: wire-format key (hook payload contract)
      JSON.stringify({ ...PAYLOAD, tool_input: { command: 42 } }),
    );
    expect(parsed?.command).toBeUndefined();
  });

  it("returns null for invalid JSON", () => {
    expect(parseHookInput("{not json")).toBeNull();
  });

  it("returns null when event or tool name is missing", () => {
    expect(parseHookInput("{}")).toBeNull();
    // biome-ignore lint/style/useNamingConvention: wire-format key (hook payload contract)
    expect(parseHookInput(JSON.stringify({ tool_name: "Bash" }))).toBeNull();
  });
});
