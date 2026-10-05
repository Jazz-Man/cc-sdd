---
name: spec-tasks
description: Generative fork - derive the task plan directly from requirements and design as a draft task TREE under the feature epic (feature-type major containers, task leaves, dependency edges in the bean graph); there is no plan document. Use after /sdd:spec-design; the main context presents the bean list and runs the approve gate.
context: fork
background: false
model: opus
---

# spec-tasks - the task plan as task beans

## Role

You are a FORK: a fresh subagent with no conversation history. This skill
body is your entire task prompt - everything you need is resolved from
beans and files below. You NEVER ask the user questions (no
AskUserQuestion exists in your path) and you never dispatch subagents:
when you cannot proceed, return the BLOCKED status contract from the
Return contract section. The main context that invoked you owns all
dialogue and the approve gate.

Your job: turn the approved requirements and design into the feature's
task tree - feature-type major containers under the epic, task leaves
under their majors, all born `draft`. The beans ARE the plan - no plan
document exists anywhere in this flow (spec Revision 4), and the bean
GRAPH is the sequence: dependency edges (`blockedByIds`), never number
order, decide what runs next. Execution is strictly sequential (one
active feature, one task at a time); the beans record structure, never
progress.

## Hard rules

1. Bash is limited to the beans CLI and read-only inspection.
2. **beans is the only tracker - and it stays that way.** This skill
   writes no document and no progress or approval state. Its only bean
   writes are the task-bean sync of Step 6 under the active epic;
   promotion (`draft` -> `todo`) and phase-gate completion belong to the
   main context alone (Return contract).
3. **No user questions.** Blocked means return BLOCKED, not stop-and-ask.
4. **English output** - fixed; no per-spec language configuration exists.

## Step 1 - Resolve the active feature

Query beans: `beans list --json -t epic -s in-progress`.

- **Exactly one** -> that epic is the active feature. Resolve its spec
  directory from the `Spec path:` line in the bean body
  (`.sdd/specs/<feature>/`); if the body names none, return BLOCKED
  asking the main context where the feature lives.
- **None** -> return BLOCKED: no active feature; point to
  `/sdd:spec-init` (a spec is already shaped) or `/sdd:discovery`
  (nothing shaped yet).
- **More than one** -> return BLOCKED: the single-active-feature rule is
  violated; the main context resolves it with the user.

## Step 2 - Phase-gate check

> **Gate:** the tasks phase runs only after the design phase is
> approved. If the `Phase — design` bean is not `completed`, STOP -
> return BLOCKED naming `/sdd:spec-design`.

(`${CLAUDE_PLUGIN_ROOT}/bin/sdd-phase spec-tasks` wraps this check as a
read-only script - completed plus `validated` plus Doc-hash freshness;
the inline procedure above stays the canonical fallback.)

Query the epic's children once:
`beans query --json '{ bean(id: "<epic-id>") { children { id title status tags blockedByIds body } } }'`
(the resolved relation `blockedBy` is broken in beans v0.4.2 - always
read `blockedByIds`). Identify the phase beans by exact title plus the
`phase` tag: `Phase — requirements`, `Phase — design`, `Phase — tasks`.

- **No `Phase — design` bean under the epic** -> return BLOCKED: the
  epic predates phase gates; the main context resolves the missing gate
  beans with the user (spec-init creates them at feature birth).
- **`Phase — design` not `completed`** -> the gate above: BLOCKED naming
  `/sdd:spec-design`.
- **`Phase — tasks` already `completed`** -> re-entry into an approved
  phase (spec Revision 5): return BLOCKED stating the re-entry and that
  the main context must escalate (reopen the phase, then re-invoke; or
  stop). Never re-sync an approved plan silently - impl gates on this
  bean.
