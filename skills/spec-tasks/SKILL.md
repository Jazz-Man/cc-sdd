---
name: spec-tasks
description: Generative fork - derive the static task plan (.sdd/specs/<feature>/tasks.md) from requirements and design, and sync one task bean per sub-task under the feature epic. Use after /sdd:spec-design; the invoking context presents the result and runs the confirm gate.
context: fork
background: false
model: opus
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebSearch, WebFetch
---

# spec-tasks - static task plan + task beans

## Role

You are a FORK: a fresh subagent with no conversation history. This skill
body is your entire task prompt - everything you need is resolved from
beans and files below. You NEVER ask the user questions (no
AskUserQuestion exists in your path) and you never dispatch subagents:
when you cannot proceed, return the BLOCKED status contract from the
Return contract section. The main context that invoked you owns all
dialogue and the confirm gate.

Your job: turn the approved design into
`.sdd/specs/<feature>/tasks.md` - a STATIC plan document - and into one
task bean per sub-task under the feature epic. Execution is strictly
sequential (one active feature, one task at a time); the plan records
structure, never progress.

## Hard rules

1. **Git is read-only.** Bash is limited to the beans CLI and read-only
   inspection. Nothing in this run stages, commits, pushes, or touches
   branches: the user reviews and commits.
2. **beans is the only tracker.** tasks.md is a STATIC plan: no
   checkboxes, no parallel markers, no progress or approval state in the
   document - ever. This skill's only bean writes are the task-bean sync
   of Step 5 under the active epic.
3. **No user questions.** Blocked means return BLOCKED, not stop-and-ask.
4. **English output** - fixed; no per-spec language configuration exists.

## Step 1 - Resolve the active feature

Query beans: `beans list --json -t epic -s in-progress`.

- **Exactly one** -> the active feature. Resolve its spec directory from
  the `Spec path:` line in the bean body (`.sdd/specs/<feature>/`); if
  the body names none, return BLOCKED asking the main context where the
  feature lives.
- **None** -> return BLOCKED: no active feature; point to
  `/sdd:spec-init` (a spec is already shaped) or `/sdd:discovery`
  (nothing shaped yet).
- **More than one** -> return BLOCKED: the single-active-feature rule is
  violated; the main context resolves it with the user.

## Step 2 - Load inputs

- `.sdd/specs/<feature>/requirements.md` and
  `.sdd/specs/<feature>/design.md` - BOTH required. design.md missing ->
  return BLOCKED pointing to `/sdd:spec-design`.
- `${CLAUDE_PLUGIN_ROOT}/assets/rules/tasks-generation.md` - generation
  principles: natural-language capability descriptions, phase ordering
  (foundation -> core -> integration -> validation), task sizing,
  dependency declaration, boundary scope, requirements mapping,
  observable completion, and the Task Plan Review Gate. Its checkbox and
  `(P)` examples are legacy grammar: the STATIC format in Step 3
  supersedes them. Do NOT read tasks-parallel-analysis.md - parallel
  judgement is retired; execution is sequential.
- `${CLAUDE_PLUGIN_ROOT}/assets/templates/tasks.md` - the plan format,
  constrained by Step 3.
- `.sdd/specs/<feature>/workspace/tasks-edits.md` - cumulative edit
  intent from the user, when present. Every recorded `## Round <K>` must
  be satisfied by the plan you produce; a round titled
  `Regenerate from scratch` overrides merge mode.

**Existing tasks.md**: treat it as the edit-merge base (preserve
untouched sections) unless a round says regenerate. Whether a
pre-existing plan should be regenerated is the presenting context's
decision, offered at its confirm gate - never yours.

## Step 3 - Draft the plan

Static plan format:

- The document opens with `# Implementation Plan` and, on the very next
  line, VERBATIM:

  `> **For executors:** REQUIRED: execute via /sdd:impl. State lives in beans — never edit this document to record progress.`

- Plain list items, never checkboxes: `- 1. Foundation: ...`,
  `- 1.1 Sub-task ...`. Maximum two levels; major tasks increment
  1, 2, 3...; sub-tasks reset per major (1.1, 1.2...). NO `(P)` markers -
  execution is sequential.
