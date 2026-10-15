---
# cc-sdd-kark
title: fs v2 fix round 3 — DENY tails stripped, Set membership
status: completed
type: task
priority: high
created_at: 2026-10-15T22:06:31Z
updated_at: 2026-10-15T22:08:30Z
---

Owner directives from task-2 review round 3: (1) DENY reasons lose all advisory tails (Ask the user / Disable via /hooks / workaround guidance); (2) membership collections become Sets with .has. Gates: bun test, tsc --noEmit, rtk biome check.

- [x] Directive 1: TAIL + all 9 interpolations removed (reasons.ts); unresolved-var reason and both policy REASONs truncated; both pinned test REASONs updated; no-inline-scripts TMP_HINT kept
- [x] Directive 2: SECRETS_SUBPATHS + PERSONAL_HOME_SUBPATHS → Set.has; one convention comment in tiers.ts; pattern arrays untouched
- [x] Gates: bun test 314 pass / 3 known run-hook fails · tsc clean · biome exit 0 (2 pre-existing warnings in untouched files)

## Summary of Changes

Round-3 owner directives for fs policy v2 applied. DENY reasons now state the rule family + quoted token and stop: deleted the TAIL constant and every interpolation in reasons.ts, truncated the unresolved-variable reason in policy.ts and the no-deps/git-readonly REASONs, updated the two exact-equality test constants; kept the ./tmp/ TMP_HINT as the sanctioned-channel exception. Membership collections SECRETS_SUBPATHS and PERSONAL_HOME_SUBPATHS are now Sets with .has, with one convention comment above the tier tables; SECRET_SUFFIXES and TMP_PREFIXES remain arrays (iterated pattern lists). No behavior change beyond reason text. Left uncommitted for the human.