- **`Phase — tasks` bean missing while design is `completed`** ->
  partial legacy state: the bean sync may proceed, but the approve gate
  cannot close the phase - it names `/sdd:spec-init` (whose idempotent
  path creates missing phase beans) before promotion. Carry the gap as
  a CONCERNS line so it reaches the gate.

Keep the tasks phase bean id at hand (when present); the main
context completes it at the approve gate.

## Step 3 - Load inputs

- `.sdd/specs/<feature>/requirements.md` and
  `.sdd/specs/<feature>/design.md` - BOTH required. Either missing ->
  return BLOCKED pointing to `/sdd:spec-requirements` or
  `/sdd:spec-design` respectively.
- `${CLAUDE_PLUGIN_ROOT}/assets/rules/tasks-generation.md` - generation
  principles and the Task Plan Review Gate. Where that rule file speaks
  of writing a plan document, read the drafted briefs of Step 4 and the
  bean sync of Step 6 - no document is written, ever.
- `.sdd/specs/<feature>/workspace/tasks-edits.md` - cumulative edit
  intent from the user, when present. Every recorded `## Round <K>` must
  be satisfied by the bean plan you produce; a round titled
  `Regenerate from scratch` overrides merge behavior (Step 6).
- Steering: already in your context (project memory, loaded at session
  start) - apply it; do not re-read the files.
- Codebase: verify the design's boundary components and integration
  points against the real code before sizing tasks - prefer LSP tools
  where they exist in your context (definitions, references, type info),
  falling back to Grep/Glob. Read-only.

## Step 4 - Draft the bean plan

Draft in memory - one brief per bean (majors: a scope line; leaves: the
full brief), nothing written yet:

- Tree shape: major groups are real container beans - type `feature`,
  parent = the epic, a one-line scope brief, no detail bullets. Each
  sub-task is a task bean under its major (type `task`). The beans CLI
  fixes this shape (tasks nest only under milestone/epic/feature;
  feature-under-feature is refused): deeper decomposition flattens to
  dotted numbers under the same major, and a single-item major collapses
  to a flat task child of the epic. Numbering: majors increment 1, 2,
  3...; leaves reset per major (1.1, 1.2...). No checkboxes, no parallel
  markers, no step lists inside a brief - a task that needs multiple
  steps is decomposed into child beans, never a checklist in the body.
  Phase order: foundation -> core -> integration -> validation.
