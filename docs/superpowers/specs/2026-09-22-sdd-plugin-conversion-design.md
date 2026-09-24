# Design Spec: Convert cc-sdd Fork into the `sdd` Claude Code Plugin

- **Date:** 2026-09-22
- **Status:** awaiting user review
- **Task tracking:** beans, umbrella bean `cc-sdd-uwj4`
- **Approach:** A — migrate in place (5 waves); proven content ported verbatim, transformed internals rewritten fresh

## 1. Goal

Turn the Jazz-Man/cc-sdd fork (a multi-agent, CLI-distributed SDD toolkit) into `sdd` — a
Claude Code plugin implementing Kiro-style spec-driven development (requirements → design
→ tasks → implementation) with **subagent-first execution**, for a single user's daily
workflow. The repository itself is the plugin artifact; there is no installer.

## 2. Background

- GitHub's original SDD framework proved too heavy (enterprise, token-hungry).
- cc-sdd has the right **structure** (phase gates, EARS requirements, design docs with
  mermaid, task discipline) but ships 18 agent targets, an npm CLI installer, and
  file-based tracking the user does not want.
- superpowers has the right **execution model** (subagents, status contracts, fix-loop
  escalation, stop-and-escalate behavior) but unstructured walls-of-text specs, no
  design-doc phase, hardwired git-write behavior, and unreliable model selection.
- The user's global workflow: beans is the only task tracker; git is read-only for
  agents (enforced by hooks); all agent questions arrive via `AskUserQuestion`.

This design takes the structure from cc-sdd and the execution from superpowers, adapts
both to the user's constraints, and deletes everything else.

## 3. Scope

**In scope:** deletion of all non-Claude-Code and non-English content; relocation to a
plugin layout; renaming to bare skill names under the `sdd` namespace; migration of all
execution tracking to beans; subagent-first execution with hardwired model policy;
stop-per-task rhythm; steering via the user's existing skill integrated as a project
skill; bootstrap hook with user-file precedence; `/sdd:init` opt-in; docs rewrite.

**Out of scope (explicitly):**
- `.github/workflows/` — untouched (separate future flow)
- `.zed/` — untouched (user's IDE configuration)
- No new features beyond this migration
- No public marketplace distribution; local install supported via the repo's
  `.claude-plugin/marketplace.json` (sdd-local) and `--plugin-dir`
- No mutation of any target project's `CLAUDE.md`, ever

## 4. Plugin Architecture

### 4.1 Layout

```
cc-sdd/                            plugin name: sdd
├── .claude-plugin/plugin.json    name: sdd, version, description
├── hooks/hooks.json              SessionStart hook (see 4.3)
├── skills/                       15 skills, bare names → /sdd:<name>
│   ├── init/SKILL.md
│   ├── discovery/SKILL.md
│   ├── spec-init/SKILL.md
│   ├── spec-requirements/SKILL.md
│   ├── spec-design/SKILL.md
│   ├── spec-tasks/SKILL.md
│   ├── impl/SKILL.md
│   │   └── templates/            implementer-prompt.md, task-reviewer-prompt.md,
│   │                             re-review-prompt.md, code-reviewer-prompt.md,
│   │                             debugger-prompt.md
│   ├── review/SKILL.md           protocol; user-invocable; path passed to subagents
│   ├── debug/SKILL.md            same
│   ├── verify-completion/SKILL.md same
│   ├── validate-gap/SKILL.md
│   ├── validate-design/SKILL.md
│   ├── validate-impl/SKILL.md
│   ├── validate-requirements/SKILL.md
│   └── steering/SKILL.md         + references/ (steering-principles.md, core/, custom/)
├── assets/
│   ├── rules/                    12 shared rule files (ported verbatim except the
│                                                                 placeholder/language strip in wave 3)
│   ├── templates/                4 document templates: requirements.md,
│                                 requirements-init.md, design.md, research.md
│                                 (init.json died with spec.json; tasks.md died with
│                                 Revision 4 — tasks live in bean bodies only)
│   ├── workflow-map.md           session-bootstrap map (the SessionStart hook cats it)
│   └── design-system_flow.png   upstream design-flow diagram
├── bin/                          sdd-gate, sdd-verdict, sdd-promote (Revision 7)
├── CLAUDE.md                     development context for THIS repo only
├── README.md                     human-facing, fork scope
└── docs/guides/                  English survivors, updated
```

Compared to the source 17 skills: `spec-status` is deleted (beans replaces it),
`spec-quick` is deleted (full cycle only, phase by phase — quick one-off work stays
in the main chat outside sdd), `spec-batch` is deleted (sequential single-feature
workflow — see 5.5), `steering-custom` merges into `steering`, `init` is new.
Total: 15 (validate-requirements added by Revision 6).

### 4.2 Skill inventory (interaction pattern, model, origin)

| Skill | Pattern | Model | Origin |
|---|---|---|---|
| init | interactive (writes file, briefs session in chat) | inherit | new |
| discovery | interactive; research to subagents | inherit | rewritten |
| spec-init | inline, lightweight | inherit | rewritten |
| spec-requirements | interactive inline; drafting dispatched to subagent | opus (draft subagent) | rewritten |
| spec-design | generative fork | opus | ported + reworked |
| spec-tasks | generative fork | opus | ported + reworked |
| impl | inline orchestrator + per-task subagents | inherit | rewritten fresh |
| review / debug / verify-completion | protocol payloads; user-invocable | (set by caller) | ported |
| validate-gap / -design / -impl | generative fork | opus | ported + reworked |
| validate-requirements | generative fork (Revision 6 gate) | opus | new |
| steering | interactive pipeline (own SKILL design) | inherit | user's global skill, verbatim |

Frontmatter on generative skills: `context: fork`, `background: false` (full toolset,
in-turn result), `model: opus`. The fork means a fresh subagent with no conversation
history — the skill body is the task prompt.

### 4.3 Bootstrap (workflow-map delivery)

SessionStart hook (matcher `startup|clear|compact`) checks whether
`<project>/.claude/rules/sdd.md` exists:

- **Missing** → inject the plugin's default workflow map as `additionalContext`
  (wrapped in `<EXTREMELY_IMPORTANT>`, with a `<SUBAGENT-STOP>` marker so dispatched
  subagents ignore it).
- **Present** → stay silent. The user's file (created by `/sdd:init`, possibly
  hand-customized) always takes precedence over the plugin default.

