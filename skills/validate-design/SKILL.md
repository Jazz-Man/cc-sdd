---
name: validate-design
description: Generative fork - quality-review the active feature's design.md against the four review criteria, apply only zero-semantics fixes, write the verdict-per-criterion report to workspace/design-review.md, and return a GO/NO_GO with blocking and minor findings. The design approve gate dispatches it automatically (Revision 6); it also runs standalone as a formative check.
context: fork
background: false
model: opus
---

# validate-design - design quality review

## Role

You are a FORK: a fresh subagent with no conversation history. This skill
body is your entire task prompt - everything you need is resolved from
beans and files below. You NEVER ask the user questions (no
AskUserQuestion exists in your path) and you never dispatch subagents:
when you cannot proceed, return the BLOCKED status contract from the
Return contract section. The main context that invoked you owns all
dialogue and the adjudication with the user.

Your job: adversarially review the design document for readiness - not
perfection, readiness. The design phase already ran its own review gate;
you are the independent second opinion before the plan gets built.

## Hard rules

1. Bash is limited to the beans CLI and read-only inspection.
2. **This skill writes no beans.** It resolves the active feature by
   reading beans; never write progress, approval, or blocked state into
   documents. Phase completion, the `validated` tag, and the
   `Doc-hash:` line are the presenting context's writes at the GO
   moment - never yours.
3. **No user questions.** Blocked means return BLOCKED, not stop-and-ask.
4. **You review; you do not redesign.** No implementation-level design,
   no technology research. Your only edits to design.md are
   zero-semantics fixes - typos, wrong paths (references to existing
   files only), formatting, ID-label normalization - and every edit is
   listed in the return's Fixes applied list (`- FIXES_APPLIED:`).
   Anything that touches design meaning - a reworded decision, a moved
   boundary, an added or removed component, alternative, or diagram
   element - is a finding, never an edit. Findings go to the report
   file; the user decides what happens to the document.
5. **No hash computation.** Revision 6 pairs the document hash with
   the phase-completion write: the presenting context computes it at
   the GO moment, after your fixes have landed. You never compute or
   record a hash.
6. **English output** - fixed; no per-spec language configuration exists.

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

## Step 2 - Load inputs

Read, under the spec directory from Step 1:

- `.sdd/specs/<feature>/design.md` - REQUIRED. Missing -> return BLOCKED
  pointing to `/sdd:spec-design`.
- `.sdd/specs/<feature>/requirements.md` - REQUIRED, the conformance
  reference. Missing -> return BLOCKED pointing to
  `/sdd:spec-requirements`.
- `.sdd/specs/<feature>/research.md` - when present: the discovery and
  gap analysis the design claims to build on.
- `${CLAUDE_PLUGIN_ROOT}/assets/rules/design-review.md` - the review
  criteria and issue format. Its interactive-dialogue step is superseded
  in fork form: where the rule says engage the designer, you record the
  finding instead, and the presenting main context takes it to the user.
- Steering: already in your context (project memory, loaded at session
  start) - apply it; do not re-read the files.

Also survey the codebase enough to check claims: the design asserts
alignment with existing architecture - Grep/Read the modules it names
and verify. A design that cites nonexistent structure is a finding, not
a detail.

## Step 3 - Zero-semantics fix pass

Scan design.md for mechanical defects and fix them in place, recording
every edit for the Fixes applied list:

- **Typos** - spelling corrections only where the intended word is
  unambiguous.
- **Wrong paths** - references to EXISTING files or modules that do
  not match the real layout (the codebase survey above is the
  authority); correct the string. The prescriptive paths of the File
  Structure Plan are design decisions, not defects - a finding, never
  a fix.
- **Formatting** - broken headings, list markers, or tables; mermaid
  syntax errors repaired without adding, removing, or rewiring any
  node or edge.
- **ID-label normalization** - a malformed requirement-ID reference
  (`R3`, `req 3`) becomes the exact ID as written in requirements.md;
  the referent never changes.

NOT fixes, ever: rewording a decision, changing a boundary, adding or
removing components, alternatives, coverage, or diagram content. Those
change the design - record them as findings with the better text as
the suggested fix.

Apply the fixes, then re-read the file and verify the edits took.
Every check below quotes the FIXED text, so evidence line numbers stay
true.

## Step 4 - Review against the criteria

Verdict per criterion, from design-review.md:

1. **Existing Architecture Alignment** - integration with real system
   boundaries, consistency with established patterns, dependency
   direction, module organization. Verified against the codebase, not
   the design's self-description.
2. **Design Consistency & Standards** - naming, error handling,
   configuration, data modeling uniformity.
3. **Extensibility & Maintainability** - separation of concerns, single
   responsibility, testability, appropriate complexity.
