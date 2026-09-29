import { deny } from "../core/decision.ts";
import type { Policy } from "../core/policy.ts";

const REASON =
  "Git write operation blocked (read-only policy): only read-only git is allowed (status, diff, log, show, branch -l, tag -l, stash list, ...). Ask the user to run write operations manually.";

const UNCONDITIONAL = new Set([
  "add",
  "commit",
  "push",
  "pull",
  "fetch",
  "merge",
  "rebase",
  "reset",
  "revert",
  "cherry-pick",
  "am",
  "apply",
  "rm",
  "mv",
  "clean",
  "init",
  "clone",
  "gc",
  "prune",
  "update-ref",
  "update-index",
  "worktree",
  "bundle",
  "checkout",
  "switch",
  "restore",
  "bisect",
]);

// subcommand → mutating flags; a BARE FIRST arg (branch/tag creation) also
// denies. Bare `git branch` / `git tag` (listing) have no args → allow.
const MUTATING_FLAGS: Record<string, Set<string>> = {
  branch: new Set([
    "-d",
    "-D",
    "-m",
    "-M",
    "-c",
    "-C",
    "-f",
    "--delete",
    "--move",
    "--copy",
    "--force",
  ]),
  tag: new Set([
    "-a",
    "-d",
    "-s",
    "-f",
    "-u",
    "--annotate",
    "--sign",
    "--delete",
    "--force",
  ]),
};

// subcommand → mutating first args; stash with NO args is push → deny
const MUTATING_SUBS: Record<string, Set<string>> = {
  notes: new Set(["add", "append", "remove", "edit", "copy", "prune"]),
  remote: new Set(["add", "remove", "rename", "set-url", "set-head", "prune"]),
  stash: new Set([
    "push",
    "pop",
    "apply",
    "drop",
    "clear",
    "save",
    "store",
    "create",
  ]),
};

const CONFIG_MUTATING_FLAGS = new Set([
  "-e",
  "--global",
  "--local",
  "--system",
  "--add",
  "--unset",
  "--unset-all",
  "--replace-all",
  "--file",
  "--get-url",
]);

const SYMBOLIC_REF_FLAGS = new Set(["-d", "--delete"]);
const REPLACE_FLAGS = new Set(["-d", "--delete", "--edit", "-g", "--graft"]);

function mutating(sub: string, args: string[]): boolean {
  if (UNCONDITIONAL.has(sub)) return true;
  const flags = MUTATING_FLAGS[sub];
  if (flags !== undefined) {
    const first = args[0];
    return (
      args.some((a) => flags.has(a)) ||
      (first !== undefined && !first.startsWith("-"))
    );
  }
  const subs = MUTATING_SUBS[sub];
  if (subs !== undefined) {
    return sub === "stash" && args.length === 0
      ? true
      : subs.has(args[0] ?? "");
  }
  if (sub === "config") {
    if (args.some((a) => CONFIG_MUTATING_FLAGS.has(a))) return true;
    return args.filter((a) => !a.startsWith("-")).length >= 2;
  }
  if (sub === "symbolic-ref")
    return args.some((a) => SYMBOLIC_REF_FLAGS.has(a));
  if (sub === "replace") return args.some((a) => REPLACE_FLAGS.has(a));
  return false;
}

export const gitReadonlyPolicy: Policy = {
  check(cmd) {
    for (const unit of cmd.units) {
      if (unit.name !== "git" || unit.args.length === 0) continue;
      if (mutating(unit.args[0] ?? "", unit.args.slice(1))) return deny(REASON);
    }
    return null;
  },
  name: "git-readonly",
};
