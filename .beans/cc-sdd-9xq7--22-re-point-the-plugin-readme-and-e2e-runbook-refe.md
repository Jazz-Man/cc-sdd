---
# cc-sdd-9xq7
title: 2.2 Re-point the plugin README and e2e runbook references
status: completed
type: task
priority: normal
tags:
    - status-done
    - verdict-approved
    - verification-verified
created_at: 2026-09-26T16:49:07Z
updated_at: 2026-09-27T10:11:48Z
parent: cc-sdd-lpx9
---

## Brief

Task: 2.2
Title: Re-point the plugin README and e2e runbook references

Update the two remaining documents whose path references break at the move: the plugin's own README (now inside the plugin subfolder) and the end-to-end runbook.

- README: the getting-started plugin-dir invocation gains the plugin-subfolder segment; repository-level references (the conversion-history directory and the license) become parent-relative; guide links stay valid because the guides moved with the README.
- Runbook: the plugin-dir invocation points at the plugin subfolder.
- The runbook is untracked working state: its edit is real but will not appear in any commit; if the file is absent from disk at execution time, record that absence in the task report instead of recreating the file.
- Observable completion: every changed line names an existing post-move path and all relative links resolve from the README's new location.

_Requirements: 5.3_
_Boundary: Documentation re-referencing_

## Report

Re-pointed the plugin README to its post-move location (plugins/sdd/) with
three line-level changes, exactly per design.md "Modified Files":

1. Getting-started invocation (L24): `claude --plugin-dir /path/to/cc-sdd`
   -> `claude --plugin-dir /path/to/cc-sdd/plugins/sdd`.
2. Conversion-history mention (L260): `docs/superpowers/` ->
   `../../docs/superpowers/`.
3. License link (L266): `[LICENSE](LICENSE)` -> `[LICENSE](../../LICENSE)`.

Guide links (`docs/guides/*.md`) untouched by design — the guides moved with
the README; verified they still resolve.

Evidence (mechanical, resolved relative to plugins/sdd/):
- Pre-edit RED: `plugins/sdd/docs/superpowers` and `plugins/sdd/LICENSE` did
  not exist — both references were broken at the README's new location, and
  the invocation lacked the `plugins/sdd` segment.
- Post-edit GREEN: full markdown-link census (5 links) — `#bootstrap` anchor
  has its heading; `docs/guides/skill-reference.md`,
  `docs/guides/spec-driven.md`, `docs/guides/why-cc-sdd.md`, and
  `../../LICENSE` all resolve; `../../docs/superpowers/` resolves; the
  invocation carries the `plugins/sdd` segment. Root targets confirmed to
  exist (`docs/superpowers/` dir, `LICENSE` file).

E2E runbook: `.superpowers/sdd/2026-09-22-sdd-plugin-conversion/e2e-runbook.md`
is ABSENT from disk (the whole directory is absent). Pre-adjudicated by the
brief: absence recorded here, file NOT recreated. The runbook half of task 2.2
is a no-op on disk; requirement 5.3's runbook clause is covered by this
recorded absence.

Files touched: plugins/sdd/README.md (only). No concerns.

## Notes

• Learning for validate-impl (5.3 check): the 2.2 runbook edit is vacuous on disk — the runbook file is absent (pre-adjudicated, recorded in 2.2's ## Report); the README half carries the real 5.3 evidence: all 5 links and both parent-relative refs resolve from plugins/sdd/.

## Validation
- VERDICT: APPROVED - 2026-09-27, review round 1, package: workspace/review-package-2.2.md

- STATUS: VERIFIED - 2026-09-27, verification gate (fresh): 5/5 relative links resolve from plugins/sdd/, invocation carries the plugins/sdd segment, claude plugin validate . exit 0

## Summary of Changes
Three README re-points (plugin-dir invocation + plugins/sdd segment, docs/superpowers and LICENSE -> ../../ parent-relative); runbook absence recorded per the pre-adjudicated conditional, file not recreated; review round 1 APPROVED with zero findings, verified fresh.
