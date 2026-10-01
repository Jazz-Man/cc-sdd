import { describe, expect, it } from "bun:test";
import { parseCommand } from "../src/core/ast.ts";
import { gitReadonlyPolicy } from "../src/policies/git-readonly.ts";

const REASON =
  "Git write operation blocked (read-only policy): only read-only git is allowed (status, diff, log, show, branch -l, tag -l, stash list, ...). Ask the user to run write operations manually.";

const check = (command: string) => {
  const cmd = parseCommand(command);
  if (cmd === null) {
    return null;
  }
  return gitReadonlyPolicy.check(cmd);
};

const DENY = [
  "git add .",
  "git commit -m x",
  "git push",
  "git push origin main",
  "cd subdir && git push",
  "git status; git add .",
  "FOO=1 git push",
  "git checkout -b feature",
  "git switch main",
  "git restore file.ts",
  "git branch -d old",
  "git branch feature",
  "git tag v1.0",
  "git tag -d v1.0",
  "git stash",
  "git stash push",
  "git stash drop",
  "git remote add origin url",
  "git config user.name X",
  "git config --global user.name X",
  "git notes add -m x",
  "git symbolic-ref -d HEAD",
  "git replace -g abc",
  "echo $(git push)",
  "git add . && git commit",
  "git bisect start",
  "GIT PUSH",
  "Git Add .",
  "git COMMIT -m x",
  "git tag -m msg v1.0",
  "git tag -F notes v1.0",
  "git stash branch newbr",
];

const ALLOW = [
  "git status",
  "git diff",
  "git log --oneline",
  "git show HEAD",
  "git branch",
  "git branch -l",
  "git branch -v",
  "git branch -l main",
  "git tag",
  "git tag -l",
  "git stash list",
  "git stash show",
  "git remote -v",
  "git remote show origin",
  "git config user.name",
  "git config --get user.name",
  "git config --list",
  "gh pr create",
  "gitk --all",
  "cat README.md",
  "echo 'git add .'",
  "grep 'git push' log",
  "GIT STATUS",
];

describe("git-readonly policy", () => {
  it.each(DENY)("denies %s", (command) => {
    const out = check(command)?.hookSpecificOutput;
    let reason: string | undefined;
    if (out?.hookEventName === "PreToolUse") {
      reason = out.permissionDecisionReason;
    }
    expect(reason).toBe(REASON);
  });

  it.each(ALLOW)("allows %s", (command) => {
    expect(check(command)).toBeNull();
  });
});
