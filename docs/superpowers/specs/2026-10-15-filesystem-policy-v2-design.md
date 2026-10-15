# Filesystem policy v2 — design

**Date:** 2026-10-15
**Status:** draft (user review pending)
**Bean:** cc-sdd-phuy
**Feature:** replace the strict outside-cwd filesystem policy with a
pattern-based deny/ask engine, and extend the guard to the file-tool channel.

## 1. Problem

The current `filesystemPolicy` denies every path outside the Bash payload
cwd. In practice this blocks ordinary daily work (reading repo-root files
from a package cwd, `~` and system inspection, homebrew paths), so the
owner disabled it in `run-hook.ts` and rebuilt the binary without it. The
filesystem control must come back in a practical form.

A second gap: the guard only inspects the **Bash** tool. `Read`, `Edit`,
`Write`, and `NotebookEdit` reach any file on disk without passing through
the binary at all.

## 2. Pattern source (mandatory reading)

**Implementers and reviewers must read `tmp/pattern-source.md` (repo-root
`tmp/`, git-ignored) before touching §7.** It is the single carrier of the
reference-implementation details: identity, license posture, a module map
tying each spec rule table to the reference file to consult, and the
reading order. All pattern data in `cli-hook` is written fresh for this
project; nothing is copied from the reference. The reference file lives
under git-ignored `tmp/` deliberately — no reference-implementation
detail enters committed history.

## 3. Verdict model

`PolicyCheckResult` widens from `deny | null` to **`deny | ask | null`**
(null = allow, unchanged):

- `decision.ts` gains `ask(reason)` producing
  `PreToolUseHookSpecificOutput { permissionDecision: "ask", permissionDecisionReason }`
  (SDK allows it: `HookPermissionDecision = 'allow' | 'deny' | 'ask' | 'defer'`).
- The four existing policies keep their deny/null contracts untouched.

Precedence fact this design relies on (official docs — hooks-guide
§"Hooks and permission modes", permission-modes §bypassPermissions): a
PreToolUse hook deny
blocks in every permission mode including `bypassPermissions`; explicit ask
rules still prompt in bypass. Hook-emitted `ask` under bypass is not
documented verbatim — it gets a live smoke check before the ask tier ships
(§10).

## 4. Policy context

```ts
export interface PolicyContext {
  cwd: string;         // Bash working dir of this call (moves per call)
  projectRoot: string; // stable project root
}
```

`projectRoot` = `process.env.CLAUDE_PROJECT_DIR ?? cwd` — no fallback
chains. This closes the long-open precedence question: cwd and
projectRoot have different roles, and scope analysis runs against
`projectRoot`.

## 5. Router

```ts
const POLICIES: Policy[] = [
  noDepsPolicy,        // absolutes first: deny-only
  gitReadonlyPolicy,   //
  noInlineScriptsPolicy,
  filesystemPolicy,    // v2: deny | ask
];
```

First non-null result wins (rule unchanged). A deny-vs-ask conflict is
structurally impossible: absolutes emit only deny and run before v2; only
v2 can emit ask.

## 6. Tool channel (new)

- `plugins/security-guard/hooks/hooks.json`: matcher `Bash` →
  `Bash|Read|Edit|Write|NotebookEdit` (same binary, same timeout).
- `payload.ts`: `ParsedHookInput` gains `filePath: string | undefined`
  extracted from `tool_input.file_path` (`notebook_path` for
  `NotebookEdit`).
- `run-hook.ts`: branch by `toolName`:
  - `Bash` → policy router;
  - `Read` → sensitive-path check, read intent;
  - `Edit | Write | NotebookEdit` → sensitive-path check, write intent;
  - anything else → null (fail-open).
- The sensitive-path table is shared between both channels.
- `Grep`/`Glob` tools are a documented boundary — pattern arguments are
  too noisy to police here (§11).

### 6.1 Settings layer (companion, not plugin-shipped)

