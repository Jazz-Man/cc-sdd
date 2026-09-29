---
# cc-sdd-ehph
title: Modular hooks security module (core + policies + router + tests)
status: in-progress
type: feature
created_at: 2026-09-29T12:21:19Z
updated_at: 2026-09-29T12:21:19Z
---

Architectural: restructure src/ into a security module per docs/superpowers/specs/2026-09-29-hooks-security-module-design.md - core/ (decision, payload, ast, policy), policies/ (filesystem, git-readonly, no-deps, tool-block), main.ts router, index.ts barrel. AST-based ports of git-readonly.sh and no-deps.sh semantics; deny emitter extracted. Unit + e2e tests, TDD. Non-goals: settings.json, bash scripts, plugin - untouched. Spec approved in brainstorm; next: user spec review, then writing-plans.
