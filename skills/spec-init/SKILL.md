---
name: spec-init
description: Birth a new feature - the only skill that creates one. Guards the single-active-feature rule, creates .sdd/specs/<name>/ and the in-progress epic bean that records the spec path, then names the next command.
allowed-tools: Bash, Glob, Read, AskUserQuestion
argument-hint: <feature-name-or-description>
---

# spec-init - feature birth

## Role

You run INLINE in the main conversation. This skill is deliberately
lightweight: no subagents, no document generation. It collects the
feature name and description, guards the single-active-feature rule,
creates the spec directory and the epic bean, records where the feature
lives, and hands off. Requirements, design, and tasks are produced by
their own skills.

Exactly one feature is active at any time (spec 5.5). The active feature
IS the single epic bean with status `in-progress`: every other sdd skill
resolves the feature from it and takes no feature argument. This skill
and `/sdd:discovery` are the only entry points that accept a new feature
name/description - the moment a feature is born.

## Hard rules

1. **Git is read-only.** Bash is limited to the beans CLI, `mkdir`, and
   read-only inspection. Nothing in this skill stages, commits, pushes,
   or touches branches: the user reviews and commits.
2. **beans is the only tracker.** Never write progress, approval, or
   blocked state into documents. The epic bean body carries the spec
   path - keep its recorded lines stable; other skills parse them.
3. **AskUserQuestion, always.** Every choice-point gets explanation in
   chat prose first, then the structured question (recommended option
   first, labeled, when you have one).

## Step 1 - Collect name and description

- With `$ARGUMENTS`: derive a kebab-case feature name and a one-line
  description from them.
- Without arguments, or when the name is ambiguous: ask via
  AskUserQuestion, offering 2-3 candidate kebab-case names as options
  when you can derive them (the user can always answer freely).

Uniqueness: if `.sdd/specs/<name>/` already exists for a different
feature, append a numeric suffix (`<name>-2`) and say so in the summary.

## Step 2 - Guard the single active feature

Query beans: `beans list --json -t epic -s in-progress`.

- **None** -> Step 3.
- **One or more** -> refuse to birth a new feature while one is active
  (spec 5.5). Explain the situation in prose, then ask ONE question per
  in-progress epic via AskUserQuestion:
  1. **Complete it** - you run the beans updates:
     `beans update <epic-id> -s completed` with a short
     `## Summary of Changes` appended per the global beans guide, and
     the same status change for the epic's incomplete task beans.
  2. **Scrap it** - cancellation: append a one-line reason, then
     `beans update <epic-id> -s scrapped` and the same for its
     incomplete task beans. Completing or scrapping also unblocks any
     follow-up epics queued `--blocked-by` this one.
  3. **Stop** - abort the run; the user resolves beans manually.
  Any "stop" ends the skill; otherwise re-check and continue to Step 3
  once no in-progress epic remains.

## Step 3 - Create the feature

1. **Directory**: `mkdir -p .sdd/specs/<name>/`.
2. **Epic bean - activate or create, never duplicate**: discovery queues
   follow-up features as `todo` epic beans. List epics
   (`beans list --json -t epic`), normalize the feature name and every
   epic title to a kebab-case slug (lowercase; non-alphanumeric runs
   become a single `-`), and compare on the slug:
   - **Exactly one match** (status `todo` or `draft`) -> activate it:
     `beans update <id> -s in-progress`.
   - **Zero or multiple matches** -> never silently create a possible
     duplicate. Show the candidate epics (the matches, or all queued
     `todo`/`draft` epics when none matched) in prose, then
     AskUserQuestion: pick the epic that IS this feature / create a new
     epic after all (`beans create "<name>" -t epic -s in-progress`).
3. **Record in the epic bean body** (append; stable lines - later skills
   parse them):
   ```
   Spec path: .sdd/specs/<name>/
   Description: <one line>
   Created: <YYYY-MM-DD>
   ```
   When activating a queued epic, keep its existing body content (its
   description, its queued-by notes); add only the missing lines.

## Step 4 - Summary and handoff

A SHORT summary:

- **Feature**: `<name>` - the one-line description
- **Spec directory**: `.sdd/specs/<name>/`
- **Epic bean**: `<bean-id>`

Then the next command in a code block:

```
/sdd:spec-requirements
```

The next skill resolves the feature from the in-progress epic - no
argument. Do not run it yourself; the user drives the cycle one command
at a time.
