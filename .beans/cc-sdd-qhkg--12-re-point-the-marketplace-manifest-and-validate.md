---
# cc-sdd-qhkg
title: 1.2 Re-point the marketplace manifest and validate green
status: todo
type: task
priority: normal
created_at: 2026-09-26T16:49:00Z
updated_at: 2026-09-26T16:54:27Z
parent: cc-sdd-lpx9
---

## Brief

Task: 1.2
Title: Re-point the marketplace manifest and validate green

Update the root marketplace registry so the sdd entry references the plugin by its new subfolder path, then confirm the restructured repository passes platform validation.

- Edit only the entry's source value to the plugin subfolder path; marketplace name, owner, entry name, and descriptions stay byte-identical to the current manifest.
- Keep the registry append-only: with the entry referenced by subfolder path, a future plugin is a new subfolder plus one new entry, requiring no change inside existing plugin subfolders.
- Run plugin validation at the repository root and require zero errors — the first green checkpoint, the earliest state where manifest and layout agree.
- If validation reports errors, its output names the offending field; fix the named field and re-validate before anything downstream proceeds.
- Observable completion: validation passes, naming the marketplace manifest at the root and the plugin entry resolving to the plugin subfolder.

_Requirements: 1.3, 2.1, 2.3_
_Boundary: Root marketplace manifest_
