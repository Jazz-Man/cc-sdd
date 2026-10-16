import type { CommandUnit } from "../core/ast.ts";
import { deny } from "../core/decision.ts";
import type { Policy } from "../core/policy.ts";

const REASON =
  "Git write operation blocked (read-only policy): only read-only git is allowed (status, diff, log, show, branch -l, tag -l, stash list, ...).";

const HOOK_REASON =
  "Git hook access blocked (read-only policy): the `git hook` subcommand reads and runs .git/hooks entries — name-based execution the filesystem policy cannot see.";

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
  "filter-branch",
  "read-tree",
  "checkout-index",
  "commit-tree",
  "fast-import",
  "pack-refs",
  "update-server-info",
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
    "-u",
    "--delete",
    "--move",
    "--copy",
    "--force",
    "--set-upstream-to",
    "--edit-description",
  ]),
  tag: new Set([
    "-a",
    "-d",
    "-s",
    "-f",
    "-u",
    "-m",
    "--message",
    "-F",
    "--file",
    "--annotate",
    "--sign",
    "--delete",
    "--force",
  ]),
};

// subcommand → mutating first args
const MUTATING_SUBS: Record<string, Set<string>> = {
  notes: new Set(["add", "append", "remove", "edit", "copy", "prune"]),
  reflog: new Set(["expire", "delete"]),
  remote: new Set(["add", "remove", "rename", "set-url", "set-head", "prune"]),
  "sparse-checkout": new Set(["set", "add", "reapply", "enable", "disable"]),
  stash: new Set([
    "push",
    "pop",
    "apply",
    "drop",
    "branch",
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
]);

const SYMBOLIC_REF_FLAGS = new Set(["-d", "--delete"]);
const REPLACE_FLAGS = new Set(["-d", "--delete", "--edit", "-g", "--graft"]);

// git's global options (man git) precede the subcommand; walking past them
// keeps `git -C . push` from hiding the subcommand behind a flag.
const GLOBAL_VALUE_FLAGS = new Set([
  "-c",
  "-C",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--super-prefix",
]);
const GLOBAL_FLAG_ONLY = new Set([
  "--bare",
  "--icase-pathspecs",
  "--glob-pathspecs",
  "--literal-pathspecs",
  "--no-literal-pathspecs",
  "--noglob-pathspecs",
  "--no-optional-locks",
  "--no-pager",
  "--no-replace-objects",
  "--paginate",
]);

interface GitCall {
  rest: string[];
  sub: string;
}

// The subcommand plus the args that follow it, or null when the leading run
// holds an unknown flag (fail-open: no opinion).
function gitCall(args: readonly string[]): GitCall | null {
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === undefined) {
      return null;
    }
    if (GLOBAL_VALUE_FLAGS.has(arg)) {
      i += 2; // the flag and its value
    } else if (!arg.startsWith("-")) {
      return { rest: args.slice(i + 1), sub: arg };
    } else if (arg.includes("=") || GLOBAL_FLAG_ONLY.has(arg)) {
      i += 1; // self-contained --opt=value, or a known flag-only global
    } else {
      return null;
    }
  }
  return null;
}

function gitUnitCall(unit: CommandUnit): GitCall | null {
  if (unit.name.toLowerCase() !== "git" || unit.args.length === 0) {
    return null;
  }
  return gitCall(unit.args);
}

// Long flags may arrive in --opt=value form; match the option part too.
function hasMutatingFlag(flags: Set<string>, args: readonly string[]): boolean {
  return args.some((a) => {
    if (flags.has(a)) {
      return true;
    }
    const eq = a.indexOf("=");
    return eq !== -1 && flags.has(a.slice(0, eq));
  });
}

// Bare `git stash` IS push, and so is a flags-only stash (`git stash -u`);
// `git stash list` / `git stash show` stay readable.
function stashViolates(subs: Set<string>, args: readonly string[]): boolean {
  const [firstArg] = args;
  const flagsOnly = args.length === 0 || firstArg?.startsWith("-") === true;
  if (flagsOnly) {
    return true;
  }
  return subs.has(firstArg ?? "");
}

// git config <key> <value> (two non-flag args) writes; flags above write too.
function configViolates(args: readonly string[]): boolean {
  if (args.some((a) => CONFIG_MUTATING_FLAGS.has(a))) {
    return true;
  }
  return args.filter((a) => !a.startsWith("-")).length >= 2;
}

function mutating(sub: string, args: readonly string[]): boolean {
  if (UNCONDITIONAL.has(sub)) {
    return true;
  }
  const [firstArg] = args;
  const flags = MUTATING_FLAGS[sub];
  if (flags !== undefined) {
    return hasMutatingFlag(flags, args) || firstArg?.startsWith("-") === false;
  }
  const subs = MUTATING_SUBS[sub];
  if (subs !== undefined) {
    if (sub === "stash") {
      return stashViolates(subs, args);
    }
    return subs.has(firstArg ?? "");
  }
  if (sub === "config") {
    return configViolates(args);
  }
  if (sub === "symbolic-ref") {
    return args.some((a) => SYMBOLIC_REF_FLAGS.has(a));
  }
  if (sub === "replace") {
    return args.some((a) => REPLACE_FLAGS.has(a));
  }
  return false;
}

export const gitReadonlyPolicy: Policy = {
  check(cmd) {
    for (const unit of cmd.units) {
      const call = gitUnitCall(unit);
      // `git hook` reads and runs .git/hooks entries BY NAME — no path
      // appears in args for the filesystem scan to catch.
      if (call !== null && call.sub.toLowerCase() === "hook") {
        return deny(HOOK_REASON);
      }
      if (call !== null && mutating(call.sub.toLowerCase(), call.rest)) {
        return deny(REASON);
      }
    }
    return null;
  },
  name: "git-readonly",
};
