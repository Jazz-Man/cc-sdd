# security-guard

Mechanical Bash guard for Claude Code. One `PreToolUse` hook (matcher `Bash`)
pipes the hook payload into the `claude-code-cli-hook` policy binary, which
parses the shell command into an AST and runs three policies in a fixed order
— first decision wins:

1. **filesystem** — dangerous filesystem operations (unsafe devices,
   writes escaping the project via `$HOME`/`$TMPDIR`/… resolution, …)
2. **no-deps** — dependency installs/updates/removals (pip/uv, npm/pnpm/yarn,
   bun, cargo, brew, gem, go, swift, composer, …)
3. **git-readonly** — every git write subcommand (add/commit/push/merge/…);
   only read-only git passes

A violation denies the call with a `permissionDecisionReason` that names the
policy and tells the agent to ask the user instead. Everything else —
including malformed payloads, non-Bash tools, and any internal error —
**fails open** (silent allow): a broken guard must never brick Bash usage.

## Prerequisite (build the binary)

The plugin configures the connection; it does not ship or build the binary.
Build it from this repo:

```bash
cd packages/cli-hook && bun run build-bin
```

That compiles `src/main.ts` into `~/.local/bin/claude-code-cli-hook`
(bun-darwin-arm64 bytecode). The hook invokes it **by name** — `~/.local/bin`
must be on `PATH` (it is, on this machine; verify with
`command -v claude-code-cli-hook`). If the binary is missing, the hook errors
non-blockingly and Bash calls proceed unguarded.

## Migration from the per-policy shell hooks

This plugin replaces the three user-scope `PreToolUse`/`Bash` hooks in
`~/.claude/settings.json` (`git-readonly.sh`, `no-deps.sh`, the Bash
`deny.sh` entry) — the binary is their consolidated port. Remove those
entries yourself once the plugin is enabled. The `WebSearch|WebFetch` deny
hook is a different policy and stays where it is.