Two deliberate omissions, recorded so they are not reported as bugs later: the
matcher does not include `resume` (resumed sessions rely on the file or the next
startup injection), and a user's `sdd.md` that lags behind a newer plugin version
remains authoritative — precedence is by design; `/sdd:init` offers to show a diff
rather than overwrite.

The hook set also ships `beans prime` unconditionally on SessionStart and on
PreCompact: the plugin self-supplies the beans agent guide every session and
before compaction. The user's global hooks carry the same today; once the plugin
is stable they will be removed in favor of the plugin's (the duplication is
harmless — identical content).

`/sdd:init` writes `.claude/rules/sdd.md` containing **only the sdd workflow rules** —
no session briefing, no narrative. After writing, it informs the current session in
chat (one short message: the file now exists and governs the workflow). Nothing else is
ever written to the file by the plugin.

## 5. Execution Model

### 5.1 Three interaction patterns

1. **Interactive** (discovery; the questioning phase of spec-requirements; every
   approval gate): main conversation with the user. Heavy research is delegated to
   subagents even here.
2. **Generative-autonomous** (spec-design, spec-tasks, validate-*, and all review
   passes): a subagent by design — `context: fork` + `background: false` + `model: opus`
   hardwired in frontmatter. (spec-requirements is NOT forked: its questioning phase
   needs the user, so the skill runs inline and dispatches only the document drafting
   to an opus subagent via the Agent tool.)
3. **Orchestrator** (`impl`): inline in the main
   conversation — owns the loop, beans state, and user gates; dispatches execution to
   subagents via the Agent tool (general-purpose type + role defined by a
   prompt-template file).

Rationale (platform constraints): subagents cannot hold user dialogue, so every
question and approval lives in the main context; forked skills keep full tools only
with `background: false`; `model:` on a fork sets the subagent's model — all three
pin the design.

### 5.2 The impl task cycle

