---
# cc-sdd-zq8w
title: 2.1 Re-scope the repository guide layout and verification sections
status: draft
type: task
created_at: 2026-09-26T16:49:07Z
updated_at: 2026-09-26T16:49:07Z
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
