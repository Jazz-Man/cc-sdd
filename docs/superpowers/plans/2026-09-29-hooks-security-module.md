# Hooks Security Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure `src/` into a modular security module — shared core, one submodule per policy, one router — porting `git-readonly` and `no-deps` from bash ERE to unbash AST argv inspection, with unit + e2e tests.

**Architecture:** `core/` (decision emitter, stdin payload guard, unbash parse producing `units` + `words` views, policy contract) + `policies/` (filesystem moved 1:1 from `src/index.ts`, git-readonly and no-deps as data tables over `CommandUnit[]`) + `main.ts` (`runHook` router, stdin/stdout under `import.meta.main`) + `index.ts` barrel re-exports for the future plugin.

**Tech Stack:** TypeScript on Bun (bun test), `unbash` 4.0.11, types from `@anthropic-ai/claude-agent-sdk` (type-only imports), Biome (Homebrew binary).

**Spec:** `docs/superpowers/specs/2026-09-29-hooks-security-module-design.md` — the plan argues from the spec; executors read both.

## Global Constraints

- **No new dependencies.** `unbash` and `@anthropic-ai/claude-agent-sdk` are already installed; zod must not be installed; nothing else is added.
- **Fail-open everywhere:** unparsable payload → allow; unbash parse throw → allow; any internal throw in `runHook` → allow. A broken guard must not break Bash usage.
- **Deny messages verbatim:** git-readonly and no-deps reasons are copied byte-for-byte from `~/.claude/hooks/git-readonly.sh:22` and `~/.claude/hooks/no-deps.sh:31`; the filesystem wrapper message stays `Filesystem access outside project blocked: ${violation}. Access files within the project directory only. Ask the user or disable via /hooks.`
- **Git is the human's.** The implementing agent NEVER runs `git add`/`git commit`/any git write. Every task ends at a stop point: the human reviews and commits. Steps below labeled "Hand off" name only a suggested commit message.
- Tests live in root `tests/`; run with bare `bun test` (no npm script exists — deliberately).
- Biome quirks that WILL fail review if ignored: object keys sorted alphabetically (`assist/source/useSortedKeys`); no `any` (`lint/suspicious/noExplicitAny`); `${...}` inside plain `"..."` strings is flagged (`lint/suspicious/noTemplateCurlyInString`) — write such literals as escaped template literals (`` `\${HOME}` ``).
- `src/debug.ts` is untouched personal tooling.
- Verification battery after every task: `bun test` (0 fail), `./node_modules/.bin/tsc --noEmit` (exit 0), `/opt/homebrew/bin/biome check .` (exit 0; the one pre-existing `src/debug.ts` warning stays).
- Code and comments in English (repo convention); conversation with the user in Ukrainian.

## Review Focus

Input classes the spec implies but task tests must be shown to cover (each pinned in the task that owns the code):

1. **Empty command string** `""` — `command` is defined-but-empty, not undefined: must fall through to allow. Pinned in Task 2 (payload) and Task 8 (router).
2. **Non-string `command` field** (`null`, `42`, object) — payload treats it as absent → allow. Pinned in Task 2.
3. **Multiline compound commands** (`git add .\ngit push`) — units are collected across newlines like any separator. Pinned in Task 3 (ast).
4. **Dual violation → router order** (`npm install /etc/passwd` violates no-deps AND filesystem) — the filesystem reason is returned (registry order: filesystem → no-deps → git-readonly). Pinned in Task 8.
5. **Prose mentions in argument position** (`echo 'git add .'`, `man npm install`) — only command-position names count; these must stay ALLOW. Pinned in Tasks 6 and 7.

---

### Task 1: core/decision.ts — the decision emitter

**Files:**
- Create: `src/core/decision.ts`
- Test: `tests/decision.test.ts`

**Interfaces:**
- Consumes: type `SyncHookJSONOutput` from `@anthropic-ai/claude-agent-sdk`.
- Produces: `type Permission = "allow" | "deny" | "ask"`; `type PermissionEvent = Extract<NonNullable<SyncHookJSONOutput["hookSpecificOutput"]>, { permissionDecision?: unknown }>["hookEventName"]` (today `"PreToolUse" | "PreModelSwitch"`); `decision` with two overloads narrowing the returned `hookSpecificOutput` per event (default `"PreToolUse"`); `deny(reason)` returning the narrowed PreToolUse shape. Design spike verified: plain generics with `Extract<..., {hookEventName: E}>` do NOT compile (deferred-conditional assignment, TS2322) — the cast-free shape is overloads + an if-narrowed body.

- [ ] **Step 1: Write the failing test — `tests/decision.test.ts`**
```ts
import { describe, expect, it } from "bun:test";
import { decision, deny } from "../src/core/decision.ts";

describe("decision", () => {
  it("deny() builds the PreToolUse deny contract", () => {
    expect(deny("boom")).toEqual({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "boom",
      },
    });
  });

  it("defaults to PreToolUse and passes the permission through", () => {
    expect(decision("ask", "why")).toEqual({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason: "why",
      },
    });
  });

  it("narrows the event through the SDK union", () => {
    expect(decision("ask", "why", "PreModelSwitch")).toEqual({
      hookSpecificOutput: {
        hookEventName: "PreModelSwitch",
        permissionDecision: "ask",
        permissionDecisionReason: "why",
      },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/decision.test.ts`
