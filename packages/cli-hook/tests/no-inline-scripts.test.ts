import { describe, expect, it } from "bun:test";
import { noInlineScriptsPolicy } from "../src/policies/no-inline-scripts.ts";
import { ALLOW, DENY, FUNCTIONS } from "./fixtures/no-inline-scripts.ts";
import { policyCheck, reasonOf } from "./helpers/policy.ts";

const REASON =
  "Inline scripts are blocked (interpreter -e/-c/--eval, shell -c/eval, stdin-fed scripts): inline code cannot be reviewed for safety. Write the script to a file under ./tmp/ and run that file instead — project linters and checkers can then review it.";

const FUNCTION_REASON =
  "Inline function definitions are blocked: shell code belongs in a file — write the script under ./tmp/ at the project root and run that file. This also covers every fork-bomb signature (a function that spawns itself or another defined function).";

const check = (command: string) => policyCheck(noInlineScriptsPolicy, command);

describe("no-inline-scripts policy", () => {
  it.each(DENY)("denies %s", (command) => {
    expect(reasonOf(check(command))).toBe(REASON);
  });

  it.each(ALLOW)("allows %s", (command) => {
    expect(check(command)).toBeNull();
  });

  it.each(FUNCTIONS)("denies inline function definition %s", (command) => {
    expect(reasonOf(check(command))).toBe(FUNCTION_REASON);
  });
});
