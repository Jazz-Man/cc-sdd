import { describe, expect, it } from "bun:test";
import type { PreModelSwitchHookSpecificOutput } from "@anthropic-ai/claude-agent-sdk";
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

  it("narrows the event through the SDK union", () => {
    const out: { hookSpecificOutput: PreModelSwitchHookSpecificOutput } =
      // biome-ignore lint/security/noSecrets: SDK event name, not a secret
      decision("ask", "why", "PreModelSwitch");
    expect(out).toEqual({
      hookSpecificOutput: {
        // biome-ignore lint/security/noSecrets: SDK event name, not a secret
        hookEventName: "PreModelSwitch",
        permissionDecision: "ask",
        permissionDecisionReason: "why",
      },
    });
  });
});
