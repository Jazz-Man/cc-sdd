---
# cc-sdd-9xq7
title: 2.2 Re-point the plugin README and e2e runbook references
status: draft
type: task
created_at: 2026-09-26T16:49:07Z
updated_at: 2026-09-26T16:49:07Z
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
