# Review Package — Task 2.2, Round 1

- Task: 2.2 (bean cc-sdd-9xq7) — Re-point the plugin README and e2e runbook references
- Requirements: 5.3 (per the task bean's _Requirements_ line)
- Scope: /Users/vasilsokolik/www/cc-sdd/plugins/sdd/README.md (boundary: Documentation re-referencing)
- Baseline note: tree was clean at commit ee723dd before this task; implementer edited the file (Edit tool); user commits at the stop point
- Runbook leg: the pinned e2e runbook (.superpowers/sdd/2026-09-22-sdd-plugin-conversion/e2e-runbook.md) is ABSENT from disk (user's deliberate deletion, pre-adjudicated at the tasks approve gate 2026-09-26); per the brief the absence is recorded in the bean's ## Report and the file was NOT recreated — nothing to review for that leg
- Implementer's evidence: pre-edit RED — `test -e plugins/sdd/docs/superpowers` and `test -e plugins/sdd/LICENSE` both absent (broken refs at post-move location); post-edit GREEN — all 5 markdown links resolve from plugins/sdd/ (#bootstrap anchor + 3 guides + ../../LICENSE), ../../docs/superpowers/ resolves, invocation carries the plugins/sdd segment, root targets present
- RED_EVIDENCE: the two unresolvable pre-edit refs above (content/location gate failing → passing)

## Diff (working tree vs HEAD): plugins/sdd/README.md, 3 insertions / 3 deletions

```diff
@@ -21,7 +21,7 @@ ## Getting started
-claude --plugin-dir /path/to/cc-sdd
+claude --plugin-dir /path/to/cc-sdd/plugins/sdd

@@ -257,10 +257,10 @@ ## Documentation
-The conversion's own spec and task plan live in `docs/superpowers/` — this
+The conversion's own spec and task plan live in `../../docs/superpowers/` — this

-MIT — see [LICENSE](LICENSE).
+MIT — see [LICENSE](../../LICENSE).
```

Guide links (docs/guides/*.md) unchanged — the guides moved with the README, so they resolve as before.