```mermaid
sequenceDiagram
    participant U as User (main context)
    participant O as /sdd:impl orchestrator
    participant I as Implementer (sonnet)
    participant R as Task-reviewer (opus)

    O->>O: query beans → next unblocked task
    O->>O: resolve the task bean (brief/report/notes are its body sections —
    Revisions 4+7; brief/report FILES are gone)
    O->>I: Agent(prompt=implementer-template + file path patterns)
    I-->>O: status contract (≤15 lines)
    O->>O: build workspace/review-package-N.md (working-tree diff+stat vs HEAD,
    incl. untracked files — agents never commit, so there are no task commits)
    O->>R: Agent(prompt=task-reviewer-template + package path)
    R-->>O: VERDICT (APPROVED / REJECTED + findings)
    alt REJECTED (≤5 rounds)
        O->>I: fix round (rounds 1-3 same agent, 4-5 fresh implementer, model raised to opus)
        O->>R: scoped re-review (changed files only)
    end
    O->>O: verify-completion gate (fresh evidence)
    O->>O: update beans (task done / concerns recorded)
    O->>U: STOP — short report + concerns → AskUserQuestion
    U->>U: reviews, tests, commits (git is read-only for agents)
    U->>O: continue → next task
```

Status contract values: `DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT`.
Minor (non-blocking) findings never enter the fix loop — they land in the task bean's parking lot (body section, Revision 7). The review package is scoped to the task's boundary paths when declared,
else the full working-tree diff — unrelated uncommitted user work never contaminates
it. After the last task: whole-branch review (opus) + `validate-impl` gate
(GO/NO-GO, max 3 remediation rounds).

### 5.3 Model policy (hardwired, never the agent's choice)

| Role | Model |
|---|---|
| Requirements / design / tasks generation | opus |
| All reviews and validations (task-reviewer, re-review, code-reviewer, validate-*, whole-branch) | opus |
| Implementer | sonnet |
| Implementer in fix-loop rounds 4-5 (escalation) | opus |

Encoded in two places: frontmatter `model:` of forked skills; the `model` parameter
of the orchestrator's Agent dispatch blocks (identifiers as supported by the host,
e.g. `opus`, `sonnet`).

### 5.4 Interaction rules

- **AskUserQuestion, always**: every choice-point or question to the user is asked via
  the AskUserQuestion tool — detailed explanation first in chat prose (approaches,
  trade-offs), then the structured question (recommended option first, labeled).
  Never a plain-text "which do you prefer?" ending.
- **Questions timeline**: clarifying questions only in discovery and the requirements
  phase. Design and tasks phases are confirm-only ("review this — any edits?").
- **Standalone generative invocations are the norm** (there is no chain skill): when
  a forked skill completes, the main context presents its result with a confirm-only
  AskUserQuestion that also names the next phase command (init → requirements →
  design → tasks → impl). The user drives the full cycle phase by phase; quick
  one-off work happens in the main chat outside sdd.
- **Stop-per-task**: the default rhythm. The stop report is SHORT — no diff summary,
  no changed-file list, no beans recap (the user watches changes live in the IDE;
  beans files are git-tracked). Optional one-liner for test results if tests ran.
- **Subagents never ask the user directly**: they return status contracts with
  structured explanations; the orchestrator formulates the AskUserQuestion.

### 5.5 Single active feature

Exactly one feature is active at any time — the user never works on multiple features
in parallel. Consequences:

- The active feature = the single epic bean with status `in-progress`. Skills resolve
  it from beans; only `spec-init` and `discovery` accept a new feature
  name/description (the moment a feature is born). All other skills take no feature
  argument.
- `spec-init` refuses to create a new feature while an `in-progress` epic exists — it
  offers to complete or scrap the current one first.
- A follow-up feature discovered mid-work is queued (epic `todo`, `--blocked-by` the
  active epic) and starts only after the current feature completes — or instead of
  it, if the current one is cancelled.
- sdd is agnostic to session lifecycle: state lives on disk (beans + files), so
  whatever the user does with their session between features is irrelevant to the
  plugin.

## 6. Data and State

### 6.1 Target project layout (fixed, no configuration)

```
<project>/
├── .sdd/
│   ├── brief.md                  workstream narrative (discovery output, one per
│   │                             initiative — not per feature)
│   ├── specs/<feature>/
│   │   ├── requirements.md      EARS-format requirements
│   │   ├── design.md            includes High-Level Architecture + mermaid diagram
│   │   ├── research.md          (validate-gap output, when used)
│   │   └── workspace/           blob storage only (Revision 7): review-package-N.md
│   │                            and other >100-line evidence; briefs/reports/notes
│   │                            live in task-bean bodies
│   └── ...
└── .claude/
    └── rules/
        └── sdd.md               OPTIONAL — user-owned via /sdd:init
```

