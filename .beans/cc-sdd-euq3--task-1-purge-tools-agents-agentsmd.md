---
# cc-sdd-euq3
title: 'Task 1: purge — tools/, .agents/, AGENTS.md'
status: completed
type: task
priority: normal
created_at: 2026-09-22T22:46:12Z
updated_at: 2026-09-22T22:50:18Z
parent: cc-sdd-uwj4
---

Plan task 1: delete tools/ (CLI + 18 agent variants + manifests), .agents/ (new-agent skill), AGENTS.md. Relocation sources consumed by Tasks 3-4 already extracted. Keep .zed/, .github/workflows/, LICENSE, .beans.yml.

## Execution note (2026-09-23)

Deleted tools/ (423 files), .agents/ (4), AGENTS.md (1) — 426 D in git status, zero A/M/??. Full report: .superpowers/sdd/2026-09-22-sdd-plugin-conversion/task-1-report.md. Status left in-progress; controller gates completion.

## Summary of Changes
Purged tools/ (421 files: CLI, 18 agent variants, manifests), .agents/ (4), AGENTS.md — 426 unstaged deletions total, zero collateral. Pre-deletion grep confirmed no references from the new plugin surface. Review APPROVED; 2 documentation-only minors (count reconciliation) deferred.
