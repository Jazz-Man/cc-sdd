# Spec-Driven Workflow

How the `sdd` plugin runs a feature from idea to finished implementation. This
is the phase-by-phase walkthrough — what you invoke, what each phase produces,
where the gates are. For per-skill contracts see the
[Skill Reference](skill-reference.md); for the reasoning behind the model,
[Why sdd?](why-cc-sdd.md).

## The shape of the workflow

One command per phase, in order, each ending in a confirm gate:

```
/sdd:discovery → /sdd:spec-init → /sdd:spec-requirements → /sdd:spec-design → /sdd:spec-tasks → /sdd:impl
```

Three rules hold the whole thing together:

- **You drive the cycle.** There is no chain skill. When a phase ends, its
  result is presented with a confirm-only question that names the next
  command; you run it when you are ready. Quick one-off work never enters the
  pipeline — discovery routes it to "no spec needed" and it happens in the
  chat.
- **One feature at a time.** The active feature is the single epic bean with
  status `in-progress`. Every skill after spec-init resolves the feature from
  beans and takes no feature argument. Follow-ups queue behind the active
  epic; multi-spec initiatives are strictly sequential chains under a
  milestone. Nothing runs in parallel, by design.
- **State is beans, artifacts are files.** Progress, approvals, blockers, and
  dependencies live in beans (feature = epic, task = task bean, initiative =
  milestone) — and so do task briefs, reports, notes, and verdict lines, as
  body sections. There is no plan document: the task beans ARE the plan.
  Resume means querying beans — never re-parsing documents, never trusting
  session memory.

## Phase 1 — Discovery

```
/sdd:discovery <idea>
```

You bring an idea; discovery researches enough to route it honestly: one
subagent surveys the codebase when the idea touches one, plus the workstream
brief (`.sdd/brief.md`), beans state, and steering rules. Clarifying questions
come one at a time, and only what research did not already answer — problem,
definition of done, responsibility seams, explicit non-goals, constraints.

Then the routing question (analysis in prose first):

- **Extend an existing spec** — the request lives inside a spec's boundary
- **No spec needed** — answered or done directly in the chat; a legitimate
  first-class outcome, not a failure
- **Single new feature** — one spec through the full cycle
- **Multi-spec initiative** — several features under a milestone, queued
  strictly one after another

Whatever the route, discovery writes `.sdd/brief.md` — the single resume
document for the workstream: intent, scope in/out, decisions with rationale,
open questions, and a rendered queue snapshot (beans remains the source of
truth for the queue). It ends by naming the next command, not by running it.

A follow-up discovered while a feature is active is queued as a `todo` epic
blocked by the active one. It starts only after the current feature completes —
or replaces it if that one is cancelled.

## Phase 2 — Feature birth

```
/sdd:spec-init "<feature>"
```

Lightweight on purpose: no research, no documents. It guards the
single-active-feature rule (while an epic is `in-progress` it refuses — and
offers to complete or scrap that epic first), creates `.sdd/specs/<feature>/`,
and activates a matching queued epic or creates a new one. The epic bean body
records the spec path and a one-line description; later skills parse those
lines. It also seeds the three phase-gate beans under the epic —
`Phase — requirements`, `Phase — design`, `Phase — tasks`, `phase`-tagged,
chained in flow order: `completed` on one IS that phase's approval, and every
later phase gates on the one before it. Handoff: `/sdd:spec-requirements`,
no argument.

## Phase 3 — Requirements

```
/sdd:spec-requirements
```

An interview, then a draft. The skill asks its clarifying questions one at a
time (this is the last phase with open questions — design and tasks are
confirm-only), writes the Q&A digest to the feature's `workspace/qa-digest.md`,
and dispatches an opus subagent that drafts `requirements.md` in EARS format
("WHEN <trigger> THE SYSTEM SHALL <response>"), applying the requirements
review gate before returning. You review the document and confirm.

Approval is validator-gated: confirming auto-dispatches
`/sdd:validate-requirements` (EARS, completeness, contradictions, steering,
testability — evidence-quoted findings, zero-semantics fixes listed). Only its
GO completes the phase — with a `validated` tag and the document's sha256
recorded as a `Doc-hash:` line on the phase bean. NO_GO escalates in the
four-part format and the phase stays open; edit, re-validate, repeat until GO.

Output: `.sdd/specs/<feature>/requirements.md`.

### Optional: gap analysis (brownfield)

```
/sdd:validate-gap
```

For features landing in an existing codebase: a fork measures the distance
between the requirements and what the code already provides — every finding
cites `file:line` with the snippet quoted verbatim, every gap names the
requirement ID it threatens. Results land in `research.md` as a gap-list plus
an implementation-approach recommendation. It produces information; the design
phase (with you) makes the choice.

## Phase 4 — Design

```
/sdd:spec-design
```

A generative fork: a fresh opus subagent with no conversation history, for whom
the skill body is the entire task prompt. It researches the feature (full or
light discovery depending on novelty), then writes `design.md`:

- boundary-first architecture with Boundary Commitments
- considered alternatives with trade-offs and a recommendation — options, never
  silent picks
- a mermaid diagram, kept 100% consistent with the prose

You review and confirm in the main context; the fork itself never asks
questions (blocked means `BLOCKED`, returned as a status contract). The
approve gate auto-dispatches `/sdd:validate-design` — the same
validator-gated approval as requirements: GO completes the phase with the
`validated` tag and a `Doc-hash:`, NO_GO escalates and the phase stays open.

