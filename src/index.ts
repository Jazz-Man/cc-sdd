import type { SyncHookJSONOutput } from "@anthropic-ai/claude-agent-sdk";

import { type ParsedScript, parse } from "unbash";

// classify()'s throws; lets findViolation tell a deny reason apart from a
// failure inside the walk (lazy getters can throw while parsing on access).
class Violation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Violation";
  }
}

const CLAUDE_PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

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

// Yield every word-like string reachable from the node. Any node with string
// .text AND string .value is treated as word-like and yielded - that is Words,
// and deliberately also quoted-literal WordParts (LiteralPart, SingleQuoted,
// AnsiCQuoted): their values are real path fragments, and quoting a path in
// pieces ("cat "/et"c/passwd") must not hide it. Cost, accepted: a variable
// reference with an absolute-looking suffix ($A/$B, ${TMPDIR}x) yields the
// suffix fragment and denies - unresolvable paths are denied, like ~.
//
// unbash hides some children behind non-enumerable prototype accessors
// (WordImpl .value/.parts, ArithmeticCommand .expression, ArithmeticFor
// .initialize/.test/.update), so Object.values alone never reaches them:
// after the own properties, the prototype's own property names are walked too
// (methods are skipped naturally - they are not objects).
function* words(node: unknown): Generator<string> {
  if (node === null || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  if (typeof obj.text === "string" && typeof obj.value === "string") {
    yield obj.value;
  }
  for (const child of Object.values(obj)) {
    yield* words(child);
  }
  const proto = Object.getPrototypeOf(obj);
  if (proto !== null) {
    for (const name of Object.getOwnPropertyNames(proto)) {
      yield* words(obj[name]);
    }
  }
}

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
  projectDir: string = CLAUDE_PROJECT_DIR,
): string | null {
  const project = projectDir.replace(/\/+$/, "");
  let ast: ParsedScript;
  try {
    ast = parse(command);
  } catch {
    return null;
  }
  try {
    for (const value of words(ast.commands)) {
      classify(value, project);
    }
  } catch (e) {
    return e instanceof Violation ? e.message : null;
  }
  return null;
}

export function deny(reason: string): SyncHookJSONOutput {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `Filesystem access outside project blocked: ${reason}. Access files within the project directory only. Ask the user or disable via /hooks.`,
    },
  };
}

// // --- stdin hook entrypoint ---
// let raw = "";
// process.stdin.setEncoding("utf8");
// process.stdin.on("data", (chunk: string) => {
//   raw += chunk;
// });
// process.stdin.on("end", () => {
//   let data: PreToolUseHookInput<BashInput>;
//   try {
//     data = JSON.parse(raw) as PreToolUseHookInput<BashInput>;
//   } catch {
//     process.exit(0);
//   }
//   // This hook is registered for PreToolUse + Bash; bail on anything else.
//   if (data.hook_event_name !== "PreToolUse") process.exit(0);
//
//   if (data.tool_name !== "Bash") {
//     process.exit(0);
//   }
//
//   if (data.tool_input?.command === undefined) {
//     process.exit(0);
//   }
//
//   const reason = findViolation(data.tool_input.command);
//   if (reason) {
//     process.stdout.write(`${JSON.stringify(deny(reason))}\n`);
//   }
//   process.exit(0);
// });
