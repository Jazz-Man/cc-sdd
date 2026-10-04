import { describe, expect, it } from "bun:test";
import { parseCommand } from "../src/core/ast.ts";

describe("parseCommand", () => {
  it("walks best-effort ASTs from malformed input (unbash reports errors, never throws)", () => {
    expect(parseCommand('cat "')?.words).toContain("cat");
  });

  it("collects units across && and pipelines", () => {
    expect(parseCommand("cd /tmp && git push")?.units).toEqual([
      { args: ["/tmp"], name: "cd" },
      { args: ["push"], name: "git" },
    ]);
  });

  it("collects units across newline separators", () => {
    expect(parseCommand("git add .\ngit push")?.units).toEqual([
      { args: ["add", "."], name: "git" },
      { args: ["push"], name: "git" },
    ]);
  });

  it("keeps the command name under an env-prefix assignment", () => {
    expect(parseCommand("FOO=1 git push origin")?.units).toEqual([
      { args: ["push", "origin"], name: "git" },
    ]);
  });

  it("collects units from nested substitution scripts", () => {
    expect(parseCommand("echo $(git push)")?.units.map((u) => u.name)).toEqual([
      "echo",
      "git",
    ]);
  });

  it("keeps quoted args as single values", () => {
    expect(parseCommand("git commit -m 'a b'")?.units[0]?.args).toEqual([
      "commit",
      "-m",
      "a b",
    ]);
  });

  it("flat words include quoted-literal fragments", () => {
    expect(parseCommand('cat "/et"c/passwd')?.words).toContain("/et");
  });

  it("flat words include arithmetic substitution scripts", () => {
    expect(parseCommand("(( $(cat /etc/passwd) ))")?.words).toContain(
      "/etc/passwd",
    );
  });
});
