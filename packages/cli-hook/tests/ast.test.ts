import { describe, expect, it } from "bun:test";
import { parseCommand } from "../src/core/ast.ts";

describe("parseCommand", () => {
  it("walks best-effort ASTs from malformed input (unbash never throws)", () => {
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

  it("collects units from nested substitution scripts (deduped, raw text out of args)", () => {
    expect(parseCommand("echo $(git push)")?.units).toEqual([
      { args: [], name: "echo" },
      { args: ["push"], name: "git" },
    ]);
  });

  it("drops only WHOLE-WORD substitutions from args; spliced ones ride for the fail-closed gate", () => {
    expect(
      parseCommand('echo "pre $(git push) post" `cat x`')?.units[0]?.args,
    ).toEqual(["pre $(git push) post"]);
  });

  it("keeps plain variable args intact (fail-closed gate depends on them)", () => {
    expect(parseCommand("cat $HOME/foo ${HOME}/bar")?.units[0]?.args).toEqual([
      "$HOME/foo",
      "${HOME}/bar",
    ]);
  });
});

describe("parseCommand (redirects, words, functionDefs)", () => {
  it("keeps redirect targets out of unit args but records them", () => {
    const parsed = parseCommand("git log > $(mktemp)");
    expect(parsed?.units.map((u) => u.name)).toEqual(["git", "mktemp"]);
    expect(parsed?.units[0]?.args).toEqual(["log"]);
    expect(parsed?.redirects).toEqual([{ operator: ">", target: "$(mktemp)" }]);
  });

  it("keeps equal-valued distinct commands (substitution + real command)", () => {
    expect(parseCommand("FOO=$(git status) git status")?.units).toHaveLength(2);
  });

  it("keeps repeated identical sibling commands as two units (identity, not value)", () => {
    expect(parseCommand("git status && git status")?.units).toHaveLength(2);
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

  it("collects inline function definition names (every form)", () => {
    expect(parseCommand("function fb { fb | fb & }; fb")?.functionDefs).toEqual(
      ["fb"],
    );
    expect(parseCommand("a(){ b& }; b(){ a& }; a")?.functionDefs).toEqual([
      "a",
      "b",
    ]);
    expect(parseCommand("ls -la")?.functionDefs).toEqual([]);
  });
});
