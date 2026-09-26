---
# cc-sdd-9s0k
title: 2.3 Run the full verification battery over the restructured tree
status: draft
type: task
created_at: 2026-09-26T16:49:07Z
updated_at: 2026-09-26T16:49:07Z
parent: cc-sdd-lpx9
---

## Brief

Task: 2.3
Title: Run the full verification battery over the restructured tree

Execute the re-scoped verification battery end to end and confirm every invariant returns its pinned result over the new layout.

- Zero-hit invariant greps over the re-scoped scope: each returns zero hits.
- Twin count-greps: each returns exactly six hits, one per fork file.
- Approve-gate paired-diff over the two spec fork skill files: empty after the slot normalization.
- Skill census over the plugin skills folder: fifteen skills; plugin validation at the root passes with no errors.
- Observable completion: one full battery run reports every pinned result — zero where zero is pinned, exactly six where six is pinned — with no check skipped or re-scoped away.

_Requirements: 5.1, 5.2_
_Boundary: Verification battery_
