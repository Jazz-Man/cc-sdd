---
# cc-sdd-uwj4
title: 'Adapt cc-sdd fork: Claude Code-only, beans tracking, .claude/rules steering'
status: in-progress
type: task
priority: normal
created_at: 2026-09-22T15:57:37Z
updated_at: 2026-09-22T16:55:13Z
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

## Brainstorm decisions (2026-09-22, round 2 — final)

5. Shared assets: PLUGIN ROOT — assets/ dir (rules/ + spec doc templates), referenced via ${CLAUDE_PLUGIN_ROOT}. Single source of truth, no per-skill duplication. (Mechanism verified in docs.)
6. Workflow map: NEW /sdd:init skill (user's design) — on explicit invocation writes .claude/rules/sdd.md into the TARGET project (workflow map: .sdd/ paths, phase flow, skill index, beans emphasis) AND injects the same instructions into the current session. Plugin never mutates target files otherwise. Old docs/CLAUDE.md template + {{DEV_GUIDELINES}} pipeline: deleted. Plugin itself verified UNABLE to ship CLAUDE.md/rules — this is the replacement.
7. Plugin name + granularity: plugin 'sdd', skills with BARE names (init, discovery, impl, spec-quick, validate-impl, steering...) → invocation /sdd:impl, /sdd:spec-quick, /sdd:init. The sdd- prefix lives in the namespace.
8. Execution: DIRECT, IN WAVES — 5 waves, each a child bean: (1) purge non-Claude/non-English, (2) plugin skeleton + relocation + rename + path hardcode .sdd/, (3) beans migration in skills + drop spec.json, (4) steering skill integration + /sdd:init, (5) docs/README.

Verified plugin facts (code.claude.com docs, 2026-09-22): .claude-plugin/plugin.json (only name required, marketplace.json not needed for local); components at plugin ROOT not in .claude-plugin/; skills namespaced /plugin:skill; local dev via claude --plugin-dir + /reload-plugins; ${CLAUDE_PLUGIN_ROOT}/${CLAUDE_SKILL_DIR}/${CLAUDE_PROJECT_DIR} substitutions in skill content; skills may ship arbitrary supporting files; SKILL.md frontmatter metadata is free-form; plugin CANNOT contribute CLAUDE.md or .claude/rules to host.
