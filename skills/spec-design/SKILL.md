---
name: spec-design
description: Generative fork - research the active feature (discovery by classification) and write design.md with boundary-first architecture, considered alternatives with trade-offs, and a mermaid diagram. Use after /sdd:spec-requirements; the invoking context presents the result and runs the confirm gate.
context: fork
background: false
model: opus
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebSearch, WebFetch
---

# spec-design - design the HOW

## Role

You are a FORK: a fresh subagent with no conversation history. This skill
body is your entire task prompt - everything you need is resolved from
beans and files below. You NEVER ask the user questions (no
AskUserQuestion exists in your path) and you never dispatch subagents:
when you cannot proceed, return the BLOCKED status contract from the
Return contract section. The main context that invoked you owns all
dialogue and the confirm gate.

Your job: research the feature (classified discovery), then draft, review,
and write `.sdd/specs/<feature>/design.md` - the HOW to the requirements'
WHAT.

## Hard rules

1. **Git is read-only.** Bash is limited to the beans CLI, `mkdir`, and
   read-only inspection. Nothing in this run stages, commits, pushes, or
   touches branches: the user reviews and commits.
2. **This skill writes no beans.** It resolves the active feature by
   reading beans; task-bean lifecycle belongs to `/sdd:spec-tasks`. Never
   write progress, approval, or blocked state into any document.
3. **No user questions.** Blocked means return BLOCKED, not stop-and-ask.
4. **Options, not silent picks.** Architecturally significant choices are
   presented as 2-3 approaches with trade-offs and a recommendation -
   never selected silently.
5. **Consistency discipline, not brevity.** Length is fine when the task
   needs it; the hard requirement is that diagrams and tables match the
   prose 100%, and the prose stays faithful to the requirements and to
   what research found.
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

- `.sdd/specs/<feature>/requirements.md` - REQUIRED. Missing -> return
  BLOCKED pointing to `/sdd:spec-requirements`.
- `.sdd/specs/<feature>/workspace/qa-digest.md` and `.sdd/brief.md` -
  interview intent and workstream narrative, when present.
- `.sdd/specs/<feature>/research.md` - prior discovery or validate-gap
  output, when present.
- Steering: Glob `.claude/rules/*.md`; read the files relevant to the
  feature's architecture, conventions, and constraints.
- `${CLAUDE_PLUGIN_ROOT}/assets/rules/design-principles.md` - design
  rules (boundary first, type safety, visual communication).
- `${CLAUDE_PLUGIN_ROOT}/assets/templates/design.md` - document
  structure.
- `${CLAUDE_PLUGIN_ROOT}/assets/templates/research.md` - discovery log
  structure.

**Existing design.md** (`.sdd/specs/<feature>/design.md` present): treat
it as the edit-merge base - improve and extend it, do not rewrite
untouched sections - unless an edit round below says otherwise.

**Edit rounds**: if `.sdd/specs/<feature>/workspace/design-edits.md`
exists, it holds cumulative edit intent from the user. Every recorded
`## Round <K>` must be satisfied by the document you produce. A round
titled `Regenerate from scratch` overrides the edit-merge base: rewrite
fully. Append nothing to the digest yourself.

## Step 3 - Classify the feature and run discovery

Classify from the epic description, requirements, brief, and codebase:

1. **New Feature** (greenfield) -> read and execute
   `${CLAUDE_PLUGIN_ROOT}/assets/rules/design-discovery-full.md`.
2. **Extension** (extends an existing system) -> read and execute
   `${CLAUDE_PLUGIN_ROOT}/assets/rules/design-discovery-light.md`;
   escalate to full discovery when its own escalation criteria fire.
3. **Simple Addition** (CRUD/UI-level change) -> skip formal discovery;
   do a quick pattern check of the surrounding code only.

Research discipline:

- **Codebase**: prefer LSP tools where they exist in your context
  (definitions, references, type info); fall back to Grep/Glob. Map the
  existing patterns, integration points, and boundaries the design must
  respect.
- **External**: WebSearch/WebFetch for dependencies, current
  documentation, version compatibility, and known issues. Verify every
  external API or library the design will rely on; record API contracts
  and constraints for the research log.

## Step 4 - Synthesize and log

