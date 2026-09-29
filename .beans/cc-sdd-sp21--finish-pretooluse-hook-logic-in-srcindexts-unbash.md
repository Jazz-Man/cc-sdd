---
# cc-sdd-sp21
title: Finish PreToolUse hook logic in src/index.ts (unbash guard + bun tests)
status: in-progress
type: task
priority: normal
created_at: 2026-09-29T11:00:21Z
updated_at: 2026-09-29T11:00:26Z
---

Complete findViolation/classify/deny in src/index.ts: universal AST walk over unbash types, classify throws plain Error (drop src/error.ts), remove in-file ALLOW/DENY fixtures and debug noise (keep src/debug.ts file, remove its import; entrypoint stays commented). Tests in root tests/ via bun-test skill: unit ALLOW/DENY fixtures with fixed projectDir, deny() shape, e2e stdin driver via Bun.spawn. Verify: bun test, tsc, biome.

## Brief

- [ ] Rewrite words() as universal AST walk (Word = string text+value, yield value; recurse otherwise)
- [ ] classify throws plain Error (4 checks unchanged); findViolation returns e.message
- [ ] Fail-open: parse throw or ast.errors non-empty => null
- [ ] Clean index.ts: drop ALLOW/DENY, DENY loop, console.logs, dead consts, error.ts/debug.ts imports; delete src/error.ts; entrypoint stays commented; export deny
- [ ] tests/find-violation.test.ts: ALLOW => null, DENY => string (fixed /proj), deny() shape
- [ ] e2e stdin driver via Bun.spawn (allow: empty stdout; deny: JSON)
- [ ] Verify: bun test, tsc, biome
