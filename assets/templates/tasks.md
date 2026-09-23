# Implementation Plan

Template for the static task plan written to `.sdd/specs/<feature>/tasks.md`.
The plan records structure only - numbering, requirement mapping, boundaries,
and dependencies. It never records progress, completion, or approvals:
execution state lives in beans, and the plan is executed strictly
sequentially, one task at a time, via `/sdd:impl`.

## Header contract

`/sdd:spec-tasks` opens the finished document with `# Implementation Plan`
and, on the very next line, writes this line verbatim - the contract
executors rely on:

> **For executors:** REQUIRED: execute via /sdd:impl. State lives in beans — never edit this document to record progress.

The examples below show the plan format as it appears beneath that line.

## Task format

Plain list items only - never checkboxes (the plan carries no completion
state) and never parallel markers (execution is sequential). Use whichever
pattern fits the work breakdown:

### Major task only
- 1. Foundation: environment and test infrastructure setup
  - Detail item *(Include details only when needed. If the task stands alone, omit bullet items.)*
  - _Requirements: X.X_

### Major + Sub-task structure
- 2. Core feature A
- 2.1 Sub-task description
  - Detail item 1
  - Detail item 2
  - Observable completion condition *(At least one detail item must state the observable completion condition for this task - what will be true when it is done.)*
  - _Requirements: X.X, Y.Y_ *(Numeric IDs exactly as in requirements.md, comma-separated; do not add descriptions or parentheses.)*
  - _Boundary: ComponentName_ *(Component names from design.md; a task stays within one responsibility boundary, and cross-boundary work becomes an explicit integration task.)*
  - _Depends: X.X_ *(Only non-obvious cross-boundary dependencies; plain ordering handles the rest. Most tasks omit this.)*

Sub-task descriptions are natural-language capability statements - no file
paths or function names; those live in design.md.
