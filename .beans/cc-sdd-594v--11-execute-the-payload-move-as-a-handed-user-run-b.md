---
# cc-sdd-594v
title: 1.1 Execute the payload move as a handed user-run batch
status: todo
type: task
priority: normal
created_at: 2026-09-26T16:49:00Z
updated_at: 2026-09-26T16:54:28Z
parent: cc-sdd-lpx9
---

## Brief

Task: 1.1
Title: Execute the payload move as a handed user-run batch

Relocate the complete sdd plugin payload from the repository root into its own subfolder under the plugins directory, executed as user-run git moves of unmodified files.

- Hand the user the exact ordered move batch pinned in the design (destination directories pre-created inside the same block) as a command block for them to execute; no git write is ever agent-run.
- Preconditions: clean working tree; the batch is the only pending change.
- After the user runs the batch, inspect git status: pure renames, zero content modifications inside the moved set.
- Confirm history survival: git log --follow on the moved plugin manifest and at least one skill file reaches commits predating the move.
- Observable completion: the plugin manifest, skills, shared assets, helper scripts, hooks, user guides, and plugin README all live under the single plugin subfolder, and git shows the whole change as renames only.

_Requirements: 1.1, 1.2, 2.2, 4.1, 4.2, 4.3_
_Boundary: Migration execution model_
