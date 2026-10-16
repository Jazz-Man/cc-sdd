---
# cc-sdd-h8il
title: Wrapper-prefixed heredoc-fed interpreters evade no-inline
status: todo
type: bug
priority: high
created_at: 2026-10-16T11:42:47Z
updated_at: 2026-10-16T11:42:47Z
---

env bash <<EOF + body ALLOWs: heredocFed keys on the unit NAME; under env/nice/nohup/timeout/xargs the interpreter hides in wrapper args and wrapperViolates is redirect-blind — same prefix family already denied for env python -c. Fix: heredoc consumption unwraps wrappers (reuse intentOf's scan or no-inline's WRAPPERS adjacency) before the interpreter check. Close together with cc-sdd-2579 (<<<) in the next no-inline dispatch.
