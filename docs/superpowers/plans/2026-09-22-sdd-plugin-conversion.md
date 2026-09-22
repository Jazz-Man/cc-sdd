# sdd Plugin Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (execution method preserved: subagent-driven, per user's standing choice) to implement
> this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking inside this
> document only — the REPO's task state lives in beans (see Global Constraints).

**Goal:** Convert the cc-sdd fork into `sdd`, a Claude Code plugin with subagent-first
execution, beans-only tracking, and hardwired model policy.

**Architecture:** Migrate in place across 5 waves (purge → skeleton → behavior rework →
steering/bootstrap → docs). Proven content (templates, rules, protocols) is relocated
verbatim; skills whose behavior transforms (impl, spec-*, discovery, validate-*) are
rewritten fresh from the spec. Repo remains loadable as a plugin after wave 2.

**Tech Stack:** Claude Code plugin format (`.claude-plugin/plugin.json`, `skills/`,
`hooks/`), SKILL.md frontmatter (`context: fork`, `background: false`, `model:`),
Agent tool dispatch, beans CLI, plain markdown/bash. No runtime code.

**Spec:** `docs/superpowers/specs/2026-09-22-sdd-plugin-conversion-design.md` — the plan
argues from the spec; executors read both.

## Global Constraints

- **Git is READ-ONLY for agents.** No `git add|commit|push|checkout|switch|mv|rm|stash`
  in any step. File operations use plain `mv`/`rm`/`mkdir`; git sees working-tree
  changes; the USER reviews and commits at every STOP step.
- **Every task ends with a STOP** (spec 5.4): short report, no diff summary, no
  changed-file list, no beans recap; optional one-line test result; the user commits
  and re-launches the next task.
- **Models hardwired** (spec 5.3): generation/review/validation = opus; implementation
  = sonnet; fix-loop rounds 4-5 = opus.
- **beans is the only tracker.** One-line references to the global beans guide;
  never duplicate its content. Epic per feature, task beans with `--blocked-by`,
  milestone per initiative.
- **English only.** Delete ja/zh-TW content on sight.
- **Never touch:** `.zed/`, `.github/workflows/`. **Never mutate** any target
  project's `CLAUDE.md`. `/sdd:init` writes only `.claude/rules/sdd.md`.
- **No placeholders in artifacts**: skill texts must be complete before their task's
  verify step passes.
- **Content discipline for this plan:** short new artifacts (manifests, hook config,
  rules content, contract blocks) are carried verbatim below; long rewrites (impl
  SKILL.md, prompt templates) are specified as complete section-by-section outlines
  with contract texts verbatim and per-section content requirements — the executor
  writes the full text from the outline + spec, and the task's verify step checks the
  required blocks are present. This adaptation exists because the "code" here is prose;
  duplicating full prose into the plan adds no review value.

## Review Focus

Input classes / failure modes the spec implies but task tests may not exercise —
each pinned to its owning task:

