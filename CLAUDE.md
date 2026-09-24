# sdd — Kiro-style Spec-Driven Development (Claude Code plugin)

This repo IS the plugin. It ships prompt-only skills for spec-driven development
(discovery → requirements → design → tasks → implementation → validation) with
subagent-first execution. Skills are invoked as `/sdd:<name>`; skill texts resolve
shared files via `${CLAUDE_PLUGIN_ROOT}`. There is no installer and no runtime data
directory created in user projects — specs live under `.sdd/` in whatever project
the plugin is used on.

This file is development context for THIS repository, not user documentation.

## Layout

```
.claude-plugin/plugin.json      plugin manifest (name: sdd)
skills/                         one directory per skill, bare names
  discovery/                    action-path triage; writes the workstream brief
                                (.sdd/brief.md); queues follow-up features as milestone/epic beans
  spec-init/                    creates spec skeleton under .sdd/specs/<feature>/
  spec-requirements/            EARS requirements + review gate
  validate-requirements/        EARS/completeness/contradictions gate (generative fork)
  spec-design/                  design + discovery + review gate (generative fork)
  spec-tasks/                   task plan + sanity review (generative fork)
  impl/                         orchestrator; templates/ holds subagent prompts
  review/                       task-local adversarial review protocol
  debug/                        root-cause-first debug protocol
  verify-completion/            fresh-evidence completion gate
  validate-gap/                 requirements vs existing codebase analysis
  validate-design/              interactive design quality review
  validate-impl/                feature-level GO/NO-GO validation
  steering/                     manages .claude/rules/ in target projects
assets/                         shared content referenced by skills
  rules/                        rule files (EARS format, review gates, …)
  templates/                    document templates (requirements, design, tasks, …)
hooks/                          SessionStart hook (added by a pending task)
docs/guides/                    user-facing guides
docs/superpowers/               this conversion's spec and plan (self-referential;
                                excluded from invariant greps)
```

Skill texts reference assets as `${CLAUDE_PLUGIN_ROOT}/assets/rules/...` and
`${CLAUDE_PLUGIN_ROOT}/assets/templates/...`. In-skill prompt templates used by the
impl orchestrator live beside its `SKILL.md` under `skills/impl/templates/`.

## Editing rules

- Skills may NOT instruct git writes (no staging, commits, branch ops, pushes) —
  no component of the plugin commits: the user reviews, tests, and commits at
  each stop point (spec §5.4).
- Skills may NOT flip task checkboxes or write progress/approval state — beans
  is the only tracker (spec §6).
- Do not duplicate the global beans guide in skill texts; one-line references only.
- No double-brace placeholders anywhere — templates are instruction-style
  documents the fork skills fill by writing content.

## Verification

- `claude plugin validate .` must pass. Known accepted warnings: missing `author`
  field, and this root `CLAUDE.md` not loading as plugin context.
- Invariant greps (must return zero hits; scope `skills/ assets/ hooks/ README.md
  CLAUDE.md docs/guides/`): unresolved double-brace placeholders, the old Kiro
  settings-directory convention, and old skill names carrying the Kiro prefix.
  Exact patterns and the full battery (checkbox-flip, git-write, beans-duplication) are
  in `docs/superpowers/specs/2026-09-22-sdd-plugin-conversion-design.md` §10.
- After content changes to skills or assets, re-run the greps and
  `claude plugin validate .` before claiming done.

## Development workflow (this repo)

- Work is tracked in beans (`.beans/`); before starting, check for an existing
  bean, otherwise create one and keep its checklist current. Commit messages
  include the bean file changes alongside code.
- Git is read-only for agent sessions in this repo: no staging, commits, branches,
  or pushes. The human reviews and commits.
- The conversion spec and task plan live in `docs/superpowers/`; task briefs and
  reports live in `.superpowers/sdd/2026-09-22-sdd-plugin-conversion/`.
