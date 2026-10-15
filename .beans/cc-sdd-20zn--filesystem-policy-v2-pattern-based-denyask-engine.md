---
# cc-sdd-20zn
title: Filesystem policy v2 — pattern-based deny/ask engine
status: in-progress
type: feature
priority: high
created_at: 2026-10-15T19:05:06Z
updated_at: 2026-10-15T19:18:48Z
---

Replace the strict outside-cwd filesystem policy with a pattern-based deny/ask engine per spec docs/superpowers/specs/2026-10-15-filesystem-policy-v2-design.md: sensitive-path tiers (Secrets/System/Settings/Git-internals/PersonalConfig), curated injection patterns, taint pair, intent table, 11-rule decision table; new tool channel Read|Edit|Write|NotebookEdit via hooks.json matcher; git hook subcommand deny in git-readonly; recommended-settings.json companion for global settings. Pattern source: tmp/pattern-source.md (mandatory reading, git-ignored).

- 2026-10-15: spec approved by owner; implementation plan written at docs/superpowers/plans/2026-10-15-filesystem-policy-v2.md (8 tasks, TDD, stop-per-task; execution: subagent-driven)
