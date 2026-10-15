---
# cc-sdd-hlx0
title: Extract policy test fixtures into tests/fixtures
status: completed
type: task
priority: normal
created_at: 2026-10-15T15:15:34Z
updated_at: 2026-10-15T15:18:39Z
---

Move DENY/ALLOW command tables of the four policy tests (filesystem, git-readonly, no-deps, no-inline-scripts) into tests/fixtures/<policy>.ts TS modules; biome override disables linter+assist for that folder (formatter stays); inline biome-ignores on fixture strings removed; REASON pins stay in tests. Pure data move - 323/0 must hold.

## Summary of Changes

Four policy fixture modules created (tests/fixtures/filesystem.ts, git-readonly.ts, no-deps.ts, no-inline-scripts.ts) exporting DENY/ALLOW as string[] tables with their explanatory comments; the four test files now import them and hold only mechanics + REASON pins. biome.json override added for packages/cli-hook/tests/fixtures/** disabling linter+assist (formatter stays on); all inline biome-ignores that guarded fixture strings removed with the move (10 lines gone). Fixture type is string[] (it.each wants a mutable array; readonly failed type-check). Gates: 323/0 unchanged, tsc clean, biome clean including explicit fixtures-folder check (silent). No binary rebuild needed - test-only change.
