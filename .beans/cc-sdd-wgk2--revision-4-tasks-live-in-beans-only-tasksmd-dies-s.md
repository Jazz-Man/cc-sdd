---
# cc-sdd-wgk2
title: 'Revisions 4-7: beans-only tasks, phase gates, validation gates, workspace migration'
status: completed
type: task
priority: normal
created_at: 2026-09-23T18:03:21Z
updated_at: 2026-09-24T18:38:52Z
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


## REVISION 5 (2026-09-24, user): persistent phase gates via phase sub-beans (variant B)

Problem: approvals died with sessions (spec.json carried both state and gate; our confirm-gates cover the moment, not persistence) — impl could run unapproved work after compaction/new session.

Design (all three recommended options accepted):
- spec-init creates epic + THREE phase beans (tag phase, blocked-by chain: requirements <- design <- tasks, titles 'Phase — <name>', status todo)
- Phase skill start-gate: previous phase bean completed (else stop naming the command); after confirm-approve -> own phase bean completed
- spec-tasks: task beans born DRAFT (= spec.json generated-not-approved); approve gate offers approve-all OR selective -> chosen draft->todo + tasks phase completed
- impl Step 0 gate: all three phase beans completed; first actionable task = first TODO task bean (draft ignored = unapproved)
- Re-entering an approved phase -> escalation AskUserQuestion: reopen downstream phases (recommended) / accept desync risk / cancel change — NO silent invalidation
- NOT added (ruled out): research/test-strategy/estimate as separate phases (content of design+validate-gap+EARS, not gates); custom statuses (fixed set); prose blocks in epic body (parsing)

Work list additions:
8. spec-init: +3 phase beans with chain/tags
9. spec-requirements/spec-design/spec-tasks: start-gates + complete own phase bean on approve; re-entry escalation rule
10. spec-tasks: draft-born task beans + approve-all/selective gate
11. impl: three-phase gate in Step 0; draft beans not actionable
12. workflow-map + README + guides: phase-gate flow description
13. Battery: phase-bean convention grep (spec-init creates exactly 3 tagged phase beans; impl references the three-phase gate)


## Research results: beans extensibility (2026-09-24, live-tested in /tmp lab)

1. CUSTOM STATUSES: NOT POSSIBLE. v0.4.2 is the LATEST release; statuses hardcoded in Go source (config_test.go: 'Statuses are hardcoded, not configurable (like types)'); .beans.yml has no statuses key; CLI rejects unknown values (INVALID_STATUS). Only path = forking the source — ruled OUT (YAGNI; 5 statuses + tags cover the model).
2. TAGS: first-class and filterable (--tag on create/update; list --tag OR-logic; --no-tag; GraphQL filter.tags/noTags). Confirms user's tag suggestion. Phase beans keep tag 'phase'; task beans free to carry qa/other tags for decomposition labeling.
3. REV-5 MODEL VALIDATED LIVE: epic + tagged phase beans render as a lifecycle view (beans list --tag phase); completed=approved; draft->todo promotion works; roadmap renders the epic tree; machine queries via filter {tags,status,type,parent}.
4. BUG/LIMITATION FOUND (design-relevant): GraphQL resolved relation blockedBy returns [] ALWAYS (tested with completed AND active blockers) while raw blockedByIds works. GATE QUERIES MUST USE blockedByIds + explicit per-blocker status checks — never the blockedBy relation. Also: singleton query field is bean(id:), not b(id:).
Work-list amendment: item 11 (impl gates) + phase-skill start-gates use the blockedByIds+status form; document the blockedBy limitation in skill comments.


## REVISION 6 (2026-09-24, user, model-thinking analysis): mandatory validation gates (pre-implementation scope)

Decisions (all confirmed):
- TRIGGER — dual loop: formative (manual /sdd:validate-* anytime, findings only, no state change) + summative ('approve' at a confirm gate AUTO-DISPATCHES the validator fork FIRST; GO required before the phase completes; NO-GO -> four-part escalation, phase stays open)
- FRESHNESS — doc content hash: sha256 of the phase document computed at validation, recorded in the phase bean body (Validated-at date + Doc-hash); any gate recomputes and compares — mismatch = stale = re-validate before proceeding. Catches committed AND uncommitted edits. Implementation: inline 'shasum -a 256' one-liner in skills, or a bin/ script if preferred (implementation choice)
- FIX BOUNDARY — validator auto-fixes ONLY zero-semantics items (typos, wrong paths, formatting), EVERY fix listed in the return summary; anything touching business logic/requirements/design semantics escalates four-part; NO-GO escalates immediately
- NEW 15th SKILL validate-requirements (opus fork, independent): EARS format, completeness, internal contradictions, steering alignment; evidence-based verdicts; the summative gate of the requirements phase. validate-gap STAYS formative research (requirements vs codebase — different axis, no gate role)
- Validators are independent opus forks (anti-confirm-bias, same principle as task-reviewer); validation rounds recorded in phase bean bodies (resume visibility)

Work-list additions:
14. skills/validate-requirements (new fork)
15. Confirm gates in spec-requirements/spec-design reworked: approve -> auto validator -> GO -> tag 'validated' + Doc-hash + phase completed
16. Hash mechanics (shasum record/compare) in gate flows
17. impl Step 0 freshness check (validated tags + hash match for requirements/design)
18. Fix-boundary + fixes-listed contract in validator texts
19. workflow-map/README/guides/CLAUDE.md validation flow
20. Battery: validated-tag + Doc-hash convention greps


## REVISION 7 (2026-09-24, user + beans-artifact-research): workspace migrates to beans bodies

Research-verified (live lab): no body size limits; bodyMod transactional; list carries no bodies; show is all-or-nothing (the real constraint -> ~100 lines/4KB boundary); 12 enum contract families inventoried; statuses impossible (+ GraphQL silently corrupts with '?' on CLI).

DECISIONS (all confirmed):
- MATRIX ADOPTED: task-brief/implementer-report/notes -> task-bean body sections (brief merges with rev-4 task spec; reports+notes append-only); review-package stays a FILE (workspace = blob storage only) with verdict block + one-line pointer in the bean
- VERDICTS: authoritative body line + MIRROR TAG (user chose dual-write; lowercase-hyphen tags only — verdict-approved etc.; tags scramble on change = accepted git-diff noise)
- bin/ HELPERS (user idea, small set): sdd-gate (phase+validated+doc-hash single call), sdd-verdict (read authoritative line), sdd-promote (draft->todo batch); one responsibility each
- PROSE SAFETY RULES in all skills: search phrases ALWAYS quoted (unquoted colon-phrases silently return []); never --ready for gating (one-sided claim bug family); etags on any concurrent-capable path; no GraphQL status writes (CLI-only)

Work-list additions:
21. Task bean = full lifecycle record (brief/report/notes sections)
22. Verdict lines + mirror tags dual-write discipline in templates/skills
23. review-package file + pointer; workspace/ = blobs only
24. impl stops writing brief/report FILES; dispatch carries task-bean id (subagent reads it) or inline brief section — implementation choice
25. bin/ helpers (3, tiny)
26. Safety prose rules everywhere
27. Docs: workspace description update
28. Battery: verdict-line + tag conventions; zero brief/report file references in skills

## Summary of Changes
All Revisions 4-7 items landed across wave tasks: B1-B4 (cc-sdd-5lgl/60q2/v6e0/mqhj), C1-C2 (cc-sdd-yoo1/5r8c), D1-D3 (cc-sdd-wsju/p1mi/ccvc). E1 (docs/battery) = final task cc-sdd-2xuo. This bean was the design manifest; execution tracked per wave.
