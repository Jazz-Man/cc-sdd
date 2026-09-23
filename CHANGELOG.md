# Changelog

All notable changes to this project will be documented in this file.

## 0.1.0 — 2026-09-23

Fork initial. Converted from the cc-sdd multi-agent toolkit to `sdd` — a
Claude Code plugin implementing Kiro-style spec-driven development with
subagent-first execution, loaded locally via `--plugin-dir`.

- 14 skills invoked as `/sdd:<name>`: init, discovery, spec-init,
  spec-requirements, spec-design, spec-tasks, impl, review, debug,
  verify-completion, validate-gap, validate-design, validate-impl, steering
- Subagent-first execution: an inline orchestrator (`/sdd:impl`) dispatching
  five role templates (implementer, task-reviewer, re-review, code-reviewer,
  debugger) with pinned models — opus for generation, review, and validation;
  sonnet for implementation
- beans replaces file-based tracking: feature = epic bean, task = task bean,
  initiative = milestone bean; spec documents under `.sdd/` are static
  artifacts that never carry progress state
- Stop-per-task rhythm with user-held git: agents never stage, commit, push,
  or touch branches
- Bootstrap: a SessionStart hook injects the workflow map unless a user-owned
  `.claude/rules/sdd.md` exists (written via `/sdd:init`; the user file always
  takes precedence)
- Single active feature enforced; multi-spec initiatives run as strictly
  sequential epic chains under a milestone
- Dropped from upstream: the npm CLI installer, all non-Claude-Code agent
  targets, non-English content, and the spec-status / spec-quick / spec-batch
  modes
