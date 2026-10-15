import { describe, expect, it } from "bun:test";
import { gitReadonlyPolicy } from "../src/policies/git-readonly.ts";
import { ALLOW, DENY } from "./fixtures/git-readonly.ts";
import { policyCheck, reasonOf } from "./helpers/policy.ts";

const REASON =
  "Git write operation blocked (read-only policy): only read-only git is allowed (status, diff, log, show, branch -l, tag -l, stash list, ...). Ask the user to run write operations manually.";

const check = (command: string) => policyCheck(gitReadonlyPolicy, command);

describe("git-readonly policy", () => {
  it.each(DENY)("denies %s", (command) => {
    expect(reasonOf(check(command))).toBe(REASON);
  });

  it.each(ALLOW)("allows %s", (command) => {
    expect(check(command)).toBeNull();
  });
});
