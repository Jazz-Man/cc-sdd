import { describe, expect, it } from "bun:test";
import { gitReadonlyPolicy } from "../src/policies/git-readonly.ts";
import { ALLOW, DENY } from "./fixtures/git-readonly.ts";
import { decisionOf, policyCheck, reasonOf } from "./helpers/policy.ts";

const REASON =
  "Git write operation blocked (read-only policy): only read-only git is allowed (status, diff, log, show, branch -l, tag -l, stash list, ...).";

const HOOK_REASON =
  "Git hook access blocked (read-only policy): the `git hook` subcommand reads and runs .git/hooks entries — name-based execution the filesystem policy cannot see.";

const check = (command: string) => policyCheck(gitReadonlyPolicy, command);

describe("git-readonly policy", () => {
  it.each(DENY)("denies %s", (command) => {
    expect(decisionOf(check(command))).toBe("deny");
  });

  it.each(ALLOW)("allows %s", (command) => {
    expect(check(command)).toBeNull();
  });

  it("the hook deny carries the dedicated hook reason", () => {
    expect(reasonOf(check("git hook run pre-commit"))).toBe(HOOK_REASON);
  });

  it("write ops carry the generic read-only reason", () => {
    expect(reasonOf(check("git push"))).toBe(REASON);
  });
});
