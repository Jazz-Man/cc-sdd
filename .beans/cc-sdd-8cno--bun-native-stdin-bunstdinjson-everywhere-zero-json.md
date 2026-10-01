---
# cc-sdd-8cno
title: 'Bun-native stdin: Bun.stdin.json() everywhere, zero JSON.parse (spec+plan)'
status: in-progress
type: task
created_at: 2026-10-01T12:54:08Z
updated_at: 2026-10-01T12:54:08Z
---

Per spec docs/superpowers/specs/2026-10-01-bun-native-stdin-design.md and plan docs/superpowers/plans/2026-10-01-bun-native-stdin.md: T1 payload guard toHookInput(data: unknown) no parsing; T2 ATOMIC flip runHook(input: unknown) + main.ts await Bun.stdin.json() (one task - split breaks all e2e denies); T3 entry pins (empty stdin, 42) + grep JSON.parse = 0. Subagent conveyor: sonnet implements, opus reviews, human commits at stop points.
