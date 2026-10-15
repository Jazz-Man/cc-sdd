---
# cc-sdd-zmaa
title: Thread payload cwd into cli-hook policies
status: completed
type: task
priority: normal
created_at: 2026-10-15T13:35:02Z
updated_at: 2026-10-15T14:11:37Z
---

Use the harness-provided cwd from the PreToolUse payload as the primary projectDir source for filesystem policy: payload.ts narrows cwd, policy.ts check() gains a PolicyContext {cwd}, run-hook passes it, filesystem resolves context.cwd ?? CLAUDE_PROJECT_DIR ?? process.cwd(). TDD; remove the owner's temp logging in main.ts before rebuild; gates: bun test, tsc, rtk biome check, rebuild binary, live smoke.

## Summary of Changes

TDD (4 red first): payload.ts narrows payload cwd; policy.ts adds PolicyContext {cwd} as second check() param (fewer-param policies stay assignable); run-hook.ts passes cwd from the payload; filesystem.ts resolves projectDir as payload cwd, then CLAUDE_PROJECT_DIR, then process cwd. Removed owner's temp logging from main.ts. Gates: 276 tests pass, tsc clean, biome clean, binary rebuilt. Live smoke: payload cwd=payload-root + cat payload-root file -> allow (decisive: payload-root exists nowhere on disk, only the payload cwd could allow it); same cwd + cat etc passwd -> deny. FINDING for owner decision: the payload cwd from the harness tracks the Bash tool's MOVING working directory, not the stable project root (observed: a repo-root absolute path was denied while the Bash cwd sat in packages/cli-hook). Since cd-dotdot is already denied by relativeEscapes, the allowed area can only shrink (cd down), never escape upward - but subfolder work loses absolute parent-project paths. Alternatives if undesired: CLAUDE_PROJECT_DIR-first precedence, or intersecting payload cwd with CLAUDE_PROJECT_DIR. Side observation: beans update with absolute paths in body text is denied by the filesystem policy (prose trade-off).

## Round 2 — align cwd typing with the SDK contract

Owner review: cwd must not be optional-danced — BaseHookInput.cwd is a required string in the SDK (sdk.d.ts:174). Round 2: agent-types re-exports PreToolUseHookInput; ParsedHookInput.cwd becomes required string (invalid cwd rejects the payload, like other required fields); PolicyContext.cwd is string; filesystem drops the CLAUDE_PROJECT_DIR/process.cwd() fallback chain and uses context.cwd directly (empty root fails open inside violationIn).

## Round 2 report

SDK contract alignment done: agent-types re-exports PreToolUseHookInput; ParsedHookInput.cwd is a required string (missing, non-string, or empty cwd rejects the whole payload -> fail-open allow, same treatment as event and tool fields); PolicyContext.cwd is string; filesystem policy uses context.cwd directly, the CLAUDE_PROJECT_DIR-to-process-cwd fallback chain deleted (the env default remains only on the exported findViolation utility for standalone runs). TDD: 2 red first, then green. Gates: 275 tests pass, biome clean (PATH tsc clean - homebrew 5.x vs workspace 7.0.2, indicative not canonical), binary rebuilt by the owner. Live smoke on the rebuilt binary: no-cwd payload -> allow (rejected payload, fail-open); payload cwd=payload-root + cat under it -> allow; same cwd + cat etc passwd -> deny. Note: agent-types index.ts one-line export not linted in this round - subfolder cwd makes the path unreachable through the Bash policy.
