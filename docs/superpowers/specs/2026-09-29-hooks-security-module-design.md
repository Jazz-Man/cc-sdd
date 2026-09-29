# Hooks Security Module — Design

Date: 2026-09-29
Status: approved design (pre-plan)
Branch context: `feature/prompt-builder`, repo root `src/` + `tests/`

## 1. Problem

Three Claude Code guard hooks live as standalone bash+jq scripts in
`~/.claude/hooks/` (`git-readonly.sh`, `no-deps.sh`, `deny.sh`), while a fourth
guard (filesystem-outside-project) is being built in TypeScript (`src/index.ts`)
on the `unbash` shell parser. The guards duplicate their decision-emission
plumbing, cannot share a parse, and cannot be imported or tested as a unit.

Goal: one modular, importable security module in this repo — business logic,
unit tests, e2e tests — that a future Claude Code plugin will integrate.
This round touches nothing outside the repo: bash scripts and global
`settings.json` stay as they are.

## 2. Goals / non-goals

Goals:

- Modular architecture: shared core + one submodule per policy + a router.
- Port `git-readonly` and `no-deps` policies from full-string ERE to unbash
  AST argv inspection (sharper: no prose false-positives, natural handling of
  env prefixes, pipelines, `&&`, subshells, substitutions).
- Extract the deny-decision emitter (today `deny.sh` + `deny()` in index.ts)
  into a shared module used by every policy.
- Preserve user-facing deny messages verbatim.
- Unit + e2e tests (bun test, TDD).

Non-goals: changing `~/.claude/settings.json`; deleting or modifying the bash
scripts; creating the plugin; `cd -` handling; runtime-interpreter heuristics
(eval / sh -c / python -c) — the static-analysis boundary documented in the
filesystem policy stands for the whole module.

## 3. Architecture

```
src/
  core/
    decision.ts   Decision emitter: decision(permission, reason[, hookEventName])
                  with overloads narrowing hookSpecificOutput per event. Only events
                  whose SDK output type carries permissionDecision are accepted —
                  derived from SyncHookJSONOutput's union via Extract, today
                  "PreToolUse" | "PreModelSwitch" (see sdk.d.ts HOOK_EVENTS for the
                  full event list); deny(reason) sugar. The port of deny.sh's
                  emitter role.
    payload.ts    parseHookInput(raw): unknown -> { hookEventName, toolName, command? } | null
    ast.ts        parseCommand(command): ParsedCommand | null  (null = cannot parse)
                  ParsedCommand = { raw: string; units: CommandUnit[]; words: string[] }
                  CommandUnit = { name: string; args: string[] }
                  units: every Command node reachable (pipelines, AndOr, subshells,
                  function bodies, $(...)/<(...) scripts, env-prefix commands);
                  words: flat word+fragment walk (filesystem's view)
    policy.ts     Policy contract + ordered Bash-policy registry
  policies/
    filesystem.ts classify/findViolation moved 1:1 from src/index.ts
    git-readonly.ts  argv tables ported from git-readonly.sh
    no-deps.ts       manager tables ported from no-deps.sh
  main.ts         runHook(raw): SyncHookJSONOutput | null; stdin/stdout under import.meta.main
  index.ts        barrel re-export of the public API
```

`src/debug.ts` is untouched personal tooling.

## 4. Contracts

```ts
// core/policy.ts
interface Policy {
  name: string;
  check(cmd: ParsedCommand): SyncHookJSONOutput | null; // null = no opinion
}
```

- All Bash policies share one `parseCommand` per invocation (one unbash parse;
  both views — `units` and `words` — are precomputed).
