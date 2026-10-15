---
# cc-sdd-xlva
title: fs v2 fix round 1 — module split + review fixes 1-3
status: completed
type: task
priority: high
created_at: 2026-10-15T21:28:22Z
updated_at: 2026-10-15T21:40:12Z
parent: cc-sdd-20zn
---

Task 2 fix round: decompose src/policies/filesystem.ts into a folder (tiers/resolve/reasons/policy), then apply plan fix-round amendments A ($-expansion guards), B (case-insensitive in-zone tiers), C (embedded-path tokens). Parent: cc-sdd-20zn.

## Summary of Changes

Module split applied (tiers/resolve/reasons/policy under src/policies/filesystem/, old single file deleted, imports re-pointed) + review fixes 1-3: $-expansion guards (name boundary, unresolved-var fail-closed gate incl. operator spellings), case-insensitive git/settings tiers, embedded-path token decomposition (@-strip, --flag=value). One plan deviation documented in task-2-report.md §F1.2 (HOME_OPERATOR fail-closed — plan-verbatim code cannot deny its own ${HOME^}secret fixture). Gates: 309/3 (3 = known run-hook trio), tsc clean, biome exit 0, all modules <300 lines. 62/62 filesystem tests.

## Round 2 (glue rule)

HOME_OPERATOR dropped for the plan's final unresolvedVar glue rule (anchored head must be ~ or ~/-continuation); residual fixture cat ${HOME}secret pinned (RED 62/1 → GREEN 63/63); resolve.ts + tiers.ts conformed to the new no-trailing-export-blocks rule (inline exports, private-first). Gates green: 310/3 (known trio), tsc clean, biome exit 0.
