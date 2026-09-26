---
# cc-sdd-spdf
title: 3.1 Hand off the marketplace registration re-point
status: todo
type: task
priority: normal
created_at: 2026-09-26T16:49:15Z
updated_at: 2026-09-26T16:54:27Z
parent: cc-sdd-lpx9
---

## Brief

Task: 3.1
Title: Hand off the marketplace registration re-point

Restore the user's local marketplace registration against the restructured repository, preserving the existing marketplace and plugin identities.

- Hand the user the re-add command for the repository directory under the existing marketplace name; a same-name re-add replaces the registration in place.
- If the CLI refuses the same-name re-add, hand the documented fallback: remove the marketplace, then re-add.
- The marketplace name and the installed plugin reference are preserved exactly — nothing is renamed anywhere in the flow.
- The broken-registration window is expected, not an error: a session started before the re-add simply runs without the plugin; the user re-adds, then starts or reloads a session.
- Observable completion: the marketplace list shows exactly one registration under the existing name pointing at the repository directory — no duplicate entry.

_Requirements: 3.1, 3.2, 3.6_
_Boundary: Registration re-point procedure_
