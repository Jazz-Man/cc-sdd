---
# cc-sdd-2579
title: Close here-string gap in no-inline-scripts
status: completed
type: bug
priority: high
created_at: 2026-10-16T11:35:33Z
updated_at: 2026-10-16T12:34:57Z
---

python3 <<< 'print(1)' still allows: <<< feeds a string to stdin (inline code execution, same family as heredoc). The Redirect record IS emitted (day2-final landed the redirects consumption for <<); the no-inline-scripts heredoc-family check needs <<< added to its operator condition. One-operator fix + fixture. Close in the next implementer dispatch (v6-upgrade or Task 4 preamble) — guard not live until Task 5.

## Summary of Changes

Added `<<<` to the heredoc-family operator set (`FED_OPERATORS`) in no-inline-scripts: a here-string on an interpreter is stdin-fed inline code, denied like `<<`/`<<-`. Pins: `python3 <<< 'print(1)'` DENY, `cat <<< hello` ALLOW. TDD red (1 failing pin) → green.
