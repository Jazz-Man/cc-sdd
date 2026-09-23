---
# cc-sdd-39sx
title: 'Task 10: discovery rewrite (sequential multi-spec queue)'
status: completed
type: task
priority: normal
created_at: 2026-09-23T10:13:11Z
updated_at: 2026-09-23T10:21:58Z
parent: cc-sdd-uwj4
---

Plan task 10: rewrite skills/discovery/SKILL.md — routing decision via AskUserQuestion with trade-offs; multi-spec = milestone + strictly sequential epic queue with blocked-by; follow-ups queued never parallel; .sdd/brief.md narrative; no roadmap.md/spec-batch mentions.

## Progress (2026-09-23)

Step 1 done: skills/discovery/SKILL.md fully rewritten (296 lines) - interactive routing skill, 5 routes incl. mixed, AskUserQuestion prose-first, milestone + strictly sequential epic chain (--blocked-by), follow-ups queued behind active epic, .sdd/brief.md single resume doc, no tracker state in documents. Dangling /sdd:spec-batch (x5) and /sdd:spec-quick (x1) invocations purged along with the plan-document machinery.

Step 2 done: grep -ci 'roadmap|spec-batch' -> 0; grep -c 'blocked-by' -> 6; spec-quick/{{/.kiro/kiro-/spec.json/approvals/checkbox/git-write -> all 0 on the file; claude plugin validate passes (known warnings only). Pre-existing {{ / kiro hits on HEAD are confined to README, docs/guides, assets/templates (own their placeholders), and skills/steering (Task 13 exception) - untouched by this task.

Step 3 pending: user review + commit. Full report: .superpowers/sdd/2026-09-22-sdd-plugin-conversion/task-10-report.md

## Summary of Changes
skills/discovery/SKILL.md rewritten (296 lines): interactive 5-route routing with prose-first AskUserQuestion and trade-offs; no-spec as legitimate outcome; multi-spec = milestone + strictly sequential epic chain (--blocked-by predecessor, parallel refused in question itself); follow-ups queued behind active epic; .sdd/brief.md single resume doc (narrative-not-state); Task-5 dangling invocations purged. Review APPROVED — all 5 judgment calls approved (epic birth stays in spec-init per 6.2; 4-option ceiling handled); 2 wording nits accepted without a round.
