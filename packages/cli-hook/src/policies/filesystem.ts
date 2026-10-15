import { isAbsolute, normalize, relative } from "node:path";
import { deny } from "../core/decision.ts";
import type { Policy } from "../core/policy.ts";

// classify()'s throws; lets violationIn tell a deny reason apart from a
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

// An absolute candidate is inside the project when relative() does not climb
// out of it ("" for the directory itself). relative() resolves both sides, so
// double-slash and interior-dot spellings are handled by node:path itself.
function isUnderProject(absPath: string, projectDir: string): boolean {
  const rel = relative(projectDir, absPath);
  return !(rel.startsWith("..") || isAbsolute(rel));
}

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
  let value = raw;
  if (eq !== -1) {
    value = raw.slice(eq + 1);
  }
  if (value.startsWith("@")) {
    value = value.slice(1);
  }

  // Tilde is a plain character to node:path ("~/.." would mangle), so the
  // home prefix is checked on the un-normalized value.
  if (value.startsWith("~")) {
    throw new Violation(
      `home-directory path "${value}" resolves outside the project`,
    );
  }

  const path = normalize(value);

  // 1. Absolute path
  if (isAbsolute(path)) {
    if (SAFE_DEVICES.has(path)) {
      return;
    }
    if (isUnderProject(path, projectDir)) {
      return;
    }
    throw new Violation(
      `absolute path "${value}" is outside the project directory`,
    );
  }

  // 2. Relative path whose .. components escape above the project root
  //    (normalize has already collapsed the reachable ones).
  if (path.startsWith("..")) {
    throw new Violation(
      `parent-directory path "${value}" escapes the project root`,
    );
  }
}

const WRAPPER =
  "Filesystem access outside project blocked: %s. Access files within the project directory only. Ask the user or disable via /hooks.";

function violationIn(words: string[], projectDir: string): string | null {
  // normalize("") and normalize(".") both give "." — a rootless project
  // cannot anchor anything; allowing is the fail-open choice (the router
  // never produces it — payload narrowing rejects an empty cwd).
  const project = normalize(projectDir);
  if (project === ".") {
    return null;
  }
  try {
    for (const value of words) {
      classify(value, project);
    }
  } catch (e) {
    if (e instanceof Violation) {
      return e.message;
    }
    return null;
  }
  return null;
}

export const filesystemPolicy: Policy = {
  check(cmd, context) {
    const reason = violationIn(cmd.words, context.cwd);
    if (reason === null) {
      return null;
    }
    return deny(WRAPPER.replace("%s", reason));
  },
  name: "filesystem",
};