### 6.2 State: beans only

- **Feature** → epic bean (created by spec-init, one per spec)
- **Task** → task bean (created by spec-tasks), requirement/boundary metadata in body,
  cross-task dependencies via `--blocked-by`
- **Initiative** (multi-spec work) → milestone bean; specs as epic beans queued with
  `--blocked-by` — strictly sequential, each next spec starts only after the previous
  completes (replaces `roadmap.md` and its checkboxes; no parallel waves)
- Roadmap rendering on demand: `beans roadmap` (never parsed as state)
- Lifecycle per the global beans guide: in-progress → completed with
  `## Summary of Changes`; concern notes appended to bean bodies

**Deleted state**: `spec.json` (all fields — `phase`, `approvals`, `updated_at`,
`ready_for_implementation`, `language`), the entire tasks.md file (Revision 4 — task
plans live in bean bodies), roadmap.md
checkboxes, `_Blocked:_` inline annotations (blocked state lives in beans).

**Division of concerns** (two-tier since Revision 7): state, verdicts, briefs,
reports, and notes = beans (bodies/tags); blobs over ~100 lines / 4KB that humans
read end-to-end (review packages, large evidence) = files, referenced from beans
by pointers. Resume = query beans (never re-parse documents for progress).

### 6.3 Plugin-internal data

Shared rules and templates live in `assets/`, referenced from skill bodies via
`${CLAUDE_PLUGIN_ROOT}/assets/...`. Skills' private files (prompt templates) are
referenced via `${CLAUDE_SKILL_DIR}/templates/...`. Steered content in target
projects: `.claude/rules/`, managed by the steering skill.

## 7. Error Handling and Escalation

**No blind decisions — ever.** Any concern, minor problem, or deviation from the plan
discovered during work — including when review passed and plan-conformance is OK (the
`DONE_WITH_CONCERNS` path) — escalates to the user with a four-part explanation:

1. How it should have been per the plan
2. What actually happened
3. Why it matters
4. Resolution options (accept as-is / fix / abort the process / other)

The user decides (via AskUserQuestion). This applies at stop-points, review
adjudication, and plan-deviation moments alike.

**Cancellation** is a first-class outcome of escalation: choosing to abort marks the
feature epic and its task beans `scrapped`; the feature branch (created and deleted
by the user — agents never touch branches) carries away the spec, workspace, and bean
files together. Nothing survives to pollute later work.

Other paths:
- `NEEDS_CONTEXT` → the orchestrator resolves it itself only if trivially answerable
  from repo/spec files; otherwise it goes to the user.
- Repeated failures → debug protocol (root-cause-first, max 2 rounds) → task marked
  blocked in beans with the root cause → escalated.
- Interrupted runs → next invocation resumes from beans; nothing depends on session
  memory.

## 8. Content and Quality Rules

- **EARS format** for requirements (ported rule, unchanged).
- **design.md** keeps High-Level Architecture + mermaid; visual structure is a
  first-class review aid.
- **Consistency discipline (not brevity)**: length is fine when the task needs it;
  the hard requirement is that tables and diagrams are 100% consistent with the prose,
  and the prose is faithful to what the user described and what research found.
  No compression that drops architectural detail.
- **Options, not silent picks**: during discovery/requirements/design the agent runs
  its own research (codebase, LSP, docs/API, web — as available) and proposes solution
  options with trade-offs; it never selects an approach silently.
- Quality architecture from cc-sdd is preserved: requirements-review-gate,
  design-review-gate, task-plan review loop, independent per-task review,
  root-cause debugging, fresh-evidence completion verification.

### 8.1 Machine contract grammar (authoritative, Revisions 6-7)

Every machine-parsed line is `- <FIELD>: <VALUE>` — exact field spelling, exact
enum token, single line. Complete inventory (live-swept):

