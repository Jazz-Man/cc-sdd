# Task Independence Analysis Rules

## Purpose
Provide a consistent way to identify which implementation tasks are genuinely independent while generating `tasks.md`. Execution is strictly sequential — independence never licenses parallel execution. The analysis informs two mappings:

1. **Task level**: which sub-tasks need no explicit `_Depends:_` (plain ordering suffices) and which carry a hidden cross-boundary dependency that must be declared. Declared `_Depends:_` entries become `blocked-by` links on the task beans.
2. **Feature level**: which follow-up capabilities can stand alone as separately queued features (epic beans blocked by the active one) rather than tasks inside the current spec.

## Relationship to Task Ordering

An independent task has no dependency on its immediately preceding peers. The Task Ordering Principle (see tasks-generation.md) ensures Foundation-phase tasks run first, making Core-phase tasks the primary independent candidates. Independent or not, tasks execute one at a time in plan order.

## When to Consider Tasks Independent
Only treat a task as independent when **all** of the following are true:

1. **No data dependency** on pending tasks.
2. **No conflicting files or shared mutable resources** are touched.
3. **No prerequisite review/approval** from another task is required beforehand.
4. **Foundation work complete**: Environment/setup work needed by this task is already satisfied by earlier Foundation-phase tasks.
5. **Non-overlapping boundaries**: `_Boundary:_` annotations confirm tasks operate on separate components.

## What Independence Means in the Plan
- Independent tasks need no `_Depends:_` — plain ordering is sufficient.
- When any criterion fails across major-task groups, declare the dependency explicitly on the later task; its `_Depends:_` entry becomes a `blocked-by` link at execution time.
  - Example: `- 2.2 Build background worker for emails` with `_Depends: 2.1_` when it needs the schema introduced in 2.1; no annotation when plain ordering suffices.
- The plan format has no parallel markers — do not annotate concurrency.

## Grouping & Ordering Guidelines
- Group related tasks under the same parent whenever the work belongs to the same theme.
- List obvious prerequisites or caveats in the detail bullets (e.g., "Requires schema migration from 1.2").
- When two tasks look similar but are not independent, call out the blocking dependency explicitly.
- Evaluate independence at the sub-task level; container-only major tasks (those without their own actionable detail bullets) carry no executable work of their own.

## Quality Checklist
Before treating a task as independent, ensure you have:

- Verified that its file scope does not conflict with the tasks planned around it.
- Confirmed `_Boundary:_` annotations show non-overlapping component scopes.
- Captured any shared state expectations in the detail bullets.
- Confirmed that the implementation can be tested independently.
- Added `_Depends: X.X_` if the task still requires specific prior work from a different major-task group.

If any check fails, **do not** treat the task as independent: declare the dependency via `_Depends:_` and explain it in the task details.
