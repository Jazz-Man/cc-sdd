# Security guard for Claude Code under bypass permissions

Date: 2026-10-07. Environment: Claude Code CLI on macOS, run almost always with bypass
permissions on (`bypassPermissions` mode / `--dangerously-skip-permissions`). Question under
study: what still binds in that mode, and how to build a full security guard — later a Claude
Code plugin — that blocks reads/writes of sensitive filesystem locations and security-scans
Bash commands.

Method: deep-research workflow (wf_75bb4629-492), bean `cc-sdd-g0im`. 24 claims survived
3-vote adversarial verification; every verifier fetched its primary source live on 2026-10-07.
All statements below trace to official Anthropic docs (code.claude.com) or NVD/GHSA records
unless marked [Inference] or [Unverified]. One claim was refuted in verification (vote 1-2,
list-merge semantics) and is flagged in §7. Doc quotes are verbatim as verified.

Page keys: [hooks-guide] = code.claude.com/docs/en/hooks-guide · [hooks] = /docs/en/hooks ·
[permissions] = /docs/en/permissions · [modes] = /docs/en/permission-modes · [sandbox] =
/docs/en/sandboxing · [settings] = /docs/en/settings · [nvd] =
nvd.nist.gov/vuln/detail/CVE-2026-25724 · [ghsa] = GHSA-4q92-rfm6-2cqx (anthropics/claude-code).

## 1. Executive summary

Two enforcement layers survive bypass permissions, and both are shippable in a plugin. First,
PreToolUse hooks: they fire "before any permission-mode check, in every permission mode," and a
hook that returns `permissionDecision: deny` — or exits 2 — "blocks the tool even in
`bypassPermissions` mode or with `--dangerously-skip-permissions`" [hooks-guide]. Second,
permission deny rules in settings: "Deny rules block in every mode, including
`bypassPermissions`" (allow rules have no effect there) [modes]. What bypass mode suspends is
the interactive layer — prompts, safety checks, and the never-auto-approved write guard on
protected paths (`.git`, `.claude`, `.mcp.json`, shell rc files, `.envrc`, `.npmrc`) [modes] —
which is exactly the gap the guard has to fill. The Bash sandbox is a strong third layer for
shell commands but is off by default, covers no file tools, still allows reading credential
files unless explicitly configured, and is documented as "not a complete isolation boundary"
[sandbox]. The documented residual risks a guard must design around: Bash permission rules
match command text only and are explicitly "not a security boundary" [permissions], and a
timed-out command hook fails open — it does not block the call [hooks].

## 2. What still binds under bypassPermissions

### Hooks — the primary layer

> "`PreToolUse` hooks fire before any permission-mode check, in every permission mode,
> including `dontAsk`. A hook that returns `permissionDecision: deny` blocks the tool even in
> `bypassPermissions` mode or with `--dangerously-skip-permissions`. This lets you enforce
> policy that users can't bypass by changing their permission mode." — [hooks-guide]

> "PreToolUse hooks run before every tool call, whether or not it needs permission." — [hooks]

Hook firing is decoupled from permission evaluation entirely; the docs position this as the
mechanism for policy that survives mode changes. Narrow lifecycle exception:
PreToolUse/PostToolUse skip `EndConversation` calls.