- Router order (fixed, by owner's priority): filesystem → no-deps →
  git-readonly. First non-null decision wins; a decision is final.

```ts
// main.ts
export function runHook(raw: string): SyncHookJSONOutput | null
```

1. `parseHookInput` — null → allow (exit silently).
2. `toolName !== "Bash"` or `command === undefined` → allow.
3. `parseCommand` — null → allow (fail-open, single place).
4. Policies in order; first non-null decision returned.
5. Any internal throw → null (fail-open).

Direct execution under `if (import.meta.main)`: read stdin, `runHook`,
write the decision JSON + newline, exit 0. Silent exit 0 when allowed.

## 5. Policy semantics

### filesystem (port 1:1 from src/index.ts)

`classify` / `findViolation` / `OUTSIDE_VAR` / `SAFE_DEVICES` / `Violation`
move unchanged. `findViolation(command, projectDir)` stays exported (tests,
future plugin). Router-side check wraps it with the default
`CLAUDE_PROJECT_DIR`.

### git-readonly (ERE → argv tables)

Applies to every `CommandUnit` with `name === "git"` (env-prefixed and nested
units included). Deny when the subcommand matches:

- Unconditional: add commit push pull fetch merge rebase reset revert
  cherry-pick am apply rm mv clean init clone gc prune update-ref
  update-index worktree bundle checkout switch restore bisect.
- `branch`: deny on a mutating flag (-d -D -m -M -c -C -f --delete --move
  --copy --force) or on a bare FIRST arg (branch creation); otherwise
  allow (`branch`, `branch -l`, `branch -v`, `branch --list 'pat*'` …).
- `tag`: same shape (-a -d -s -f -u --annotate --sign --delete --force, or a
  bare first arg).
- `stash`: deny bare `stash` (≡ push) and stash push pop apply drop clear save
  store create; allow `stash list`, `stash show`, …
- `remote`: deny add remove rename set-url set-head prune; allow `-v`, `show`.
- `config`: deny mutating flags (-e --global --local --system --add --unset
  --unset-all --replace-all --file --get-url) or ≥2 positional args (key +
  value write); allow `config <key>` (read) and --get/--list.
- `notes`: deny add append remove edit copy prune.
- `symbolic-ref`: deny -d --delete.
- `replace`: deny -d --delete --edit -g --graft.

Sharpening over the ERE (test-pinned): prose mentions (`echo 'git add .'`)
are ALLOW — only command-position `git` counts; `FOO=1 git push` is DENY.
Deny message verbatim from `git-readonly.sh`.

### no-deps (ERE → manager tables)

Applies to every `CommandUnit`; deny when `name` is a manager and the args
match its mutation subcommands:

| manager | deny when args |
|---|---|
| pip, pip3 | install\|uninstall\|download … |
| python, python3 | `-m pip install\|uninstall\|download` prefix |
| uv | add remove sync lock upgrade, `pip install…`, `tool install/uninstall/upgrade`, `self update` |
| pipx | install upgrade uninstall inject reinstall |
| poetry | add remove install update lock, `self update` |
| npm | install i install-test ci reinstall uninstall un remove rm r update up upgrade link ln dedupe ddp dist-tag |
| yarn | add remove install upgrade up dlx link, `set version` |
| pnpm | add remove rm install i update up upgrade dlx import link |
| bun | add remove rm install i update upgrade |
| cargo | install add remove rm update upgrade fetch generate |
| rustup | install update uninstall |
| composer | install update require remove self-update selfupdate, `global require/update/remove` |
| gem | install uninstall update |
| go | install get, `mod tidy`, `mod download` |
| swift | `package install/update/resolve` |
| brew | install reinstall uninstall remove rm upgrade tap untap bundle autoremove; `services start/stop/restart/run/kill/cleanup` |
| npx, bunx | any invocation |
| deno | add install cache upgrade |

Alias safety is structural (args compare as whole words), so `npm info` /
`npm run` stay ALLOW. Deny message verbatim from `no-deps.sh`.

## 6. Error handling

Fail-open everywhere, decided in one place each: unparsable payload → allow;
unbash parse throw → allow; internal router/policy throw → allow. A broken
guard must not break Bash usage; silence is the failure mode.

## 7. Testing (TDD, bun test, root `tests/`)

- Unit `core`: decision JSON shape; parseHookInput guards; parseCommand
  units/words on structural forms (pipeline, `&&`, subshell, `$(...)`,
  env-prefix, quotes, line continuation).
- Unit per policy: `it.each` fixture tables — filesystem keeps its current
  ALLOW/DENY tables (import paths updated); git-readonly and no-deps get
  tables built from the bash semantics plus the AST-sharpening cases
  (`echo 'git add .'` ALLOW, `FOO=1 git push` DENY, `npm i` DENY,
  `npm info` ALLOW, `go mod tidy` DENY, `git stash` DENY, `git config user.name` ALLOW).
- Router unit: `runHook` directly (Bash deny, Bash allow, non-Bash, missing
  command, invalid JSON, parse-throw fail-open).
- E2E: `Bun.spawn` on `src/main.ts` with JSON stdin (allow → empty stdout;
  deny → decision JSON; exit 0). `tests/helpers/hook-driver.ts` retires —
  `main.ts` is the real entry now.
- Battery after changes: `bun test`, `./node_modules/.bin/tsc --noEmit`,
  `/opt/homebrew/bin/biome check .`.

## 8. Public API (future plugin surface)

`src/index.ts` barrel re-exports: `runHook`, `findViolation`, `deny`,
`decision`, `parseHookInput`, `parseCommand`, and the shared types. The
plugin integrates by importing these — no settings or packaging decisions
here.

## 9. Migration inside the repo

- `src/index.ts` body dissolves into `core/` + `policies/filesystem.ts`;
  `index.ts` becomes the barrel. Its commented stdin entrypoint is deleted —
  `main.ts` is the real one.
- `tests/find-violation.test.ts` imports move to the new paths (fixtures
  unchanged); e2e tests switch to spawning `src/main.ts`;
  `tests/helpers/hook-driver.ts` deleted.
- `src/debug.ts` untouched.

## 10. Alternatives considered

- **Class-based PolicyRegistry** — rejected: one contract, zero shared state;
  inheritance would be ceremony.
- **Minimal split (deny.ts + payload.ts only)** — rejected: contradicts the
  submodule goal.
- **ERE ported 1:1 into TS** — rejected: keeps the compound-safety workarounds
  and prose false-positives the AST removes; loses the shared-parse win.
- **tool-block config in the module** — descoped by the owner: ad-hoc tool
  denials (WebSearch/WebFetch) need a settings-level matcher per case anyway;
  the global bash `deny.sh` covers them simply and cheaply, so it stays.
- **Deployment/rollout work this round** — descoped by the owner: bash scripts
  and settings.json stay; integration happens later via a dedicated plugin.
