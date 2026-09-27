# Review Package — Task 3.2, Round 1

- Task: 3.2 (bean cc-sdd-sp3d) — Verify plugin behavior in a fresh session
- Requirements: 3.3, 3.4, 3.5 (per the task bean's _Requirements_ line)
- Scope: verification-only (boundary: sdd plugin folder); NO repository file changes; scratch dir /tmp/sdd-fresh-session-scratch created and verified removed afterwards
- Preconditions (held): registration re-point done (3.1 completed — one sdd-local Directory registration, sdd@sdd-local enabled user-scope), repository battery-green (2.3 completed)
- Method: headless FRESH session in the scratch project — `claude -p` with a minimal two-part question; SessionStart fires on startup, so hook output lands in the model's context
- Implementer's evidence:
  - Pre-check (read-only): `claude plugin list` — exactly one `sdd@sdd-local`, Scope user, enabled
  - A1 (map injection — 3.4 + 3.5): scratch session answered verbatim "A1: YES", quoting the heading `# sdd - spec-driven development (default workflow map)` plus the opening sentence, both matched against `plugins/sdd/assets/workflow-map.md` — the repository's only map file; therefore the hook's `${CLAUDE_PLUGIN_ROOT:?unset}/assets/workflow-map.md` cat resolved to the plugin subfolder, proving hook execution AND plugin-root resolution together
  - A2 (skills invocable — 3.3): scratch session answered "A2: YES" with sdd:impl, sdd:review, sdd:spec-init visible
  - Scratch dir absent after cleanup
- Corroboration: the orchestrator's own session loaded /sdd:impl's skill body from /Users/vasilsokolik/www/cc-sdd/plugins/sdd/skills/impl/ after the re-add
- Non-blocking notes (bean ## Report): scratch-session transcript persists under ~/.claude/projects/ as harness logging; `beans prime` hook outcome in the scratch session not separately observable — irrelevant to the proof
- RED_EVIDENCE: N/A — verification-only task

## Reviewer instruction

Independently verify: re-run the headless fresh-session check in your own /tmp scratch dir (the same two-part question), confirm the quoted map lines match plugins/sdd/assets/workflow-map.md, confirm no repository files changed (git status read-only). The implementer's contract is not evidence.
