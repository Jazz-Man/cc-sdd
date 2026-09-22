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
  mermaid, task discipline) but ships 17 agent targets, an npm CLI installer, and
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
- No marketplace distribution (local `--plugin-dir` use only for now)
- No mutation of any target project's `CLAUDE.md`, ever

## 4. Plugin Architecture

### 4.1 Layout

```
cc-sdd/                            plugin name: sdd
├── .claude-plugin/plugin.json    name: sdd, version, description
├── hooks/hooks.json              SessionStart hook (see 4.3)
├── skills/                       16 skills, bare names → /sdd:<name>
│   ├── init/SKILL.md
│   ├── discovery/SKILL.md
│   ├── spec-quick/SKILL.md
│   ├── spec-init/SKILL.md
│   ├── spec-requirements/SKILL.md
│   ├── spec-design/SKILL.md
│   ├── spec-tasks/SKILL.md
│   ├── spec-batch/SKILL.md
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
│   └── steering/SKILL.md         + references/ (steering-principles.md, core/, custom/)
├── assets/
│   ├── rules/                    12 shared rule files (ported verbatim)
│   └── templates/                5 document templates: requirements.md,
│                                 requirements-init.md, design.md, tasks.md, research.md
│                                 (init.json dies with spec.json)
├── CLAUDE.md                     development context for THIS repo only
├── README.md                     human-facing, fork scope
└── docs/guides/                  English survivors, updated
```

Compared to the source 17 skills: `spec-status` is deleted (beans replaces it),
`steering-custom` merges into `steering`, `init` is new. Total: 16.

### 4.2 Skill inventory (interaction pattern, model, origin)

| Skill | Pattern | Model | Origin |
|---|---|---|---|
| init | interactive (writes file, briefs session in chat) | inherit | new |
| discovery | interactive; research to subagents | inherit | rewritten |
| spec-quick | inline orchestrator of the phase chain | inherit | rewritten |
| spec-init | inline, lightweight | inherit | rewritten |
| spec-requirements | interactive inline; drafting dispatched to subagent | opus (draft subagent) | rewritten |
| spec-design | generative fork | opus | ported + reworked |
| spec-tasks | generative fork | opus | ported + reworked |
| spec-batch | orchestrator of per-spec subagent waves | inherit | rewritten |
| impl | inline orchestrator + per-task subagents | inherit | rewritten fresh |
| review / debug / verify-completion | protocol payloads; user-invocable | (set by caller) | ported |
| validate-gap / -design / -impl | generative fork | opus | ported + reworked |
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
3. **Orchestrator** (`spec-quick`, `spec-batch`, `impl`): inline in the main
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
    O->>O: write workspace/task-N-brief.md
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
Minor (non-blocking) findings never enter the fix loop — they land in a final-report
parking lot. After the last task: whole-branch review (opus) + `validate-impl` gate
(GO/NO-GO, max 3 remediation rounds).

### 5.3 Model policy (hardwired, never the agent's choice)

| Role | Model |
|---|---|
| Requirements / design / tasks generation | opus |
| All reviews and validations (task-reviewer, re-review, code-reviewer, validate-*, whole-branch) | opus |
| Implementer | sonnet |
| Implementer in fix-loop rounds 4-5 (escalation) | opus |

Encoded in two places: frontmatter `model:` of forked skills; `model` parameter of
Agent calls inside prompt-templates (identifiers as supported by the host, e.g.
`opus`, `sonnet`).

### 5.4 Interaction rules

- **AskUserQuestion, always**: every choice-point or question to the user is asked via
  the AskUserQuestion tool — detailed explanation first in chat prose (approaches,
  trade-offs), then the structured question (recommended option first, labeled).
  Never a plain-text "which do you prefer?" ending.
- **Questions timeline**: clarifying questions only in discovery and the requirements
  phase. Design and tasks phases are confirm-only ("review this — any edits?").
- **Stop-per-task**: the default rhythm. The stop report is SHORT — no diff summary,
  no changed-file list, no beans recap (the user watches changes live in the IDE;
  beans files are git-tracked). Optional one-liner for test results if tests ran.
- **Subagents never ask the user directly**: they return status contracts with
  structured explanations; the orchestrator formulates the AskUserQuestion.

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
│   │   ├── tasks.md             STATIC plan document — numbering, requirement
│   │   │                        mapping, boundaries, dependencies; header contract:
│   │   │                        "REQUIRED: execute via /sdd:impl"; NO live checkboxes
│   │   ├── research.md          (validate-gap output, when used)
│   │   └── workspace/           execution artifacts, append-only:
│   │                            task-N-brief.md, task-N-report.md,
│   │                            review-package-N.md, notes.md
│   └── ...
└── .claude/
    └── rules/
        └── sdd.md               OPTIONAL — user-owned via /sdd:init
