---
# cc-sdd-67u5
title: 'Task 3: plugin manifest + skills tree (13 bare-name moves)'
status: completed
type: task
priority: normal
created_at: 2026-09-22T22:06:09Z
updated_at: 2026-09-22T22:10:08Z
parent: cc-sdd-uwj4
---

Plan task 3: create .claude-plugin/plugin.json (name: sdd), move 13 skill dirs from tools/cc-sdd/templates/agents/claude-code-skills/skills/kiro-* to skills/ with bare names. Verify: 13 entries each with SKILL.md. Parent: cc-sdd-uwj4.

## Summary of Changes

Created .claude-plugin/plugin.json (verbatim from brief). Moved 13 kiro-* skill dirs from tools/cc-sdd/templates/agents/claude-code-skills/skills/ to skills/ bare names (discovery, spec-init, spec-requirements, spec-design, spec-tasks, impl, review, debug, verify-completion, validate-gap, validate-design, validate-impl, steering), all with SKILL.md. Source retains exactly the 4 dropped skills (spec-batch, spec-quick, spec-status, steering-custom). `claude plugin validate .` passed with 2 warnings (no author field; repo-root CLAUDE.md not loaded as plugin context) — no {{...}} warnings. Working tree left uncommitted for human review. Full report: .superpowers/sdd/2026-09-22-sdd-plugin-conversion/task-3-report.md

## Summary of Changes
.claude-plugin/plugin.json created (name: sdd). 13 skill dirs moved from tools/cc-sdd/templates/agents/claude-code-skills/skills/kiro-* to skills/ with bare names. claude plugin validate: passed (2 accepted warnings: no author field — deferred to Task 15; root CLAUDE.md not plugin context — by design spec 4.3). Review: spec-compliant, quality APPROVED, 0 findings; move integrity byte-verified.
