---
# cc-sdd-ehph
title: Modular hooks security module (core + policies + router + tests)
status: in-progress
type: feature
priority: normal
created_at: 2026-09-29T12:21:19Z
updated_at: 2026-09-29T15:22:11Z
---

Architectural: restructure src/ into a security module per docs/superpowers/specs/2026-09-29-hooks-security-module-design.md - core/ (decision, payload, ast, policy), policies/ (filesystem, git-readonly, no-deps), main.ts router. tool-block descoped by owner: ad-hoc tool denials stay on the global bash deny.sh, index.ts barrel. AST-based ports of git-readonly.sh and no-deps.sh semantics; deny emitter extracted. Unit + e2e tests, TDD. Non-goals: settings.json, bash scripts, plugin - untouched. Spec approved in brainstorm; next: user spec review, then writing-plans.

## Notes

Plan written: docs/superpowers/plans/2026-09-29-hooks-security-module.md (9 tasks, TDD, git-stop-points per task - human commits). Self-review fixed: git-readonly bare-first-arg bug (git branch/tag bare = list = allow), ESM-only test drafts, spec/plan alignment on branch --list 'pat*' case. Awaiting user plan review + execution method choice.

## Checklist

- [x] T1 core/decision.ts
- [x] T2 core/payload.ts
- [x] T3 core/ast.ts
- [x] T4 core/policy.ts
- [x] T5 policies/filesystem.ts + index barrel
- [ ] T6 policies/git-readonly.ts
- [ ] T7 policies/no-deps.ts
- [ ] T8 main.ts router + run-hook tests
- [ ] T9 cleanup + final barrel