| # | Field | Values | Written by |
|---|---|---|---|
| 1 | STATUS | DONE, DONE_WITH_CONCERNS, BLOCKED, NEEDS_CONTEXT | implementer |
| 2 | VERDICT | APPROVED, REJECTED | task-reviewer, re-review, code-reviewer, review |
| 3 | finding | [ADDRESSED], [NOT ADDRESSED] | re-review (per finding) |
| 4 | severity | BLOCKING, MINOR | reviewers (per finding) |
| 5 | OUTCOME | RESOLVED, UNRESOLVED | debugger |
| 6 | STATUS | VERIFIED, NOT_VERIFIED, MANUAL_VERIFY_REQUIRED | verify-completion |
| 7 | DECISION | GO, NO_GO, MANUAL_VERIFY_REQUIRED | validate-impl |
| 8 | evidence | Tests PASS/FAIL; Smoke PASS/FAIL/MANUAL_REQUIRED | validate-impl |
| 9 | evidence | Tests PASS/FAIL; Static PASS/FAIL/SPOT_CHECKED | review |
| 10 | STATUS / VERDICT | DONE/BLOCKED; GO/NO_GO | validate-design, forks |
| 11 | criterion | PASS, CONCERN, FAIL | validate-design (per criterion) |
| 12 | STATUS | DONE, AMBIGUITY | spec-requirements drafter |

Task-bean body sections (stable append-only headers): `## Brief`, `## Report`,
`## Notes`, `## Validation`, `## Parking lot`. Mirror tags (lowercase-hyphen):
`status-done`, `verdict-approved`, `outcome-resolved`, `verification-verified`,
`decision-go`, and `validated` on phase beans. `bin/sdd-verdict` parses the
authoritative line; tags exist for cheap cross-bean filtering.

## 9. Migration Plan (5 waves, each a child bean, verified before the next)

1. **Purge** — delete `tools/cc-sdd/`, `.agents/`, `AGENTS.md`, all non-Claude agent
   variants, legacy `claude-code/` and `claude-code-agent/` variants, all demo specs
   in `.kiro/specs/`, all non-English files (ja, zh-TW). Keep `.zed/`,
   `.github/workflows/`, `LICENSE`, `.beans.yml`.
2. **Skeleton** — `plugin.json`; relocate `claude-code-skills` → `skills/` with bare
   names; rules/templates → `assets/` (collapse the `.kiro/settings` vs
   `templates/shared/settings` duplication into one source); replace `{{KIRO_DIR}}`
   → `.sdd/` (≈69 occurrences in the relocated skills — the gate is the grep, not the
   count); delete `.kiro/`; rewrite root
   `CLAUDE.md`. Verify: `claude -p --plugin-dir . '<probe>'` responds (an interactive
   load check would hang).
3. **Subagent-first + beans** — fork frontmatter on generative skills; impl
   orchestrator + prompt-template suite + status contracts + fix-loop + review-package
   builder; all tracking migrated to beans; `spec.json` deleted; `tasks.md` became
   the static plan doc at this stage (removed later by Revision 4); rules/templates stripped of spec.json/`{{LANG_CODE}}`/language
   references; discovery moves to milestone/epic beans (sequential queue); `spec-batch` is deleted.
   Verify: grep invariants (see 10), smoke-run `/sdd:impl` on a toy spec.
4. **Steering + bootstrap** — integrate the steering skill with its references;
   build `/sdd:init`; SessionStart hook with the precedence rule.
5. **Docs** — README rewrite; prune/rewrite guides (keep skill-reference,
   spec-driven, why-cc-sdd updated; delete command-reference, customization-guide,
   migration-guide); CHANGELOG resets with the fork.

## 10. Verification and Testing

A prompt-only plugin has no unit tests; verification is invariant-based and
behavioral:

1. **Load check**: `claude --plugin-dir .` starts; `claude plugin validate` passes;
   skills appear under `/sdd:*`.
2. **Grep invariants** (all must return zero hits; scope = `skills/ assets/ hooks/
   README.md CLAUDE.md docs/guides/` — deliberately excluding `.github/`, `.zed/`,
   `.beans/`, and `docs/superpowers/`, whose `kiro`/`{{` content is either untouchable
   or self-referential). Convention invariants (Revisions 4-7): zero `tasks.md`
   references in skills; spec-init creates exactly three `phase`-tagged beans;
   completed requirement/design phases carry `validated` tags + `Doc-hash:` lines;
   verdict lines follow §8.1 grammar with mirror tags; zero brief/report file
   references in skills; `bin/` included in the scope:
   - `{{` (unresolved placeholders), `.kiro`, `kiro-` (old names)
   - checkbox-flip instructions (`- [x]` writes) and spec.json phase/approval writes
   - git-write instructions (`git add`, `git commit`, `git push`, branch ops) in any
     skill or template — read-only git only
   - duplication of the global beans guide (one-line references only)
