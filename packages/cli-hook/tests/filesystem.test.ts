import { describe, expect, it } from "bun:test";
import { filesystemPolicy } from "../src/policies/filesystem.ts";
import { ALLOW, DENY } from "./fixtures/filesystem.ts";
import { policyCheck, reasonOf } from "./helpers/policy.ts";

const PROJECT_DIR = "/proj";

describe("filesystem policy", () => {
  describe("allows in-project commands", () => {
    it.each(ALLOW)('allows "%s"', (command) => {
      expect(policyCheck(filesystemPolicy, command)).toBeNull();
    });
  });

  describe("denies out-of-project access", () => {
    it.each(DENY)('denies "%s"', (command) => {
      expect(reasonOf(policyCheck(filesystemPolicy, command))).toContain(
        "Filesystem access outside project blocked",
      );
    });
  });

  it("allows commands unbash cannot parse (fail-open)", () => {
    expect(policyCheck(filesystemPolicy, 'cat "')).toBeNull();
  });

  it("normalizes the project cwd (trailing slashes)", () => {
    expect(
      policyCheck(filesystemPolicy, "cat file", `${PROJECT_DIR}///`),
    ).toBeNull();
    expect(
      policyCheck(filesystemPolicy, "ls /proj", `${PROJECT_DIR}/`),
    ).toBeNull();
  });

  it("emits the full wrapper message", () => {
    expect(reasonOf(policyCheck(filesystemPolicy, "cat /etc/passwd"))).toBe(
      'Filesystem access outside project blocked: absolute path "/etc/passwd" is outside the project directory. Access files within the project directory only. Ask the user or disable via /hooks.',
    );
  });

  describe("honors context.cwd", () => {
    it("allows absolute paths under the payload cwd", () => {
      expect(
        policyCheck(
          filesystemPolicy,
          "cat /payload-root/file",
          "/payload-root",
        ),
      ).toBeNull();
    });

    it("denies paths under the old project dir but outside the payload cwd", () => {
      expect(
        reasonOf(
          policyCheck(filesystemPolicy, "cat /proj/file", "/payload-root"),
        ),
      ).toBeDefined();
    });

    it("fails open when the context cwd is empty (router never sends it)", () => {
      expect(policyCheck(filesystemPolicy, "cat /etc/passwd", "")).toBeNull();
    });
  });
});
