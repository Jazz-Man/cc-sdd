import type {
  PreToolUseHookInput as PreToolUseHookInputBase,
  SyncHookJSONOutput,
} from "@anthropic-ai/claude-agent-sdk";
import type { BashInput } from "@anthropic-ai/claude-agent-sdk/sdk-tools";

import { type Node, type ParsedScript, parse, type Statement } from "unbash";
import { debug } from "./debug.ts";
import {
  AbsolutePathError,
  HomeDirectoryError,
  HomeVariableError,
  ParentDirectoryError,
} from "./error.ts";

type PreToolUseHookInput<T = unknown> = Omit<
  PreToolUseHookInputBase,
  "tool_input"
> & { tool_input: T };

const HOME_DIR = process.env.HOME as string;

const CURRENT_PROJ_DIR = `${HOME_DIR}/www/cc-sdd`;

const CWD_DIR = process.cwd();

const CLAUDE_PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR ?? CWD_DIR;

// console.log(HOME_DIR);

const SAFE_DEVICES = new Set([
  "/dev/null",
  "/dev/stdin",
  "/dev/stdout",
  "/dev/stderr",
  "/dev/zero",
  "/dev/urandom",
  "/dev/random",
]);

const ALLOW = [
  "ls -la",
  "ls src/",
  "cat README.md",
  "find . -name *.js",
  "grep -r pattern .",
  "rg pattern src/",
  "head -5 CLAUDE.md",
  "tree -L 2",
  "cat file 2>/dev/null",
  "echo hello",
  "bun test",
  "bun run stage:0",
  "printf %s hello",
  `ls ${CURRENT_PROJ_DIR}`,
  `cat ${CURRENT_PROJ_DIR}/CLAUDE.md`,
  `find ${CURRENT_PROJ_DIR} -name x`,
  "wc -l src/api.ts",
  "diff src/a.ts src/b.ts",
  "mkdir -p src/new",
  // .. that resolve back inside the project must be allowed
  "foo/../bar",
  "cat /dev/null",
  "rg pattern .",
  "ls -la .git",
];

const DENY = [
  "find / -name test.txt",
  "ls /etc",
  "ls -la /usr/local",
  "cat /etc/passwd",
  "head /var/log/syslog",
  "tail -5 /var/log/syslog",
  "grep -r pattern /var/log",
  "rg pattern /usr",
  "tree /Users",
  "cp /etc/hosts .",
  "rm /tmp/file",
  "find ~ -name x",
  "ls ~",
  "cat ~/secret",
  "find .. -name x",
  "ls ../other",
  "cat $HOME/secret",
  "find ${HOME}",
  "cd /tmp && ls /etc",
  "cat /etc/passwd /etc/shadow",
  "stat /etc/hosts",
  "file /usr/bin/python3",
  "du -sh /var",
  // extra structural cases the bash version missed
  'cat "/etc/passwd"',
  "FOO=/etc/passwd ls",
  "cat < /etc/hosts",
  "for f in /etc/*; do cat $f; done",
  "echo hi | grep foo /var/log/x",
  "../../etc/passwd",
  "a/b/../../../etc",
  "./../x/../y",
  "/bin/ls",
];

// $HOME / ${HOME} reference (kept literally by unbash, which does not expand params).
const HOME_REF = /\$(\{HOME\}|HOME(?![A-Za-z0-9_]))/;

// Yield the .value of every Word in the AST. A Word is an object with string
// .text AND string .value; AssignmentPrefix.value is a Word object (not a string),
// and Redirect/Command lack a string .text+.value, so they are naturally excluded.
function* words(commands: Statement[] | Node): Generator<string> {
  if (Array.isArray(commands) && commands.length > 0) {
    for (const command of commands) {
      if (command.type === "Statement" && typeof command.command === "object") {
        switch (command.command.type) {
          case "Command":
            yield* command.command.name?.value as string;
            break;
          case "Pipeline":
            // yield* command.command.commands as Statement[];

            // console.log(command.command);
            break;
          default:
            debug(command.command, {
              depth: 6,
            });
            // console.log(typeof command.command["commands"] === "object");
            break;
        }
      } else {
        console.log(command);
      }

      yield* "test";
    }
  } else {
  }

  //   if (!commands || typeof commands !== "object") return;
  //
  //   // const obj = commands as Record<string, unknown>;
  //
  //   if (typeof obj.text === "string" && typeof obj.value === "string") {
  //     yield obj.value as string;
  //     return; // a Word's children are WordParts, not Words; .value already holds the text
  //   }
  //
  //   for (const v of Array.isArray(commands)
  //     ? commands
  //     : Object.values(commands)) {
  //     console.log(v);
  //
  //     yield* words(v);
  //   }
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

// Classify a single word. Returns a deny reason, or null if the word is allowed.
function classify(value: string, projectDir: string) {
  if (value === "") {
    return;
  }

  // 1. Absolute path
  if (value.startsWith("/")) {
    if (SAFE_DEVICES.has(value)) {
      return;
    }
    if (isUnderProject(value, projectDir)) {
      return;
    }
    throw new AbsolutePathError(
      `absolute path "${value}" is outside the project directory`,
    );
  }

  // 2. Tilde (home directory)
  if (value.startsWith("~")) {
    throw new HomeDirectoryError(
      `home-directory path "${value}" resolves outside the project`,
    );
  }

  // 3. $HOME / ${HOME}
  if (HOME_REF.test(value)) {
    throw new HomeVariableError(
      `HOME-variable path "${value}" resolves outside the project`,
    );
  }

  // 4. Relative path whose .. components escape above the project root
  if (relativeEscapes(value)) {
    throw new ParentDirectoryError(
      `parent-directory path "${value}" escapes the project root`,
    );
  }
}

// Inspect a parsed command string. Returns a deny reason, or null to allow.
// Exported so it can be unit-tested directly.
export function findViolation(
  command: string,
  projectDir: string = CLAUDE_PROJECT_DIR.replace(/\/+$/, ""),
): string | null {
  const project = projectDir.replace(/\/+$/, "");
  let ast: ParsedScript;
  try {
    ast = parse(command);
    console.log("\n");
    console.log("__START__");
    console.log(`cmd: "${command}"`);
    // debug(ast.commands, {
    //   depth: 10,
    // });
  } catch {
    // Cannot parse -> cannot reason about it -> allow (matches prior behavior).
    return null;
  }
  for (const value of words(ast.commands)) {
    try {
      classify(value, project);
    } catch (e) {
      if (e instanceof ParentDirectoryError) {
        return e.message;
      }
      // throw e;
    }
  }
  return null;
}

function deny(reason: string): SyncHookJSONOutput {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `Filesystem access outside project blocked: ${reason}. Access files within the project directory only. Ask the user or disable via /hooks.`,
    },
  };
}

for (const command of DENY) {
  const reason = findViolation(command);
  // if (reason) {
  //   console.log(reason);
  // }
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
//   if (data.tool_input.command === undefined) {
//     process.exit(0);
//   }
//
//   const reason = findViolation(data.tool_input.command);
//   if (reason) {
//     process.stdout.write(`${JSON.stringify(deny(reason))}\n`);
//   }
//   process.exit(0);
// });