Expected: FAIL — module `../src/core/decision.ts` not found.

- [ ] **Step 3: Write minimal implementation — `src/core/decision.ts`**
```ts
import type {
  PreModelSwitchHookSpecificOutput,
  PreToolUseHookSpecificOutput,
  SyncHookJSONOutput,
} from "@anthropic-ai/claude-agent-sdk";

export type Permission = "allow" | "deny" | "ask";

type HookSpecificOutput = NonNullable<SyncHookJSONOutput["hookSpecificOutput"]>;

// Only events whose SDK output type carries permissionDecision are valid
// here (see HOOK_EVENTS in sdk.d.ts for the full event list); the SDK union
// is the source of truth, so new permission-bearing events widen this
// automatically.
export type PermissionEvent = Extract<
  HookSpecificOutput,
  { permissionDecision?: unknown }
>["hookEventName"];

// The port of ~/.claude/hooks/deny.sh's emitter: one place builds the
// hookSpecificOutput contract every policy returns. Overloads (not a
// generic Extract) because TypeScript cannot assign an object literal to a
// deferred conditional type — the if-narrowed body is the cast-free shape.
export function decision(
  permission: Permission,
  reason: string,
): { hookSpecificOutput: PreToolUseHookSpecificOutput };
export function decision(
  permission: Permission,
  reason: string,
  hookEventName: "PreModelSwitch",
): { hookSpecificOutput: PreModelSwitchHookSpecificOutput };
export function decision(
  permission: Permission,
  reason: string,
  hookEventName: PermissionEvent = "PreToolUse",
): SyncHookJSONOutput {
  const fields = {
    permissionDecision: permission,
    permissionDecisionReason: reason,
  };
  if (hookEventName === "PreModelSwitch") {
    return { hookSpecificOutput: { hookEventName, ...fields } };
  }
  return { hookSpecificOutput: { hookEventName: "PreToolUse", ...fields } };
}

export function deny(
  reason: string,
): { hookSpecificOutput: PreToolUseHookSpecificOutput } {
  return decision("deny", reason);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/decision.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Battery + hand off**

Run: `bun test`, `./node_modules/.bin/tsc --noEmit`, `/opt/homebrew/bin/biome check .` — all green (pre-existing `src/debug.ts` warning allowed).
Hand off for commit (suggested: `feat: extract decision emitter into core/decision.ts`).

---

### Task 2: core/payload.ts — stdin payload guard

**Files:**
- Create: `src/core/payload.ts`
- Test: `tests/payload.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `interface ParsedHookInput { hookEventName: string; toolName: string; command: string | undefined }` (renamed from `HookInput` by controller ruling after Task 2 review — the name collided with the SDK's exported `HookInput` union); `parseHookInput(raw: string): ParsedHookInput | null` (null on invalid JSON, non-object, or missing/non-string `hook_event_name`/`tool_name`; `command` is a string only when `tool_input.command` is a string — Review Focus 1 & 2).

- [ ] **Step 1: Write the failing test — `tests/payload.test.ts`**
```ts
import { describe, expect, it } from "bun:test";
import { parseHookInput } from "../src/core/payload.ts";

const PAYLOAD = {
  hook_event_name: "PreToolUse",
  tool_input: { command: "git push" },
  tool_name: "Bash",
};

describe("parseHookInput", () => {
  it("parses a Bash PreToolUse payload", () => {
    expect(parseHookInput(JSON.stringify(PAYLOAD))).toEqual({
      command: "git push",
      hookEventName: "PreToolUse",
      toolName: "Bash",
    });
  });

  it("keeps a defined-but-empty command (not undefined)", () => {
    const parsed = parseHookInput(
      JSON.stringify({ ...PAYLOAD, tool_input: { command: "" } }),
    );
    expect(parsed?.command).toBe("");
  });

  it("treats a non-string command field as absent", () => {
    const parsed = parseHookInput(
      JSON.stringify({ ...PAYLOAD, tool_input: { command: 42 } }),
    );
    expect(parsed?.command).toBeUndefined();
  });

  it("returns null for invalid JSON", () => {
    expect(parseHookInput("{not json")).toBeNull();
  });

  it("returns null when event or tool name is missing", () => {
    expect(parseHookInput("{}")).toBeNull();
    expect(parseHookInput(JSON.stringify({ tool_name: "Bash" }))).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/payload.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation — `src/core/payload.ts`**
```ts
export interface HookInput {
  hookEventName: string;
  toolName: string;
  command: string | undefined;
}

// Read the hook's stdin JSON into a typed shape, or null when it is not a
// hook payload we can reason about (fail-open starts here).
export function parseHookInput(raw: string): HookInput | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (data === null || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (typeof obj.hook_event_name !== "string") return null;
  if (typeof obj.tool_name !== "string") return null;
  const toolInput = obj.tool_input;
  const command =
    toolInput !== null &&
    typeof toolInput === "object" &&
    typeof (toolInput as Record<string, unknown>).command === "string"
      ? ((toolInput as Record<string, unknown>).command as string)
      : undefined;
  return {
    command,
    hookEventName: obj.hook_event_name,
    toolName: obj.tool_name,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/payload.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Battery + hand off**

Battery green. Hand off (suggested: `feat: add stdin payload guard in core/payload.ts`).

---

### Task 3: core/ast.ts — one parse, two views

**Files:**
- Create: `src/core/ast.ts`
- Test: `tests/ast.test.ts`

**Interfaces:**
- Consumes: `parse`, `ParsedScript` from `unbash`.
- Produces: `interface CommandUnit { name: string; args: string[] }` — args are ALL words after the command name, subcommand included (`git commit -m x` → name "git", args ["commit","-m","x"]); `interface ParsedCommand { raw: string; units: CommandUnit[]; words: string[] }`; `parseCommand(command: string): ParsedCommand | null` — null ONLY on an actual parse throw; unbash 4.0.11 never throws on malformed input (it returns a best-effort script with a non-empty `errors` array), and those partial ASTs are DELIBERATELY still walked — the conservative direction (a typo'd quote must not let /etc/passwd through; verified in the fix-wave re-review). The walk semantics are exactly today's `src/index.ts` `words()` (Word-like = string `.text` AND string `.value`, includes quoted-literal fragments; explicit `.parts` descent — unbash's `WordImpl` keeps `.value`/`.parts` on the prototype; own + prototype-own-names recursion for nodes like `ArithmeticCommandImpl`).

- [ ] **Step 1: Write the failing test — `tests/ast.test.ts`**
```ts
import { describe, expect, it } from "bun:test";
import { parseCommand } from "../src/core/ast.ts";

describe("parseCommand", () => {
  it("walks best-effort ASTs from malformed input (unbash reports errors, never throws)", () => {
    expect(parseCommand('cat "')?.words).toContain("cat");
  });

  it("collects units across && and pipelines", () => {
    expect(parseCommand("cd /tmp && git push")?.units).toEqual([
      { args: ["/tmp"], name: "cd" },
      { args: ["push"], name: "git" },
    ]);
  });

  it("collects units across newline separators", () => {
    expect(parseCommand("git add .\ngit push")?.units).toEqual([
      { args: ["add", "."], name: "git" },
      { args: ["push"], name: "git" },
    ]);
  });

  it("keeps the command name under an env-prefix assignment", () => {
    expect(parseCommand("FOO=1 git push origin")?.units).toEqual([
      { args: ["push", "origin"], name: "git" },
    ]);
  });

  it("collects units from nested substitution scripts", () => {
    expect(parseCommand("echo $(git push)")?.units.map((u) => u.name)).toEqual(
      ["echo", "git"],
    );
  });

  it("keeps quoted args as single values", () => {
    expect(parseCommand("git commit -m 'a b'")?.units[0]?.args).toEqual([
      "commit",
      "-m",
      "a b",
    ]);
  });

  it("flat words include quoted-literal fragments", () => {
    expect(parseCommand('cat "/et"c/passwd')?.words).toContain("/et");
  });

  it("flat words include arithmetic substitution scripts", () => {
    expect(parseCommand("(( $(cat /etc/passwd) ))")?.words).toContain(
      "/etc/passwd",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/ast.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation — `src/core/ast.ts`**
```ts
import { type ParsedScript, parse } from "unbash";

export interface CommandUnit {
  name: string;
  args: string[];
}

export interface ParsedCommand {
  raw: string;
  units: CommandUnit[];
  words: string[];
}

function wordLike(obj: Record<string, unknown>): boolean {
  return typeof obj.text === "string" && typeof obj.value === "string";
}

// One unbash parse, two views: `units` (name+args per Command node — pipelines,
// &&/||, subshells, function bodies, $(...) scripts, env-prefixed commands)
// and `words` (every word-like string, including quoted-literal fragments).
// unbash 4.0.11 never throws on malformed input — it returns a best-effort
// script with a non-empty `errors` array. Partial ASTs are deliberately still
// walked (a typo'd quote must not let /etc/passwd through); null is returned
// only on an actual throw.
// unbash quirks this walk already handles: WordImpl keeps .value/.parts on the
// PROTOTYPE (so .parts needs explicit descent, Object.values never sees it),
// and ArithmeticCommand/ArithmeticFor hide children behind non-enumerable
// prototype accessors (so prototype own names are walked too).
export function parseCommand(command: string): ParsedCommand | null {
  let ast: ParsedScript;
  try {
    ast = parse(command);
  } catch {
    return null;
  }
  const units: CommandUnit[] = [];
  const words: string[] = [];

  const visit = (node: unknown): void => {
    if (node === null || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    if (wordLike(obj)) {
      words.push(obj.value as string);
      visit(obj.parts);
      return;
    }
    if (obj.type === "Command" && obj.name !== null && typeof obj.name === "object") {
      const name = obj.name as Record<string, unknown>;
      if (typeof name.value === "string") {
        units.push({ args: wordValues(obj.suffix), name: name.value });
      }
    }
    for (const child of Object.values(obj)) {
      visit(child);
    }
    const proto = Object.getPrototypeOf(obj);
    if (proto !== null) {
      for (const key of Object.getOwnPropertyNames(proto)) {
        visit(obj[key]);
      }
    }
  };
  visit(ast.commands);
  return { raw: command, units, words };
}

function wordValues(node: unknown): string[] {
  if (node === null || typeof node !== "object") return [];
  const obj = node as Record<string, unknown>;
  if (wordLike(obj)) return [obj.value as string];
  return Object.values(obj).flatMap(wordValues);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/ast.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Battery + hand off**

Battery green. Hand off (suggested: `feat: shared unbash parse with units and words views`).

---

### Task 4: core/policy.ts — the contract

**Files:**
- Create: `src/core/policy.ts`

**Interfaces:**
- Consumes: `ParsedCommand` from `./ast.ts`; `SyncHookJSONOutput`.
- Produces: `interface Policy { name: string; check(cmd: ParsedCommand): SyncHookJSONOutput | null }` — null means "no opinion" (allow). The ordered registry is assembled in `main.ts` (Task 8).

- [ ] **Step 1: Write the contract — `src/core/policy.ts`**
```ts
import type { SyncHookJSONOutput } from "@anthropic-ai/claude-agent-sdk";
import type { ParsedCommand } from "./ast.ts";

// A policy inspects a parsed Bash command and either decides (deny/ask/allow
// JSON out) or returns null for "no opinion". Policies are pure functions;
// the router (main.ts) owns the order and the first decision wins.
export interface Policy {
  name: string;
  check(cmd: ParsedCommand): SyncHookJSONOutput | null;
}
```

- [ ] **Step 2: Battery + hand off**

Type-only module — no test of its own (covered through every policy task).
Run battery; tsc must compile it clean.
Hand off (suggested: `feat: policy contract in core/policy.ts`).

---

### Task 5: policies/filesystem.ts — move, don't rewrite

**Files:**
- Create: `src/policies/filesystem.ts`
- Rewrite: `src/index.ts` (becomes a partial barrel: re-exports from core + policies; the old inline implementation and its commented stdin entrypoint are deleted)
- Modify: `tests/find-violation.test.ts` (imports move; the deny-shape test and the e2e section are removed — superseded by Task 8's router/e2e tests)

**Interfaces:**
- Consumes: `parseCommand`, `ParsedCommand` from `../core/ast.ts`; `deny` from `../core/decision.ts`; `Policy` from `../core/policy.ts`.
- Produces: `findViolation(command: string, projectDir?: string): string | null` (unchanged signature); `filesystemPolicy: Policy` (check uses `cmd.words`, emits the full wrapper message).

- [ ] **Step 1: Update the test imports (they must fail against missing module)**

In `tests/find-violation.test.ts`:
- change `import { deny, findViolation } from "../src/index.ts";` to `import { findViolation } from "../src/policies/filesystem.ts";`
- DELETE the whole `describe("deny", ...)` block and the whole `describe("hook e2e (stdin driver)", ...)` block plus the `DRIVER`/`bashPayload`/`runHook` helpers above it (Task 8 replaces them with router tests against `src/main.ts`).
- ADD this test inside the existing top-level describe:

```ts
  it("filesystemPolicy emits the full wrapper message", () => {
    const cmd = parseCommand("cat /etc/passwd");
    const result = cmd === null ? null : filesystemPolicy.check(cmd);
    expect(result?.hookSpecificOutput.permissionDecisionReason).toBe(
      'Filesystem access outside project blocked: absolute path "/etc/passwd" is outside the project directory. Access files within the project directory only. Ask the user or disable via /hooks.',
    );
  });
```

with imports `import { filesystemPolicy } from "../src/policies/filesystem.ts";` and `import { parseCommand } from "../src/core/ast.ts";` (type-only `ParsedCommand` import alongside). Note: `filesystemPolicy.check` reads the project dir from `CLAUDE_PROJECT_DIR` — the test process env does not matter here because `/etc/passwd` is outside any plausible project dir; to stay deterministic set `process.env.CLAUDE_PROJECT_DIR = "/proj"` at the top of the file (before other tests reuse it).

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/find-violation.test.ts`
Expected: FAIL — `../src/policies/filesystem.ts` not found.

- [ ] **Step 3: Move the implementation — `src/policies/filesystem.ts`**
Create `src/policies/filesystem.ts` containing, moved verbatim from today's `src/index.ts`: the `Violation` class, `SAFE_DEVICES`, `OUTSIDE_VAR`, `classify` (raw-token var check → `=`/`@` decomposition → absolute/tilde/`..` checks), `relativeEscapes`, `isUnderProject`, `findViolation`. Changes during the move:

- `findViolation` keeps its public signature but delegates to a new shared core so the policy does not re-parse:

```ts
import { parseCommand, type ParsedCommand } from "../core/ast.ts";
import { deny } from "../core/decision.ts";
import type { Policy } from "../core/policy.ts";

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

export function findViolation(
  command: string,
  projectDir: string = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
): string | null {
  const parsed = parseCommand(command);
  if (parsed === null) return null;
  return violationIn(parsed.words, projectDir);
}

export const filesystemPolicy: Policy = {
  name: "filesystem",
  check(cmd) {
    const reason = violationIn(
      cmd.words,
      process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
    );
    return reason === null ? null : deny(WRAPPER.replace("%s", reason));
  },
};
```

(`classify` becomes module-private; the old inline `words()` generator, `parse` import, and the commented stdin entrypoint are deleted — `main.ts` in Task 8 is the real entrypoint.)

- [ ] **Step 4: Rewrite src/index.ts as the partial barrel — `src/index.ts`**
```ts
export { decision, deny } from "./core/decision.ts";
export type { Permission } from "./core/decision.ts";
export { parseCommand } from "./core/ast.ts";
export type { CommandUnit, ParsedCommand } from "./core/ast.ts";
export { parseHookInput } from "./core/payload.ts";
export type { ParsedHookInput } from "./core/payload.ts";
export type { Policy } from "./core/policy.ts";
export { findViolation } from "./policies/filesystem.ts";
```

`tests/helpers/hook-driver.ts` imports `deny`/`findViolation` from `../../src/index.ts` — the barrel still provides both, so the old driver keeps compiling until Task 9 deletes it.

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test`
Expected: PASS — all filesystem fixtures green through the moved module; decision/payload/ast suites untouched.

- [ ] **Step 6: Battery + hand off**

Battery green. Hand off (suggested: `refactor: move filesystem guard into policies/filesystem.ts, index.ts becomes barrel`).

---

### Task 6: policies/git-readonly.ts — ERE → argv tables

**Files:**
- Create: `src/policies/git-readonly.ts`
- Test: `tests/git-readonly.test.ts`

**Interfaces:**
- Consumes: `Policy` from `../core/policy.ts`, `deny` from `../core/decision.ts`, `CommandUnit` via `cmd.units`.
- Produces: `gitReadonlyPolicy: Policy` (name `"git-readonly"`).

- [ ] **Step 1: Write the failing test — `tests/git`**
```ts
import { describe, expect, it } from "bun:test";
import { parseCommand } from "../src/core/ast.ts";
import { gitReadonlyPolicy } from "../src/policies/git-readonly.ts";

const REASON =
  "Git write operation blocked (read-only policy): only read-only git is allowed (status, diff, log, show, branch -l, tag -l, stash list, ...). Ask the user to run write operations manually.";

const check = (command: string) => {
  const cmd = parseCommand(command);
  return cmd === null ? null : gitReadonlyPolicy.check(cmd);
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
];

describe("git-readonly policy", () => {
  it.each(DENY)("denies %s", (command) => {
    expect(check(command)?.hookSpecificOutput.permissionDecisionReason).toBe(
      REASON,
    );
  });

  it.each(ALLOW)("allows %s", (command) => {
    expect(check(command)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/git-readonly.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation — `src/policies/git`**
```ts
import { deny } from "../core/decision.ts";
import type { Policy } from "../core/policy.ts";

const REASON =
  "Git write operation blocked (read-only policy): only read-only git is allowed (status, diff, log, show, branch -l, tag -l, stash list, ...). Ask the user to run write operations manually.";

const UNCONDITIONAL = new Set([
  "add", "commit", "push", "pull", "fetch", "merge", "rebase", "reset",
  "revert", "cherry-pick", "am", "apply", "rm", "mv", "clean", "init",
  "clone", "gc", "prune", "update-ref", "update-index", "worktree",
  "bundle", "checkout", "switch", "restore", "bisect",
]);

// subcommand → mutating flags; a BARE FIRST arg (branch/tag creation) also
// denies. Bare `git branch` / `git tag` (listing) have no args → allow.
const MUTATING_FLAGS: Record<string, Set<string>> = {
  branch: new Set(["-d", "-D", "-m", "-M", "-c", "-C", "-f", "--delete", "--move", "--copy", "--force"]),
  tag: new Set(["-a", "-d", "-s", "-f", "-u", "--annotate", "--sign", "--delete", "--force"]),
};

// subcommand → mutating first args; stash with NO args is push → deny
const MUTATING_SUBS: Record<string, Set<string>> = {
  stash: new Set(["push", "pop", "apply", "drop", "clear", "save", "store", "create"]),
  remote: new Set(["add", "remove", "rename", "set-url", "set-head", "prune"]),
  notes: new Set(["add", "append", "remove", "edit", "copy", "prune"]),
};

const CONFIG_MUTATING_FLAGS = new Set([
  "-e", "--global", "--local", "--system", "--add", "--unset", "--unset-all",
  "--replace-all", "--file", "--get-url",
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
    return sub === "stash" && args.length === 0 ? true : subs.has(args[0] ?? "");
  }
  if (sub === "config") {
    if (args.some((a) => CONFIG_MUTATING_FLAGS.has(a))) return true;
    return args.filter((a) => !a.startsWith("-")).length >= 2;
  }
  if (sub === "symbolic-ref") return args.some((a) => SYMBOLIC_REF_FLAGS.has(a));
  if (sub === "replace") return args.some((a) => REPLACE_FLAGS.has(a));
  return false;
}

export const gitReadonlyPolicy: Policy = {
  name: "git-readonly",
  check(cmd) {
    for (const unit of cmd.units) {
      if (unit.name !== "git" || unit.args.length === 0) continue;
      if (mutating(unit.args[0], unit.args.slice(1))) return deny(REASON);
    }
    return null;
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/git-readonly.test.ts`
Expected: PASS (48 fixture tests). If `git branch -l main` DENIES (bare-arg rule fires on args[0] check) — the rule checks only `args[0]`, so `-l` passes; verify.

- [ ] **Step 5: Battery + hand off**

Battery green. Hand off (suggested: `feat: git-readonly policy on argv tables`).

---

### Task 7: policies/no-deps.ts — manager tables

**Files:**
- Create: `src/policies/no-deps.ts`
- Test: `tests/no-deps.test.ts`

**Interfaces:**
- Consumes: `Policy`, `deny`, `cmd.units`.
- Produces: `noDepsPolicy: Policy` (name `"no-deps"`).

- [ ] **Step 1: Write the failing test — `tests/no`**
```ts
import { describe, expect, it } from "bun:test";
import { parseCommand } from "../src/core/ast.ts";
import { noDepsPolicy } from "../src/policies/no-deps.ts";

const REASON =
  "Dependency install/update blocked: do not install, update, or remove packages (pip/uv/pipx/poetry, npm/npx/yarn/pnpm/bun/bunx, cargo/rustup, composer, gem, go get/install, swift package, brew). Ask the user to do it manually.";

const check = (command: string) => {
  const cmd = parseCommand(command);
  return cmd === null ? null : noDepsPolicy.check(cmd);
};

const DENY = [
  "pip install x",
  "pip3 install x",
  "python3 -m pip install x",
  "uv add x",
  "uv pip install x",
  "uv tool install x",
  "uv self update",
  "pipx install x",
  "poetry add x",
  "poetry self update",
  "npm install",
  "npm i",
  "npm ci",
  "npm uninstall x",
  "yarn add x",
  "yarn set version 4",
  "pnpm add x",
  "pnpm up",
  "bun add x",
  "bun i",
  "cargo add x",
  "rustup update",
  "composer require x",
  "composer global update",
  "gem install x",
  "go get x",
  "go mod tidy",
  "swift package resolve",
  "brew install x",
  "brew services start x",
  "npx create-thing",
  "bunx create-thing",
  "deno add x",
  "cd /x && npm install",
  "FOO=1 pip install x",
];

const ALLOW = [
  "npm info x",
  "npm run build",
  "npm test",
  "pip --version",
  "python3 app.py",
  "cargo build",
  "cargo test",
  "go build ./...",
  "go mod verify",
  "brew list",
  "brew info x",
  "deno run x",
  "bun test",
  "cat package.json",
  "echo 'npm install x'",
  "man npm install",
];

describe("no-deps policy", () => {
  it.each(DENY)("denies %s", (command) => {
    expect(check(command)?.hookSpecificOutput.permissionDecisionReason).toBe(
      REASON,
    );
  });

  it.each(ALLOW)("allows %s", (command) => {
    expect(check(command)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/no-deps.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation — `src/policies/no`**
```ts
import { deny } from "../core/decision.ts";
import type { Policy } from "../core/policy.ts";

const REASON =
  "Dependency install/update blocked: do not install, update, or remove packages (pip/uv/pipx/poetry, npm/npx/yarn/pnpm/bun/bunx, cargo/rustup, composer, gem, go get/install, swift package, brew). Ask the user to do it manually.";

// Deny when args start with any listed prefix (whole words). [] = any args.
const MUTATIONS: Record<string, readonly (readonly string[])[]> = {
  bun: [["add"], ["remove"], ["rm"], ["install"], ["i"], ["update"], ["upgrade"]],
  bunx: [[]],
  cargo: [["install"], ["add"], ["remove"], ["rm"], ["update"], ["upgrade"], ["fetch"], ["generate"]],
  composer: [["install"], ["update"], ["require"], ["remove"], ["self-update"], ["selfupdate"], ["global", "require"], ["global", "update"], ["global", "remove"]],
  deno: [["add"], ["install"], ["cache"], ["upgrade"]],
  gem: [["install"], ["uninstall"], ["update"]],
  go: [["install"], ["get"], ["mod", "tidy"], ["mod", "download"]],
  npm: [["install"], ["i"], ["install-test"], ["ci"], ["reinstall"], ["uninstall"], ["un"], ["remove"], ["rm"], ["r"], ["update"], ["up"], ["upgrade"], ["link"], ["ln"], ["dedupe"], ["ddp"], ["dist-tag"]],
  npx: [[]],
  pip: [["install"], ["uninstall"], ["download"]],
  pip3: [["install"], ["uninstall"], ["download"]],
  pipx: [["install"], ["upgrade"], ["uninstall"], ["inject"], ["reinstall"]],
  pnpm: [["add"], ["remove"], ["rm"], ["install"], ["i"], ["update"], ["up"], ["upgrade"], ["dlx"], ["import"], ["link"]],
  poetry: [["add"], ["remove"], ["install"], ["update"], ["lock"], ["self", "update"]],
  python: [["-m", "pip", "install"], ["-m", "pip", "uninstall"], ["-m", "pip", "download"]],
  python3: [["-m", "pip", "install"], ["-m", "pip", "uninstall"], ["-m", "pip", "download"]],
  rustup: [["install"], ["update"], ["uninstall"]],
  swift: [["package", "install"], ["package", "update"], ["package", "resolve"]],
  uv: [["add"], ["remove"], ["sync"], ["lock"], ["upgrade"], ["pip", "install"], ["pip", "uninstall"], ["pip", "download"], ["tool", "install"], ["tool", "uninstall"], ["tool", "upgrade"], ["self", "update"]],
  yarn: [["add"], ["remove"], ["install"], ["upgrade"], ["up"], ["dlx"], ["link"], ["set", "version"]],
};

function mutates(name: string, args: string[]): boolean {
  const prefixes = MUTATIONS[name];
  if (prefixes === undefined) return false;
  return prefixes.some(
    (prefix) => prefix.length <= args.length && prefix.every((w, i) => args[i] === w),
  );
}

export const noDepsPolicy: Policy = {
  name: "no-deps",
  check(cmd) {
    for (const unit of cmd.units) {
      if (mutates(unit.name, unit.args)) return deny(REASON);
    }
    return null;
  },
};
```

(Object keys are alphabetized for Biome's `useSortedKeys`; prefix arrays keep the bash script's order for readability — arrays are not sorted by the rule.)

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/no-deps.test.ts`
Expected: PASS (52 fixture tests).

- [ ] **Step 5: Battery + hand off**

Battery green. Hand off (suggested: `feat: no-deps policy on manager prefix tables`).

---

### Task 8: main.ts — the router

**Files:**
- Create: `src/main.ts`
- Modify: `src/index.ts` (add `export { runHook } from "./main.ts";`)
- Test: `tests/run-hook.test.ts` (unit + e2e)

**Interfaces:**
- Consumes: everything from Tasks 1–7.
- Produces: `runHook(raw: string): SyncHookJSONOutput | null`; direct execution under `import.meta.main` reads stdin, writes decision JSON + newline, exits 0 silently when allowed.

- [ ] **Step 1: Write the failing test — `tests/run`**
```ts
import { describe, expect, it } from "bun:test";
import { runHook } from "../src/main.ts";

const MAIN = `${import.meta.dir}/../src/main.ts`;

function bashPayload(command: string) {
  return {
    hook_event_name: "PreToolUse",
    tool_input: { command },
    tool_name: "Bash",
  };
}

function decisionOf(result: ReturnType<typeof runHook>) {
  return result?.hookSpecificOutput.permissionDecision;
}

describe("runHook (unit)", () => {
  it("denies git writes through the router", () => {
    expect(decisionOf(runHook(JSON.stringify(bashPayload("git push"))))).toBe(
      "deny",
    );
  });

  it("returns the FIRST policy's reason on dual violations", () => {
    const result = runHook(JSON.stringify(bashPayload("npm install /etc/passwd")));
    expect(result?.hookSpecificOutput.permissionDecisionReason).toContain(
      "Filesystem access outside project blocked",
    );
  });

  it("denies filesystem escapes", () => {
    expect(
      decisionOf(runHook(JSON.stringify(bashPayload("cat /etc/passwd")))),
    ).toBe("deny");
  });

  it("allows ordinary commands", () => {
    expect(runHook(JSON.stringify(bashPayload("ls -la")))).toBeNull();
  });

  it("ignores non-Bash tools and non-PreToolUse events", () => {
    expect(
      runHook(JSON.stringify({ ...bashPayload("git push"), tool_name: "Read" })),
    ).toBeNull();
    expect(
      runHook(
        JSON.stringify({
          ...bashPayload("git push"),
          hook_event_name: "PostToolUse",
        }),
      ),
    ).toBeNull();
  });

  it("fails open on invalid JSON and missing/empty command", () => {
    expect(runHook("{not json")).toBeNull();
    expect(
      runHook(
        JSON.stringify({ hook_event_name: "PreToolUse", tool_input: {}, tool_name: "Bash" }),
      ),
    ).toBeNull();
    expect(runHook(JSON.stringify(bashPayload("")))).toBeNull();
  });
});

describe("runHook (e2e via spawned main.ts)", () => {
  async function spawnHook(raw: string): Promise<{ code: number | null; stdout: string }> {
    const proc = Bun.spawn(["bun", MAIN], {
      env: { ...Bun.env, CLAUDE_PROJECT_DIR: "/proj" },
      stderr: "pipe",
      stdin: new Blob([raw]),
      stdout: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const code = await proc.exited;
    return { code, stdout };
  }

  it("emits nothing and exits 0 for an allowed command", async () => {
    const { code, stdout } = await spawnHook(JSON.stringify(bashPayload("ls -la")));
    expect(code).toBe(0);
    expect(stdout).toBe("");
  });

  it("emits the deny JSON for a git write", async () => {
    const { code, stdout } = await spawnHook(JSON.stringify(bashPayload("git push")));
    expect(code).toBe(0);
    const output = JSON.parse(stdout) as {
      hookSpecificOutput: { permissionDecision: string; permissionDecisionReason: string };
    };
    expect(output.hookSpecificOutput.permissionDecision).toBe("deny");
    expect(output.hookSpecificOutput.permissionDecisionReason).toContain(
      "read-only policy",
    );
  });

  it("emits nothing for invalid JSON", async () => {
    const { code, stdout } = await spawnHook("{not json");
    expect(code).toBe(0);
    expect(stdout).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/run-hook.test.ts`
Expected: FAIL — `../src/main.ts` not found.

- [ ] **Step 3: Write the implementation — `src/main.ts`**
```ts
import type { SyncHookJSONOutput } from "@anthropic-ai/claude-agent-sdk";
import { parseCommand } from "./core/ast.ts";
import type { Policy } from "./core/policy.ts";
import { parseHookInput } from "./core/payload.ts";
import { filesystemPolicy } from "./policies/filesystem.ts";
import { gitReadonlyPolicy } from "./policies/git-readonly.ts";
import { noDepsPolicy } from "./policies/no-deps.ts";

// Fixed registry order (owner's priority): first non-null decision wins (spec §4).
const POLICIES: Policy[] = [filesystemPolicy, noDepsPolicy, gitReadonlyPolicy];

export function runHook(raw: string): SyncHookJSONOutput | null {
  try {
    const payload = parseHookInput(raw);
    if (payload === null) return null;
    if (payload.hookEventName !== "PreToolUse") return null;
    if (payload.toolName !== "Bash" || payload.command === undefined) {
      return null;
    }
    const cmd = parseCommand(payload.command);
    if (cmd === null) return null;
    for (const policy of POLICIES) {
      const result = policy.check(cmd);
      if (result !== null) return result;
    }
    return null;
  } catch {
    return null; // fail-open: a broken guard must not break Bash usage
  }
}

if (import.meta.main) {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk: string) => {
    raw += chunk;
  });
  process.stdin.on("end", () => {
    const result = runHook(raw);
    if (result !== null) {
      process.stdout.write(`${JSON.stringify(result)}\n`);
    }
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/run-hook.test.ts`
Expected: PASS (9 tests: 6 unit + 3 e2e).

- [ ] **Step 5: Battery + hand off**

Battery green. Hand off (suggested: `feat: runHook router + stdin entrypoint in main.ts`).

---

### Task 9: cleanup + final barrel

**Files:**
- Delete: `tests/helpers/hook-driver.ts`
- Modify: `src/index.ts` (final barrel, adds policies re-exports)

**Interfaces:**
- Produces the complete public API: `runHook`, `findViolation`, `decision`, `deny`, `parseHookInput`, `parseCommand`, and the shared types (`Permission`, `HookInput`, `CommandUnit`, `ParsedCommand`, `Policy`).

- [ ] **Step 1: Delete the retired driver**

Delete `tests/helpers/hook-driver.ts` — `src/main.ts` is the real entrypoint and `tests/run-hook.test.ts` spawns it directly.

- [ ] **Step 2: Finalize the barrel — `src/index.ts`**
```ts
export { parseCommand } from "./core/ast.ts";
export type { CommandUnit, ParsedCommand } from "./core/ast.ts";
export { decision, deny } from "./core/decision.ts";
export type { Permission } from "./core/decision.ts";
export { parseHookInput } from "./core/payload.ts";
export type { ParsedHookInput } from "./core/payload.ts";
export type { Policy } from "./core/policy.ts";
export { runHook } from "./main.ts";
export { findViolation } from "./policies/filesystem.ts";
```

- [ ] **Step 3: Full battery**

Run: `bun test` (expect 0 fail across all suites: decision, payload, ast, find-violation fixtures, git-readonly, no-deps, run-hook unit+e2e, plus the pre-existing prompt-builder-era suites), `./node_modules/.bin/tsc --noEmit` (exit 0), `/opt/homebrew/bin/biome check .` (exit 0, only the pre-existing `src/debug.ts` warning).

- [ ] **Step 4: Hand off**

Hand off (suggested: `chore: retire hook driver, finalize module barrel`). This is the feature-complete stop point.

---

## Execution notes

- Every task is independently shippable and ends at a human-commit stop point; nothing in this plan runs git write commands.
- The unbash prototype quirks (WordImpl `.value`/`.parts`, ArithmeticCommand/ArithmeticFor accessors) are handled once in `core/ast.ts`; if a future policy needs a new AST view, extend `parseCommand` — never re-parse per policy.
