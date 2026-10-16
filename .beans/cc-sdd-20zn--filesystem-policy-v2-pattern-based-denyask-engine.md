---
# cc-sdd-20zn
title: Filesystem policy v2 — pattern-based deny/ask engine
status: in-progress
type: feature
priority: high
created_at: 2026-10-15T19:05:06Z
updated_at: 2026-10-15T23:49:20Z
---

Replace the strict outside-cwd filesystem policy with a pattern-based deny/ask engine per spec docs/superpowers/specs/2026-10-15-filesystem-policy-v2-design.md: sensitive-path tiers (Secrets/System/Settings/Git-internals/PersonalConfig), curated injection patterns, taint pair, intent table, 11-rule decision table; new tool channel Read|Edit|Write|NotebookEdit via hooks.json matcher; git hook subcommand deny in git-readonly; recommended-settings.json companion for global settings. Pattern source: tmp/pattern-source.md (mandatory reading, git-ignored).

- 2026-10-15: spec approved by owner; implementation plan written at docs/superpowers/plans/2026-10-15-filesystem-policy-v2.md (8 tasks, TDD, stop-per-task; execution: subagent-driven)

- 2026-10-16 session: Tasks 1-3 complete via subagent-driven flow (T1+T2 committed by owner; T3 in tree). T3 delivered intents.ts + scan-based intentOf + AST redirects + rows 5-11 + owner conventions (no reason tails, HOME const, Sets, inline exports). Ironclad model rule restored after violation: ALL reviews opus. Resume tomorrow at Task 4.
