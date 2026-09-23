<SUBAGENT-STOP> If you were dispatched as a subagent to execute a task, ignore this block.

<EXTREMELY_IMPORTANT>
# sdd - spec-driven development (default workflow map)

Spec-driven development with subagent-first execution; skills run as /sdd:<name>.

**Fixed paths.** Feature specs live in `.sdd/specs/<feature>/` - requirements.md, design.md, tasks.md,
and the append-only `workspace/` (task briefs, reports, review packages). The workstream brief is
`.sdd/brief.md`. Nothing is configurable.

**Phase flow.** `/sdd:discovery` -> `/sdd:spec-init` -> `/sdd:spec-requirements` -> `/sdd:spec-design`
-> `/sdd:spec-tasks` -> `/sdd:impl`. One phase per command, each confirming before the next; there is
no chain skill - when a phase ends, present its result and ask a confirm-only question naming the
next command. The user drives the full cycle phase by phase; quick one-off work happens in the main
chat outside sdd.

**Single active feature.** The active feature IS the one epic bean with status `in-progress`; every
other skill resolves it from beans and takes no feature argument. Only spec-init and discovery accept
a new feature name; spec-init refuses to birth one while an in-progress epic exists (offer to
complete or scrap it first). Follow-up features queue as `todo` epics blocked by the active one.

**beans is the only tracker.** State lives in beans, artifacts in files; follow the global beans
guide (SessionStart-injected). Never write progress, approvals, or checkbox flips into documents:
tasks.md is a static plan, never edited to record progress. Resume by querying beans, never by
re-parsing documents.

**Interaction.** Every question or choice-point goes through AskUserQuestion - detailed prose first,
then the structured question. Subagents never ask the user; they return status contracts and the
orchestrator formulates the question. Clarifying questions only in discovery and requirements;
design and tasks are confirm-only. Stop-per-task: after each impl task the orchestrator stops; the
user reviews, tests, and commits before continuing - git is read-only for agents.

**Models (hardwired, never the agent's choice).** Generation of requirements, design, and tasks:
opus. All reviews and validations: opus. Implementation: sonnet, raised to opus in fix-loop rounds
4-5.

**Escalation - no blind decisions.** Any concern or deviation surfaces to the user in four parts:
how it should have been per the plan / what actually happened / why it matters / resolution options
(accept, fix, abort, other). The user decides via AskUserQuestion.

| Skill | Purpose |
|---|---|
| /sdd:init | write the user-owned .claude/rules/sdd.md from this default |
| /sdd:discovery | entry point: research and route new work; writes .sdd/brief.md |
| /sdd:spec-init | birth a feature: spec directory + in-progress epic bean |
| /sdd:spec-requirements | interview the user, dispatch the EARS draft (opus) |
| /sdd:spec-design | fork: research the feature and write design.md |
| /sdd:spec-tasks | fork: static task plan + one task bean per sub-task |
| /sdd:impl | orchestrator: subagent implement/review, stop-per-task |
| /sdd:review | adversarial task-local review protocol |
| /sdd:debug | root-cause-first debugging protocol |
| /sdd:verify-completion | fresh-evidence gate for completion claims |
| /sdd:validate-gap | requirements vs codebase gap analysis (research.md) |
| /sdd:validate-design | design quality review, verdict per criterion |
| /sdd:validate-impl | feature-level GO/NO-GO gate |
| /sdd:steering | manage .claude/rules/ in the target project |

A user-owned `.claude/rules/sdd.md` (written via /sdd:init) always overrides this default map.
</EXTREMELY_IMPORTANT>