3. **Presence invariants**: generative skills carry `context: fork` +
   `background: false` + `model:`; prompt-templates pin `model` per role; every
   user-facing choice-point instruction mentions AskUserQuestion; impl templates
   contain the four-part escalation format and stop-per-task rule.
4. **Per-skill behavior checklist**: each of the 15 skills gets a short manual
   checklist (entry condition → expected interaction pattern → expected artifacts →
   expected beans effects) walked through during wave verification.
5. **End-to-end dry run**: in a scratch project — `/sdd:init`, a toy feature through
   spec-init → spec-requirements → spec-design → spec-tasks (approving each
   confirm), `/sdd:impl` for one task verifying the
   stop-point and report shape, beans state inspected.

Post-Revision dry-run additions: the walkthrough must exercise the phase gates
(impl refuses unapproved phases), the auto-validator firing on approve (including
one NO-GO round and one zero-semantics auto-fix), validate-requirements as the
requirements gate, a deliberate post-validation doc edit triggering the stale-hash
escalation, task bodies carrying Brief/Report/Notes sections with verdict lines +
mirror tags, and the review-package file + bean pointer pair.

## 11. Open Items (inferences to verify during build)

- **[Inference] Scoped agent identifiers** (`plugin:agent`) as Agent-tool
  `subagent_type` — unneeded by this design (we dispatch `general-purpose` +
  prompt-templates), but revisit if agents/ is ever added.
- **[Inference] Subagent context inheritance** — mitigated by pattern-based handoff
  (everything a subagent needs is in its prompt or readable from files).
- Backgrounded forks have a narrowed toolset — all our forks use `background: false`;
  keep it that way unless a use case demands otherwise.

## 12. Success Criteria

1. Plugin loads via `claude --plugin-dir .`; all 15 skills invocable as `/sdd:<name>`;
   hook injects on startup and defers to an existing `.claude/rules/sdd.md`.
2. `git ls-files` contains none of: `tools/`, `.agents/`, `AGENTS.md`, `.kiro/`,
   ja/zh-TW files, demo specs.
3. All grep invariants (10.2) hold; all presence invariants (10.3) hold.
4. The end-to-end dry run (10.5) passes with the expected interaction shapes:
   questions via AskUserQuestion, stop-per-task with short report, concerns escalated
   in the four-part format; phase gates enforced; auto-validation fires on approve;
stale-hash escalates rather than silently re-validates.
5. README/docs describe the fork; everything is English; `.zed/` and
   `.github/workflows/` are byte-identical to before the migration.

## Revision 4 (2026-09-23) — tasks live in beans only

User decision (E2E observation): the tasks FILE — original cc-sdd's tracker and its
token/bottleneck burden — has no reason to exist once task details can live in bean
bodies. Overrides, authoritatively:

- §6.1: `tasks.md` is DELETED from the feature layout. The spec dir holds
  requirements.md, design.md, research.md, brief.md (workstream), workspace/.
- §4.2/§9: `/sdd:spec-tasks` SURVIVES, reworked: a generative fork (opus) that reads
  requirements + design + the tasks-generation rule and creates task beans
  DIRECTLY — bodies carry number, title, description, detail bullets with the
  observable completion condition, `_Requirements:`, `_Boundary:`; dependencies via
  `--blocked-by`; idempotent re-sync with the numbering discipline; confirm gate on
  the bean list in the presenting context. No file write, no header contract line.
- §5.2: the implementer brief is built from the task bean's body (number,
  description, details, requirements, boundary) plus file path patterns
  (design.md/requirements.md read by the subagent) — not extracted from any file.
- §5.5/flow: the user iterates requirements/design freely, generates tasks when
  ready, then invokes `/sdd:impl` separately (impl Step 0: epic without task beans
  → stop with a pointer to `/sdd:spec-tasks`).
- The executor header contract ("REQUIRED: execute via /sdd:impl") is retired —
  impl is the only executor and resolves from beans.

## Revision 5 (2026-09-24) — persistent phase gates

The original spec.json carried both state and gates; confirm-gates cover only the
moment of approval, not its persistence. Authoritative overrides:

