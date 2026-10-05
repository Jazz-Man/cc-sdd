---
# cc-sdd-1zge
title: Modernize prompt-builder skill examples to current @kasava/prompt-builder 0.3.x API
status: completed
type: task
priority: normal
created_at: 2026-10-05T11:50:19Z
updated_at: 2026-10-05T12:12:34Z
---

The .claude/skills/prompt-builder skill's code examples use deprecated methods (titled list/numberedList, no-op spacing methods, presets-moved methods). Audit every reference file against packages/skill-builder/node_modules/@kasava/prompt-builder type declarations and rewrite examples to the current API. Then eval per skill-creator loop.

## Report

- Audit source of truth: dist type declarations + runtime chunk of @kasava/prompt-builder 0.3.0 (packages/skill-builder/node_modules). Confirmed via README + presets.ts: all 5 domain generators + bullets/steps/newline/paragraph/blankLine are deprecated shims, removed in 1.0; class methods delegate to this.include(preset(...)).
- Fixed deprecated usages in: examples.md (toolGuidance/gracefulDegradation x4), api-fluent.md (6 sections rewritten to canonical /presets + .include() form, 'Deprecated class methods' section), patterns.md (5 chains), best-practices.md (4 spots), anti-patterns.md (2 spots + fixed a wrong claim: toolGuidance([]) DOES render '## Available Tools' heading — verified in lookupTable impl), SKILL.md (quick-reference rows, rule 7).
- Verification: every rewritten example executed against the installed library with output assertions (bun) + tsc --strict clean; grep battery shows zero deprecated usages in example code (mentions in migration notes only).
- Old skill snapshotted to .claude/skills/prompt-builder-workspace/skill-snapshot for baseline evals.

## Validation

Eval loop (skill-creator): 3 prompts x (new skill vs old snapshot) = 6 runs. All 6 outputs pass the full battery: deprecated-call greps, presets import + .include() composition, tsc --strict against installed 0.3.0, live bun render with structural assertions, per-eval content checks (3 tools / 5 WorkedExample fields / 3 matrix rows / 3 requirements). Result: 100% both configs — parity, because old-skill prose already taught the canonical form and diligent agents read the d.ts instead of copying the old examples (the deprecated forms lived in its examples; noted as non-discriminating in benchmark.md analyst observations). Timing/tokens not captured (harness notices carry no totals; marked N/A). Viewer running at http://127.0.0.1:3117 (PID in /tmp/pb-viewer.pid), awaiting user review; feedback.json to be read after.

## Summary of Changes

7 skill files updated to canonical 0.3.x API (examples.md, api-fluent.md, patterns.md, best-practices.md, anti-patterns.md, api-output.md, SKILL.md): all preset-family examples rewritten to /presets + .include(), wrong toolGuidance([]) claim corrected, pointers unified on 'Deprecated class methods'. Verified by live library run + tsc --strict + grep battery; skill-creator eval loop (6 runs) confirmed parity old-vs-new with honest non-discriminating-assertions analysis. Eval workspace (snapshot, iteration-1, scripts, evals.json) and /tmp viewer artifacts deleted at user request after review flow concluded; the skill edits themselves remain in the working tree for the user's commit.
