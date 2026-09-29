import { type ParsedCommand, parseCommand } from "../core/ast.ts";
import { deny } from "../core/decision.ts";
import type { Policy } from "../core/policy.ts";

// classify()'s throws; lets findViolation tell a deny reason apart from a
// failure inside the walk (lazy getters can throw while parsing on access).
class Violation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Violation";
  }
}

const SAFE_DEVICES = new Set([
  "/dev/null",
  "/dev/stdin",
  "/dev/stdout",
  "/dev/stderr",
  "/dev/zero",
  "/dev/urandom",
  "/dev/random",
]);

// Variable references that resolve outside the project (unbash keeps parameter
// text literal in Word.value): $HOME/${HOME} plus their operator spellings
// (${HOME:0}, ${HOME^}, ${HOME+x}, ...), and the other outside-resolving env
// vars. ${#HOME} (length) does not match - the # intervenes.
const OUTSIDE_VAR = /\$\{?(HOME|OLDPWD|TMPDIR|TMP)(?![A-Za-z0-9_])/;

function isUnderProject(absPath: string, projectDir: string): boolean {
  return absPath === projectDir || absPath.startsWith(`${projectDir}/`);
}

// Does a relative path escape above the project root via .. ?
function relativeEscapes(value: string): boolean {
  let depth = 0;
  for (const part of value.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      depth--;
      if (depth < 0) return true;
    } else {
      depth++;
    }
  }
  return false;
}

// Classify a single word. Throws a Violation with the deny reason when the
// word reaches outside the project directory.
//
// Classify a single word. Throws a Violation with the deny reason when the
// word reaches outside the project directory.
function classify(raw: string, projectDir: string): void {
  if (raw === "") {
    return;
  }

  // The variable check runs on the RAW token: = -bearing operator spellings
  // (${HOME:=x}, ${HOME?=x}) would discard the variable name in the split
  // below. Any match in the decomposed value implies a match here, so this
  // one test covers both.
  if (OUTSIDE_VAR.test(raw)) {
    throw new Violation(
      `environment-variable path "${raw}" resolves outside the project`,
    );
  }

  // Argument tokens that embed a path are decomposed: the RHS of the first =
  // is classified (tar --file=/tmp/x.tar, env DIR=/etc ls), then one leading
  // @ is stripped (curl -d @/etc/passwd, curl -F f=@/etc/hosts).
  // Trade-off, accepted: prose mentions (echo foo=/etc) deny too.
  const eq = raw.indexOf("=");
  let value = eq === -1 ? raw : raw.slice(eq + 1);
  if (value.startsWith("@")) {
    value = value.slice(1);
  }

  // 1. Absolute path
  if (value.startsWith("/")) {
    if (SAFE_DEVICES.has(value)) {
      return;
    }
    if (isUnderProject(value, projectDir)) {
      return;
    }
    throw new Violation(
      `absolute path "${value}" is outside the project directory`,
    );
  }

  // 2. Tilde (home directory)
  if (value.startsWith("~")) {
    throw new Violation(
      `home-directory path "${value}" resolves outside the project`,
    );
  }

  // 3. Relative path whose .. components escape above the project root
  if (relativeEscapes(value)) {
    throw new Violation(
      `parent-directory path "${value}" escapes the project root`,
    );
  }
}

const WRAPPER =
  "Filesystem access outside project blocked: %s. Access files within the project directory only. Ask the user or disable via /hooks.";

function violationIn(words: string[], projectDir: string): string | null {
  const project = projectDir.replace(/\/+$/, "");
  try {
    for (const value of words) {
      classify(value, project);
    }
  } catch (e) {
    return e instanceof Violation ? e.message : null;
  }
  return null;
}

// Inspect a parsed command string. Returns the deny reason, or null to allow.
// Fail-open by policy: if unbash cannot parse the command, or the walk itself
// fails, there is nothing to reason about and the command is allowed.
//
// Static-analysis boundary (documented, deliberate): commands that build
// their paths at runtime inside interpreters (eval "...", sh -c '...',
// python3 -c "...", heredoc bodies), file:// URLs, and symlinks that point
// out of the project are NOT catchable here - substring heuristics for them
// would deny prose mentions of paths, so they are left to the human.
// Exported so it can be unit-tested directly.
export function findViolation(
  command: string,
  projectDir: string = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
): string | null {
  const parsed: ParsedCommand | null = parseCommand(command);
  if (parsed === null) return null;
  return violationIn(parsed.words, projectDir);
}

export const filesystemPolicy: Policy = {
  check(cmd) {
    const reason = violationIn(
      cmd.words,
      process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
    );
    return reason === null ? null : deny(WRAPPER.replace("%s", reason));
  },
  name: "filesystem",
};