- Phase gate model: each feature epic gets THREE phase sub-beans (tag `phase`,
  titles "Phase — requirements/design/tasks", `--blocked-by` chained in flow
  order, created by spec-init as `todo`).
- `completed` on a phase bean IS the approval. Phase skills gate on the previous
  phase bean being `completed` (stop with the named command otherwise) and
  complete their own bean after the confirm-approve.
- Task beans are born `draft` (generated-not-approved, the exact semantics of
  spec.json's `approvals.tasks.generated:true, approved:false`); the spec-tasks
  approve gate offers approve-all or selective promotion `draft → todo`;
  `ready_for_implementation` is implicit: three phase beans completed + at least
  one `todo` task bean.
- impl Step 0 hard-gates on all three phase beans; `draft` task beans are never
  auto-selected (unapproved).
- Re-entering an approved phase escalates (AskUserQuestion): reopen downstream
  phases (recommended) / accept desync risk / cancel. No silent invalidation.
- Explicitly NOT phase gates: research, test-strategy, estimate (content of
  design/requirements/validate-*, not lifecycle gates).
- Re-running spec-tasks after promotion preserves promoted statuses (never resets
  todo/in-progress to draft); the numbering discipline (no number reuse for
  different work) applies to re-runs.
- Mirror-tag scope (Revision 7): task beans carry status-/verdict-/outcome-/
  verification-/decision- mirrors; phase beans carry `validated` after GO.

### Revision 5 research annex (2026-09-24, live-tested)

- Custom statuses are IMPOSSIBLE in beans v0.4.2 (latest; hardcoded in source,
  config key absent, CLI rejects). Do not design around them; forking the tracker
  is ruled out.
- Tags are first-class and filterable (`--tag`, list/GraphQL filters) — the
  sanctioned mechanism for phase marking and task labeling (qa-series etc.).
- beans v0.4.2 BUG: the GraphQL `blockedBy` resolved relation returns empty
  regardless of blocker status (verified with completed and active blockers).
  ALL gate queries use `blockedByIds` + explicit per-blocker status checks.
  Singleton queries use `bean(id:)`.

## Revision 6 (2026-09-24) — mandatory validation gates (pre-implementation)

Approval is no longer a conversation alone: the REQUIREMENTS and DESIGN phases'
"approve" auto-dispatches an independent validator (opus fork) first (the tasks
phase has no document post-Revision 4 — it completes on its approve/promotion
gate alone). GO → phase completes with tag
`validated` and the document's sha256 recorded in the phase bean body
(`Doc-hash:`); NO-GO → four-part escalation, phase stays open. Any later gate
recomputes the hash — a changed document invalidates its validation (staleness is
mechanical, catches committed and uncommitted edits; the hash is computed AFTER
the validator's own zero-semantics fixes, at the GO moment; a stale hash at any
later gate escalates four-part — never silently re-validates). Validators auto-fix only
zero-semantics items (typos, paths, formatting) and list every fix; all else
escalates. New skill `validate-requirements` (15th) gates the requirements phase
(EARS, completeness, contradictions, steering); `validate-gap` remains formative
research against the codebase. Formative manual runs stay available anytime.

## Revision 7 (2026-09-24) — workspace migrates to beans bodies

Research-verified capabilities (live-tested): body writes are unlimited and
transactional; `list` never carries bodies; `show` reads all-or-nothing — the
practical boundary for "state=beans, artifacts=files" becomes ~100 lines / 4KB
of end-to-end-read content. Decisions: briefs, implementer reports, notes, and
verdict lines live in task-bean bodies (append-only sections; single-line enum
flips); review packages (diff blobs) stay files in workspace/ with a verdict
block + pointer in the bean; verdicts carry a lowercase-hyphen mirror tag for
cross-bean filtering (dual-write accepted, tag-order noise accepted); a small
bin/ helper set (sdd-gate, sdd-verdict, sdd-promote) protects quote/etag traps.
Safety rules in all skill prose: search phrases always quoted; no --ready
gating; etags on concurrent-capable paths; status changes via CLI only.

### §8.1 amendment (Revision 7, D1): epic beans may also carry `## Validation`
rounds — feature-level verdicts (validate-impl DECISION etc.) record there; the
section-header set is identical, the bean differs (task = per-task lifecycle,
epic = feature-level). Mirror tags apply on the epic for decision-* family.
