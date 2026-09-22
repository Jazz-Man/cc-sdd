---
# cc-sdd-uwj4
title: 'Adapt cc-sdd fork: Claude Code-only, beans tracking, .claude/rules steering'
status: in-progress
type: task
priority: normal
created_at: 2026-09-22T15:57:37Z
updated_at: 2026-09-22T16:15:52Z
---

Umbrella bean for refactoring the cc-sdd fork:
- Remove everything not related to Claude Code (multi-agent templates, CLI, installer)
- Keep Claude Code skills + doc/spec/steering templates as the repo's core
- Migrate all task tracking from spec.json/tasks.md checkboxes to beans CLI (no duplicated beans instructions, just references)
- Replace .kiro/steering mechanism with native .claude/rules/ + integrate the global 'steering' skill into this project
- Remove all non-English instructions/docs/examples (ja, zh-TW, -ja spec examples)
- Target: future Claude Code plugin (no installer needed)
Status: research + prompt optimization + brainstorm phase

## Scope clarifications (from user, 2026-09-22)

- .github/workflows: DO NOT touch — separate future flow, out of scope
- .kiro/specs/: contains only demo examples (en/ja) — all deleted, none needed
- .kiro/settings/: rendered dogfood copy of tools/cc-sdd/templates/shared/settings (placeholders resolved) — content needed, must be consolidated to a single source of truth in the fork
- Non-English content: delete (docs/README_ja, zh-TW, docs/guides/ja/, tools/cc-sdd/README_ja|zh-TW, .kiro/specs/*-ja)
- AGENTS.md: multi-agent duplicate of CLAUDE.md — remove in Claude-only fork

## Brainstorm decisions (2026-09-22, round 1)

1. Repo layout: PLUGIN LAYOUT NOW — plugin manifest + plugin dir structure from day one, testable locally as a plugin. No .claude/skills dogfood layout. Plugin format facts being verified via docs before design.
2. Specs path: fixed .sdd/ at project root — all specs under .sdd/specs/, same path always, NO {{KIRO_DIR}} placeholder/config machinery (hardcode the path, delete resolver concept). User quote: 'всі спеки жили за одним і тим же шляхом завжди на рівні проекту'.
3. Skill names: RENAME kiro-* → sdd-* (all 17 skills, CLAUDE.md, docs, cross-refs).
4. spec.json: DROP entirely — no phase/approvals/updated_at, no language field. Feature name = directory name. English-only output.

- CORRECTION: .zed/ STAYS (user's IDE config — never delete)
