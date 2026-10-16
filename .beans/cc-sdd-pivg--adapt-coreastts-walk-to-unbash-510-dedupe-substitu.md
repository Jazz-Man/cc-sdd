---
# cc-sdd-pivg
title: Adapt core/ast.ts walk to unbash 5.1.0 (dedupe substitution units, strip raw substitution args)
status: completed
type: task
priority: normal
created_at: 2026-10-16T10:29:48Z
updated_at: 2026-10-16T10:45:37Z
parent: cc-sdd-20zn
---

unbash 4.0.11->5.1.0 changed substitution parse semantics: inner command surfaces twice and raw $(...) text rides as an echo arg, hitting the fs policy $-fail-closed gate. Probe matrix, root fix in ast.ts, tests + quirks comments updated. Report: .superpowers/sdd/2026-10-15-filesystem-policy-v2/unbash5-adapt-report.md

## Summary of Changes

Root-caused the unbash 5.1.0 AST-walk adaptation in packages/cli-hook (probe-first, parse-only):

- Root cause: 5.1.0 CommandImpl exposes `args`/`redirects` PROTOTYPE accessors returning the same instances the own `suffix` array holds (suffix now nests Redirect nodes — 4.0.11 kept targets out). The walk's prototype descent re-entered those subtrees, double-emitting every arg-position substitution (echo $(git push) → echo,git,git).
- Fix 1 (ast.ts): visited-identity set in the walk — revisited object = same subtree re-emitted; equal-valued distinct commands (FOO=$(git status) git status) both survive (probe-proven).
- Fix 2 (ast.ts): wordValues drops substitution-shaped values ($(, backtick, <(, >() from collected args — inner units carry enforcement; plain $VAR/${VAR} stay for the fail-closed gate. Redirect-typed nodes skipped (targets live in the redirects view, never args).
- Fix 3: quirks header + collectRedirects comments rewritten to 5.1.0 reality (4.0.11 findings kept as history; re-verified 2026-10-16 by probe).
- Tests: :29 restored to [echo, git] + 4 new regression tests (subst-out-of-args, var-args intact, redirect targets out of args but recorded, equal-valued distinct commands); suite split into two describes for the 50-line function limit.

Evidence: bun test 373 pass / 3 fail (exactly the 3 known run-hook failures — owner's temporary filesystemPolicy disable); tsc (effect-tsgo) 0 errors; rtk biome check exit 0; filesystemPolicy probes: echo $(git log --oneline) ALLOW, echo $(cat /etc/passwd) DENY (inner-unit boundary), fail-closed $VAR deny and secrets tier intact. Full report: .superpowers/sdd/2026-10-15-filesystem-policy-v2/unbash5-adapt-report.md
