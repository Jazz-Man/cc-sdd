# Design Review Round 1

## Summary

The design is a well-verified relocation plan: nearly every factual claim checks
out against the codebase (manifest contents, payload inventory and counts,
README/runbook line references, battery membership including the three exactly-6
twin count-greps, and the current `claude plugin validate .` baseline pass).
Boundaries are concrete, the move batch is syntactically sound with destination
directories pre-created, and all five requirements are traceably addressed. Two
minor concerns defer cleanly; nothing blocks task generation.

## Criterion verdicts

- Existing Architecture Alignment: PASS — the platform's documented
  multi-plugin marketplace model is adopted as-is; the
  `${CLAUDE_PLUGIN_ROOT}`-relocation claim was independently verified (zero
  payload-internal references that break on move); dependency direction and
  battery read-only posture unchanged.
- Design Consistency & Standards: CONCERN — one internal contradiction
  (tracked vs untracked runbook) fixed in review; one minor residual: repo
  steering files keep pre-move paths (see minor findings).
- Extensibility & Maintainability: PASS — append-only manifest entries for
  future plugins (1.3), one reviewable move batch, battery prefix-mapping note
  guards scope drift.
- Type Safety & Interface Design: PASS — the only interfaces (manifest JSON,
  CLI sequences, command block) are pinned verbatim with
  preconditions/postconditions/invariants per component; the manifest's
  post-edit content matches the current file exactly except `source`.

## Critical issues (BLOCKING)

None.

## Minor findings

- `.claude/rules/product.md` (line 7), `.claude/rules/tech.md` (line 38), and
  `.claude/rules/structure.md` (throughout) reference root-relative payload
  paths (`skills/`, `assets/`, `bin/`, `hooks/`, `--plugin-dir /path/to/cc-sdd`)
  that go stale after the move; they fall outside R5.3's three-artifact
  enumeration so the design conforms, but the System Flows claim that the
  repository is "fully consistent" at ReAdd overstates — suggest a follow-up
  bean or an explicit out-of-scope note. [Traceability: Requirement 5;
  Evidence: design.md §System Flows, §Modified Files]
- The behavioral check "Session start in a scratch project" presumes the plugin
  is enabled there, but user-level `enabledPlugins` has no `sdd@sdd-local`
  (only this repo's `.claude/settings.json` enables it) — the check needs a
  per-project enable, a `--plugin-dir` launch (which bypasses the marketplace
  path), or should run in this repo; name the precondition. [Traceability:
  Requirements 3.3-3.5; Evidence: design.md §Testing Strategy, §Registration
  re-point procedure]

## Fixes applied

- design.md line 235: "the tracked e2e-runbook file" → "the untracked
  e2e-runbook file" (`.superpowers/` is gitignored; nothing under it is
  tracked — now consistent with §Modified Files and §Documentation
  re-referencing).

## Strengths

- Exceptional claim-to-codebase fidelity: inventory counts, manifest contents,
  line-number references, and battery membership (including the three exactly-6
  count-greps per the §4 erratum) all verified true.
- Error handling covers the one expected broken state (registration window) and
  three repairable failure classes with concrete responses, each tied to a
  checkpoint.

## Verdict

**GO** — zero blocking findings; the design is ready for task planning with the
two minor findings traveling as context (steering-file staleness likely becomes
a follow-up bean; the behavioral-check precondition belongs in the tasks).
