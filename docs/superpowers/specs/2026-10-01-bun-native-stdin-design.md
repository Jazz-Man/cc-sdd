# Bun-Native Stdin — Design

Date: 2026-10-01
Status: approved design (pre-plan)
Owner's directive: use `await Bun.stdin.json()` instead of `JSON.parse` — no
`JSON.parse` anywhere in this codebase; every script runs on Bun, exclusively.

## 1. Problem

The hook entry (`src/main.ts`) reads stdin with a `process.stdin` chunk
listener and the payload guard (`src/core/payload.ts`) parses text with
`JSON.parse`. Bun ships a native API that does both in one move — the pattern
the Bun repository itself uses in its hooks
(https://github.com/oven-sh/bun/blob/main/.claude/hooks/pre-bash-guard.js):

```js
const input = await Bun.stdin.json();
```

Verified against bun-types [Verified]: `Bun.stdin: BunFile` (read-only,
bun.d.ts:5223), consumer method `json(): Promise<any>` (overrides.d.ts:25);
top-level await compiles clean under `--strict`. Malformed JSON REJECTS the
promise — the fail-open catch at the entry covers it.

## 2. Goals / non-goals

Goals:

- `await Bun.stdin.json()` is the ONLY payload decoding — `JSON.parse`
  disappears from the module (output may still `JSON.stringify`).
- Object-everywhere contract: `runHook(input: unknown)` takes the already-
  parsed payload; guards narrow `unknown`, they never parse text.
- Minimal `main.ts`: top-level await + one try/catch, no process.stdin
  listeners.
- Tests pass object literals (no `JSON.stringify` on the input side).
- Spec/plan/subagent execution per the established workflow (sonnet
  implements, opus reviews).

Non-goals: touching `parseCommand`, the policies, or the decision emitter;
changing the deny output channel (`process.stdout.write` stays); packaging or
settings work.

## 3. Architecture

```
src/main.ts        const input = await Bun.stdin.json()  (top level)
                   runHook(input) → decision
                   decision → process.stdout.write(JSON.stringify(...) + "\n")
                   rejection/non-object → silent exit 0 (fail-open)

src/core/payload.ts toHookInput(data: unknown): ParsedHookInput | null
                   — typeof narrowing only: object?, hook_event_name/tool_name
                     strings?, tool_input.command string?
                   — renamed from parseHookInput: nothing parses here anymore

src/run-hook.ts    runHook(input: unknown): SyncHookJSONOutput | null
                   — five router steps unchanged in shape: toHookInput →
                     event gate → tool/command gate → parseCommand → policies
```

## 4. Contracts

- `toHookInput(data: unknown)`: null on non-object, missing/non-string
  `hook_event_name`/`tool_name`; `command` is a string only when
  `tool_input.command` is a string. Empty-string command stays defined.
- `runHook(input: unknown)`: null = allow (fail-open) on non-object input,
  wrong event, non-Bash tool, missing command, unparsable command, internal
  throw. First policy decision wins (filesystem → no-deps → git-readonly).
- Entry: any throw from `Bun.stdin.json()` (malformed JSON, empty stdin) →
  caught → silent exit 0. `JSON.stringify` on the output side only.

## 5. Migration

- `core/payload.ts`: signature `raw: string` → `data: unknown`; the
  try/JSON.parse branch is deleted; rename export to `toHookInput`.
- `src/run-hook.ts`: `runHook(raw: string)` → `runHook(input: unknown)`;
  step 1 becomes `toHookInput(input)`.
- `src/main.ts`: rewritten as the three-line entry above; the chunk
  accumulator, `setEncoding`, and both listeners are deleted.
- `tests/payload.test.ts`: literals passed directly; the "invalid JSON" case
  becomes non-object input cases (`42`, `"text"`, `null` → null).
- `tests/run-hook.test.ts`: `bashPayload` returns the object; all call sites
  drop `JSON.stringify`; `runHook("{not json")` stays as a string-fails-
  narrowing test; e2e spawn suite unchanged (it proves the real entry,
  including malformed-JSON silence through `Bun.stdin.json()` rejection).

## 6. Testing

TDD per task; the 261-test suite stays green throughout (the affected suites
change shape, not coverage: object-literal inputs, non-object guard cases,
e2e malformed-JSON at the entry). Battery after every task: `bun test`,
`./node_modules/.bin/tsc --noEmit`, `/opt/homebrew/bin/biome check .` —
zero diagnostics, zero warnings.

## 7. Alternatives considered

- **`Bun.stdin.text()` + string contract** — rejected: keeps `JSON.parse`,
  contradicts the directive.
- **Hybrid raw-string wrapper alongside the object contract** — rejected by
  the owner: full refactor, no compatibility shims.

## 8. References

- Bun repo hook example (raw URL fetched 2026-10-01): `.claude/hooks/pre-bash-guard.js`.
- bun-types: `Bun.stdin: BunFile` (bun.d.ts:5219-5223); `json(): Promise<any>`
  (overrides.d.ts:25).