Plugins cannot ship permission rules — a plugin `settings.json` only takes
effect for `agent` and `subagentStatusLine`, and permission rules live only
in settings files where a deny at any level wins (permissions docs,
verified 2026-10-15). The plugin therefore ships
`plugins/security-guard/recommended-settings.json`: a ready-to-merge
`permissions.deny` block for the user's global settings covering the
exact-pattern families (secrets, system files, Claude settings, git
internals, `Bash(git hook:*)`, bare `env`/`printenv`). Division of labor:
settings rules apply even when the plugin is unloaded or in `--safe-mode`;
the hook carries the semantic layer (intents, scope, taint, ask tier) that
path patterns cannot express. A PreToolUse hook deny (exit 2) stops the
call before permission rules are evaluated and overrides allow rules — the
layers stack, they do not conflict. Settings rules are a best-effort
outer layer, **not** a guarantee — upstream issues document enforcement
gaps (anthropics/claude-code#24846 and its duplicates); the hook channel
of §6 is the enforcing guarantee and stays authoritative even if a
settings rule fails to fire.

## 7. Rule tables (all inside `policies/filesystem.ts`, single file)

### 7.1 SENSITIVE_PATHS

| Tier | Patterns (fresh data; source map in `tmp/pattern-source.md`) | Verdict |
|---|---|---|
| Secrets | `.env`, `.env.*`, `.ssh/*`, `id_rsa`, `id_ed25519`, `id_ecdsa`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `.aws/credentials`, `.gnupg/*`, `.netrc`, `.npmrc`, `.pypirc`, `.docker/config.json`, `.kube/config`, `.gcloud/*`, `credentials.json`, `*.secret`, `*.secrets`, `.htpasswd`, `token.json`, `terraform.tfstate` | **deny read+write, both channels, always** — even in-project |
| System | `/etc/passwd`, `/etc/shadow`, `/etc/sudoers`, `/etc/ssh/*`, `/proc/*/environ`, `/proc/self/environ`, `/etc/hosts`, `/etc/resolv.conf`, `/etc/crontab` | **deny read+write, both channels, always** |
| Settings | `.claude/settings.json`, `.claude/settings.local.json`, `~/.claude/settings.json`, `~/.claude.json` | **deny read+write, both channels, always** (self-disable vector: settings hold the hooks that enforce the guard) |
| Git internals | `.git/config` | **deny write, both channels, always** (mutations belong to the git-readonly policy's `git config` gate; this closes the file-channel bypass; `~/.gitconfig` stays in PersonalConfig) |
| Git internals | `.git/hooks/*` | **deny read, write, and execute — any reference, both channels, always**: tool-channel `Read`/`Edit`/`Write`, and any Bash arg or command resolving under `.git/hooks/` (running `bash .git/hooks/x` is as bad as planting it). Name-based access via the `git hook` subcommand is closed in the git-readonly policy (companion rule, §7.5) |
| PersonalConfig | `.bashrc`, `.zshrc`, `.zprofile`, `.profile`, `.bash_profile`, `.vimrc`, `.gitconfig`, `.config/*`, `.vscode/*`, `.cursor/*` | **deny write outside projectRoot** (persistence vector); read allowed |

`.claude/*` as a whole is **unrestricted** (agents author skills and rules
there daily; the steering skill writes `.claude/rules/` in target
projects). Only the Settings tier above is forbidden.
`Makefile`, `Dockerfile`, `docker-compose.yml` carry **no tier entry**:
ordinary files, judged only by the decision table.

### 7.2 INJECTION_PATTERNS (curated subset; source map in `tmp/pattern-source.md`)

**deny:** `/dev/tcp`, `/dev/udp` substrings; `LD_PRELOAD` /
`LD_LIBRARY_PATH` assignments; `PATH=` override whose value lacks
`$PATH`; `HISTFILE` / `.bash_history` / `HISTSIZE=0`; null byte; control
characters; non-ASCII whitespace.

**Rejected as too noisy for daily work:** `$()`, backticks, `<()`, `>()`,
`${}`, `$((`, `$IFS`, `$'…'`, `\; \| \&`, brace expansion, `\x \u`
escapes, base64-in-pipe. **Owned by `no-inline-scripts`:** `eval`,
`source`, pipe-to-shell/interpreter, dot-sourcing (sanctioned file-exec
pattern).

### 7.3 TAINT (2 rules)

| Source | Sink | Verdict |
|---|---|---|
| Secrets-tier arg | network command (`curl`/`wget`/`nc`/`ssh` with `-d`/`--data`/`-F`/`-T`/`@file`) | **deny** |
| network download (`curl`/`wget` `-o`/`-O`/`--output-document`) | file write outside projectRoot | **ask**; in-project → allow |

Deferred: download→execution (owned by no-inline-scripts), env→network
(legitimate `$TOKEN` headers), any_read→network (too broad).

### 7.4 INTENTS (~45 commands; wrappers transparent)

- **read:** cat, head, tail, less, more, wc, stat, file, du, df, find,
  ls, tree, grep, rg, diff, md5sum, shasum
- **write:** tee, cp, mv, touch, mkdir, ln, chmod, chown, truncate, dd,
  rsync, install, tar
- **delete:** rm, rmdir, shred, unlink
- **network:** curl, wget, ssh, scp, sftp, nc
- **wrappers** (skip to the inner command): sudo, env, nice, nohup,
  timeout, xargs
- Unknown command → no intent: only 7.1/7.2/7.3 checks apply (fail-open
  posture — unknown commands are not pre-punished).
- Redirection targets (`>`, `>>`) count as write-intent targets.

### 7.5 DECISION table (scope vs projectRoot; first match wins)

Companion rule (lives in the git-readonly policy, listed here because it
closes the same vector): **the whole `git hook` subcommand → deny**
(`git hook run`, `git hook list`, any argument). `run` executes
`.git/hooks/<name>` by name, so no path appears in the args for a
filesystem scan to catch; `list` is reconnaissance of the same directory.
The plumbing command has no legitimate agent use.

| # | Condition | Verdict |
|---|---|---|
| 1 | Scope `/` (filesystem root), any intent | deny |
| 2 | Any §7.1 sensitive-path hit (tier verdict applies: read and/or write) | deny |
| 3 | Injection pattern (§7.2) | deny |
| 4 | Taint: secrets→network (§7.3) | deny |
| 5 | write/delete targeting Home as a whole (`~`, `$HOME`, no tail) | deny |
| 6 | write/delete in system prefixes (`/etc /usr /bin /sbin /lib /var /opt /proc /sys /boot`) | deny |
| 7 | write to PersonalConfig tier (§7.1) outside projectRoot | deny |
| 8 | read targeting Home as a whole | ask |
| 9 | Taint: download→write outside projectRoot | ask |
| 10 | write/delete outside projectRoot | ask |
| 11 | everything else (incl. any read outside projectRoot, any non-Secrets op in-project) | allow |

## 8. Behavior changes vs today

| Command | Today (policy disabled: all allow) | v2 |
|---|---|---|
| `cat ../../README.md` (ordinary read outside cwd) | allow | **allow** (the pain, fixed) |
| `cat .env` in-project | allow | **deny** (intentional; agent must ask the user) |
| `ls /etc` | allow | allow (non-System-tier system read) |
| `cat /etc/passwd` | allow | **deny** |
| `tee /tmp/notes` (write outside project) | allow | **ask** |
| `rm -rf ~/` / `rm -rf /` | allow | **deny** |
| `curl -o /tmp/x.tar …` | allow | **ask** |
| `cat .env \| curl -d @- …` | allow | **deny** |
| `echo $X \| base64` and other daily constructs | allow | allow (7.2 rejects list) |
| `Read ~/.claude/settings.json`, `Edit` of it | allow (unguarded channel) | **deny** |
| `tee .git/hooks/pre-commit` / Write into `.git/hooks/` | allow | **deny** |
| Authoring `.claude/skills/…`, `.claude/rules/…` | allow | allow |

## 9. Error handling

Unchanged fail-open posture: unparseable command → null; any policy throw
→ catch in `runHook` → allow. A broken guard must not break Bash or file
tools.

## 10. Testing

- `tests/fixtures/filesystem.ts` → `{ DENY, ASK, ALLOW }` (fixtures are
  own data; the reference corpus is not copied — see
  `tmp/pattern-source.md`).
- `tests/helpers/policy.ts`: `decisionOf(result) → "deny" | "ask" | null`
  next to `reasonOf`.
- New tests: router ask path; tool-channel payloads (`tool_name: "Read"`
  + `file_path`); settings-tier and `.git/config` denies.
- TDD per increment; gates: `bun test`, `tsc -p tsconfig.json --noEmit`,
  `rtk biome check --reporter=concise`, `bun run build-bin`,
  `claude plugin validate .`.
- Live smokes after rebuild: (1) binary fed an ask-case payload via
  redirect file returns `permissionDecision: "ask"`; (2) in-session: an
  ask-class Bash call under `bypassPermissions` shows a permission prompt
  (user observes); (3) `Read` of `/etc/passwd` denied in-session;
  (4) `/reload-plugins --force` picks up the new matcher.

## 11. Considered and deferred

- Score engine (0-100, weights, thresholds) — rejected: calibration
  drift risk over owner absolutes; deny/ask tables are explicit.
- Reference-extras (attack-technique mappings, custom rule files,
  binary-capability tables, shell-specific rule sets) — out of scope
  (full list in `tmp/pattern-source.md`).
- `Grep`/`Glob` tool channel — pattern args, too noisy; revisit if
  needed.
- Guard self-protection (plugin-cache write protection) — revisit
  separately.
- env→network taint — legitimate API-header use breaks.

## 12. Files touched

| File | Change |
|---|---|
| `packages/cli-hook/src/core/decision.ts` | + `ask(reason)` |
| `packages/cli-hook/src/core/policy.ts` | `PolicyCheckResult` widen; `PolicyContext` + `projectRoot` |
| `packages/cli-hook/src/core/payload.ts` | + `filePath` extraction |
| `packages/cli-hook/src/run-hook.ts` | router order; tool-channel branch; uncomment filesystemPolicy |
| `packages/cli-hook/src/policies/filesystem.ts` | full v2 rewrite (tables §7) |
| `packages/cli-hook/src/policies/git-readonly.ts` | + deny the `git hook` subcommand entirely (name-based `.git/hooks` run/list, §7.5 companion rule) |
| `packages/cli-hook/tests/fixtures/filesystem.ts` | DENY/ASK/ALLOW tables |
| `packages/cli-hook/tests/filesystem.test.ts` | restructure + tool-channel tests |
| `packages/cli-hook/tests/helpers/policy.ts` | + `decisionOf` |
| `plugins/security-guard/hooks/hooks.json` | matcher `Bash\|Read\|Edit\|Write\|NotebookEdit` |
| `plugins/security-guard/recommended-settings.json` | ready-to-merge global deny block (§6.1) |
| `tmp/pattern-source.md` (git-ignored) | pattern-source reference; mandatory reading for implementer and reviewer (§2) |
| `plugins/security-guard/README.md` | document v2 policy set, tool channel, settings layer |
