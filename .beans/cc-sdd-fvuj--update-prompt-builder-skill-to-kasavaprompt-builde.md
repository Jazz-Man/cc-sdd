---
# cc-sdd-fvuj
title: Update prompt-builder skill to @kasava/prompt-builder 0.3.0
status: completed
type: task
priority: normal
created_at: 2026-09-27T13:14:53Z
updated_at: 2026-09-28T08:46:40Z
---

Deep-analyze changes between library versions 0.2.2 (skill's baseline) and 0.3.0 (installed), then brainstorm and update .claude/skills/prompt-builder/ accordingly. Source: node_modules/@kasava/prompt-builder + github.com/Kasava-AI/prompt-builder (tags v0.2.2, v0.3.0). LSP mandatory for source exploration.

## Report

Deep analysis 0.2.2 -> 0.3.0 (sources: /tmp/pb-022 + /tmp/pb-030 tarballs of tags v0.2.2/v0.3.0, node_modules dist via LSP documentSymbol, my-cv node_modules confirmed 0.2.2).

Library: prompt ORM rewrite on top of the kept fluent core. NEW subsystems: schema (definePrompt, text/num/list/bool/json, notNull/default, $inferVars, .body(), .render(vars), .prepare() -> PreparedPrompt, MissingVarError); template tag p (+p.raw/join/empty, placeholder(), MissingParamError; explicitly NOT injection defense); combinators when/unless/all/any/each; AST+dialects (15 node kinds, toAST/toPrompt, build(dialect), markdown({strict}), xml(), toMessages + cache_control + .cacheBoundary(), custom Dialect); budget (.priority/.$budget returning NEW builder, approximateTokens, BudgetExceededError); subpaths /presets (6 generator fns; class methods now deprecated shims until 1.0) and /zod (createVarsSchema); .node() AST escape hatch; .$dynamic().

Output fixes (semantic-compat, 8 rows of PLAN section 6): separator normalized; keyValues({})/limitedList([]) skip; table/lookupTable escape pipe in cells; section/field unified to bold-title-colon; workedExamples XML tight; severityScale single list node; filesList pluralization; empty lookupTable now skips (legacy header-only preserved via node.legacy + markdown strict mode). include/conditional splice AST nodes (output unchanged). All 53 v0.2.2 methods alive (source-compatible); removals deferred to 1.0. prompt-kit CLI deferred to 0.4.0.

Skill vs 0.3.0: (a) factually stale claims: lookupTable empty-rows exception (api-reference + anti-patterns), build() no-arg-only, include() signature without Fragment, no mention of pipe escaping; (b) missing half the library: schema/render/p/combinators/dialects/messages+cache/budget/zod/presets path; (c) teaches 5 soon-deprecated preset methods as primary; (d) core fluent guidance (headings, single-use tags, pure builders, role() first) still valid.

## Notes

Goal clarified by user: the skill must FULLY cover all usage patterns of library version 0.3.0 (not a minimal patch). The old project's ban on .outputFormat() was local there and does NOT apply here; outputFormat verified present in 0.3.0 with byte-identical implementation to 0.2.2 (flat {field,type,description} bullet list, heading default 'Output Format').

## Notes

Design approved in brainstorming (4 sections, all confirmed): neutral map + architectures menu (D1), mechanically tested examples via bun-test skill (D2), module-mirror file structure (D3), unchanged frontmatter description (D4), four library-only architectures with no external context (D5, MD/Claude-Code-skill generation content explicitly rejected). Spec written: docs/superpowers/specs/2026-09-27-prompt-builder-skill-030-update-design.md — awaiting user review, then writing-plans. User commits the spec.

## Notes

Implementation plan written and self-reviewed (spec coverage complete; budget maxTokens corrected 15->30 after token math; KISS/DRY/YAGNI added as global constraint per user reminder): docs/superpowers/plans/2026-09-27-prompt-builder-skill-030-update.md. 12 tasks: extraction harness, api-fluent rename+fixes, api-schema, api-output, architectures, SKILL.md router, patterns, best-practices, anti-patterns, examples, snapshots+script, final battery. Awaiting user plan review + execution-method choice (native vs subagent-driven).

## Notes

Battery T12 green: greps zero-hit, warnings present in 3 files, suite 47/0, plugin validate exit 0, routing audit clean

## Summary of Changes

prompt-builder skill rewritten to fully cover @kasava/prompt-builder 0.3.0: neutral-map SKILL.md router + api-fluent (renamed, corrected) + NEW api-schema/api-output/architectures + updated patterns/best-practices/anti-patterns/examples; extraction harness at root tests/ executes every runnable example block (47/0 via bun test, biome clean) + structural snapshots. Executed subagent-driven: 12/12 tasks review-approved, final whole-branch review With-fixes satisfied (4 one-liners + scoped re-review). All commits user-made on feature/prompt-builder; final fix-wave findings triaged ship-as-is in the plan workspace ledger (deleted after this write; git history is the record).
