---
name: validate-gap
description: Generative fork - analyze the gap between the active feature's requirements and the existing codebase, writing findings with quoted evidence to research.md and returning a gap-list with an implementation-approach recommendation. Use for brownfield features, after requirements, before or during design.
context: fork
background: false
model: opus
---

# validate-gap - requirements vs existing codebase

## Role

You are a FORK: a fresh subagent with no conversation history. This skill
body is your entire task prompt - everything you need is resolved from
beans and files below. You NEVER ask the user questions (no
AskUserQuestion exists in your path) and you never dispatch subagents:
when you cannot proceed, return the BLOCKED status contract from the
Return contract section. The main context that invoked you owns all
dialogue and the confirm gate.

Your job: measure the distance between what the requirements demand and
what the codebase already provides, and write it down as evidence-backed
findings - the gap-list and approach recommendation that design decisions
rest on.

## Hard rules

1. **Git is read-only.** Bash is limited to the beans CLI and read-only
   inspection. Nothing in this run stages, commits, pushes, or touches
   branches: the user reviews and commits.
2. **This skill writes no beans.** It resolves the active feature by
   reading beans; never write progress, approval, or blocked state into
   any document.
3. **No user questions.** Blocked means return BLOCKED, not stop-and-ask.
4. **Quoted evidence or it did not happen.** Every finding about the
   codebase cites `file:line` and quotes the relevant snippet verbatim.
   Every gap states the requirement it threatens, by its exact ID.
5. **Information over decisions.** You produce analysis, options, and a
   recommendation - the design phase (with the user) makes the choice.
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
- `.sdd/specs/<feature>/research.md` - prior discovery output, when
  present: read it, extend it, never overwrite it.
- `${CLAUDE_PLUGIN_ROOT}/assets/rules/gap-analysis.md` - the analysis
  framework (current state, feasibility, approach options, effort/risk)
  and its output checklist. Follow it.
- Steering: already in your context (project memory, loaded at session
  start) - apply it; do not re-read the files.

## Step 3 - Survey the existing codebase

Map what already exists against what the requirements need:

- **Assets**: Grep/Glob/Read for domain-related files, modules, reusable
  components, and directory layout. Quote the decisive snippets.
- **Conventions**: naming, layering, dependency direction, testing
  approach - as observed in code, not assumed.
- **Integration surfaces**: data models, API clients, auth mechanisms -
  the seams this feature must plug into.
- **External dependencies**: WebSearch/WebFetch for compatibility,
  version constraints, and known integration pitfalls of every external
  library the requirements imply. Record versions and constraints.

Every claim above carries `file:line` evidence or a URL. "Looks like"
without a citation is a Research Needed item, not a finding.

## Step 4 - Analyze the gap

Apply the gap-analysis framework:

1. **Requirement-to-Asset map**: each requirement ID -> the existing
   asset that partially satisfies it, tagged `Missing` / `Unknown` /
   `Constraint`. Unknowns are recorded as Research Needed items - deep
   research belongs to the design phase.
2. **Approach options**: Extend existing components / create new
   components / hybrid - each with concrete integration points, trade
   offs, and what it means for the specific files surveyed in Step 3.
3. **Effort (S/M/L/XL) and risk (High/Medium/Low)**, one-line
   justification each.
4. **Recommendation**: one preferred approach and the research items to
   carry into design. A recommendation is not a decision.

## Step 5 - Write research.md

Write `.sdd/specs/<feature>/research.md`. If the file already exists
(prior discovery or a previous run), APPEND your analysis as a new
`## Gap Analysis - <date>` section after a `---` separator - earlier
content survives untouched. Follow the gap-analysis rule's output
checklist for the section's structure. Verify the write by reading the
file back.

## Return contract

**To the fork (your final message).** Return exactly this block - the
caller parses the heading and the `- STATUS:` line mechanically:

```
## Gap Analysis Summary
- STATUS: <DONE | BLOCKED>
- GAPS: <one line per gap: requirement ID, Missing/Unknown/Constraint, one-phrase impact>
- APPROACHES: <one line per approach, marking the recommended one>
- EFFORT_RISK: <S/M/L/XL and High/Medium/Low with one-line justification>
- RESEARCH_NEEDED: <one line each, if any>
- CONCERNS: <one line each, if any>
- PATH: <.sdd/specs/<feature>/research.md, or - when BLOCKED>
- BLOCKERS: <BLOCKED only - the gap or condition, and the command to run>
```

**To the presenting main context.** You invoked this fork; it cannot ask
the user anything, so you own the confirm gate. On DONE: present a SHORT
summary in chat - the gap-list, the approaches with the recommended one,
effort/risk, and the research.md path (the user reads the file in the
IDE; do not dump it into chat). Then AskUserQuestion, confirm-only:

1. **Proceed to design** (Recommended) - the analysis is settled; name
   the next command in a code block:
   ```
   /sdd:spec-design
   ```
2. **Re-run with focus** - the user names an area to dig into further.
   Append their focus note as a `## Follow-up Focus` section to
   research.md, then re-invoke `/sdd:validate-gap`: the fork reads the
   existing file (Step 2), investigates the focus, and appends a new
   dated analysis section.
3. **Stop** - the user takes over; the analysis stays on disk.

On BLOCKED: present the blocker and the named command, then
AskUserQuestion on how to proceed (resolve via that command / adjust
inputs / stop).
