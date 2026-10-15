import { describe, expect, it } from "bun:test";
import { noInlineScriptsPolicy } from "../src/policies/no-inline-scripts.ts";
import { ALLOW, DENY } from "./fixtures/no-inline-scripts.ts";
import { policyCheck, reasonOf } from "./helpers/policy.ts";

const REASON =
  "Inline scripts are blocked (interpreter -e/-c/--eval, shell -c/eval, stdin-fed scripts): inline code cannot be reviewed for safety. Write the script to a file under ./tmp/ and run that file instead — project linters and checkers can then review it.";

const check = (command: string) => policyCheck(noInlineScriptsPolicy, command);

describe("no-inline-scripts policy", () => {
  it.each(DENY)("denies %s", (command) => {
    expect(reasonOf(check(command))).toBe(REASON);
  });

  it.each(ALLOW)("allows %s", (command) => {
    expect(check(command)).toBeNull();
  });
});
