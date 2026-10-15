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
  return gitReadonlyPolicy.check(cmd, { cwd: "/proj" });
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
  // global options before the subcommand must not hide it
  "git -C . push",
  "git -C subdir rebase",
  "git --no-pager push",
  "git -c core.hooksPath=/dev/null commit",
  "git --git-dir=.git add x",
  "git --work-tree=. commit -m x",
  // stash with flags only is still a push
  "git stash -u",
  "git stash -m wip",
  // table gaps found in review
  "git filter-branch --tree-filter 'rm x' HEAD",
  "git branch --set-upstream-to=origin/x",
  "git branch -u origin/x",
  "git read-tree HEAD",
  "git checkout-index -a",
  "git commit-tree HEAD",
  "git fast-import",
  "git pack-refs --all",
  "git update-server-info",
  "git reflog expire --all",
  "git reflog delete HEAD@{0}",
  "git sparse-checkout set src",
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
  "git -C . status",
  "git --no-pager log",
  "git -c x=y status",
  "git reflog",
  "git reflog show HEAD",
  "git sparse-checkout list",
  "git remote get-url origin",
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
