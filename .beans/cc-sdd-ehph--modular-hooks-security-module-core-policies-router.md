---
# cc-sdd-ehph
title: Modular hooks security module (core + policies + router + tests)
status: completed
type: feature
priority: normal
tags:
    - decision-go
created_at: 2026-09-29T12:21:19Z
updated_at: 2026-09-29T18:18:38Z
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
- [x] T6 policies/git-readonly.ts
- [x] T7 policies/no-deps.ts
- [x] T8 main.ts router + run-hook tests
- [x] T9 cleanup + final barrel

## Summary of Changes

Modular hooks security module delivered per spec docs/superpowers/specs/2026-09-29-hooks-security-module-design.md: core/ (decision emitter with per-event overloads narrowing, payload guard [ParsedHookInput], ast parse with units+words views and the unbash prototype quirks handled, policy contract), policies/ (filesystem moved 1:1 with violationIn core; git-readonly and no-deps as argv/prefix tables with case-insensitive name+prefix-head matching; deny-set completions tag -m/-F + stash branch), main.ts router (registry filesystem -> no-deps -> git-readonly, whole-body fail-open, stdin under import.meta.main), index.ts barrel. 261 tests (unit + e2e spawning the real entry). Nine task rounds + two security fix rounds (7.5 case-folding, 7.6 deny-set) + final fix wave (5 label comments). Final whole-branch review: APPROVED FOR MERGE (deny strings byte-verified vs bash sources, adversarial cross-seam pass clean). Two Important coverage findings gated to ACTIVATION in follow-up bean cc-sdd-0ivz (wrapper-command descent, glued-flag matching). Bash hooks and settings.json untouched by design.
