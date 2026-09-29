import { describe, expect, it } from "bun:test";
import { runHook } from "../src/main.ts";

const MAIN = `${import.meta.dir}/../src/main.ts`;

function bashPayload(command: string) {
  return {
    hook_event_name: "PreToolUse",
    tool_input: { command },
    tool_name: "Bash",
  };
}

function decisionOf(result: ReturnType<typeof runHook>) {
  const out = result?.hookSpecificOutput;
  return out?.hookEventName === "PreToolUse"
    ? out.permissionDecision
    : undefined;
}

describe("runHook (unit)", () => {
  it("denies git writes through the router", () => {
    expect(decisionOf(runHook(JSON.stringify(bashPayload("git push"))))).toBe(
      "deny",
    );
  });

  it("returns the FIRST policy's reason on dual violations", () => {
    const result = runHook(
      JSON.stringify(bashPayload("npm install /etc/passwd")),
    );
    const out = result?.hookSpecificOutput;
    expect(
      out?.hookEventName === "PreToolUse"
        ? out.permissionDecisionReason
        : undefined,
    ).toContain("Filesystem access outside project blocked");
  });

  it("denies filesystem escapes", () => {
    expect(
      decisionOf(runHook(JSON.stringify(bashPayload("cat /etc/passwd")))),
    ).toBe("deny");
  });

  it("allows ordinary commands", () => {
    expect(runHook(JSON.stringify(bashPayload("ls -la")))).toBeNull();
  });

  it("ignores non-Bash tools and non-PreToolUse events", () => {
    expect(
      runHook(
        JSON.stringify({ ...bashPayload("git push"), tool_name: "Read" }),
      ),
    ).toBeNull();
    expect(
      runHook(
        JSON.stringify({
          ...bashPayload("git push"),
          hook_event_name: "PostToolUse",
        }),
      ),
    ).toBeNull();
  });

  it("fails open on invalid JSON and missing/empty command", () => {
    expect(runHook("{not json")).toBeNull();
    expect(
      runHook(
        JSON.stringify({
          hook_event_name: "PreToolUse",
          tool_input: {},
          tool_name: "Bash",
        }),
      ),
    ).toBeNull();
    expect(runHook(JSON.stringify(bashPayload("")))).toBeNull();
  });
});

describe("runHook (e2e via spawned main.ts)", () => {
  async function spawnHook(
    raw: string,
  ): Promise<{ code: number | null; stdout: string }> {
    const proc = Bun.spawn(["bun", MAIN], {
      env: { ...Bun.env, CLAUDE_PROJECT_DIR: "/proj" },
      stderr: "pipe",
      stdin: new Blob([raw]),
      stdout: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const code = await proc.exited;
    return { code, stdout };
  }

  it("emits nothing and exits 0 for an allowed command", async () => {
    const { code, stdout } = await spawnHook(
      JSON.stringify(bashPayload("ls -la")),
    );
    expect(code).toBe(0);
    expect(stdout).toBe("");
  });

  it("emits the deny JSON for a git write", async () => {
    const { code, stdout } = await spawnHook(
      JSON.stringify(bashPayload("git push")),
    );
    expect(code).toBe(0);
    const output = JSON.parse(stdout) as {
      hookSpecificOutput: {
        permissionDecision: string;
        permissionDecisionReason: string;
      };
    };
    expect(output.hookSpecificOutput.permissionDecision).toBe("deny");
    expect(output.hookSpecificOutput.permissionDecisionReason).toContain(
      "read-only policy",
    );
  });

  it("emits nothing for invalid JSON", async () => {
    const { code, stdout } = await spawnHook("{not json");
    expect(code).toBe(0);
    expect(stdout).toBe("");
  });
});
