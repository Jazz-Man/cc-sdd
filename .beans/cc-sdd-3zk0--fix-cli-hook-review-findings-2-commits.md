---
# cc-sdd-3zk0
title: Fix cli-hook review findings (2 commits)
status: in-progress
type: task
created_at: 2026-10-15T14:42:54Z
updated_at: 2026-10-15T14:42:54Z
---

Round 1 (behavior, TDD): git global-flag bypass (subcommandOf), stash flags-only push, UNCONDITIONAL/MUTATING table gaps, version-suffix baseName for interpreter/deps lookups (python3.13, node20, perl5.34), fish, uvx/npm exec-create-init/yarn global in no-deps. Round 2 (no behavior change): node:path in filesystem classifier, dead code removal (debug.ts, zombie prompt-builder tests, decision.ts test-only surface, findViolation env default), PreToolUseHookInput-derived ParsedHookInput, build.ts exit codes, tests/helpers/policy.ts DRY harness, bare-interpreter deny pin. Live probes must flip to deny. Review: merged my pass + code-review agent.