1. **Surviving git-write instructions in ported text** (old kiro skills contain
   commit/branch instructions; a ported file that keeps them violates the core
   constraint) → pinned in Task 11's grep battery (`git add|git commit|git push|git
   checkout -b|git switch` must return 0 hits across skills/ and assets/).
2. **Forked skill missing `background: false`** → silently narrowed toolset in the
   subagent (spec 11) → pinned in Task 16 invariant battery (every skill with
   `context: fork` must also carry `background: false` and `model:`).
3. **Stale identifiers after rename** (`{{`, `.kiro`, `kiro`, `KIRO_DIR`, `/kiro-`)
   → pinned in Task 5 and re-checked in Task 16 (0 hits repo-wide in tracked files).
4. **Literal git-write adjacency in prose** triggers the user's command hook falsely
   (observed incident: prose containing "git commit" inside a bash command string was
   blocked) → pinned in Task 7: prompt-template prose must use "the user commits" /
   "commit is manual", never the literal `git commit` sequence inside bash-callable
   text or script blocks.
5. **beans-guide duplication creeping into rewritten skills** → pinned in Task 16
   (any file in skills/ matching more than one line of the guide's distinctive
   phrases, e.g. "## Summary of Changes" headings + `beans update <id> -s completed`
   usage examples together, fails).

---

### Task 1: Purge — multi-agent surface, CLI, generic agents doc

**Files:**
- Delete: `tools/` (entire directory — CLI src/test/package.json, 17 agent template
  variants, manifests, scripts)
- Delete: `.agents/` (cc-sdd-new-agent skill)
- Delete: `AGENTS.md`

**Interfaces:**
- Consumes: nothing.
- Produces: a repo with no `tools/`, no `.agents/`, no `AGENTS.md`. Later tasks build
  the plugin layout at the repo root.

- [ ] **Step 1: Delete the three surfaces**

```bash
rm -rf tools .agents AGENTS.md
```

- [ ] **Step 2: Verify deletion and absence of side effects**

Run: `git status --porcelain | awk '{print $1}' | sort | uniq -c`
Expected: only `D` entries (deletions), no `A`/`M`/`??` beyond pre-existing.

Run: `git ls-files | grep -cE '^tools/|^\.agents/|^AGENTS\.md$'`
Expected: `0` — wait, `git ls-files` reflects the index, which still holds the files
until the user commits; the correct check while read-only is:
`ls tools .agents AGENTS.md 2>&1`
Expected: "No such file or directory" ×3.

- [ ] **Step 3: STOP**

Short report. User reviews `git status`, commits (suggested message:
`chore: purge CLI, multi-agent templates, AGENTS.md`).

### Task 2: Purge — non-English content and demo specs

**Files:**
- Delete: `docs/README/README_ja.md`, `docs/README/README_zh-TW.md`,
  `docs/RELEASE_NOTES/RELEASE_NOTES_ja.md`, `docs/guides/ja/` (entire dir)
- Delete: `.kiro/specs/` (entire dir — demo specs en and ja)

**Interfaces:**
- Consumes: nothing.
- Produces: English-only docs; `.kiro/` reduced to `settings/` (consumed by Task 4).

- [ ] **Step 1: Delete**

```bash
rm -rf docs/guides/ja .kiro/specs
rm docs/README/README_ja.md docs/README/README_zh-TW.md docs/RELEASE_NOTES/RELEASE_NOTES_ja.md
```

- [ ] **Step 2: Verify**

Run: `git ls-files ':(glob)**/*_ja*' ':(glob)**/*ja/**' ':(glob)**/*zh-TW*' --diff-filter=HEAD 2>/dev/null; ls .kiro`
Expected: `.kiro` contains only `settings`. No ja/zh-TW files remain on disk
(`find . -name '*_ja*' -o -name '*zh-TW*' -not -path './.git/*'` → empty).

- [ ] **Step 3: STOP** — user reviews and commits.

### Task 3: Skeleton — plugin manifest and skills tree with bare names

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create/rename: `skills/` populated from `tools/cc-sdd/templates/agents/...` —
  NOTE: Task 1 deleted `tools/`! **Order correction:** this task's moves happen BEFORE
  Task 1 only if sourced from `tools/`. Resolution: Task 1 must not run first. See
  revised wave order below — Tasks 1-2 run AFTER the skeleton extraction. Executor:
  follow the revised order in this plan's final section "Execution Order".

*(Self-review note folded into the plan: the original wave order — purge everything,
then rebuild from `claude-code-skills` — would destroy the source we relocate from.
Correct order: extract first (Tasks 3-4), then purge the rest (Tasks 1-2). The task
numbers are kept for traceability; execute in the order given at the end.)*

**Interfaces:**
- Consumes: `tools/cc-sdd/templates/agents/claude-code-skills/skills/kiro-*/` (17 dirs).
- Produces: `skills/{init…steering}/` — the canonical skill set (16 after deletions);
  names later tasks reference: `init, discovery, spec-quick, spec-init,
  spec-requirements, spec-design, spec-tasks, spec-batch, impl, review, debug,
  verify-completion, validate-gap, validate-design, validate-impl, steering`.

- [ ] **Step 1: Create the manifest (verbatim)**

`.claude-plugin/plugin.json`:
```json
{
  "name": "sdd",
  "version": "0.1.0",
  "description": "Kiro-style spec-driven development for Claude Code with subagent-first execution",
  "displayName": "sdd"
}
```

- [ ] **Step 2: Move the 15 kept skills to bare names**

```bash
mkdir -p skills
S=tools/cc-sdd/templates/agents/claude-code-skills/skills
mv $S/kiro-discovery        skills/discovery
mv $S/kiro-spec-quick       skills/spec-quick
mv $S/kiro-spec-init        skills/spec-init
mv $S/kiro-spec-requirements skills/spec-requirements
mv $S/kiro-spec-design      skills/spec-design
mv $S/kiro-spec-tasks       skills/spec-tasks
mv $S/kiro-spec-batch       skills/spec-batch
mv $S/kiro-impl             skills/impl
mv $S/kiro-review           skills/review
mv $S/kiro-debug            skills/debug
mv $S/kiro-verify-completion skills/verify-completion
mv $S/kiro-validate-gap     skills/validate-gap
mv $S/kiro-validate-design  skills/validate-design
mv $S/kiro-validate-impl    skills/validate-impl
mv $S/kiro-steering         skills/steering
```
(`kiro-spec-status` and `kiro-steering-custom` are NOT moved — they die with `tools/`
in Task 1. `skills/init/` is created new in Task 14.)

- [ ] **Step 3: Verify**

Run: `ls skills | sort`
Expected: 15 entries exactly matching the list above, each containing `SKILL.md`.

Run: `claude plugin validate . 2>&1 || true` — note result; formal validation is
re-run in Task 5 after references are fixed (broken `{{...}}` strings may warn here;
that is expected at this stage).

- [ ] **Step 4: STOP** — user reviews and commits.

### Task 4: Skeleton — assets/ consolidation and .kiro removal

**Files:**
- Create: `assets/rules/` (12 files), `assets/templates/` (5 files)
- Delete: `.kiro/` (entire), `tools/cc-sdd/templates/shared/settings/templates/specs/init.json`

**Interfaces:**
- Consumes: `tools/cc-sdd/templates/shared/settings/rules/*.md` (12),
  `.../templates/specs/{requirements,requirements-init,design,tasks,research}.md`.
- Produces: canonical asset paths used by every later skill edit:
  `${CLAUDE_PLUGIN_ROOT}/assets/rules/<name>.md`,
  `${CLAUDE_PLUGIN_ROOT}/assets/templates/<name>.md`.

- [ ] **Step 1: Move assets**

```bash
mkdir -p assets
mv tools/cc-sdd/templates/shared/settings/rules      assets/rules
mv tools/cc-sdd/templates/shared/settings/templates  assets/templates
rm assets/templates/init.json
rm -rf .kiro
```

- [ ] **Step 2: Rewire skill references**

In all files under `skills/`: replace every reference of the form
`{{KIRO_DIR}}/settings/rules/<x>.md` → `${CLAUDE_PLUGIN_ROOT}/assets/rules/<x>.md`
and `{{KIRO_DIR}}/settings/templates/specs/<x>.md` →
`${CLAUDE_PLUGIN_ROOT}/assets/templates/<x>.md`.
Concrete example (spec-design):
`{{KIRO_DIR}}/settings/templates/specs/design.md` →
`${CLAUDE_PLUGIN_ROOT}/assets/templates/design.md`.

- [ ] **Step 3: Verify**

Run: `grep -rn 'settings/rules\|settings/templates' skills/ | wc -l` → `0`.
Run: `ls assets/rules | wc -l` → `12`; `ls assets/templates` → 5 files, no init.json.

- [ ] **Step 4: STOP** — user reviews and commits.

### Task 5: Skeleton — path hardcode, invocation rename, root CLAUDE.md

**Files:**
- Modify: all `skills/*/SKILL.md`, `skills/impl/templates/*.md`
- Rewrite: `CLAUDE.md` (repo root)

**Interfaces:**
- Consumes: Tasks 3-4 layouts.
- Produces: `.sdd/` path convention everywhere; `/sdd:<name>` invocation strings
  (later tasks and the workflow-map asset rely on exactly these).

- [ ] **Step 1: Global path replacement**

In all files under `skills/`: `{{KIRO_DIR}}` → `.sdd` (96 expected occurrences;
after Task 4's rewiring only spec-path mentions remain).
Fix the two known hardcodes: `skills/spec-batch/SKILL.md` subagent prompts
`.claude/skills/kiro-spec-{init,requirements,design,tasks}/SKILL.md` →
`.sdd`-based dispatch via `${CLAUDE_PLUGIN_ROOT}/skills/...`; `docs/CLAUDE.md`
template is already deleted with `tools/`.

- [ ] **Step 2: Invocation rename**

Replace `/kiro-<x>` → `/sdd:<x>` and bare `kiro-<x>` → the bare skill name or
`/sdd:<x>` as grammar requires, across `skills/`. Example:
`/kiro-spec-quick {feature}` → `/sdd:spec-quick {feature}`.

- [ ] **Step 3: Rewrite root CLAUDE.md**

Replace repo-root `CLAUDE.md` with a development-context document for THIS repo:
what the plugin is, the layout map (skills/assets/hooks), how to verify
(`claude plugin validate .`, invariant greps from the spec §10.2), the beans workflow
for this repo's own development, and the read-only-git rule. It must NOT describe an
installation flow (there is none) and must not reference `.kiro`.

- [ ] **Step 4: Verify**

Run: `grep -rnE '\{\{|\.kiro|kiro-|KIRO_DIR' --include='*.md' skills/ CLAUDE.md | wc -l` → `0`.
Run: `claude plugin validate .` → passes (warnings acceptable, errors not).

- [ ] **Step 5: STOP** — user reviews and commits. After this task Tasks 1-2 (purge
  of `tools/`, `.agents/`, `AGENTS.md`, non-English, demo specs) execute as written
  above.

### Task 6: Rework — impl orchestrator SKILL.md (rewrite fresh)

**Files:**
- Rewrite: `skills/impl/SKILL.md`

**Interfaces:**
- Consumes: `${CLAUDE_SKILL_DIR}/templates/*.md` (Task 7), beans CLI, workspace
  paths `.sdd/specs/<feature>/workspace/`.
- Produces: the orchestrator loop contract that templates and later checklists test
  against. Key names (exact): status contract values `DONE | DONE_WITH_CONCERNS |
  BLOCKED | NEEDS_CONTEXT`; report block `## Status Report` with `- STATUS:` line;
  review verdict block `## Review Verdict` with `- VERDICT: APPROVED|REJECTED`.

**Required sections (each with full content at execution):**
1. Frontmatter: `name: impl`, description, `allowed-tools: Read, Write, Edit, Glob,
   Grep, Bash, Agent, AskUserQuestion` (Bash restricted to read-only git — stated in
   body), `argument-hint: <feature-name> [task-id]`.
2. Loop (spec 5.2 verbatim semantics): query beans for next unblocked task → write
   `workspace/task-N-brief.md` (extract the task section from tasks.md + requirement
   IDs + boundary) → dispatch implementer (Task 7 template, `model: sonnet`) with
   file path PATTERNS (never file contents) → parse `## Status Report` → build
   `workspace/review-package-N.md` from working-tree diff vs HEAD including
   untracked (`git diff` + `git status --porcelain` are the only git calls) →
   dispatch task-reviewer (`model: opus`) → on REJECTED run fix-loop: rounds 1-3
   SendMessage to the same implementer, rounds 4-5 fresh Agent with `model: opus`,
   each round scoped re-review (package rebuilt for changed files only) → max 5
   rounds then BLOCKED path → verify-completion gate (fresh evidence) → update beans
   (task bean completed, concerns appended) → STOP.
3. STOP contract (spec 5.4): short report; optional one-line test result if tests
   ran; any concern/deviation presented in the four-part format (verbatim block
   below); then AskUserQuestion with options: continue next task / revise / escalate
   to plan change / abort. The user makes the commit — the skill text says "the user
   reviews, tests, and commits" (never a literal `git commit` sequence).
4. Four-part escalation block (verbatim):
```
1. Per plan: <what the plan/tasks.md specified>
2. Actual: <what happened>
3. Why it matters: <consequence>
4. Options: accept as-is / fix now / change the plan / abort
```
5. Feature finish: whole-branch review (`code-reviewer-prompt.md`, opus) +
   `validate-impl` invocation, max 3 remediation rounds (GO/NO-GO).
6. Resume semantics: every iteration re-queries beans; no session memory assumed.

- [ ] **Step 1: Write the SKILL.md** with the sections above, complete text.
- [ ] **Step 2: Verify presence invariants**

Run: `grep -c 'DONE_WITH_CONCERNS\|NEEDS_CONTEXT' skills/impl/SKILL.md` → ≥2.
Run: `grep -c 'model: sonnet\|model: opus' skills/impl/SKILL.md` → ≥2 (in dispatch
blocks).
Run: `grep -nE 'git (add|commit|push|checkout|switch)' skills/impl/SKILL.md` → empty.

- [ ] **Step 3: STOP** — user reviews and commits.

### Task 7: Rework — impl prompt-template suite (5 files, rewrite fresh)

**Files:**
- Create/rewrite: `skills/impl/templates/implementer-prompt.md`,
  `task-reviewer-prompt.md`, `re-review-prompt.md`, `code-reviewer-prompt.md`,
  `debugger-prompt.md`

**Interfaces:**
- Consumes: Task 6 contract names.
- Produces: template bodies the orchestrator splices; each ends with the exact
  report block the orchestrator parses.

**Per-template requirements (full content at execution; shared header rules):**
- Common to ALL five: role line; "you are a subagent — do NOT ask the user
  questions; return a status contract instead"; input = brief file path + file path
  patterns to self-expand via Glob; read-only git (prose form: "never stage, never
  record snapshots, never touch branches"); output ≤15 lines unless REJECTED/Blocked
  findings listed.
- `implementer-prompt.md`: TDD order (RED→GREEN→REFACTOR) per cc-sdd protocol;
  boundary discipline (only files the task's `_Boundary:` names); appends one-line
  learning to `workspace/notes.md`; returns `## Status Report` + `- STATUS:`.
- `task-reviewer-prompt.md`: reads ONLY brief + review-package; spec-conformance
  first, quality second; blocking vs minor split (minor → parking-lot list, never
  the fix loop); returns `## Review Verdict` + `- VERDICT: APPROVED|REJECTED`.
- `re-review-prompt.md`: scoped — reviews only files changed since last round.
- `code-reviewer-prompt.md`: whole-branch final pass on the working tree;
  model-escalated use.
- `debugger-prompt.md`: root-cause-first (superpowers systematic-debugging
  semantics): reproduce → isolate → root-cause hypothesis → minimal fix; max 2
  rounds then BLOCKED with four-part block filled.

- [ ] **Step 1: Write all five templates**, complete texts.
- [ ] **Step 2: Verify**

Run: `grep -L '## Status Report\|## Review Verdict\|## Debug Outcome' skills/impl/templates/*.md`
→ only templates whose role legitimately ends otherwise may be absent; expected:
implementer has Status Report, task-reviewer + re-review have Review Verdict,
debugger has Debug Outcome, code-reviewer has Review Verdict.
Run: `grep -nE 'git (add|commit|push)' skills/impl/templates/*.md` → empty (Review
Focus #4: prose forms only).

- [ ] **Step 3: STOP** — user reviews and commits.

### Task 8: Rework — spec-init, spec-quick, spec-requirements

**Files:**
- Rewrite: `skills/spec-init/SKILL.md`, `skills/spec-quick/SKILL.md`,
  `skills/spec-requirements/SKILL.md`

**Interfaces:**
- Consumes: beans (`beans create ... -t epic`), Agent dispatch for drafting.
- Produces: `.sdd/specs/<feature>/` + epic bean (spec-init); phase-chain approvals
  (spec-quick); `requirements.md` (spec-requirements).

**Requirements:**
- `spec-init`: create `.sdd/specs/<feature>/`; create the epic bean titled after the
  feature with `-t epic -s todo`; no spec.json (deleted concept — text must not
  mention it).
- `spec-quick`: inline orchestrator invoking `sdd:spec-init → spec-requirements →
  spec-design → spec-tasks` via the Skill tool with an approval AskUserQuestion
  between phases; exit summary lists bean ids created.
- `spec-requirements`: interactive phase FIRST (clarifying questions in main
  context, one at a time, AskUserQuestion; user may paste context); then dispatch
  the DRAFTING to an Agent subagent (`model: opus`) carrying the Q&A digest + EARS
  rule path `${CLAUDE_PLUGIN_ROOT}/assets/rules/ears-format.md` + template path;
  confirm-only afterwards. Skill itself is NOT forked (frontmatter has no
  `context: fork`).

- [ ] **Step 1: Write the three SKILL.md files**, complete.
- [ ] **Step 2: Verify**

Run: `grep -c 'spec.json\|phase:\|approvals' skills/spec-init/SKILL.md
  skills/spec-quick/SKILL.md skills/spec-requirements/SKILL.md` → `0` per file.
Run: `grep -c 'AskUserQuestion' skills/spec-requirements/SKILL.md` → ≥2.
Run: `grep -c 'context: fork' skills/spec-requirements/SKILL.md` → `0`.

- [ ] **Step 3: STOP** — user reviews and commits.

### Task 9: Rework — spec-design, spec-tasks (generative forks)

**Files:**
- Rewrite: `skills/spec-design/SKILL.md`, `skills/spec-tasks/SKILL.md`

**Interfaces:**
- Consumes: assets templates + rules (design-discovery-full/light, design-principles,
  tasks-generation, tasks-parallel-analysis); beans (task beans).
- Produces: `design.md` (mermaid High-Level Architecture mandatory), `tasks.md`
  (static plan doc), task beans under the feature epic.

**Requirements:**
- Frontmatter both: `context: fork`, `background: false`, `model: opus`.
- `spec-design`: discovery classification (new/extension/simple — port logic from
  the old skill), research via WebSearch/LSP where available, PROPOSES options with
  trade-offs in the doc's "Considered Alternatives" section (never silent picks);
  mermaid diagram 100% consistent with prose (consistency discipline, spec §8).
- `spec-tasks`: generates tasks.md per the REWORKED template (Task 12) — numbering,
  `_Requirements:` IDs, `_Boundary:`, `_Depends:`; creates one task bean per
  sub-task (`-t task`, body carries requirement/boundary metadata, `--blocked-by`
  for `_Depends:`); tasks.md contains NO checkboxes; header contract line verbatim:
  `> **For executors:** REQUIRED: run via /sdd:impl. State lives in beans — never
  edit this document to record progress.`

- [ ] **Step 1: Write both SKILL.md files**, complete.
- [ ] **Step 2: Verify**

Run: `grep -c 'context: fork' skills/spec-design/SKILL.md skills/spec-tasks/SKILL.md`
→ `1` each; same for `background: false` and `model: opus`.
Run: `grep -c 'beans create' skills/spec-tasks/SKILL.md` → ≥1.

- [ ] **Step 3: STOP** — user reviews and commits.

### Task 10: Rework — discovery and spec-batch (beans-native multi-spec)

**Files:**
- Rewrite: `skills/discovery/SKILL.md`, `skills/spec-batch/SKILL.md`

**Interfaces:**
- Consumes: beans milestone/epic + `--blocked-by`; `.sdd/brief.md`.
- Produces: milestone bean + epic beans with dependency waves; `brief.md`;
  batch generation driving per-spec subagents.

**Requirements:**
- `discovery`: routing decision (extend existing spec / no spec / single / multi /
  mixed) presented via AskUserQuestion with trade-offs; multi-spec → create milestone
  bean + epic beans, cross-spec dependencies as `--blocked-by` (replaces roadmap.md
  entirely — text must not mention roadmap.md); writes `.sdd/brief.md` (narrative:
  intent, scope, decisions, open questions).
- `spec-batch`: reads pending epics under the milestone from beans (NOT files);
  dispatches per-spec subagent waves (a wave = epics whose blockers are all
  completed), `model: opus`, one Agent per spec per wave; updates epic statuses.

- [ ] **Step 1: Write both files**, complete.
- [ ] **Step 2: Verify**

Run: `grep -c 'roadmap' skills/discovery/SKILL.md skills/spec-batch/SKILL.md` → `0`.
Run: `grep -c 'beans' skills/spec-batch/SKILL.md` → ≥3.

- [ ] **Step 3: STOP** — user reviews and commits.

### Task 11: Rework — validate-* trio and protocol skills; purge git-write prose

**Files:**
- Rewrite: `skills/validate-gap/SKILL.md`, `validate-design/SKILL.md`,
  `validate-impl/SKILL.md`
- Modify: `skills/review/SKILL.md`, `skills/debug/SKILL.md`,
  `skills/verify-completion/SKILL.md` (strip tracking/git-write references; keep
  protocol substance)

**Interfaces:**
- Consumes: beans state; fork mechanics.
- Produces: validators with `context: fork` + `background: false` + `model: opus`;
  protocol files safe to hand to subagents.

**Requirements:**
- validate-*: fork frontmatter; verdicts GO/NO-GO; validate-impl reads beans for
  completion state (not checkboxes); max-3-rounds remediation wording.
- Protocol trio: remove checkbox/phase/spec.json references; keep adversarial
  review structure, root-cause debugging, fresh-evidence verification.

- [ ] **Step 1: Apply rewrites.**
- [ ] **Step 2: Verify (Review Focus #1 pin)**

Run: `grep -rnE 'git (add|commit|push|checkout -b|switch)' skills/ assets/` → empty.
Run: `grep -rln 'context: fork' skills/` → exactly: spec-design, spec-tasks,
  validate-gap, validate-design, validate-impl (5 files).

- [ ] **Step 3: STOP** — user reviews and commits.

### Task 12: Rework — document templates

**Files:**
- Modify: `assets/templates/tasks.md` (becomes static plan doc),
  `assets/templates/design.md`, `assets/templates/requirements.md`,
  `assets/templates/requirements-init.md`, `assets/templates/research.md`
- Modify: `assets/rules/ears-format.md` + any rule mentioning spec.json/language

**Interfaces:**
- Consumes: spec §6.1.
- Produces: templates consistent with beans-only state.

- [ ] **Step 1: Rework tasks.md template** — remove all checkbox grammar; keep
  numbering, `_Requirements:_`, `_Boundary:_`, `_Depends:_`, detail-item guidance;
  add the header contract line (text in Task 9). Remove `(P)` parallel-marker
  semantics (parallelism is a beans/dispatch concern now) — keep a note that
  independent tasks may carry `parallel: yes` metadata for the orchestrator.
- [ ] **Step 2: Strip spec.json/language references** from the other four templates
  and from rules (English is the fixed output language; no per-spec language
  config). `grep -rn 'spec.json\|LANG_CODE\|{{' assets/` → empty.
- [ ] **Step 3: Verify consistency**: `grep -c 'mermaid\|```mermaid'
  assets/templates/design.md` → ≥1 (diagram requirement preserved).
- [ ] **Step 4: STOP** — user reviews and commits.

### Task 13: Steering integration

**Files:**
- Replace: `skills/steering/` contents with the user's global skill: copy
  `~/.claude/skills/steering/SKILL.md` + `references/` (steering-principles.md,
  core/{product,tech,structure}.md, custom/*.md)

**Interfaces:**
- Consumes: the global skill verbatim.
- Produces: `/sdd:steering` managing target projects' `.claude/rules/`.

- [ ] **Step 1: Replace contents** (`rm -rf skills/steering && cp -R
  ~/.claude/skills/steering skills/steering`). Keep its `llm-application-dev:prompt-optimize`
  dependency reference as-is (global environment provides it).
- [ ] **Step 2: Verify**: `ls skills/steering/references/core` → 3 files; SKILL.md
  frontmatter intact (`name: steering`).
- [ ] **Step 3: STOP** — user reviews and commits.

### Task 14: /sdd:init, workflow-map asset, SessionStart hook

**Files:**
- Create: `skills/init/SKILL.md`, `assets/workflow-map.md`, `hooks/hooks.json`

**Interfaces:**
- Consumes: spec §4.3.
- Produces: bootstrap behavior; the default rules content `/sdd:init` writes.

- [ ] **Step 1: `assets/workflow-map.md` (verbatim core; executor completes the
  skill index table with the 16 names from Task 3):** content = the workflow map:
  paths (`.sdd/specs/`, workspace, brief), phase flow (discovery → requirements →
  design → tasks → impl with approval gates), beans-only-tracking statement +
  one-line pointer to the global beans guide, AskUserQuestion-always rule,
  stop-per-task + user-commits rule, model table. Wrapped for hook injection with
  `<EXTREMELY_IMPORTANT>` open/close and a `<SUBAGENT-STOP>` notice line at top.
- [ ] **Step 2: `hooks/hooks.json` (verbatim):**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "if [ ! -f \"$CLAUDE_PROJECT_DIR/.claude/rules/sdd.md\" ]; then cat \"${CLAUDE_PLUGIN_ROOT:?unset}/assets/workflow-map.md\"; fi"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 3: `skills/init/SKILL.md`:** frontmatter (`name: init`,
  `disable-model-invocation: true` — user-invoked only); body: write
  `<project>/.claude/rules/sdd.md` with EXACTLY the content of
  `assets/workflow-map.md` minus the `<EXTREMELY_IMPORTANT>`/`<SUBAGENT-STOP>`
  wrappers; refuse politely if the file exists (offer to show a diff instead of
  overwriting); after writing, one short in-chat note that the file now governs the
  workflow. No other content ever goes into that file.
- [ ] **Step 4: Verify**: `python3 -c "import json;json.load(open('hooks/hooks.json'))"`
  → OK. `grep -c 'sdd.md' skills/init/SKILL.md` → ≥2.
- [ ] **Step 5: STOP** — user reviews and commits.

### Task 15: Docs, README, CHANGELOG

**Files:**
- Rewrite: `README.md`; prune `docs/guides/` to skill-reference.md, spec-driven.md,
  why-cc-sdd.md (updated to fork reality: no CLI, no agents table, /sdd:* usage,
  beans, models, stop-per-task); delete command-reference.md, customization-guide.md,
  migration-guide.md, `docs/README/`, `docs/RELEASE_NOTES/`; reset `CHANGELOG.md`
  to a fork-initial entry.

- [ ] **Step 1: Apply.** Step 2: Verify `grep -rn 'kiro-\|\.kiro\|npm install cc-sdd' README.md docs/` → 0.
- [ ] **Step 3: STOP** — user reviews and commits.

### Task 16: Final verification battery and housekeeping

**Files:** none created; verification + beans cleanup.

- [ ] **Step 1: Full invariant battery (spec §10.2-10.3)** — all greps from Tasks
  5, 8-12 re-run repo-wide; `claude plugin validate .` clean; `claude -p
  --plugin-dir . "Reply with the exact list of your available /sdd: skills"`
  returns the 16 names.
- [ ] **Step 2: E2E dry run (spec §10.5)** in a scratch project: `/sdd:init` →
  toy feature via `/sdd:spec-quick` (approve each phase via the offered choices) →
  `/sdd:impl` one task → verify STOP shape (short report, AskUserQuestion, no
  diff-list), beans state, workspace artifacts.
- [ ] **Step 3: Housekeeping**: mark the two research-agent beans
  (`cc-sdd-0gd1`, `cc-sdd-koql`) completed; update umbrella `cc-sdd-uwj4` with
  `## Summary of Changes`.
- [ ] **Step 4: STOP** — final user review and commit.

## Execution Order

Tasks 3 → 4 → 5 → 1 → 2 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16.
(Skeleton extraction precedes purges so relocation sources survive; the purge tasks
run unchanged as numbered.)

## Self-Review (recorded per skill)

- **Spec coverage:** spec §4 → Tasks 3-5, 13, 14; §5 → 6-9, 11; §6 → 8-10, 12; §7 →
  6-7; §8 → 9, 12; §9 → task order = waves; §10 → per-task verifies + 16; §3
  untouchables → Global Constraints. Gap found and fixed: original purge-first order
  would destroy relocation sources → Execution Order corrected, note left in Task 3.
- **Placeholder scan:** long-prose artifacts use declared outlines with verbatim
  contract blocks (see "Content discipline"); no TBD/TODO steps remain.
- **Type consistency:** status contract values, report block names, asset paths,
  skill names cross-checked across Tasks 3-14.
- **Review Focus:** five failure modes listed; each pinned to Tasks 11, 16, 5/16, 7, 16.