4. **Type Safety & Interface Design** - interface contracts, unsafe
   patterns, API boundaries, input validation.

Plus the cross-cutting checks the criteria assume:

- **Requirements coverage**: every requirement ID from requirements.md
  is addressed by some part of the design. Use IDs exactly as written.
- **Internal consistency**: diagrams and tables match the prose - every
  component, boundary, and flow appears in both, identically.
- **Boundary readiness**: This Spec Owns / Out of Boundary / Allowed
  Dependencies / Revalidation Triggers are concrete enough for a
  reviewer to later detect violations.

Each criterion gets a verdict: `PASS`, `CONCERN` (finding attached), or
`FAIL` (blocking finding attached). Classify every finding:

- **BLOCKING** - an architectural misalignment, an unaddressed
  requirement, an internal contradiction, or a gap that materially
  raises failure risk. Must be resolved before tasks are generated.
- **MINOR** - real but safe to defer; no correctness risk. These land in
  the report's minor-findings list for the user to weigh.

Cap BLOCKING findings at the 3 most important, per design-review.md's
critical-focus rule - and say so when you stopped early. Each finding
follows the rule's issue format: concern, impact, suggestion,
traceability (requirement ID), evidence (design.md section).

## Step 5 - Decide GO/NO_GO

- **GO**: zero BLOCKING findings. The design is ready for task planning
  with acceptable risk; MINOR findings travel with it.
- **NO_GO**: any BLOCKING finding. The design needs revision first;
  the phase stays open (Revision 6).

## Step 6 - Write the report

Write `.sdd/specs/<feature>/workspace/design-review.md` (create the
workspace directory if absent). If the file already exists, APPEND a new
`# Review Round <K>` section after a `---` separator - earlier rounds
survive untouched (the workspace is append-only). Structure per round:

- Summary: 2-3 sentences on quality and readiness.
- Criterion verdicts: one line each (criterion, verdict, one-phrase why).
- Critical issues (BLOCKING): the rule's issue format.
- Minor findings: one line each.
- Fixes applied: one line each.
- Strengths: 1-2, to keep the assessment balanced.
- Verdict: GO or NO_GO with 1-2 sentences of rationale.

Verify the write by reading the file back.

## Return contract

**To the fork (your final message).** Return exactly this block - the
caller parses the heading and the `- STATUS:` line mechanically:

```
## Design Review Summary
- STATUS: <DONE | BLOCKED>
- VERDICT: <GO | NO_GO>
- CRITERIA: <criterion: verdict, one per line - all four>
- BLOCKING: <one line per blocking finding, or none>
- MINOR: <count first, then one line each>
- FIXES_APPLIED: <one line per zero-semantics fix, or none>
- PATH: <.sdd/specs/<feature>/workspace/design-review.md, or - when BLOCKED>
- BLOCKERS: <BLOCKED only - the gap or condition, and the command to run>
```

**To the presenting main context.** You invoked this fork; it cannot ask
the user anything, so you own the adjudication. On DONE: present the
verdict, the criterion verdicts, each BLOCKING finding with its impact,
and the fixes it applied (the user reads design-review.md in the IDE;
do not dump it into chat). Then by invocation:

- **Auto-gate - dispatched by the spec-design approve step (spec
  Revision 6).** On GO the design phase may complete: the phase bean
  closes with the `validated` tag and the document's hash recorded as
  its `Doc-hash:` line, computed at this moment, after the fork's
  fixes (the fork computed no hash and wrote no beans - those writes
  are yours). The wiring lives in the design approve gate. On NO_GO
  present the four-part escalation (impl Step 9 shape) with payload
  <findings>.
- **Standalone formative run.** AskUserQuestion:

  1. **Accept GO, generate tasks** (Recommended, when VERDICT is GO) -
     name the next command in a code block:
     ```
     /sdd:spec-tasks
     ```
     MINOR findings travel as context into the tasks phase.
  2. **Send findings to revision** (when VERDICT is NO_GO, or the user
     rejects a GO) - the user picks the findings to address; append
     them under `## Round <K>` in
     `.sdd/specs/<feature>/workspace/design-edits.md` (create the file
     if needed; workspace files are append-only), then re-invoke
     `/sdd:spec-design` - a NEW fork edit-merges the round. Re-run
     `/sdd:validate-design` afterwards.
  3. **Accept as-is despite findings** - the user explicitly accepts
     the risk; record that in one line appended to design-review.md,
     then proceed as in option 1.
  4. **Stop** - the user takes over; the report stays on disk.

On BLOCKED (either invocation): present the blocker and the named
command, then AskUserQuestion on how to proceed (resolve via that
command / adjust inputs / stop).
