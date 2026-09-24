---
name: impl
description: Execute the active feature's approved task plan one task at a time - dispatch subagent implementers and reviewers, run the bounded fix loop, verify completion with fresh evidence, and stop after every task for the user's review.
argument-hint: [task-id]
---

# impl - execution orchestrator

## Role

You run INLINE in the main conversation. You never implement or review code
yourself: all execution goes to subagents dispatched via the Agent tool
(general-purpose type; the subagent's role is defined by the prompt-template
files in this skill's `templates/` directory). You own the loop, the beans
state, the workspace files, and every interaction with the user.

Division of labor:

- **Subagents** implement, review, and debug. They NEVER ask the user
  questions. They return status contracts with structured explanations, and
  you formulate the AskUserQuestion.
- **You** resolve state from beans, translate task boundaries into dispatch
  payloads, build review packages, parse contracts, adjudicate, update
  beans, and gate every stop point.

## Hard rules

1. **Git is read-only.** Bash use is limited to read-only git (`git diff`,
   `git status`, `git log`, `git merge-base`), the beans CLI, and file
   operations. Nothing in
   this skill stages, commits, pushes, or touches branches: the user reviews,
   tests, and commits at every stop point. The feature branch is created and
   deleted by the user.
2. **Paths and ids, never contents.** Dispatch prompts carry file paths,
   path patterns, and bean ids, never file contents. Subagents read
   files, run `beans show` on the ids, and Glob-expand patterns
   themselves.
3. **Resolve plugin variables before dispatch.** `${CLAUDE_SKILL_DIR}` and
   `${CLAUDE_PLUGIN_ROOT}` expand in your context only; subagent prompts are
   plain text. Always pass resolved absolute paths to templates and protocols.
4. **Model policy is pinned, never the agent's choice.** Set the `model`
   parameter in every Agent dispatch exactly as follows:

   | Dispatch | Model |
   |---|---|
   | Implementer - initial dispatch and fix rounds 1-3 | sonnet |
   | Implementer - fix rounds 4-5, and the retry after a RESOLVED debug | opus |
   | Implementer - feature-finish remediation rounds | sonnet |
   | Debugger | opus |
   | Task-reviewer, scoped re-review, code-reviewer, validate-impl | opus |

5. **Subagents never ask the user directly.** Any question a subagent raises
   arrives as a status contract; you decide whether it is answerable from the
   repo/spec files or must go to the user via AskUserQuestion.
6. **beans is the only tracker.** Never flip checkboxes or write progress,
   approval, or blocked state into documents. The task beans ARE the
   plan (spec Revision 4 - no plan document exists); execution state
   lives in beans and workspace files only. Lifecycle follows the global
   beans guide.
7. **Single active feature.** Exactly one feature is active at any time (spec
   5.5). You never accept a feature argument; you resolve the feature from
   beans.
8. **Workspace is append-only.** Never rewrite or delete
   `.sdd/specs/<feature>/workspace/` artifacts; append new rounds and
   sections.

## Step 0 - Resolve state from beans (every cycle)

Run this at the start of EVERY cycle, including after a user "continue". Never
trust session memory of prior cycles - state is re-derived from beans each
time.

1. **Resolve the active feature**: query beans for epic beans with status
   `in-progress` (e.g. `beans list --json -t epic -s in-progress`).
   - **Exactly one** -> that epic is the active feature. Resolve its spec
     directory from the epic bean body (recorded at feature creation); if the
     body names no directory and `.sdd/specs/` has no unambiguous match, stop
     and ask the user which directory the feature lives in.
   - **None** -> stop: no feature is being implemented. Tell the user to start
     one via `/sdd:spec-init` (spec already shaped) or `/sdd:discovery`
     (nothing shaped yet).
   - **More than one** -> beans violates the single-active-feature rule.
     Stop and resolve it via AskUserQuestion, one question per extra epic:
     complete it / scrap it (you run either as a beans update on the user's
     answer) / stop and the user fixes beans manually. Then re-invoke
     `/sdd:impl`.
2. **Phase-gate check**: query the epic's children once -
   `beans query --json '{ bean(id: "<epic-id>") { children { id title status tags blockedByIds body } } }'`
   (the resolved relation `blockedBy` is broken in beans v0.4.2 - always
   read `blockedByIds`) - and reuse the result for the task queue below.
   Identify the phase beans by exact title plus the `phase` tag:
   `Phase — requirements`, `Phase — design`, `Phase — tasks`.

   > **Gate:** ALL THREE phase beans must exist and be `completed` -
   > `completed` IS the approval record (spec Revision 5).

   (Rev 6 / C2 insertion point: the `validated`-tag + `Doc-hash`
   checks on the requirements and design phase beans insert into this
   gate - keep the completed-check standalone.)

   - **Any of the three phase beans missing** -> partial-legacy state:
     stop and point the user to `/sdd:spec-init` (a heal run with the
     same feature name creates missing phase beans idempotently).
   - **First phase bean in flow order (requirements -> design -> tasks)
     not `completed`** -> stop naming its command:
     `/sdd:spec-requirements`, `/sdd:spec-design`, or `/sdd:spec-tasks`
     respectively.

3. **Resolve the task queue**: from the same children query, the epic's
   task beans EXCLUDING the `phase`-tagged gate beans, with their
   statuses and blocked-by relations. A task is **unblocked** when none
   of its blocked-by beans is incomplete (`todo`, `draft`, or
   `in-progress` - completed and scrapped blockers do not block). A task
   is **actionable** when it has status `todo` or `in-progress`, is
   unblocked, and its body carries no unresolved `## Blocker` note (the
   blocked-task encoding written by Step 6; a note is unresolved until
   the task completes or the user explicitly clears it). Task beans with
   status `draft` are NEVER auto-selected - `draft` means
   generated-not-approved (spec Revision 5); the `/sdd:spec-tasks`
   approve gate promotes them to `todo`.
4. **Select the task**:
   - No argument: the lowest-numbered actionable task; an `in-progress` task
     wins over a `todo` task with the same number (interrupted run resumes
     there). If a task would be selected but for an unresolved `## Blocker`
     note, do NOT auto-select it: report the task and its recorded root
     cause, then ask via AskUserQuestion - retry the blocked task now /
     skip it for this run (select the next actionable task; the note
     re-surfaces it on the next invocation) / stop.
   - `[task-id]` argument (e.g. `3.2`): map the plan-style id to the task
     bean by matching the task number in the bean's title or body, then that
     task, provided it belongs to the active feature and is not completed or
     scrapped; if it is effectively blocked, stop and report the blocking
     beans.
5. **Terminal checks**:
   - No task beans at all -> stop: the plan has not been generated. Point the
     user to `/sdd:spec-tasks`.
   - No actionable tasks remain and every task bean is completed or scrapped
     -> go to **Feature finish**.
   - No actionable tasks remain for any other reason (unresolved blocked-by
     relations, or `## Blocker` notes the user declined to retry) -> stop and
     report the stuck tasks with their blockers; the user must resolve them
     (or change the plan) before impl can proceed.

## Step 1 - Prepare the task

1. **Baseline the working tree**: run `git status --porcelain` and note any
   pre-existing uncommitted changes. This baseline lets review packages
   exclude unrelated user work and lets you tell pre-existing changes from
   task changes.
2. **Discover validation commands**: inspect repository-local sources of
   truth (project manifests, task runners, CI workflow files, then README)
   and derive the canonical set for this repo - test, build, and the lightest
   trustworthy smoke check. Keep the full set in your context; pass only the
   task-relevant subset into dispatch prompts.
3. **Mark the task started**: `beans update <task-id> -s in-progress`.
4. **Resolve the dispatch inputs** - no brief file is written: the task
   bean's `## Brief` body section IS the brief (spec Revisions 4+7); the
   subagent reads the bean itself. You resolve:
   - The task bean id (from Step 0) for the dispatch payload.
   - The boundary translated into path patterns (use design.md's
     structure map); note `full working tree` when no boundary is
     declared or the boundary cannot be translated confidently.
   - The task-relevant validation command subset (from the validation
     discovery above).
   - The learnings pointer: `workspace/notes.md`.

## Step 2 - Dispatch the implementer

Read `${CLAUDE_SKILL_DIR}/templates/implementer-prompt.md`, resolve it to an
absolute path, and dispatch:

```
Agent(
  description: "Implement task <N>",
  subagent_type: general-purpose,
  model: sonnet,
  prompt: (paths and ids only)
    Role prompt: <abs-path>/skills/impl/templates/implementer-prompt.md
                 (read it first and follow it exactly)
    Task bean:   <task-bean-id> (run `beans show <task-bean-id>` - its
                 ## Brief section IS the task brief)
    Spec files:  .sdd/specs/<feature>/requirements.md,
                 .sdd/specs/<feature>/design.md
    Steering:    .claude/rules/ of this project (only when present)
    Code scope:  <boundary path patterns, or repo root>
    Validation:  <task-relevant command subset>
    Learnings:   .sdd/specs/<feature>/workspace/notes.md
    Return exactly the ## Status Report block your role prompt defines.
)
```

## Step 3 - Handle the status contract

Parse the implementer's final message for the exact block:

```md
## Status Report
- STATUS: <DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT>
```

Parse discipline: only the exact `## Status Report` block and its `- STATUS:`
line count. If the block is missing, ambiguous, or replaced with prose, resume
the agent once (SendMessage) requesting the exact structured block only. Never
infer status from surrounding prose. The report must list the files touched
this round (field shape defined by the role prompt).

| STATUS | Action |
|---|---|
| `DONE` | Hold the contract in context; go to Step 4. |
| `DONE_WITH_CONCERNS` | Same as `DONE`, plus hold the concerns: they surface at the STOP in the four-part format and are appended to the task bean in Step 8. Review still runs - concerns do not bypass it. |
| `BLOCKED` | Go to Step 6 (debug protocol). |
| `NEEDS_CONTEXT` | The report states exactly what is missing. If it is trivially answerable from repo or spec files, answer it yourself and resume the implementer (SendMessage) with the answer. Otherwise formulate an AskUserQuestion for the user, then resume the implementer with their answer. Context rounds do not count against the fix-loop budget - but if the implementer repeats `NEEDS_CONTEXT` with no new specifics after being answered, treat it as `BLOCKED`. |

## Step 4 - Build the review package and dispatch the reviewer

1. **Build** `workspace/review-package-<N>.md` (append a new
   `# Round <K>` section per review round; never rewrite earlier rounds):
   - Scope: the task's boundary paths when declared, else the full working
     tree. Unrelated uncommitted user work (the Step 1 baseline outside the
     scope) never enters the package.
   - Contents: header (task ID, requirement IDs from the task bean's
     `_Requirements:` metadata, scope, baseline note), the findings
     under remediation (rounds 2+), the scoped diffstat and diff
     (`git diff -- <paths>`), and full contents of untracked in-scope files
     (from `git status --porcelain`).
   - `git diff` and `git status` are the only git calls used here; agents
     never commit, so the working tree vs HEAD is always the task's complete
     change set.
2. **Dispatch** the task-reviewer. Read
   `${CLAUDE_SKILL_DIR}/templates/task-reviewer-prompt.md`, resolve paths, and
   dispatch:

```
Agent(
  description: "Review task <N>",
  subagent_type: general-purpose,
  model: opus,
  prompt: (paths and ids only)
    Role prompt:     <abs-path>/skills/impl/templates/task-reviewer-prompt.md
    Review protocol: <abs-path>/skills/review/SKILL.md (apply it to this task)
    Package:         .sdd/specs/<feature>/workspace/review-package-<N>.md
    Spec files:      .sdd/specs/<feature>/requirements.md, design.md
    Task bean:       <task-bean-id> (its ## Brief carries the task text and
                     requirement IDs - verify against it independently;
                     the implementer's contract is not evidence)
    Return exactly the ## Review Verdict block your role prompt defines.
)
```

3. **Parse the verdict**:

```md
## Review Verdict
- VERDICT: <APPROVED | REJECTED>
```

Same parse discipline as Step 3 (exact block and `- VERDICT:` line only).
`REJECTED` findings must be marked blocking or minor.

- **APPROVED** -> Step 7 (verification gate).
- **Minor findings** never enter the fix loop regardless of verdict: append
  them to `workspace/notes.md` under `## Minor Findings` (the parking lot,
  surfaced at feature finish).
- **REJECTED** -> Step 5.

## Step 5 - Fix loop (REJECTED verdicts)

One counter per review cycle; it resets only when the task closes
(APPROVED + verified), not on intermediate verdicts.

- **Rounds 1-3**: resume the SAME implementer agent via SendMessage with the
  blocking findings, the scoped package path, and the requirement to list
  every file touched this round. Model stays as dispatched (sonnet).
- **Rounds 4-5**: dispatch a FRESH implementer via the Agent tool with
  `model: opus` - full dispatch data from Step 2 plus the blocking findings
  and a short summary of prior rounds (paths, not transcripts).
- **Every round**: after the implementer returns `DONE`/`DONE_WITH_CONCERNS`,
  append a `# Round <K>` scoped section to the review package covering the
  files changed this round only, then dispatch a scoped re-review (read
  `${CLAUDE_SKILL_DIR}/templates/re-review-prompt.md`, resolve, dispatch with
  `model: opus`, package + findings paths). Parse the same
  `## Review Verdict` block.
- **APPROVED** -> Step 7. **Five rounds exhausted** -> Step 6.

Adjudication: if the implementer substantively disputes the same finding two
rounds in a row and you cannot settle it from the spec, stop burning rounds -
escalate to the user with the four-part format and an AskUserQuestion
(enforce the finding / accept the dispute / plan change / abort).

## Step 6 - Blocked path (debug protocol)

Entered when: the implementer returns `BLOCKED`, a `NEEDS_CONTEXT` loop
degenerates, or the fix loop exhausts five rounds.

1. **Dispatch the debugger** - fresh context, it receives failure evidence,
   not the failed implementation history. Read
   `${CLAUDE_SKILL_DIR}/templates/debugger-prompt.md`, resolve, dispatch:

```
Agent(
  description: "Debug task <N> failure",
  subagent_type: general-purpose,
  model: opus,
  prompt: (paths and ids only)
    Role prompt:      <abs-path>/skills/impl/templates/debugger-prompt.md
    Debug protocol:   <abs-path>/skills/debug/SKILL.md (apply it)
    Failure summary:  <one-line symptom>
    Task bean:        <task-bean-id> (its ## Brief section says what was
                      being built)
    Review evidence:  .sdd/specs/<feature>/workspace/review-package-<N>.md
                      (if built; on a first-round BLOCKED no package exists
                      yet - the debugger relies on the working tree)
    Working tree:     inspect read-only (git diff / git status)
    Return exactly the ## Debug Outcome block your role prompt defines.
)
```

2. **Parse the outcome**:

```md
## Debug Outcome
- OUTCOME: <RESOLVED | UNRESOLVED>
```

Same parse discipline. `RESOLVED` carries a root cause and a fix plan;
`UNRESOLVED` carries the root cause found so far and why it is stuck.

3. **Handle it**:
   - `RESOLVED` -> dispatch a fresh implementer (`model: opus`) with the fix
     plan plus the Step 2 dispatch data, then a scoped re-review. Still
     failing -> next debug round.
   - `UNRESOLVED`, or two debug rounds exhausted -> **mark the task blocked
     in beans**: append a `## Blocker` note to the task bean body (root
     cause, rounds attempted, date) and leave the status `in-progress`.
     Escalate: four-part format plus an AskUserQuestion with options - you
     intervene then re-invoke `/sdd:impl` to retry / skip to the next
     actionable task for the rest of this run (the `## Blocker` note keeps it
     out of auto-selection per Step 0 and re-surfaces it on the next
     invocation) / escalate to plan change / abort the feature.

## Step 7 - Verification gate (fresh evidence)

Before any completion claim, apply the verify-completion protocol
(`${CLAUDE_PLUGIN_ROOT}/skills/verify-completion/SKILL.md`) inline, claim
type `TASK`:

- Re-run the task-relevant validation commands yourself via Bash. Reported
  success from the implementer is not evidence; only fresh output and exit
  codes from the current code state count.
- `VERIFIED` -> Step 8.
- `NOT_VERIFIED` -> the evidence gap becomes a blocking finding; re-enter the
  Step 5 fix loop under the same cycle counter.
- `MANUAL_VERIFY_REQUIRED` -> complete the beans/workspace updates that are
  safe, then STOP with the missing verification presented as a concern in the
  four-part format.

## Step 8 - Record state

1. Concerns (`DONE_WITH_CONCERNS`, verification gaps, accepted disputes):
   one line each, appended to the task bean body.
2. Cross-cutting learnings for later tasks: one line each, appended to
   `workspace/notes.md` under `## Learnings`.
3. Complete the task bean: `beans update <task-id> -s completed` with a short
   `## Summary of Changes` appended per the global beans guide.

## Step 9 - STOP (after every task)

The user reviews, tests, and commits here - never you.

**The stop report is SHORT**: task ID, final status, review verdict, and
verification result; optionally ONE line of test results if tests ran. No
diff summary, no changed-file list, no beans recap.

Present any concern or deviation in the four-part format, verbatim:

```
1. Per plan: <what the task bean's ## Brief specified>
2. Actual: <what happened>
3. Why it matters: <consequence>
4. Options: accept as-is / fix now / change the plan / abort
```

Then ask via AskUserQuestion (recommended option first, labeled):

1. **Continue** (Recommended) - proceed to the next task (Step 0 re-resolves
   state from beans), or to Feature finish when no tasks remain.
2. **Revise this task** - you supply feedback; the orchestrator reopens the
   task bean (`-s in-progress`), runs one fix cycle with your feedback as the
   input (same implementer via SendMessage where possible, else fresh sonnet
   dispatch), scoped re-review, verification gate, beans update, and STOPs
   again.
3. **Escalate to plan change** - stop the run. The plan (the task beans)
   must be revised before impl resumes; the user drives that revision
   (possibly via `/sdd:spec-tasks`).
4. **Abort feature** - cancellation is a first-class outcome: run
   `beans update <epic-id> -s scrapped` and the same for every task bean of
   the feature - plan tasks AND the three `phase` gate beans, which are its
   task-type children too (append a one-line reason first), then stop. The
   branch, spec, workspace, and bean files are the user's to carry away;
   nothing else is touched.

## Feature finish

Entered from Step 9 "Continue" when all task beans are completed (or directly
from Step 0 when invoked in that state).

1. **Whole-branch review**. Build `workspace/review-package-final.md`: the
   committed diff since the feature branch diverged from the repository's
   default branch (divergence point via `git merge-base <default-branch>
   HEAD`, diff via `git diff <base>...HEAD`) plus the uncommitted
   working-tree remainder. Then
   dispatch the code-reviewer: read
   `${CLAUDE_SKILL_DIR}/templates/code-reviewer-prompt.md`, resolve, dispatch
   with `model: opus`, package + spec paths. Parse `## Review Verdict` as
   usual; blocking findings start a remediation round.
2. **validate-impl gate**. Dispatch a fresh subagent applying the
   validate-impl protocol:

```
Agent(
  description: "Validate feature implementation",
  subagent_type: general-purpose,
  model: opus,
  prompt: (paths only)
    Apply:      <abs-path>/skills/validate-impl/SKILL.md
    Feature:    .sdd/specs/<feature>/ (requirements.md, design.md)
    Workspace:  .sdd/specs/<feature>/workspace/ (review packages, notes.md)
    Return the GO / NO-GO result with its evidence.
)
```

3. **Remediation budget: 3 rounds total for the finish phase**, shared by
   both gates. Each round: implementer dispatch (`model: sonnet`) fixing the
   concrete findings -> scoped re-review (`model: opus`) -> re-run the failed
   gate. `GO` plus an APPROVED whole-branch review ends the phase; still
   failing after three rounds -> stop and escalate with the four-part format.
4. **Final stop**. Apply the same fresh-evidence discipline to the GO claim
   before reporting it. Report: GO verdict (one line), the parking lot
   (`## Minor Findings` from `workspace/notes.md`), then an AskUserQuestion:
   **Complete feature** (Recommended) - epic bean `-s completed` with a short
   summary; **Leave open** - the user continues manually; **Abort** - scrapped
   handling as in Step 9.

## Resume semantics

- Every cycle starts at Step 0 with fresh beans queries. Nothing depends on
  session memory; an interrupted run is indistinguishable from a fresh one
  (the `in-progress` task bean is simply picked up again).
- The workspace holds the append-only review packages and notes.md; task
  briefs live in the task beans' `## Brief` bodies (spec Revisions 4+7).
  Never re-parse documents for progress - beans answers that.
