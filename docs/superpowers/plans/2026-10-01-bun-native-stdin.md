# Bun-Native Stdin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all stdin text-parsing with the Bun-native `await Bun.stdin.json()` — `JSON.parse` disappears from the codebase, the hook contract becomes object-everywhere.

**Architecture:** The entry (`src/main.ts`) awaits the parsed payload from the runtime and hands it to `runHook(input: unknown)`; the payload guard narrows `unknown` to `ParsedHookInput` (renamed `toHookInput`, no parsing); the router's five steps keep their shape. Malformed JSON is a promise rejection caught at the entry (fail-open).

**Tech Stack:** TypeScript on Bun (top-level await), bun-types (`Bun.stdin: BunFile`, `json(): Promise<any>` — verified at bun.d.ts:5219-5223 and overrides.d.ts:25), bun test, Biome.

**Spec:** `docs/superpowers/specs/2026-10-01-bun-native-stdin-design.md` — the plan argues from the spec; executors read both.

## Global Constraints

- **`JSON.parse` is forbidden anywhere in src/ and tests/ after this plan lands** (owner's directive, verbatim: "використати await Bun.stdin.json() замість JSON.parse"). `JSON.stringify` on the OUTPUT side stays.
- Every script runs on Bun exclusively — Bun globals need no guards beyond the config's `globals: ["Bun"]`.
- Fail-open everywhere: non-object input, wrong event, non-Bash tool, missing command, unparsable command, internal throw, and stdin rejection → silent allow (exit 0, no output).
- Git is the human's: implementers NEVER run git write commands; every task ends at a stop point for the human's commit.
- No new dependencies. No file-path label comments (.claude/rules/code-style.md).
- Tests live in root `tests/`; bare `bun test`.
- Biome: sorted keys/members, no `any` in OUR code (the runtime's `Promise<any>` from `Bun.stdin.json()` is consumed as `unknown`), no `${...}` in plain strings (existing fixture ignores stay).
- Battery after every task: `bun test` (0 fail), `./node_modules/.bin/tsc --noEmit` (exit 0), `/opt/homebrew/bin/biome check .` (exit 0, zero diagnostics).
- Registry order and policy behavior are untouched: filesystem → no-deps → git-readonly, first decision wins.
- OPERATIONAL: the repository's own live hooks pattern-match Bash command text case-insensitively against git-mutation and blocked-manager patterns — never spell such invocations literally in shell commands; fixture/payload strings go into files via Write/Edit.

## Review Focus

1. **Empty stdin** (zero bytes piped) — `Bun.stdin.json()` rejects or resolves `undefined`; the entry must exit 0 silently, never crash. Pinned in Task 3 (e2e empty-stdin case).
2. **Payload that is valid JSON but not an object** (`"42"`, `null`, `[1]` piped as JSON text) — `json()` resolves a non-object; `toHookInput` returns null → allow. Pinned in Task 1 (guard tests) and Task 3 (e2e pipes the literal `42`).
3. **`tool_input.command` present but non-string** (`{"command": 42}`) — command becomes `undefined` → allow (gate at the router). Pinned in Task 1 (stays from the current suite).
4. **String passed directly to `runHook`** (`runHook("{not json")`) — a string is a non-object for the guard → null. Pinned in Task 2 (unit test).
5. **Output formatting unchanged** — deny JSON + trailing `\n` via `process.stdout.write`, byte-identical to today. Pinned in Task 3 (e2e deny assertion unchanged).

---

### Task 1: core/payload.ts — toHookInput(data: unknown)

**Files:**
- Modify: `src/core/payload.ts`
- Test: `tests/payload.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces: `interface ParsedHookInput { command: string | undefined; hookEventName: string; toolName: string }` (unchanged shape); `toHookInput(data: unknown): ParsedHookInput | null` — null on non-object, missing/non-string `hook_event_name`/`tool_name`; `command` is a string only when `tool_input.command` is a string; empty-string command stays defined. The old `parseHookInput(raw: string)` export is DELETED (Task 2 updates the last consumer).

- [ ] **Step 1: Rewrite the test file — object literals in, non-object cases**

Replace the full content of `tests/payload.test.ts` with:

```ts
import { describe, expect, it } from "bun:test";
import { toHookInput } from "../src/core/payload.ts";

const PAYLOAD = {
  // biome-ignore lint/style/useNamingConvention: wire-format key (hook payload contract)
  hook_event_name: "PreToolUse",
  // biome-ignore lint/style/useNamingConvention: wire-format key (hook payload contract)
  tool_input: { command: "git push" },
  // biome-ignore lint/style/useNamingConvention: wire-format key (hook payload contract)
  tool_name: "Bash",
};

describe("toHookInput", () => {
  it("narrows a Bash PreToolUse payload", () => {
    expect(toHookInput(PAYLOAD)).toEqual({
      command: "git push",
      hookEventName: "PreToolUse",
      toolName: "Bash",
    });
  });

  it("keeps a defined-but-empty command (not undefined)", () => {
    const parsed = toHookInput({ ...PAYLOAD, tool_input: { command: "" } });
    expect(parsed?.command).toBe("");
  });

  it("treats a non-string command field as absent", () => {
    const parsed = toHookInput({ ...PAYLOAD, tool_input: { command: 42 } });
    expect(parsed?.command).toBeUndefined();
  });

  it("returns null for non-object input", () => {
    expect(toHookInput(42)).toBeNull();
    expect(toHookInput("not json")).toBeNull();
    expect(toHookInput(null)).toBeNull();
    expect(toHookInput([1, 2])).toBeNull();
  });

  it("returns null when event or tool name is missing", () => {
    expect(toHookInput({})).toBeNull();
    expect(toHookInput({ tool_name: "Bash" })).toBeNull();
    expect(
      // biome-ignore lint/style/useNamingConvention: wire-format key (hook payload contract)
      toHookInput({ hook_event_name: "PreToolUse" }),
    ).toBeNull();
  });
});
```

(Notes for the implementer: the `{ command: 42 }` and `{ ...PAYLOAD, tool_input: … }` literals inherit the spread's biome-ignore context only where a comment sits on the directly-preceding line — keep exactly the comments shown. The `[1, 2]` array input must be `null`: arrays are `typeof "object"` but cannot carry the string fields.)

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/payload.test.ts`
Expected: FAIL — `toHookInput` is not exported from `../src/core/payload.ts`.

- [ ] **Step 3: Rewrite the guard — unknown in, no parsing**

Replace the full content of `src/core/payload.ts` with:

```ts
export interface ParsedHookInput {
  command: string | undefined;
  hookEventName: string;
  toolName: string;
}

// Narrow the runtime-parsed hook payload (Bun.stdin.json() output) into a
// typed shape, or null when it is not a hook payload we can reason about
// (fail-open starts here). Nothing parses text: the runtime already did.
export function toHookInput(data: unknown): ParsedHookInput | null {
  if (data === null || typeof data !== "object") {
    return null;
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.hook_event_name !== "string") {
    return null;
  }
  if (typeof obj.tool_name !== "string") {
    return null;
  }
  const toolInput = obj.tool_input;
  let command: string | undefined;
  if (
    toolInput !== null &&
    typeof toolInput === "object" &&
    typeof (toolInput as Record<string, unknown>).command === "string"
  ) {
    command = (toolInput as Record<string, unknown>).command as string;
  }
  return {
    command,
    hookEventName: obj.hook_event_name,
    toolName: obj.tool_name,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/payload.test.ts`
Expected: PASS (6 tests). The FULL suite will still fail elsewhere (`src/run-hook.ts` imports `parseHookInput`) — that is Task 2; do not fix it here.

- [ ] **Step 5: Battery note + hand off**

`./node_modules/.bin/tsc --noEmit` will report the missing `parseHookInput` export in `src/run-hook.ts` — expected mid-migration state; battery goes fully green in Task 2. Hand off (suggested: `refactor: payload guard narrows unknown, no text parsing`).

---

### Task 2: runHook(input: unknown) + the Bun-native entry — ONE atomic flip

**Why one task:** the router signature and the entry must flip together. After
a signature-only change, `src/main.ts` would still pass a string into an
object-expecting `runHook` — every e2e deny case would fail and the hook would
silently allow everything. A task ends only at a green, shippable state.

**Files:**
- Modify: `src/run-hook.ts`, `src/main.ts`
- Test: `tests/run-hook.test.ts`

**Interfaces:**
- Consumes: `toHookInput(data: unknown): ParsedHookInput | null` (Task 1), `parseCommand`, the three policies, `Policy`, `Bun.stdin.json()` (runtime, `Promise<any>` consumed as `unknown`).
- Produces: `runHook(input: unknown): SyncHookJSONOutput | null` — input is the runtime-parsed payload object; five steps: toHookInput → event gate → tool/command gate → parseCommand → policies. Entry: top-level `await Bun.stdin.json()`, rejection → silent exit.

- [ ] **Step 1: Rewrite the unit tests — object literals, no JSON.stringify on inputs**

In `tests/run-hook.test.ts` apply these changes (keep the e2e describe untouched — it feeds raw text through the spawned entry, which is exactly its job):

1. `bashPayload` keeps its shape (comments included) but callers stop wrapping in `JSON.stringify`:

```ts
function bashPayload(command: string) {
  return {
    // biome-ignore lint/style/useNamingConvention: wire-format key (hook payload contract)
    hook_event_name: "PreToolUse",
    // biome-ignore lint/style/useNamingConvention: wire-format key (hook payload contract)
    tool_input: { command },
    // biome-ignore lint/style/useNamingConvention: wire-format key (hook payload contract)
    tool_name: "Bash",
  };
}
```

2. Every unit-test call site drops `JSON.stringify(...)`: `runHook(bashPayload("git push"))`, `runHook({ ...bashPayload("git push"), tool_name: "Read" })` (keep its biome-ignore comment), the PostToolUse spread case (keep its comment), and the fail-open describe becomes:

```ts
describe("runHook (unit — fail-open)", () => {
  it("fails open on non-object input and missing/empty command", () => {
    expect(runHook("{not json")).toBeNull();
    expect(runHook(42)).toBeNull();
    expect(
      runHook({
        // biome-ignore lint/style/useNamingConvention: wire-format key (hook payload contract)
        hook_event_name: "PreToolUse",
        // biome-ignore lint/style/useNamingConvention: wire-format key (hook payload contract)
        tool_input: {},
        // biome-ignore lint/style/useNamingConvention: wire-format key (hook payload contract)
        tool_name: "Bash",
      }),
    ).toBeNull();
    expect(runHook(bashPayload(""))).toBeNull();
  });
});
```

(`runHook("{not json")` is now a string-fails-narrowing pin — a string IS non-object input for the guard.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/run-hook.test.ts`
Expected: unit cases FAIL — `runHook` still takes a string and returns null for object inputs.

- [ ] **Step 3: Flip the router AND the entry together**

In `src/run-hook.ts`: change the import to `import { toHookInput } from "./core/payload.ts";` and the function head + first step to:

```ts
export function runHook(input: unknown): SyncHookJSONOutput | null {
  try {
    const payload = toHookInput(input);
    if (payload === null) {
      return null;
    }
```

Everything below (event gate, tool/command gate, parseCommand, policies loop, catch → null) stays byte-identical.

Replace the full content of `src/main.ts` with:

```ts
import process from "node:process";
import { runHook } from "./run-hook.ts";

// Stdin entrypoint for the PreToolUse hook: the runtime parses the payload
// (Bun.stdin.json()), the router decides, the decision (if any) goes to
// stdout. Any rejection — malformed or empty stdin — is a silent allow.
try {
  const input: unknown = await Bun.stdin.json();
  const result = runHook(input);
  if (result !== null) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  }
} catch {
  // fail-open: a broken payload must not break Bash usage
}
```

(Top-level await outside `import.meta.main` is fine: this file's only consumer is the spawned `bun src/main.ts` process. The old chunk accumulator, `setEncoding`, and both listeners are gone.)

- [ ] **Step 4: Run the full suite**

Run: `bun test`
Expected: PASS — all suites green including the e2e (the entry now feeds parsed objects to `runHook`; deny/allow/invalid-JSON e2e behave exactly as before). `tsc --noEmit` exit 0 (the missing-export break from Task 1 is resolved here).

- [ ] **Step 5: Battery + hand off**

Battery: `bun test` 0 fail, `tsc` exit 0, `biome check .` exit 0 zero diagnostics. Hand off (suggested: `refactor: object contract for runHook and Bun-native stdin entry`).

---

### Task 3: entry-level pins + the forbidden-call audit

**Files:**
- Test: `tests/run-hook.test.ts` (e2e additions only)

**Interfaces:**
- Consumes: the finished entry (Task 2).
- Produces: entry-behavior regression pins + the zero-`JSON.parse` audit as a plan step.

- [ ] **Step 1: Add the e2e pins**

In `tests/run-hook.test.ts`, inside the e2e describe, add:

```ts
  it("emits nothing and exits 0 for empty stdin", async () => {
    const { code, stdout } = await spawnHook("");
    expect(code).toBe(0);
    expect(stdout).toBe("");
  });

  it("emits nothing and exits 0 for valid-JSON non-object input", async () => {
    const { code, stdout } = await spawnHook("42");
    expect(code).toBe(0);
    expect(stdout).toBe("");
  });
```

(These pass under the old entry too — chunk listener + failed parse → silent. They are REGRESSION PINS carried across the Task-2 rewrite, not RED drivers; the RED/Green cycle lived in the unit layers. Confirm green and note it in the report.)

- [ ] **Step 2: Run them green, then the full battery**

Run: `bun test` (expect 263: 261 + 2 new e2e), `./node_modules/.bin/tsc --noEmit` (exit 0), `/opt/homebrew/bin/biome check .` (exit 0, zero diagnostics).

- [ ] **Step 3: The forbidden-call audit**

Run: `grep -rn "JSON.parse" src` → ZERO hits. Run: `grep -rn "JSON.parse" tests` → the ONLY permitted hit is the e2e assertion parse of the spawned hook's stdout (tests/run-hook.test.ts, output-side — the spec bans payload decoding, not assertion parsing).

- [ ] **Step 4: Hand off**

Hand off (suggested: `test: pin entry behavior for empty and non-object stdin`). Feature-complete stop point.
