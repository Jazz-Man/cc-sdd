---
# cc-sdd-8cno
title: 'Bun-native stdin: Bun.stdin.json() everywhere, zero JSON.parse (spec+plan)'
status: completed
type: task
priority: normal
created_at: 2026-10-01T12:54:08Z
updated_at: 2026-10-01T13:45:48Z
---

Per spec docs/superpowers/specs/2026-10-01-bun-native-stdin-design.md and plan docs/superpowers/plans/2026-10-01-bun-native-stdin.md: T1 payload guard toHookInput(data: unknown) no parsing; T2 ATOMIC flip runHook(input: unknown) + main.ts await Bun.stdin.json() (one task - split breaks all e2e denies); T3 entry pins (empty stdin, 42) + grep JSON.parse = 0. Subagent conveyor: sonnet implements, opus reviews, human commits at stop points.

## Summary of Changes

Bun-native stdin per spec 2026-10-01: toHookInput(data: unknown) narrows the runtime-parsed payload (no text parsing, export renamed from parseHookInput); runHook(input: unknown) — five router steps and registry order untouched (3-line seam); main.ts = top-level await Bun.stdin.json() + fail-open catch + process.stdout.write (import.meta.main guard dropped — sole consumer is the spawned process). ZERO JSON.parse in src/; tests: one permitted output-side e2e assertion parse. 263/0 tests (2 new entry pins: empty stdin, 42-text), tsc 0, biome 0. Plus the user-requested naming config: capture-forwarding convention (wire names pass non-capturing, others forward to CONSTANT|camelCase; anchors hard-rejected by biome — implicit), 16 inline suppressions removed. Three task reviews Approved (one fix round on T1 plan-prose lint slips) + final whole-feature review APPROVED FOR COMMIT (adversarial: dup-keys last-wins, __proto__ inert, no snake_case slip-through, empty-stdin pin load-bearing both branches; rulings 1-4 AGREE, no minors block).