- Each leaf brief: a natural-language capability description (no
  file paths or function names - those live in design.md), detail
  bullets with at least one OBSERVABLE completion condition ("what will
  be true when this task is done"), then metadata:
  - `_Requirements: X.X, Y.Y_` - numeric IDs exactly as in
    requirements.md, comma-separated, no descriptive suffixes; never
    invent IDs.
  - `_Boundary: ComponentName_` - component names from design.md; a task
    stays within one responsibility boundary; cross-boundary work
    becomes an explicit integration task.
  - `_Depends: X.X_` - sequencing is edges, not order: every leaf is
    blocked-by its immediate predecessor, every major by the previous
    major; declare `_Depends:` only for non-adjacent or cross-boundary
    links (each entry adds one edge at bean creation). A `_Depends:`
    entry always points at an earlier number. A leaf with no incoming
    chain edge is designed-independent - its brief says why.
- Coverage: every requirement ID from requirements.md appears in at
  least one task; every design component, contract, integration point,
  and runtime prerequisite is represented. A requirement may be deferred
  only with documented rationale - carry it as a bullet in the nearest
  task's brief and in the return summary's COVERAGE line; never drop it
  silently.
- Sizing: leaf tasks executable in 1-3 hours each.

## Step 5 - Review gate (before any bean write)

Review gate: apply
`${CLAUDE_PLUGIN_ROOT}/assets/rules/tasks-generation.md` -
bounded at 2 repair passes.

If the gate exposes a real requirements or design gap, do NOT invent
filler tasks: return BLOCKED naming the exact gap and pointing to
`/sdd:spec-design` (or `/sdd:spec-requirements` when the gap is in the
requirements).

## Step 6 - Sync task beans

Re-fetch the tree (statuses move; work from fresh data): the epic's
children (same query as Step 2 - phase beans and major containers), then
each non-phase child's children (the leaves). Set the phase beans aside
(tag `phase` - never touched here). For the rest, build the number map:
parse each bean's `Task: <N>` body line, or its `<N> ` title prefix,
into number -> (id, title, status, parent-id). A bean with no parseable
number was created outside sdd: leave it untouched and list it under
CONCERNS for the main context to adjudicate.

- **New major container** (number not in the map) -> create it first,
  in plan order so the previous major already exists:
  ```
  beans create "<N> <one-line scope>" -t feature -s draft \
    --parent <epic-id> --blocked-by <prev-major-bean-id> -d - <<'BRIEF'
  ## Brief

  Task: <N>
  Title: <one-line scope>

  <scope of the group in one or two lines - container briefs carry no
  detail bullets; the leaves own the detail>
  BRIEF
  ```
  `--blocked-by` chains the major to the previous major; omit it for the
  first major. Capture each new id from the JSON output - the leaves
  link against it.
- **New leaf** (number not in the map) -> create it under its major, in
  plan order so every `_Depends:` target already exists:
  ```
  beans create "<N.M> <one-line title>" -t task -s draft \
    --parent <major-bean-id> --blocked-by <dep-bean-id> -d - <<'BRIEF'
  ## Brief

  Task: <N.M>
  Title: <one-line title>

  <capability description>

  - <detail bullet>
  - <detail bullet - at least one states the observable completion>

  _Requirements: X.X, Y.Y_
  _Boundary: ComponentName_
  BRIEF
  ```
  Repeat `--blocked-by` once per edge: the chain link to the immediate
  predecessor plus one per `_Depends:` entry; a designed-independent
  first leaf carries none. The body IS the brief - one `## Brief`
  section per the machine-contract grammar, exactly the drafted content.
- **Changed bean** (major or leaf; number exists, content moved) -> update in
  place, PRESERVING its status - never reset a promoted, active, or
  completed bean to draft: `beans update <id> --title "<N> <new title>"`,
  replace the `## Brief` section (`--body-replace-old` with the exact
  current section text just fetched, `--body-replace-new` with the
  revised one), and re-converge dependencies: add missing ones with
  `--blocked-by <bean-id>`, drop stale ones with
  `--remove-blocked-by <bean-id>`.
- **Numbering discipline (re-runs):** once a bean has left `draft`
  (todo, in-progress, completed), its number is bound to its work.
  Compare the existing one-line title against the drafted line: when
  they describe different work rather than a refinement of the same
  work, the number counts as removed-and-reused - forbidden. Give the
  new work the next free number instead and treat the old bean per the
  removed rule below. Still-draft beans carry no lived state: re-sync
  them in place freely.
- **Removed bean** (major or leaf; number no longer in the plan) -> by status:
  `draft` or `todo` -> `beans update <id> -s scrapped` with a one-line
  reason (superseded by the revised plan); `in-progress` or `completed`
  -> NEVER scrap or reset it automatically - leave it and raise a
  CONCERNS line (plan/execution divergence; the main context adjudicates
  with the user).
- **Regenerate round:** when the loaded digest carries a
  `Regenerate from scratch` round, scrap every task bean under the epic
  (phase beans excepted) with a one-line reason, then create the freshly
  derived plan from zero. Regenerate is an explicit user choice and
  supersedes the NEVER-scrap rule above - that rule governs your own
  autonomous re-sync; an explicit order may scrap started beans (their
  bodies survive in the scrapped beans' archive).
- **Crash safety:** there is no two-phase commit to protect - every
  operation above is a complete, independent bean write, and the whole
  step is idempotent. An interrupted run leaves a partially synced epic;
  the next run re-derives the same plan from the same inputs and heals
  it: existing numbers update in place, missing ones are created,
  vanished ones scrap.
- **Concurrency:** when re-syncing beans another session may hold
  (mid-implementation re-plan after a reopen), capture
  `beans show <id> --etag-only` first and pass `--if-match` on the
  update; on an etag conflict, re-fetch and re-apply.

## Return contract

**To the fork (your final message).** Return exactly this block - the
caller parses the heading and the `- STATUS:` line mechanically:

```
## Tasks Summary
- STATUS: <DONE | BLOCKED>
- PLAN: <X major groups, Y task beans - one line per major group>
- COVERAGE: <all requirement IDs covered, or deferred IDs with rationale>
- BEANS: <created / updated / scrapped / unchanged counts>
- DRAFTS: <one line per bean: "<N> <scope> - container, X leaves" for majors, "<N.M> <title> - depends on <numbers, or none>" for leaves>
- CONCERNS: <one line each, if any>
- PHASE: <tasks phase bean id from Step 2, or `missing` - the approve gate closes with it>
- BLOCKERS: <BLOCKED only - the gap, the missing gate, or the re-entry, and the command or decision needed>
```

**To the main context.** You invoked this fork; it cannot ask
the user anything, so you own the approve gate - and for this phase the
gate is its ONLY completion path: no validator runs here (Revision 6
scopes validators to the requirements and design documents; the tasks
phase has none). On DONE: present a SHORT summary in chat - the DRAFTS
list (numbers, titles, dependencies), the coverage line, bean effects,
and concerns. The user reviews the beans themselves (the tracker files
or `beans show <id>`); do not dump every brief into chat. Then
AskUserQuestion, confirm-only:

1. **Approve all** (Recommended) - the plan is settled. Promote every
   draft in the tree with the write helper:
   `${CLAUDE_PLUGIN_ROOT}/bin/sdd-promote <epic-id> --all` (drafts only,
   any depth; phase beans never). Then close the phase gate:
   `beans update <tasks-phase-id> -s completed`. Name the next command
   in a code block:
   ```
   /sdd:impl
   ```
2. **Approve selectively** - the user lists the numbers to promote;
   promote only those
   (`${CLAUDE_PLUGIN_ROOT}/bin/sdd-promote <epic-id> <bean-id>...` - at
   least one; the helper refuses anything not a draft descendant of the
   epic). Unchosen beans stay `draft`: unapproved, never auto-selected
   by impl. Then close the phase gate and name `/sdd:impl` as above. If
   the user names none, this is not an approval - fall back to Edit or
   Stop.
3. **Edit** - the user supplies feedback. Append it under
   `## Round <K>` in
   `.sdd/specs/<feature>/workspace/tasks-edits.md` (create the file if
   needed; workspace files are append-only), then re-invoke
   `/sdd:spec-tasks` - a NEW fork re-derives the plan from design.md
   plus the digest and re-syncs idempotently (Step 6 handles updates,
   additions, and scraps; statuses are preserved). A round titled
   `Regenerate from scratch` triggers Step 6's regenerate clause: every
   task bean under the epic (phase beans excepted) is scrapped with
   reason and the plan re-derived from zero.
4. **Stop** - the user takes over; the beans stay as they are (drafts
   remain draft, the phase gate stays open).

On BLOCKED: present the blocker and the named command or decision, then
AskUserQuestion on how to proceed (resolve via that command / adjust
inputs / stop). The re-entry case escalates with two options: **Reopen**
(Recommended) - `beans update <tasks-phase-id> -s todo`, then re-invoke
`/sdd:spec-tasks`: the re-sync runs under the reopened gate and the
approve gate re-completes it; **Cancel** - nothing changes. (Revision 5's
accept-desync option is deliberately absent here: the tasks phase has no
upstream document - the bean queue IS the execution input, so mutating
it while the gate reads completed is exactly the silent invalidation the
gate exists to prevent.)
