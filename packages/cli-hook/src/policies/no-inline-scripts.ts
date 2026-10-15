import { baseName, type CommandUnit } from "../core/ast.ts";
import { deny } from "../core/decision.ts";
import type { Policy } from "../core/policy.ts";

const REASON =
  "Inline scripts are blocked (interpreter -e/-c/--eval, shell -c/eval, stdin-fed scripts): inline code cannot be reviewed for safety. Write the script to a file under ./tmp/ and run that file instead — project linters and checkers can then review it.";

// Long flags match exactly; short flags also match clustered spellings
// (`python -uc`, `bash -ic`).
const INTERPRETERS: Record<
  string,
  { longs: readonly string[]; shorts: readonly string[] }
> = {
  bash: { longs: [], shorts: ["c"] },
  bun: { longs: ["--eval"], shorts: ["e"] },
  dash: { longs: [], shorts: ["c"] },
  fish: { longs: [], shorts: ["c"] },
  ksh: { longs: [], shorts: ["c"] },
  node: { longs: ["--eval", "--print"], shorts: ["e", "p"] },
  osascript: { longs: [], shorts: ["e"] },
  perl: { longs: [], shorts: ["e", "E"] },
  php: { longs: [], shorts: ["r"] },
  python: { longs: [], shorts: ["c"] },
  python3: { longs: [], shorts: ["c"] },
  ruby: { longs: [], shorts: ["e"] },
  sh: { longs: [], shorts: ["c"] },
  zsh: { longs: [], shorts: ["c"] },
};

// Clustered short flags like `-uc`/`-ic` (letters only, no values).
const SHORT_FLAG_CLUSTER = /^-[A-Za-z]+$/;

// `deno` spells inline code as a subcommand: `deno eval '…'`.
const EVAL_SUBCOMMANDS = new Set(["deno"]);

// Wrappers whose argument list may carry the interpreter inline: xargs/find
// take it as data (`xargs sh -c '…'`, `find -exec bash -c '…`'); env/sudo/nohup
// prefixes also land here when the parser does not flatten them.
const WRAPPERS = new Set([
  "env",
  "find",
  "nice",
  "nohup",
  "parallel",
  "sudo",
  "time",
  "timeout",
  "xargs",
]);

function isInlineArg(lname: string, arg: string): boolean {
  const table = INTERPRETERS[lname];
  if (table === undefined) {
    return false;
  }
  if (table.longs.includes(arg)) {
    return true;
  }
  return (
    SHORT_FLAG_CLUSTER.test(arg) && table.shorts.some((s) => arg.includes(s))
  );
}

// Stdin-fed script: an interpreter invoked with no arguments reads piped or
// heredoc-fed code; a bare "-" argument names stdin explicitly.
function readsStdinScript(args: readonly string[]): boolean {
  return args.length === 0 || args.includes("-");
}

function interpreterViolates(name: string, args: readonly string[]): boolean {
  if (EVAL_SUBCOMMANDS.has(name)) {
    return args[0] === "eval";
  }
  if (INTERPRETERS[name] === undefined) {
    return false;
  }
  return args.some((arg) => isInlineArg(name, arg)) || readsStdinScript(args);
}

function wrapperViolates(lname: string, args: readonly string[]): boolean {
  if (!WRAPPERS.has(lname)) {
    return false;
  }
  return args.some((arg, i) => {
    const next = args[i + 1];
    if (next === undefined) {
      return false;
    }
    const candidate = baseName(arg.toLowerCase());
    if (candidate === "eval") {
      return true;
    }
    if (EVAL_SUBCOMMANDS.has(candidate)) {
      return next === "eval";
    }
    return (
      INTERPRETERS[candidate] !== undefined && isInlineArg(candidate, next)
    );
  });
}

function unitViolates(unit: CommandUnit): boolean {
  const lname = unit.name.toLowerCase();
  if (lname === "eval") {
    return true;
  }
  return (
    interpreterViolates(baseName(lname), unit.args) ||
    wrapperViolates(lname, unit.args)
  );
}

export const noInlineScriptsPolicy: Policy = {
  check(cmd) {
    for (const unit of cmd.units) {
      if (unitViolates(unit)) {
        return deny(REASON);
      }
    }
    return null;
  },
  name: "no-inline-scripts",
};
