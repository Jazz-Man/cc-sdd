import { describe, expect, it } from "bun:test";
import { decision, deny } from "../src/core/decision.ts";

describe("decision", () => {
  it("deny() builds the PreToolUse deny contract", () => {
    expect(deny("boom")).toEqual({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "boom",
      },
    });
  });

  it("defaults to PreToolUse and passes the permission through", () => {
    expect(decision("ask", "why")).toEqual({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason: "why",
      },
    });
  });
});
