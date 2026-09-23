---
# cc-sdd-73kb
title: Follow-ups from final branch review (findings 2-8)
status: todo
type: task
priority: normal
created_at: 2026-09-23T12:45:25Z
updated_at: 2026-09-23T12:45:25Z
parent: cc-sdd-uwj4
---

From the final whole-branch review (CLEAN-WITH-FOLLOW-UPS):
2. DELETE assets/templates/requirements-init.md (zero refs) or wire into spec-requirements edit-merge
3. DELETE assets/rules/tasks-parallel-analysis.md + drop spec-tasks:64 prohibition line (criteria condensed in tasks-generation.md)
4. DELETE assets/rules/steering-principles.md (unreferenced post-Task-13; name-collides with skills/steering/references/ copy carrying different content)
5. impl SKILL.md:87 — add blockedByIds to the Step 0 example children query
6. validate-impl:147 — add -i to the case-insensitive grep command
7. verify-completion ~22 — reword garbled 'and that validate-impl applies to use whenever'
8. validate-impl:115 — add CLAUDE_SKILL_DIR sibling fallback phrasing for standalone fork entry
Apply AFTER the user's E2E walkthrough returns (do not desync the scratch session).
