---
# cc-sdd-ey1g
title: fs v2 deny-union re-ruling — pathCandidates tail-evidence union
status: completed
type: task
priority: normal
created_at: 2026-10-16T10:55:42Z
updated_at: 2026-10-16T11:00:59Z
---

Apply the rev-parse deny-union re-ruling to pathCandidates: judge BOTH the ;-truncated candidate and the full value so tail-borne evidence ($VAR, secret suffix, ..-climb) denies again. Three DENY pins landed (RED confirmed: 3 fail / 122 pass, truncation pins unchanged). Resolved: owner corrected the plan block (';' test on arg, full candidates from the raw token) and authorized. Applied; GREEN. Full record: .superpowers/sdd/2026-10-15-filesystem-policy-v2/rev-parse-report.md §9.

## Summary of Changes

- resolve.ts pathCandidates: deny-union per the corrected plan block — flag branch emits [truncated, @-stripped full value side] when arg carries ';'; =@ branch emits [truncated, arg.slice(indexOf("=@")+2)]; plan comment verbatim; ternaries to if/return (§8.1 biome precedent). splitPair comment reworded per review Minor (guard short-circuits =-less tokens; catch = parser-rejected =-bearing shapes).
- tests/fixtures/filesystem.ts: three re-ruling DENY pins ($KEY tail, id_rsa.key tail, ..-climb tail).
- Gates: filesystem 125/0; full suite 376/3 (known run-hook trio only); tsc 1 pre-existing owner-file error; biome exit 0. Probe re-run: 37 diffs, zero deny→allow — every pre-revision deny survives.
