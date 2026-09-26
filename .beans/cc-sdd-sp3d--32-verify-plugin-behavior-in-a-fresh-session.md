---
# cc-sdd-sp3d
title: 3.2 Verify plugin behavior in a fresh session
status: todo
type: task
priority: normal
created_at: 2026-09-26T16:49:15Z
updated_at: 2026-09-26T16:54:28Z
parent: cc-sdd-lpx9
---

## Brief

Task: 3.2
Title: Verify plugin behavior in a fresh session

Confirm the re-pointed installation behaves identically to the pre-move one by checking the plugin's runtime footprint in a fresh session.

- Preconditions: the registration re-point has run and the repository is battery-green.
- Start a fresh session in a scratch project with the re-pointed registration active (or reload plugins in a running one).
- The workflow map is injected at session start — this proves both hook execution and plugin-root resolution to the plugin subfolder, since the hook reads the map through the plugin-root variable.
- The sdd skills appear invocable in the session.
- Observable completion: a fresh session loads the sdd skills and injects the workflow map while the registration points at the restructured repository.

_Requirements: 3.3, 3.4, 3.5_
_Boundary: sdd plugin folder_