- Each sub-task: a natural-language capability description (no file
  paths or function names - those live in design.md), detail bullets
  with at least one OBSERVABLE completion condition ("what will be true
  when this task is done"), then metadata lines:
  - `_Requirements: X.X, Y.Y_` - numeric IDs exactly as in
    requirements.md, comma-separated, no descriptive suffixes; never
    invent IDs
  - `_Boundary: ComponentName_` - component names from design.md; a task
    stays within one responsibility boundary, and cross-boundary work
    becomes an explicit integration task
  - `_Depends: X.X_` - only non-obvious cross-boundary dependencies;
    plain ordering handles the rest
- Coverage: every requirement ID from requirements.md appears in at
  least one task; every design component, contract, integration point,
  and runtime prerequisite is represented. A requirement may be deferred
  only with documented rationale in the plan - never silently dropped.

## Step 4 - Sanity review (before writing anything)

Run the **Task Plan Review Gate** from tasks-generation.md on the draft:
mechanical coverage first (every requirement ID present, every design
component represented), then executability (1-3 hour sub-tasks,
verifiable deliverables, observable completion bullets, no implicit
prerequisites, `_Depends:_`/`_Boundary:_` consistent with the design's
boundary map). Repair local issues and re-run - at most 2 repair passes.

If the gate exposes a real requirements or design gap, do NOT invent
filler tasks: return BLOCKED naming the exact gap and pointing to
`/sdd:spec-design` (or `/sdd:spec-requirements` when the gap is in the
requirements).

## Step 5 - Write tasks.md, then sync task beans

1. **Write** `.sdd/specs/<feature>/tasks.md` - only after the gate
   passes.
2. **Sync beans** so the epic carries exactly one task bean per sub-task.
   First fetch the epic's existing children, e.g.
   `beans query --json '{ bean(id: "<epic-id>") { children { id title status body } } }'`,
   and map each bean's `Task:` body line to a plan number. A child with
   no parseable `Task:` line (created outside sdd) is left untouched and
   listed in the return summary's CONCERNS for the presenting context to
   adjudicate. Then:
   - **New sub-task** -> `beans create "<N> <one-line title>" -t task -s todo`
     (capture the id from the JSON output), then
     `beans update <id> --parent <epic-id>`, then for each of its
     `_Depends:` entries
     `beans update <id> --blocked-by <bean-id of the depended task>`
     (create accepts no blocked-by; update does). The body carries
     stable parseable lines:
     ```
     Task: <N>
     Requirements: <IDs>
     Boundary: <components>
     ```
   - **Changed sub-task** (number exists, content moved) -> update the
     title and body; PRESERVE its status - never reset a bean that has
     progressed.
   - **Numbering discipline (edit rounds):** once implementation has
     started, a Task number must never be reused for different work.
     Either preserve the numbering of completed/in-progress tasks, or
     give renumbered work new numbers - new beans, old ones scrapped
     with reason: a bean's status must never end up bound to different
     content. Compare each existing bean's one-line title against the
     plan line; when they describe different work rather than a
     refinement of the same work, treat the number as removed and the
     work as new.
   - **Removed sub-task** (bean's number no longer in the plan) ->
     `beans update <id> -s scrapped` with a one-line reason (superseded
     by the revised plan).
   Create beans in plan order; `_Depends:` always points at an earlier
   number, so the referenced bean exists by the time you link it. The
   write order is deliberate: tasks.md is durable BEFORE any bean is
   created, so an interrupted sync is healed by the next run's
   idempotent re-sync from the written plan.

## Return contract

**To the fork (your final message).** Return exactly this block - the
caller parses the heading and the `- STATUS:` line mechanically:

```
## Tasks Summary
- STATUS: <DONE | BLOCKED>
- PLAN: <X major tasks, Y sub-tasks; major groups one line each>
- COVERAGE: <all requirement IDs covered / deferred ones with rationale>
- BEANS: <created / updated / scrapped counts>
- CONCERNS: <one line each, if any>
- PATH: <.sdd/specs/<feature>/tasks.md, or - when BLOCKED>
- BLOCKERS: <BLOCKED only - the gap and the command to run>
```

**To the presenting main context.** You invoked this fork; it cannot ask
the user anything, so you own the confirm gate. On DONE: present a SHORT
summary in chat - task counts, the major groups one line each, coverage
confirmation, bean effects (created/updated/scrapped). The user reads
tasks.md in the IDE; do not dump it into chat. Then AskUserQuestion,
confirm-only:

1. **Approve** (Recommended) - the plan and its beans are settled. Name
   the next command in a code block:
   ```
   /sdd:impl
   ```
2. **Edit** - the user supplies feedback. Append it under `## Round <K>`
   in `.sdd/specs/<feature>/workspace/tasks-edits.md` (create the file
   if needed; workspace files are append-only), then re-invoke
   `/sdd:spec-tasks` - a NEW fork re-derives the plan from design.md
   plus the digest and re-syncs the beans (Step 5 handles updates,
   additions, and scraps idempotently).
3. **Regenerate from scratch** - offer when tasks.md existed before this
   run. Append `## Round <K> - Regenerate from scratch` to the digest
   and re-invoke `/sdd:spec-tasks`.
4. **Stop** - the user takes over; the plan and beans stay as they are.

On BLOCKED: present the blocker and the named command, then
AskUserQuestion on how to proceed (resolve via that command / adjust
inputs / stop).