Apply `${CLAUDE_PLUGIN_ROOT}/assets/rules/design-synthesis.md` to the
full discovery picture - generalization, build-vs-adopt, simplification.
Persist findings: create or update `.sdd/specs/<feature>/research.md`
per its template - key findings, evaluated options, decisions with
rationale, risks. The design document stays self-contained; research.md
holds the raw investigation behind it.

## Step 5 - Draft the design

Draft in memory against the template. Where this skill and
`${CLAUDE_PLUGIN_ROOT}/assets/templates/design.md` conflict, this skill
wins - the rule is general. Keep it unwritten until the review gate
passes. Mandatory content:

- **Boundary first**: This Spec Owns / Out of Boundary / Allowed
  Dependencies / Revalidation Triggers - concrete enough that reviewers
  can later detect boundary violations.
- **Considered Alternatives section**: 2-3 approaches with trade-offs
  and a recommendation. Rejected alternatives and their reasons stay
  visible in the document; deeper evaluation lives in research.md.
- **High-Level Architecture with a mermaid diagram** - mandatory at
  every complexity level, pure Mermaid syntax. The diagram must match
  the prose 100%: every component, boundary, and data flow appears in
  both, identically.
- **File Structure Plan**: concrete file paths, one clear responsibility
  per file - this section directly drives task `_Boundary:_` annotations
  and implementation briefs.
- **Technology Stack table** and **Testing Strategy** derived from the
  requirements' acceptance criteria, not generic patterns.
- **Requirements traceability**: every numeric requirement ID from
  requirements.md mapped to the components, contracts, or flows that
  realize it. Use IDs exactly as written; never invent or relabel them.

## Step 6 - Review gate

Read and apply
`${CLAUDE_PLUGIN_ROOT}/assets/rules/design-review-gate.md` to the draft:
mechanical checks first (requirement ID coverage, boundary sections
populated, file structure populated, no orphan components), then
judgment (architecture readiness, boundary readiness, executability).
Repair local issues and re-run the gate - at most 2 repair passes.

If the gate exposes a real requirements gap or ambiguity, do NOT write a
patched-over design: return BLOCKED naming the exact gap and pointing
back to `/sdd:spec-requirements`.

## Step 7 - Write and return

Write `.sdd/specs/<feature>/design.md` (and research.md, Step 4) only
after the gate passes, then return the summary block.

## Return contract

**To the fork (your final message).** Return exactly this block - the
caller parses the heading and the `- STATUS:` line mechanically:

```
## Design Summary
- STATUS: <DONE | BLOCKED>
- DISCOVERY: <full | light | skipped - one line on what was researched>
- APPROACHES: <one line per approach considered, marking the recommended one>
- CONCERNS: <one line each, if any>
- PATH: <.sdd/specs/<feature>/design.md, or - when BLOCKED>
- BLOCKERS: <BLOCKED only - the gap or condition, and the command to run>
```

**To the presenting main context.** You invoked this fork; it cannot ask
the user anything, so you own the confirm gate. On DONE: present a SHORT
summary in chat - discovery type, the approaches considered with the
recommended one, boundary highlights, concerns, and the document path
(the user reads design.md in the IDE; do not dump it into chat). Then
AskUserQuestion, confirm-only:

1. **Approve** (Recommended) - the design is settled. Name the next
   command in a code block:
   ```
   /sdd:spec-tasks
   ```
   Optional first: `/sdd:validate-design` for a forked quality
   review of the document.
2. **Edit** - the user supplies feedback. Append it under
   `## Round <K>` in
   `.sdd/specs/<feature>/workspace/design-edits.md` (create the file if
   needed; workspace files are append-only), then re-invoke
   `/sdd:spec-design` - a NEW fork reads the digest plus the existing
   document and edit-merges. Edit rounds are user-driven with no fixed
   cap, but each round must carry concrete feedback.
3. **Regenerate from scratch** - offer when design.md existed before
   this run. Append `## Round <K> - Regenerate from scratch` to the
   digest and re-invoke `/sdd:spec-design`.
4. **Stop** - the user takes over; the document stays on disk.

On BLOCKED: present the blocker and the named command, then
AskUserQuestion on how to proceed (resolve via that command / adjust
inputs / stop).
