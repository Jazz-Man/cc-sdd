import { describe, expect, it } from "bun:test";
import { homedir } from "node:os";
import { filesystemPolicy } from "../src/policies/filesystem/policy.ts";
import { ALLOW, ASK, DENY } from "./fixtures/filesystem.ts";
import { decisionOf, policyCheck, reasonOf } from "./helpers/policy.ts";

describe("filesystem policy v2", () => {
  it.each(DENY)("denies %s", (command) => {
    expect(decisionOf(policyCheck(filesystemPolicy, command))).toBe("deny");
  });

  it.each(ASK)("asks on %s", (command) => {
    expect(decisionOf(policyCheck(filesystemPolicy, command))).toBe("ask");
  });

  it.each(ALLOW)("allows %s", (command) => {
    expect(policyCheck(filesystemPolicy, command)).toBeNull();
  });

  it("fail-open: unparseable command allows", () => {
    expect(policyCheck(filesystemPolicy, 'cat "')).toBeNull();
  });

  it("allows reading the repo root from a package cwd (repo-in-$HOME scenario)", () => {
    const repo = `${homedir()}/www/repo`;
    expect(
      policyCheck(
        filesystemPolicy,
        "cat ../../README.md",
        `${repo}/packages/cli-hook`,
        repo,
      ),
    ).toBeNull();
  });

  it("tier denies quote the offending token", () => {
    expect(
      reasonOf(policyCheck(filesystemPolicy, "cat /etc/passwd")),
    ).toContain("/etc/passwd");
  });

  it("the /tmp deny reason teaches ./tmp/ at the project root", () => {
    expect(reasonOf(policyCheck(filesystemPolicy, "tee /tmp/x y"))).toContain(
      "./tmp/",
    );
  });
});
