---
# cc-sdd-wgk2
title: 'Revision 4: tasks live in beans only — tasks.md dies, spec-tasks reworked, impl briefs from bean bodies'
status: todo
type: task
priority: normal
created_at: 2026-09-23T18:03:21Z
updated_at: 2026-09-23T18:03:21Z
parent: cc-sdd-uwj4
---

User design decision (E2E observation 2). Flow: requirements/design iterated freely -> /sdd:spec-tasks (fork, opus) generates task beans DIRECTLY (bodies: number, title, description, detail bullets incl. completion condition, _Requirements:, _Boundary:; deps via --blocked-by; idempotent re-sync with numbering discipline) + confirm gate -> /sdd:impl separately.
WORK LIST:
1. skills/spec-tasks/SKILL.md rework: drop tasks.md write + header contract; bean-only output; keep fork frontmatter + review-gate + Return contract + re-sync semantics
2. skills/impl/SKILL.md: brief = task bean body + path patterns (no tasks.md extraction); Step 0 guard: epic without task beans -> pointer to /sdd:spec-tasks
3. DELETE assets/templates/tasks.md; strip tasks.md references from assets/rules/tasks-generation.md
4. assets/workflow-map.md: phase flow line + beans-only emphasis (no plan doc)
5. README.md + docs/guides/{skill-reference,spec-driven}.md + root CLAUDE.md layout: drop tasks.md mentions
6. Spec revision section appended + inline fixes (4.1 templates list, 4.2 row, 5.2 brief source, 6.1)
7. Battery: grep 'tasks.md' over invariant scope -> only historical mentions in docs/superpowers allowed (0 in skills/assets/hooks/README/CLAUDE/guides)
Apply POST-E2E together with cc-sdd-73kb (allowed-tools strip, dead assets, nits).