Known reliability caveats (bug reports, not documented contract): hooks failing to initialize
on first startup in bypass mode (Oct 2025), project-level hooks not firing (#100008), hooks
failing open when the executable bit is missing (#94362). Practical reading: make the hook
executable, keep it in user settings, and smoke-test it after install.

### Deny rules — the second layer

> "Deny rules block in every mode, including `bypassPermissions`. Deny and ask rules don't
> apply to `EndConversation` as long as Claude still has at least one other tool it can call.
> Allow rules have no effect in `bypassPermissions`." — [modes]

`--dangerously-skip-permissions` is documented as equivalent to the mode, so both spellings
are covered. Real-world evidence runs toward over-enforcement, not bypass: #91683 shows a
`Read()` deny rule actively prompting under bypassPermissions (labeled regression).

### Suspended: the protected-path write guard

> "`bypassPermissions` mode disables permission prompts and safety checks so tool calls
> execute immediately, including writes to protected paths." — [modes]

The docs' protected-path lists: directories `.git`, `.cargo`, `.claude` (with narrow
exceptions), `--plugin-dir` dirs; files `.gitconfig`, `.bashrc`/`.zshrc`/`.profile`, `.envrc`,
`.npmrc`, `.mcp.json`/`.claude.json`. Elsewhere: "Writes to a small set of paths are never
auto-approved, except in `bypassPermissions` mode [...]". Under bypass, hooks and deny rules
are the remaining defense for exactly these locations — the guard should mirror this list.

### Still prompting in every mode (built-in circuit breakers)

> "Claude Code doesn't auto-approve the following in any mode, including `bypassPermissions`."
> — [modes]

The list: tools matched by an explicit ask rule; `AskUserQuestion` and MCP tools marked
`requiresUserInteraction`; `rm`/`rmdir` targeting a critical path ("which no allow rule or
`PreToolUse` hook allow approves"); cross-session messaging safeguards; and reads outside the
working directories while `permissions.blockReadsOutsideWorkingDirectories` is on —
"recognized file-reading Bash commands prompt even in auto mode and `bypassPermissions`
mode" (requires v2.1.257+). The critical-path rm circuit breaker in full:

> "Claude Code never lets a `permissions.allow` rule or a `PreToolUse` hook that returns allow
> approve an `rm` or `rmdir` command that targets a critical path, even in modes that skip
> other prompts. This circuit breaker guards against model error. A matching deny rule still
> blocks the command outright." — [modes]

Critical paths: filesystem root, top-level directories, home directory, working directory and
its parents (plus Windows drive roots and `additionalDirectories` globs). Historical note: a
critical-path rm bypass via `bash -c`/`sh -c` inline scripts under bypass existed and was
fixed in v2.1.288; the docs now cover nested commands and inline `-c` scripts under this
check.

## 3. PreToolUse mechanics for the guard

### Blocking semantics

- Exit code 2 + reason on stderr blocks the tool call. "Exit 2 means a blocking error. On
  events that can block, exit 2 blocks whether or not you print JSON: even a JSON
  `permissionDecision` of `allow` can't override it." A hook that blocks by exiting 2 "routes
  the same way as `deny`: Claude sees the stderr message as the denial reason." — [hooks]
- "A blocking hook also takes precedence over allow rules. A hook that exits with code 2 stops
  the tool call before permission rules are evaluated, so the block applies even when an allow
  rule would otherwise let the call proceed." — [permissions]
- Multiple PreToolUse hooks returning different decisions: "precedence is `deny` > `defer` >
  `ask` > `allow`." — [hooks] The most restrictive answer wins; several guard hooks compose
  safely.

### Structured JSON output

`permissionDecision` values on PreToolUse: `allow` (skip the interactive prompt — "Deny and
ask rules, including enterprise managed deny lists, still apply"), `deny` ("cancel the tool
call and send the reason to Claude"), `ask` ("show the permission prompt to the user as
normal"), plus `defer` only in non-interactive `-p` mode [hooks-guide, hooks]. The decision
must be nested inside `hookSpecificOutput`; returned at the top level, "the JSON still parses,
and Claude Code ignores the misplaced fields without reporting an error" — only
`claude --debug` shows a warning [hooks]. A silent-ignore failure mode: guard hooks should
emit correctly nested JSON or use exit 2, and be tested once installed.

### The docs' own guard patterns

- Protected-file blocker: "Prevent Claude from modifying sensitive files like `.env`,
  `package-lock.json`, or anything in `.git/`. [...] The script checks the target file path
  against a list of protected patterns and exits with code 2 to block the edit." — [hooks-guide].
  The shipped example is `.claude/hooks/protect-files.sh`: reads `.tool_input.file_path` via
  jq, matches `PROTECTED_PATTERNS=(.env package-lock.json .git/)` with substring globbing,
  writes `Blocked: ...` to stderr, exits 2; registered on matcher `Edit|Write`. (Substring
  matching, no canonicalization — a starting point, not the finished guard; see §4.)
- Bash allow + hook reject pairing: "To run all Bash commands without prompts except for a few
  you want blocked, add Bash to your allow list and register a PreToolUse hook that rejects
  those specific commands." — [permissions]. This is the documented architecture for the
  user's "bypass on, but block the dangerous stuff" requirement.

### The mods caveat

"A mod you install that handles `tool.check` can approve a call that your `PreToolUse` hook
blocked, unless the hook is in managed settings" [hooks-guide, permissions]. On a personal
machine with no mods installed the vector is moot; if mods ever enter the picture, guard hooks
belong in managed settings.

## 4. Path handling and canonicalization

### What the hook receives

> "For the file tools `Write`, `Edit`, and `Read`, `tool_input.file_path` is always absolute:
> Claude Code expands `~` and relative paths before hooks run, so a hook that matches on paths
> can't be bypassed via `~` or a relative spelling of the same path." — [hooks]

`../` segments are collapsed before the hook fires (issue #59829 repro:
`Read(./p1-child-dir/../src/file.ts)` arrives as `/home/claude/projects/p1/src/file.ts`).
Windows-only caveat (backslash separators need normalizing) does not apply to the macOS
target. Version caveat: #59829 flags the normalization as a change from earlier versions, and
#93439 (open) reports Read of binary files never triggering PreToolUse in the Desktop App Code
tab — a surface-specific gap.

### Symlinks — two different stories

Permission rules evaluate both paths: "Deny rules: apply when either the requested path or the
file it resolves to matches. A symlink that points to a denied file is itself denied. For
example, with `Read(./project/**)` allowed and `Read(~/.ssh/**)` denied, a symlink at
`./project/key` pointing to `~/.ssh/id_rsa` is blocked" [permissions]. On macOS/Linux, a deny
or ask rule written through a symlinked directory with a `//`, `~/`, or `/` pattern also
applies at the directory's real location — `Read(//etc/**)` blocks `/private/etc/hosts` too
(v2.1.268+). This is the documented answer to the `/tmp` vs `/private/tmp` question, at the
rules layer.

Hooks get no such dual evaluation: the docs guarantee an absolute path, not a
symlink-resolved one. [Inference] a guard hook must canonicalize (`realpath`/
`python -c 'import os,sys;print(os.path.realpath(sys.argv[1]))'`) before matching, or a
symlink planted inside the project defeats the pattern list. The CVE history says this class
of bug is real, not theoretical.

### CVE-2026-25724 / GHSA-4q92-rfm6-2cqx (the precedent)

> "Prior to version 2.1.7, Claude Code failed to strictly enforce deny rules configured in
> settings.json when accessing files through symbolic links. If a user explicitly denied
> Claude Code access to a file (such as /etc/passwd) and Claude Code had access to a symbolic
> link pointing to that file, it was possible for Claude Code to read the restricted file
> through the symlink without triggering deny rule enforcement. This issue has been patched in
> version 2.1.7." — [nvd]

NVD CPE marks all Claude Code versions below 2.1.7 affected; the earlier CVE-2025-59829
(below 1.0.120) was the same class. Severity scoring disagrees across sources (CNA CVSS 4.0
2.3 LOW vs NVD CVSS 3.1 7.5 HIGH) — the mechanism, not the score, matters here. Current
installs on auto-update are patched; the relevance is as motivation for canonicalization in
custom hooks.

### Uncovered

[Unverified] case-insensitive APFS matching: no verified claim addresses whether deny rules or
hook pattern lists need case normalization on macOS. [Inference] a guard should compare
case-insensitively on darwin as cheap insurance; whether Claude Code's own rule engine already
does so is untested.

## 5. Bash: rules are command-text matching, not a boundary

> "A Bash rule matches the command text Claude writes, after Claude Code splits compound
> commands and strips wrappers. It doesn't match the same program invoked in a different form,
> so a deny or ask rule covers the invocation Claude usually produces and isn't a security
> boundary around the program." — [permissions]

The docs' own evasion table: `Bash(git push --force*)` is evaded by `git -C . push --force`;
`Bash(rm*)` by `unlink` or absolute-path `rm`. Matching does split compounds, evaluate
subcommands/command substitution, and strip `bash -c` wrappers — and still is not a boundary.
The docs then hand the problem to exactly the two mechanisms this guard planned to use:

> "For filesystem and network enforcement that doesn't depend on the command text, use
> sandboxing. To inspect the full command text with your own logic before it runs, use a
> PreToolUse hook." — [permissions]

Secondary-source enforcement bugs reinforce the best-effort status: Bash deny rules reportedly
bypassed after ~50 chained subcommands (adversa.ai), plus a Reddit report of deny-rule bypass.
[Unverified] — bug reports in the matching layer, not documented behavior; treat the Bash
rule layer as defense-in-depth, never the only control on a command.

## 6. The Bash sandbox (macOS Seatbelt)

### Scope — shell commands only

> "The sandbox covers shell commands only. Claude's file tools, MCP servers, and hooks run
> outside it. [...] Built-in file and web tools: tools such as Read, Edit, Write, WebFetch,
> and WebSearch follow permission rules instead. [...] Other processes Claude Code starts:
> command hooks, local MCP servers, plugin monitors, LSP servers, and helper commands [...]
> run with your full access." — [sandbox]

Consequence for the guard: sandboxing and hooks are complementary, not redundant — the sandbox
never sees a `Read(~/.ssh/id_rsa)` tool call; only deny rules and PreToolUse hooks do. And
guard hooks themselves run unsandboxed with full access, which they need in order to read
their own config.

### Defaults

> "The sandbox is off by default. To turn it on, run `/sandbox` in a session [...] or set
> `sandbox.enabled` to `true` in a settings file such as `~/.claude/settings.json`. [...]
> macOS: sandboxing uses the built-in Seatbelt framework." — [sandbox]

Linux/WSL2 uses bubblewrap + socat; native Windows runs commands unsandboxed.

### Read policy — credentials are readable unless listed

> "Default read behavior: read access to the entire computer, except certain denied
> directories. This default still allows reading credential files, so protect credentials you
> don't want commands to read. [...] There is no built-in credential deny list, so only the
> files and variables you list are restricted." — [sandbox]

The levers: `sandbox.credentials` entries with mode `deny` or `mask`, `sandbox.filesystem.denyRead`
/ `denyWrite`, and `permissions.blockReadsOutsideWorkingDirectories` (v2.1.257+). The docs'
own examples of what to list: `~/.aws`, `~/.ssh`. This is the direct answer to the
secret-exfiltration-over-Bash threat: without explicit entries, a sandboxed `cat ~/.aws/credentials`
succeeds.

### Behavior under bypassPermissions

Escape hatches open up [sandbox]: the unsandboxed retry via `dangerouslyDisableSandbox` "runs
without a prompt"; hosts outside `allowedDomains` are permitted; commands matching
`excludedCommands` run without a prompt. The countermeasures that hold in every mode:

> "In `bypassPermissions` mode, hosts outside your allowed domains are allowed unless one of
> them is on [strictAllowlist or allowManagedDomainsOnly... the built-in sandbox proxy refuses
> the connection in every permission mode]. A connection to a host in `deniedDomains` is
> refused in every permission mode too. [...] add an ask rule for
> `Bash(dangerouslyDisableSandbox:true)` to be prompted on Bash retries. You get the prompt in
> auto mode and `bypassPermissions` mode too, and the rule takes precedence over a matching
> allow rule." — [sandbox]

And `allowUnsandboxedCommands: false` disables the retry entirely (shown as "Strict sandbox
mode" in `/sandbox`). Scope caveat from issue #90355 (empirically confirmed on v2.1.250):
`strictAllowlist` is honored only from user/managed/CLI settings — a project-level copy is
silently ignored — and `allowManagedDomainsOnly` is managed-settings-only. Place these keys
accordingly.

### Documented limits

> "Sandboxing reduces risk but is not a complete isolation boundary. Review the limitations
> below before relying on it as a hard security control." — [sandbox]

The enumerated limits: the proxy "does not terminate or inspect TLS on outbound traffic"
(encrypted exfiltration content is not examined); allowing `/var/run/docker.sock` "effectively
grants access to the host system"; broad filesystem write permissions (dirs in `$PATH`,
`.bashrc`/`.zshrc`) enable privilege escalation; macOS `allowAppleEvents` removes
code-execution isolation (sandboxed commands can launch unsandboxed apps). One built-in hard
rule inside the sandbox: protected paths — writes to `.claude` settings/skills/hooks,
`.mcp.json`, `~/.claude`, `.credentials.json` are denied even inside writable directories,
because "A command that could edit those files could grant itself permissions, or add a hook
or MCP server that Claude Code runs outside the sandbox."

## 7. Placement and precedence

> "When the same key appears in more than one place, Claude Code uses the value from the
> highest level that sets it. [...] In order, highest precedence first: 1. Managed settings
> [...] 2. Command line arguments [...] 3. Project local settings (.claude/settings.local.json)
> [...] 4. Shared project settings (.claude/settings.json) [...] 5. User settings
> (~/.claude/settings.json)." — [settings]

For the guard this cuts both ways. A project-level file (rank 3-4) overrides the user-level
scalar keys of a guard installed at rank 5 — including `disableAllHooks`-class switches — so a
compromised or untrusted project checkout can weaken a user-scoped guard's configuration.
[Inference] for a single-user personal setup, user settings is the practical floor (the user
controls what checkouts exist), and managed settings is the ceiling if tamper-resistance
against project files or mods ever matters.

Merge semantics are the open wound. The hooks reference states hook entries "merge across
settings levels rather than replacing each other" (user/project/local add hooks without
removing managed ones) — that much the claim-23 verification confirmed. But the parallel claim
that list-type keys like `permissions.allow` merge across all files was refuted in this
research's verification (vote 1-2): the docs carry a "Lists merge instead of overriding"
section, yet the specific merge behavior for permission lists did not survive.
[Unverified] — test on the installed version before relying on list merging; do not design
the guard on the assumption that a lower file's deny entries survive a higher file writing the
same key.

## 8. Hook failure modes and residual gaps

- **Timeout fails open.** "A timed-out `command`, `http`, or `mcp_tool` hook doesn't block the
  tool call. The call continues through the normal permission flow, so don't count on a
  stalled hook to act as a gate." [hooks] Defaults: 600 s command, 30 s http/mcp_tool; only
  Agent SDK callback hooks block on timeout — a plugin ships command hooks. Keep guard hooks
  fast, dependency-light, and locally executable.
- **Read deny coverage and floors.** "A `Read` deny rule also blocks the Edit and Write tools
  on the same path, including creating a new file there. NotebookEdit isn't covered, so add an
  `Edit` deny rule for paths no tool may change." [permissions] Version floors: v2.1.208+ for
  edits, v2.1.228+ for writes. Read deny extends to Grep/Glob only best-effort, and does not
  gate Bash (`cat .env` is a Bash problem, §5-6).
- **Bash writes through symlinks** are outside the Read/Edit path checks [permissions] — the
  Bash scanner hook owns that surface.
- **`Write`/`NotebookEdit`/`Glob`/`WebFetch(domain:...)` path rules are never consulted** —
  "Claude Code checks file permissions against `Edit(path)` and `Read(path)` rules only"
  [permissions]. Write the deny rules as `Read(...)`/`Edit(...)`, not `Write(...)`.
- **Desktop App Code tab**: binary-file Reads reportedly never trigger PreToolUse (#93439,
  open) — a known surface gap if the guard must cover the desktop app.

## 9. What this research did not establish

- No verified claims on detecting obfuscated exfiltration (curl/wget pipes, base64/hex
  payloads, DNS exfiltration). The enforcement machinery is documented; the attacker-technique
  catalog and scanner signature design were not verified. The sandbox's no-TLS-inspection
  limit [sandbox] means content-based detection at the proxy is not available either.
- No verified claims on real-world attack vectors — prompt injection leading to secret
  exfiltration, malicious MCP servers, poisoned web content. Nothing from research angle 5
  survived verification.
- No verified inventory of existing OSS Claude Code security hook/plugin projects.
- macOS Keychain, shell history, password-manager stores: the verified docs material covers
  `~/.ssh` and `~/.aws` examples only; Keychain-specific behavior (e.g., `security` CLI access
  from sandboxed commands) is unverified.
- Case-insensitive APFS path matching: unverified (§4).

## 10. Design implications for the plugin

[Inference] — the whole section is synthesis of the verified facts above into design advice,
not doc text.

1. **Core: PreToolUse command hooks** with per-tool matchers — `Read|Edit|Write` (hard
   guarantee: absolute `file_path`), `Glob|Grep` (best-effort), `Bash` (full-text scan),
   optionally `WebFetch`. Deny via exit 2 with an actionable stderr reason (the reason reaches
   Claude and it can adapt), or nested-JSON `permissionDecision: deny`. Both hold under
   `--dangerously-skip-permissions` (§2-3).
2. **Canonicalize before matching**: `realpath` every path, then compare; on darwin compare
   case-insensitively as insurance (§4). Match the resolved path, not the spelled one.
3. **Mirror the protected lists**: the docs' own protected-path set (`.git`, `.claude`,
   `.mcp.json`, rc files, `.envrc`, `.npmrc`, `.gitconfig`) plus the user's secret set
   (`~/.ssh/**`, `~/.aws/**`, `.env*`, `~/.gnupg/**`, shell history, password-manager dirs).
4. **Duplicate the policy as Read/Edit deny rules** in user settings — an independent second
   layer that also blocks new-file creation on those paths and covers the surfaces where a
   hook might fail open (§2, §8).
5. **Bash scanner**: inspect the full command text (the docs' designated lever, §5); deny
   secret-dump patterns (`cat`/`head`/`less` on secret paths, `history`, `env`, credential
   vars), egress-with-payload patterns (`curl`/`wget` with `-d`/`--data`/pipes), and the
   classics (`sudo`, `rm -rf` on broad paths, `chmod -R`, `git push --force`). Accept that
   re-spelling evades text matching; pair with the sandbox rather than chasing total coverage.
6. **Sandbox hardening shipped as settings**: `sandbox.enabled: true`,
   `sandbox.credentials` deny list, `sandbox.filesystem.denyRead` for secret dirs,
   `allowUnsandboxedCommands: false`, `deniedDomains` (and `strictAllowlist` at user scope —
   honored only there, §6). Add the ask rule for `Bash(dangerouslyDisableSandbox:true)` if
   strict mode is ever relaxed.
7. **Fail-fast hooks**: plain `sh` + `jq`, no network, short timeout budget — timeout is
   fail-open (§8).
8. **Placement**: user settings as the floor; document managed settings as the hardening step
   if mods or untrusted project checkouts enter the picture (§3, §7).
9. **Verify on the installed version**: several cited behaviors carry version floors
   (2.1.208/2.1.228 read-deny coverage, 2.1.257 blockReads, 2.1.268 symlinked-dir rules,
   2.1.288 inline `-c` critical-path fix), and merge semantics are unresolved — test the
   installed build, not the docs.

## 11. Empirical validation on v2.1.285 (2026-10-07)

Post-research hands-on test run after this report recommended verifying
doc-verified behavior on the installed build (§10.9). Setup: Claude Code
v2.1.285 on macOS, `permissions.blockReadsOutsideWorkingDirectories` set in
global user settings, session launched with working directory `~/.claude`,
target files under `/Users/vasilsokolik/www/cc-sdd/` (outside the working
directories). The session ran under the user's usual bypass-permissions setup;
the exact mode is not conclusively recorded in the transcript ([Unverified] —
it affects the reading of result 3). Full test log:
`blockReadsOutsideWorkingDirectories-TEST.md` at the repo root.

Observed:

1. **Read of an outside-working-dir file — blocked.** The Read tool returned a
   permission error naming `blockReadsOutsideWorkingDirectories`. Empirically
   confirms the §2 claim on the installed build: the setting binds the Read
   tool from global settings.
2. **Write/Edit of an existing outside file — blocked, transitively.** Both
   Write and Edit failed with "File has not been read yet. Read it first before
   writing to it." — the harness read-before-write lock, not a write permission
   rule. New finding, absent from the doc-based research: the read block
   cascades onto modification of existing files. Fragile protection: it holds
   only because Read is the sole remaining way to satisfy the read-first
   requirement — [Inference] Bash (`cat >`, `tee`, heredoc) sidesteps the lock
   entirely.
3. **Bash `cat` of the outside file — succeeded, no prompt.** Confirms §8
   ("does not gate Bash") in practice. This diverges from the doc-verified
   permission-modes quote "recognized file-reading Bash commands prompt even in
   auto mode and `bypassPermissions` mode" (§2): either the test session was not
   in bypass mode and the prompt went unrecorded in the transcript, or the
   installed build does not treat `cat` as a "recognized file-reading command"
   worth prompting under bypass ([Unverified]). Either way the design
   conclusion stands: the Bash surface needs its own controls (§5, §6) —
   blockReads contributes nothing there.

Gaps the test opened:

- **New-file creation outside the working directories — untested.** [Inference]
  Write succeeds: the setting is read-scoped by name and observed behavior, and
  the read-first requirement does not apply to files that do not exist yet. The
  mitigating control is already in §8: `Read(...)`/`Edit(...)` deny rules block
  file creation on the matched paths (v2.1.228+, satisfied by 2.1.285) — secret
  paths get deny rules regardless of blockReads.
- **Config self-modification vector.** The test session's working directory was
  `~/.claude`, which contains the global `settings.json` the setting lives in:
  reading it is legal (inside the working dir), and under bypass the
  protected-path write guard is suspended (§2) — whether `~/.claude/settings.json`
  belongs to the never-auto-approved set is [Unverified]. An agent could read
  the settings, append itself an allow rule, and rewrite the file — the same
  reasoning the sandbox docs use to protect `~/.claude` inside the sandbox (§6).
  Design implication for the plugin: guard configuration belongs in managed
  settings, or a PreToolUse hook must block writes to the guard's own config.

Cosmetic note from the log: the transcript rendered one Write call as
`Create(...)` — same write path, same read-first error; the label differs, the
enforcement does not.

## Sources

Primary (all fetched live by verifiers on 2026-10-07):

- https://code.claude.com/docs/en/hooks-guide
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/permissions
- https://code.claude.com/docs/en/permission-modes
- https://code.claude.com/docs/en/sandboxing
- https://code.claude.com/docs/en/settings
- https://nvd.nist.gov/vuln/detail/CVE-2026-25724 and NVD API record
- GHSA-4q92-rfm6-2cqx (anthropics/claude-code, npm @anthropic-ai/claude-code)

Secondary corroboration cited by verifiers (not independently re-verified here): cybedefend.com,
hidekazu-konishi.com, morphllm.com, terra.security (CVE discoverer), datacamp.com,
arrangeactassert.com, adversa.ai, SentinelOne, Rapid7, Snyk; GitHub issues anthropics/claude-code
#59829, #83877, #90355, #91683, #93439, #94362, #100008, #24327, #47810.
