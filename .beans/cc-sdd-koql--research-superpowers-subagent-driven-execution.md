---
# cc-sdd-koql
title: 'Research: superpowers subagent-driven execution'
status: completed
type: task
priority: normal
created_at: 2026-09-22T17:08:02Z
updated_at: 2026-09-22T17:10:00Z
---

Deep-dive into obra/superpowers plugin: structure, brainstorm workflow, SDD subagent dispatch, chunking, handoff, review loops, reusable patterns. Feeds cc-sdd-uwj4.

## Summary of Changes

Research-only bean (no code changes). Packed obra/superpowers@6.4.1 via repomix (228 files) and read: subagent-driven-development SKILL.md + 3 prompt templates + 3 bash scripts, brainstorming, writing-plans, executing-plans, dispatching-parallel-agents, requesting-code-review, verification-before-completion, TDD, using-git-worktrees, using-superpowers + claude-code-tools, hooks/session-start, .claude-plugin/plugin.json, docs/porting-to-a-new-harness.md. Key finding: SDD uses NO named agent types — general-purpose subagents with role-by-prompt-template; all state flows through per-plan workspace files (.superpowers/sdd/<plan>/): task briefs, implementer reports, review packages, progress ledger. Local install is 6.1.1 (cache stripped to 6 files); findings from main@6.4.1.