```

### 6.2 State: beans only

- **Feature** → epic bean (created by spec-init, one per spec)
- **Task** → task bean (created by spec-tasks), requirement/boundary metadata in body,
  cross-task dependencies via `--blocked-by`
- **Initiative** (multi-spec work) → milestone bean; specs as epic beans with
  `--blocked-by` encoding dependency waves (replaces `roadmap.md` and its checkboxes)
- Roadmap rendering on demand: `beans roadmap` (never parsed as state)
- Lifecycle per the global beans guide: in-progress → completed with
  `## Summary of Changes`; concern notes appended to bean bodies

**Deleted state**: `spec.json` (all fields — `phase`, `approvals`, `updated_at`,
`ready_for_implementation`, `language`), tasks.md checkbox lifecycle, roadmap.md
checkboxes, `_Blocked:_` inline annotations (blocked state lives in beans).

**Division of concerns**: state = beans; artifacts = files in the feature workspace.
Resume = query beans (never re-parse documents for progress).

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

## 9. Migration Plan (5 waves, each a child bean, verified before the next)

1. **Purge** — delete `tools/cc-sdd/`, `.agents/`, `AGENTS.md`, all non-Claude agent
   variants, legacy `claude-code/` and `claude-code-agent/` variants, all demo specs
   in `.kiro/specs/`, all non-English files (ja, zh-TW). Keep `.zed/`,
   `.github/workflows/`, `LICENSE`, `.beans.yml`.
2. **Skeleton** — `plugin.json`; relocate `claude-code-skills` → `skills/` with bare
   names; rules/templates → `assets/` (collapse the `.kiro/settings` vs
   `templates/shared/settings` duplication into one source); replace `{{KIRO_DIR}}`
   → `.sdd/` (96 references + 2 known hardcodes); delete `.kiro/`; rewrite root
   `CLAUDE.md`. Verify: `claude --plugin-dir .` loads.
3. **Subagent-first + beans** — fork frontmatter on generative skills; impl
   orchestrator + prompt-template suite + status contracts + fix-loop + review-package
   builder; all tracking migrated to beans; `spec.json` deleted; `tasks.md` becomes
   the static plan doc; discovery/spec-batch move to milestone/epic beans.
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
2. **Grep invariants** (all must return zero hits):
   - `{{` (unresolved placeholders), `.kiro`, `kiro-` (old names)
   - checkbox-flip instructions (`- [x]` writes) and spec.json phase/approval writes
   - git-write instructions (`git add`, `git commit`, `git push`, branch ops) in any
     skill or template — read-only git only
   - duplication of the global beans guide (one-line references only)
3. **Presence invariants**: generative skills carry `context: fork` +
   `background: false` + `model:`; prompt-templates pin `model` per role; every
   user-facing choice-point instruction mentions AskUserQuestion; impl templates
   contain the four-part escalation format and stop-per-task rule.
4. **Per-skill behavior checklist**: each of the 16 skills gets a short manual
   checklist (entry condition → expected interaction pattern → expected artifacts →
   expected beans effects) walked through during wave verification.
5. **End-to-end dry run**: in a scratch project — `/sdd:init`, a toy feature through
   spec-quick (approving each phase), `/sdd:impl` for one task verifying the
   stop-point and report shape, beans state inspected.

## 11. Open Items (inferences to verify during build)

- **[Inference] Scoped agent identifiers** (`plugin:agent`) as Agent-tool
  `subagent_type` — unneeded by this design (we dispatch `general-purpose` +
  prompt-templates), but revisit if agents/ is ever added.
- **[Inference] Subagent context inheritance** — mitigated by pattern-based handoff
  (everything a subagent needs is in its prompt or readable from files).
- Backgrounded forks have a narrowed toolset — all our forks use `background: false`;
  keep it that way unless a use case demands otherwise.

## 12. Success Criteria

1. Plugin loads via `claude --plugin-dir .`; all 16 skills invocable as `/sdd:<name>`;
   hook injects on startup and defers to an existing `.claude/rules/sdd.md`.
2. `git ls-files` contains none of: `tools/`, `.agents/`, `AGENTS.md`, `.kiro/`,
   ja/zh-TW files, demo specs.
3. All grep invariants (10.2) hold; all presence invariants (10.3) hold.
4. The end-to-end dry run (10.5) passes with the expected interaction shapes:
   questions via AskUserQuestion, stop-per-task with short report, concerns escalated
   in the four-part format.
5. README/docs describe the fork; everything is English; `.zed/` and
   `.github/workflows/` are byte-identical to before the migration.
