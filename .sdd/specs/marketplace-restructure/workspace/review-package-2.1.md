# Review Package — Task 2.1, Round 1

- Task: 2.1 (bean cc-sdd-zq8w) — Re-scope the repository guide layout and verification sections
- Requirements: 5.1, 5.3 (per the task bean's _Requirements_ line)
- Scope: /Users/vasilsokolik/www/cc-sdd/CLAUDE.md — §Layout and §Verification (boundary: Verification battery, Documentation re-referencing)
- Baseline note: tree was clean at commit 63b7cb9 before this task; implementer edited the file (Edit tool); user commits at the stop point
- Implementer's evidence: exists-check over every path named in new §Verification/§Layout → 13/13 EXISTS; stale-scope sweep (bare skills/assets/hooks/bin/README.md/docs-guides outside plugins/sdd/) → none remain; `claude plugin validate .` exit 0; battery spot-run over the new prefix from the pinned patterns: twin count-greps 6/6/6, census 15, zero-hit greps (double-brace, .kiro, kiro-) zero, approve-gate paired-diff EMPTY after four-slot normalization
- RED_EVIDENCE: pre-edit existence check over the OLD §Verification scope strings → MISSING: skills, assets, hooks, bin, README.md, docs/guides at root
- Known concern (pre-adjudicated by the user at the tasks approve gate, 2026-09-26): the pinned e2e runbook path `.superpowers/sdd/2026-09-22-sdd-plugin-conversion/e2e-runbook.md` does not exist — `.superpowers/` is empty because the user deliberately deleted it; task 2.2 (cc-sdd-9xq7) owns recording the absence. CLAUDE.md's e2e member carries no concrete path, per the design's contract wording.
- Binding learnings applied (beans cc-sdd-594v, cc-sdd-qhkg ## Notes): validate green proves nothing about manifest content; validate never prints per-entry resolved paths

## Diff (working tree vs HEAD): CLAUDE.md, 69 insertions / 43 deletions

Opening claim replaced: "This repo IS the plugin" → marketplace-root claim (repo is a local Claude Code plugin marketplace; sdd lives at plugins/sdd/, its only plugin today).

§Layout: old flat root tree → design's target tree under plugins/sdd/ (skills with all 15 entries, assets incl. workflow-map.md + design-system_flow.png, bin, hooks, docs/guides, README.md, .claude-plugin/plugin.json), root keeps .claude-plugin/marketplace.json, CLAUDE.md, LICENSE, docs/superpowers/, working-state dirs; impl templates reference updated to plugins/sdd/skills/impl/templates/.

§Verification: invariant-grep scope → `plugins/sdd/skills/ plugins/sdd/assets/ plugins/sdd/hooks/ plugins/sdd/README.md CLAUDE.md plugins/sdd/docs/guides/` plus `plugins/sdd/bin/` for the convention set; twin checks scope → `plugins/sdd/skills/` with explicit twin file paths and the 15-skill census over plugins/sdd/skills/ returning exactly 15; NEW prefix-mapping note (pattern texts pinned in the two historical design documents apply with the plugins/sdd/ prefix; those documents are append-only records, not edited); NEW e2e member ("e2e dry run per the re-pointed runbook", pathless per the design's contract wording given the known absence); root `claude plugin validate .` bullet unchanged.

Full unified diff available via `git diff -- CLAUDE.md` (69+/43-); reviewers should read the file and the diff directly.
