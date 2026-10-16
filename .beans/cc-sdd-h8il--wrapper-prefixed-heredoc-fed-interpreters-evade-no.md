---
# cc-sdd-h8il
title: Wrapper-prefixed heredoc-fed interpreters evade no-inline
status: completed
type: bug
priority: high
created_at: 2026-10-16T11:42:47Z
updated_at: 2026-10-16T12:34:57Z
---

env bash <<EOF + body ALLOWs: heredocFed keys on the unit NAME; under env/nice/nohup/timeout/xargs the interpreter hides in wrapper args and wrapperViolates is redirect-blind — same prefix family already denied for env python -c. Fix: heredoc consumption unwraps wrappers (reuse intentOf's scan or no-inline's WRAPPERS adjacency) before the interpreter check. Close together with cc-sdd-2579 (<<<) in the next no-inline dispatch.

## Summary of Changes

Wrapper-prefixed heredoc fix in no-inline-scripts: new wrapperHeredocViolates unwraps env/nice/nohup/timeout/xargs (and siblings in the local WRAPPERS set) with the same noise classes as intents.ts' intentOf scan (-tokens, NAME=VALUE assignments, unknown bare tokens), then applies heredocFed on the unit's own args/redirects where the delimiter rides. Pins: env bash <<EOF+body DENY, nice -n 5 python3 <<'EOF'+body DENY, non-interpreter cat heredoc unchanged ALLOW. TDD red (2 failing pins) → green.
