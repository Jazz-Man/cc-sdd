---
# cc-sdd-ovm3
title: Harden wrapper-carrier family for absolutes
status: todo
type: bug
priority: high
created_at: 2026-10-16T17:19:39Z
updated_at: 2026-10-16T17:19:39Z
---

Final-review I1: sudo/network wherever-seen scan covers only the five intents.WRAPPERS; command/exec/builtin/watch/parallel/find -exec/env -S value carriers let curl/sudo-family through (probed ALLOW). Fix: carrier-aware scan that does not false-positive echo curl / grep curl README.md. Subsumes the ledgered env -S blind spot.
