# security-guard

Mechanical Bash guard for Claude Code. One `PreToolUse` hook (matcher `Bash`)
pipes the hook payload into the `claude-code-cli-hook` policy binary
(`packages/cli-hook` in this repo), which parses the shell command into an AST
and runs three policies in a fixed order — first decision wins:

1. **filesystem** — dangerous filesystem operations (unsafe devices, writes
   escaping the project via `$HOME`/`$TMPDIR`/… resolution, …)
2. **no-deps** — dependency installs/updates/removals (pip/uv, npm/pnpm/yarn,
   bun, cargo, brew, gem, go, swift, composer, …)
3. **git-readonly** — every git write subcommand (`commit`, `push`, `tag
   <name>`, bare `git branch x`, …); only read-only git passes

A violation denies the call with a `permissionDecisionReason` naming the
policy. Everything else — non-Bash tools, benign commands, malformed payloads,
and any internal error — **fails open** (silent allow): a broken guard must
never brick Bash usage.

## Prerequisite (build the binary)

The plugin wires the connection; it does not build the binary. Build it from
this repo:

```bash
cd packages/cli-hook && bun run build-bin
```

That compiles `src/main.ts` into `~/.local/bin/claude-code-cli-hook`
(bun-darwin-arm64 bytecode, sourcemap linked). The hook invokes it **by
name**, so `~/.local/bin` must be on `PATH` (verify with
`command -v claude-code-cli-hook`). If the binary is missing, the hook fails
non-blockingly and Bash calls proceed unguarded.

## Runtime contract of the binary (hard-won lessons)

- stdin carries the hook JSON; the decision JSON goes to **stdout** (exit 0);
  no output means allow. Diagnostics go to **stderr only** — stdout is
  protocol.
- **Never gate the stdin read on `Bun.stdin.exists()`**: that call is
  interactive-TTY detection and returns false in the hook context (payload
  piped, then closed) — it once made the binary exit before any policy,
  silently allowing everything (fixed 2026-10-08).
- After changing `main.ts` or policies, **rebuild** (`bun run build-bin`) —
  the hook runs the compiled binary, not the source.

## Lifecycle notes

- A plugin's hooks attach at **session start**. Enabling the plugin
  mid-session does not wire its `PreToolUse` dispatcher — `/reload-plugins`
  reports a hook count, but the guard only goes live in the next session (or
  a `--force` reload that applies hook changes).
- This plugin replaces the three user-scope `PreToolUse`/`Bash` hooks in
  `~/.claude/settings.json` (`git-readonly.sh`, `no-deps.sh`, the Bash
  `deny.sh` entry) — the binary is their consolidated port. Remove those
  entries once this plugin is enabled. The `WebSearch|WebFetch` deny hook is
  a different policy and stays where it is.
