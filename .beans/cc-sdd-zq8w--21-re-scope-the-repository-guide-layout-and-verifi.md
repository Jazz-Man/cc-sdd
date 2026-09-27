---
# cc-sdd-zq8w
title: 2.1 Re-scope the repository guide layout and verification sections
status: completed
type: task
priority: normal
tags:
    - status-done-with-concerns
    - verdict-approved
    - verification-verified
created_at: 2026-09-26T16:49:07Z
updated_at: 2026-09-27T09:02:22Z
parent: cc-sdd-lpx9
---

## Brief

Task: 2.1
Title: Re-scope the repository guide layout and verification sections

Update the repository's development-context document so its layout description and verification battery reflect the post-restructure reality.

- Replace the layout tree with the target layout from the design, including the opening claim that the repository root is the plugin — false the moment the move lands.
- Re-scope the battery scope list per the design's scope contract: per-plugin-subfolder prefixes for skills, assets, hooks, the plugin README, and the guides; the convention set over the helper scripts; twin count-greps, the approve-gate paired-diff, and the skill census over the plugin skills folder; root plugin validation unchanged; the e2e dry run per the re-pointed runbook.
- Add the prefix-mapping note: pattern texts as pinned in the historical conversion documents apply with the plugin-subfolder prefix; those historical documents are append-only records and are not edited.
- Observable completion: every scope string in the verification section names a path that exists in the restructured tree, and no stale root-level plugin scope remains.

_Requirements: 5.1, 5.3_
_Boundary: Verification battery, Documentation re-referencing_

## Report

Task 2.1 — four edits to CLAUDE.md, all inside the Layout/Verification scope.

What was done:

1. Opening claim: "This repo IS the plugin." replaced with the marketplace
   framing — the repository is a local Claude Code plugin marketplace, the
   sdd plugin lives at `plugins/sdd/` and is its only plugin today. Rest of
   the intro paragraph unchanged.
2. §Layout tree replaced with the design's target layout (File Structure
   Plan): marketplace manifest at root, `plugins/sdd/` holding the complete
   plugin unit (15 skills with their per-skill annotations preserved at the
   new nesting, assets incl. workflow-map.md and design-system_flow.png, 3
   bin helpers, hooks, docs/guides, plugin README), plus the stays-put
   entries (CLAUDE.md, LICENSE, docs/superpowers/, working state). Migration
   markers (STAYS/moved) deliberately dropped — they would go stale; the
   steady-state descriptions are kept. The paragraph after the tree now
   names `plugins/sdd/skills/impl/templates/` instead of the bare
   `skills/impl/templates/`.
3. §Verification re-scoped per the design's scope contract: zero-hit grep
   scope `plugins/sdd/skills/ plugins/sdd/assets/ plugins/sdd/hooks/
   plugins/sdd/README.md CLAUDE.md plugins/sdd/docs/guides/` plus
   `plugins/sdd/bin/` for the convention set; twin checks scoped to
   `plugins/sdd/skills/` with the paired-diff files named explicitly
   (`plugins/sdd/skills/spec-requirements/SKILL.md`,
   `plugins/sdd/skills/spec-design/SKILL.md`) and the 15-skill census made
   explicit (returns exactly 15 under `plugins/sdd/skills/`); root
   `claude plugin validate .` bullet unchanged.
4. Two new bullets: the prefix-mapping note (pattern texts pinned in the two
   historical design docs apply with the `plugins/sdd/` prefix; those docs
   are append-only records, not edited) and the e2e dry run member (worded
   as the design's scope contract words it: "e2e dry run per the re-pointed
   runbook" — no concrete path, see Concerns).

Verification evidence (RED then GREEN):

- RED: existence check over the old §Verification scope strings —
  `skills/ assets/ hooks/ bin/ README.md docs/guides/` all MISSING at the
  root (the failing pre-edit state).
- GREEN: existence check over every path named in the new §Verification +
  Layout — 13/13 EXISTS (plugins/sdd/skills, .../assets, .../hooks,
  .../README.md, .../docs/guides, .../bin, .../skills/spec-requirements/SKILL.md,
  .../skills/spec-design/SKILL.md, the two docs/superpowers pattern docs,
  .claude-plugin/marketplace.json, CLAUDE.md, plugins/sdd/skills/impl/templates).
- Stale-scope sweep: grep over CLAUDE.md for bare
  skills/assets/hooks/bin/README.md/docs-guides tokens outside `plugins/sdd/`
  prefixes — only tree lines (nested under the plugins/sdd parent line),
  `${CLAUDE_PLUGIN_ROOT}`-relative references (correct by design), and prose
  words. No stale root-level plugin scope.
- `claude plugin validate .` → exit 0, "Validation passed", names the root
  marketplace manifest.
- Battery spot-run over the new prefix (patterns read from the pinned
  historical docs, not copied here): three twin count-greps each exactly 6;
  15-skill census = 15; zero-hit greps (`{{`, `.kiro`, `kiro-`) over the new
  scope = zero hits; approve-gate paired-diff (awk extraction + four-slot
  sed normalization in pinned order) = EMPTY.

Concerns:

- The e2e runbook the design pins (`.superpowers/sdd/2026-09-22-sdd-plugin-conversion/e2e-runbook.md`,
  untracked per design) does NOT exist — `.superpowers/` is empty on disk.
  The design's Modified Files assumed it existed. CLAUDE.md therefore carries
  the member pathless (as the design's scope contract itself words it), which
  keeps the dispatched exists-check green; but the runbook re-point task
  (cc-sdd-9xq7, 2.2) owns the concrete file. If the file was expected to
  exist, it needs restoring; if it should be created fresh, that is 2.2's
  call, and a later fix round could add the concrete path to CLAUDE.md once
  it exists.

## Notes

• The e2e runbook file does not exist on disk (.superpowers/ empty) though the design treats it as an existing untracked file — its re-point task (2.2) owns the concrete file/path.
• Battery spot-run with the `plugins/sdd/` prefix returns all pinned results (6/6/6 twins, census 15, zero-hit greps, empty paired-diff) — the re-scoped scopes are proven, usable evidence for validate-impl.

## Validation
- VERDICT: APPROVED - 2026-09-27, review round 1, package: workspace/review-package-2.1.md

## Parking lot
- e2e battery member is unexecutable until 2.2 (cc-sdd-9xq7) lands or restores the runbook; once a concrete path exists, a later fix round may pin it in CLAUDE.md §Verification.

- STATUS: VERIFIED - 2026-09-27, verification gate (fresh): 11/11 named paths exist, census 15 over plugins/sdd/skills, claude plugin validate . exit 0; no stale root-level plugin scope remains

## Summary of Changes
CLAUDE.md §Layout replaced with the design's target marketplace tree (plugins/sdd self-contained unit) and §Verification re-scoped to plugins/sdd/ prefixes with twin/census/paired-diff paths, prefix-mapping note for the append-only historical docs, and the pathless e2e member; review round 1 APPROVED (1 MINOR parked), verified fresh.
