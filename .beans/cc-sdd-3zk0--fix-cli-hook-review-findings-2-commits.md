---
# cc-sdd-3zk0
title: Fix cli-hook review findings (2 commits)
status: completed
type: task
priority: normal
created_at: 2026-10-15T14:42:54Z
updated_at: 2026-10-15T15:08:14Z
---

Round 1 (behavior, TDD): git global-flag bypass (subcommandOf), stash flags-only push, UNCONDITIONAL/MUTATING table gaps, version-suffix baseName for interpreter/deps lookups (python3.13, node20, perl5.34), fish, uvx/npm exec-create-init/yarn global in no-deps. Round 2 (no behavior change): node:path in filesystem classifier, dead code removal (debug.ts, zombie prompt-builder tests, decision.ts test-only surface, findViolation env default), PreToolUseHookInput-derived ParsedHookInput, build.ts exit codes, tests/helpers/policy.ts DRY harness, bare-interpreter deny pin. Live probes must flip to deny. Review: merged my pass + code-review agent.

## Round 2 report (no behavior change, one pinned bugfix)

filesystem.ts rewritten on node:path: normalize once per word, isAbsolute, relative()-based isUnderProject; relativeEscapes, TRAILING_SLASHES and hand-rolled prefix logic deleted; tilde checked pre-normalize (normalize would mangle it). One deliberate delta pinned by test: double-slash spellings (cat proj-proj-slash file) no longer falsely denied. Dead code removed: debug.ts, zombie prompt-builder tests (owner had already deleted most), findViolation export with its CLAUDE_PROJECT_DIR default (env channel fully retired; find-violation.test.ts migrated to filesystem.test.ts via the policy). decision.ts trimmed to PreToolUse-only (PreModelSwitch overloads and PermissionEvent machinery out). ParsedHookInput.cwd now derives from the SDK PreToolUseHookInput contract (the agent-types re-export gained its consumer). build.ts: success checked with non-zero exit on failure, unscoped-name guard replaces the as-cast. tests/helpers/policy.ts shared harness (policyCheck/reasonOf), four policy test files migrated; REASON constants stay verbatim per ruling. Bare bun/node REPL deny pinned. Gates: 323/0, tsc clean, biome clean. Binary rebuilt (build.ts output now asserts success:true); live smoke: round-1 denials intact, double-slash allow confirmed.