Output: `.sdd/specs/<feature>/design.md`.

### Optional: design pressure-test

```
/sdd:validate-design
```

Also runs standalone as a formative check anytime: a fork reviews the
design against four criteria, writes the verdict-per-criterion report to
`workspace/design-review.md`, and returns GO/NO_GO with blocking and minor
findings. It reviews; it does not redesign — what happens to the document is
your call.

## Phase 5 — Task plan

```
/sdd:spec-tasks
```

Another fork — but it writes no document. It derives the plan from the
approved requirements and design and creates one task bean per sub-task under
the feature epic, born `draft`: each body's `## Brief` section carries the
number, title, natural-language description, detail bullets (at least one
observable completion condition), and `_Requirements:_` / `_Boundary:_` /
`_Depends:_` metadata; cross-task dependencies are `--blocked-by` relations.
The beans ARE the plan.

The approve gate is yours in the main context: approve-all or selectively
promote `draft` → `todo` (impl never auto-selects a `draft`). Promotion
completes the tasks phase bean, and the handoff is `/sdd:impl`. Re-running
the fork re-syncs idempotently — promoted statuses are never reset, and a
task number is never reused for different work.

## Phase 6 — Implementation

```
/sdd:impl            (or /sdd:impl <task-id>)
```

The orchestrator. It runs inline, owns the loop and the gates, and dispatches
all execution to subagents via five role templates (implementer, task-reviewer,
re-review, code-reviewer, debugger). Before anything: the phase gates — all
three phase beans must be `completed` (impl refuses unapproved phases) and
fresh, meaning the `Doc-hash:` recorded at validation still matches the
document on disk. A stale hash escalates four-part; it never silently
re-validates. Per task:

1. State is re-resolved from beans — active feature, task queue, blockers.
   Nothing depends on session memory.
2. A sonnet implementer is dispatched with the task bean id — its `## Brief`
   body section IS the brief; it appends its own `## Report` and `## Notes`
   one-liners — and returns a status contract
   (`DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT`).
3. An opus task-reviewer gets a scoped review package (the task's working-tree
   diff vs HEAD, kept in `workspace/`) and applies the
   adversarial review protocol. Verdict `APPROVED` or `REJECTED`, recorded on
   the task bean as a `## Validation` line (with the package pointer) plus a
   mirror tag.
4. Rejections run a bounded fix loop — max 5 rounds (rounds 1–3 the same
   implementer, rounds 4–5 a fresh one with the model raised to opus), each
   round with a scoped re-review. Minor findings never enter the loop; they
   park in the task bean's `## Parking lot` and surface at feature finish.
5. Still failing: a fresh opus debugger investigates root causes (max 2
   rounds). Unresolved → the task bean is marked blocked with the root cause
   and the decision escalates to you.
6. Before any completion claim, the orchestrator re-runs the validation
   commands itself — reported success is not evidence; only fresh output and
   exit codes count.
7. **STOP.** A short report — task ID, status, verdict, verification result,
   optionally one line of test results. Concerns and deviations surface in the
   four-part format (per plan / actual / why it matters / options: accept,
   fix, change the plan, abort). Then the question: continue, revise this
   task, escalate to a plan change, or abort the feature.

Stop-per-task is the rhythm: **you** review the diff, run what you want, and
commit. Continuing is an explicit answer, not a default.

## Feature finish

When the last task bean closes, two gates run, sharing 3 remediation rounds:

- **Whole-branch review** — an opus code-reviewer reads the committed diff
  since the feature branch diverged from the default branch, plus the
  uncommitted remainder.
- **`validate-impl`** — the feature-level GO/NO_GO gate: integration,
  coverage, design-alignment, and boundary checks with fresh evidence, reading
  completion state from the task beans.

Both verdicts are recorded on the epic bean's `## Validation` with mirror
tags. Then the final stop: GO verdict, the minor-findings parking lot (the
`## Parking lot` sections of the task beans plus the epic's), and the closing
question — complete the feature (epic bean `completed` with a summary), leave
it open, or abort (the epic and its tasks go `scrapped`; the branch — yours to
delete — carries the whole feature away).

## What lands on disk

```
.sdd/
├── brief.md                      workstream narrative (discovery)
└── specs/<feature>/
    ├── requirements.md           EARS-format requirements
    ├── design.md                 architecture + mermaid
    ├── research.md               validate-gap output, when used
    └── workspace/                append-only blobs: review packages,
                                   qa-digest, design-review and
                                   validation reports, edit digests
```

Task briefs, implementer reports, notes, verdict lines, and the parking lot
do NOT land on disk — they live in the task-bean bodies (`## Brief`,
`## Report`, `## Notes`, `## Validation`, `## Parking lot`). The workspace is
append-only: packages and reports accumulate; rounds are added as new
sections, earlier ones are never rewritten. Together with beans it forms the
durable record — any session can pick the feature up from there.

## New vs existing projects

- **Greenfield** — start at discovery or straight at `/sdd:spec-init`; let
  steering rules accumulate as conventions emerge (`/sdd:steering`).
- **Brownfield** — capture steering first, and run `/sdd:validate-gap` after
  requirements so the design reconciles with what already exists instead of
  assuming a blank slate.

## Related

- [Skill Reference](skill-reference.md) — per-skill contracts and the impl
  dispatch templates
- [Why sdd?](why-cc-sdd.md) — the design rationale and trade-offs
- [README](../../README.md) — the plugin overview
