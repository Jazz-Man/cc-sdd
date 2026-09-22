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
- **Single active feature** (spec 5.5). Exactly one `in-progress` epic; skills
  resolve the active feature from beans and take NO feature argument; only
  `spec-init`/`discovery` accept a new feature name; `spec-init` refuses while an
  in-progress epic exists. Session lifecycle (compaction, new sessions) is not
  sdd's concern — state lives on disk.
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
   constraint) → pinned in Task 11's grep battery (the full write-class pattern
   `git[ ]+(add|commit|push|checkout|switch|stash|mv|rm)\b` must return 0 hits across
   skills/ and assets/).
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
- Delete: `tools/` (entire directory — CLI src/test/package.json, 18 agent template
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

Run: `ls tools .agents AGENTS.md 2>&1`
Expected: "No such file or directory" ×3.
(Do NOT use `git ls-files` here — the index still holds the deleted paths until the
user commits; it cannot return 0 pre-commit.)

- [ ] **Step 3: STOP**

Short report. User reviews `git status`, commits (suggested message:
`chore: purge CLI, multi-agent templates, AGENTS.md`).

### Task 2: Purge — non-English content and demo specs

**Files:**
- Delete: `docs/README/README_ja.md`, `docs/README/README_zh-TW.md`,
  `docs/RELEASE_NOTES/RELEASE_NOTES_ja.md`, `docs/guides/ja/` (entire dir)
- Note: `.kiro/specs/` (demo specs) is already gone — `.kiro/` was removed wholesale
  in Task 4 under the revised execution order.

**Interfaces:**
- Consumes: nothing.
- Produces: English-only docs.

- [ ] **Step 1: Delete**

```bash
rm -rf docs/guides/ja
rm docs/README/README_ja.md docs/README/README_zh-TW.md docs/RELEASE_NOTES/RELEASE_NOTES_ja.md
```

- [ ] **Step 2: Verify**

Run: `find . -path ./.git -prune -o \( -name '*_ja*' -o -name '*zh-TW*' \) -print`
Expected: empty output. (The `-prune` form avoids the `.git` scan; `git ls-files`
cannot be used pre-commit — the index still holds deleted paths.)

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
- Produces: `skills/{init…steering}/` — the canonical skill set (14 after deletions);
  names later tasks reference: `init, discovery, spec-init,
  spec-requirements, spec-design, spec-tasks, impl, review, debug,
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

- [ ] **Step 2: Move the 13 kept skills to bare names**

```bash
mkdir -p skills
S=tools/cc-sdd/templates/agents/claude-code-skills/skills
mv $S/kiro-discovery        skills/discovery
mv $S/kiro-spec-init        skills/spec-init
mv $S/kiro-spec-requirements skills/spec-requirements
mv $S/kiro-spec-design      skills/spec-design
mv $S/kiro-spec-tasks       skills/spec-tasks
mv $S/kiro-impl             skills/impl
mv $S/kiro-review           skills/review
mv $S/kiro-debug            skills/debug
mv $S/kiro-verify-completion skills/verify-completion
mv $S/kiro-validate-gap     skills/validate-gap
mv $S/kiro-validate-design  skills/validate-design
mv $S/kiro-validate-impl    skills/validate-impl
mv $S/kiro-steering         skills/steering
```
(`kiro-spec-status`, `kiro-spec-quick`, `kiro-spec-batch`, and
`kiro-steering-custom` are NOT moved — they die with `tools/` in Task 1: beans
replaces status, the phase-by-phase full cycle replaces quick, the sequential
single-feature workflow (spec 5.5) replaces batch. `skills/init/` is created new in
Task 14.)

- [ ] **Step 3: Verify**

Run: `ls skills | sort`
Expected: 13 entries exactly matching the list above, each containing `SKILL.md`.

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

The source `settings/templates/` contains THREE subdirectories (`specs/`, `steering/`,
`steering-custom/`) — only `specs/*.md` is relocated, flattened:

```bash
mkdir -p assets
mv tools/cc-sdd/templates/shared/settings/rules  assets/rules
mkdir -p assets/templates
mv tools/cc-sdd/templates/shared/settings/templates/specs/*.md  assets/templates/
rm assets/templates/init.json
rm -rf .kiro
```

The old `templates/steering/` and `templates/steering-custom/` are deliberately NOT
relocated — superseded by the steering skill's own `references/` (Task 13).

- [ ] **Step 2: Rewire skill references**

In all files under `skills/`: replace every reference of the form
`{{KIRO_DIR}}/settings/rules/<x>.md` → `${CLAUDE_PLUGIN_ROOT}/assets/rules/<x>.md`
and `{{KIRO_DIR}}/settings/templates/specs/<x>.md` →
`${CLAUDE_PLUGIN_ROOT}/assets/templates/<x>.md`.
Concrete example (spec-design):
`{{KIRO_DIR}}/settings/templates/specs/design.md` →
`${CLAUDE_PLUGIN_ROOT}/assets/templates/design.md`.

ADDITIONALLY (scope extension found during execution — the template-tree skills
reference rules as skill-local paths the installer CLI used to create):
- In the 5 skills that use them (spec-design, spec-requirements, spec-tasks,
  validate-design, validate-gap), replace every skill-local `rules/<name>.md`
  reference ("from this skill's directory") →
  `${CLAUDE_PLUGIN_ROOT}/assets/rules/<name>.md` (13 references).
- Remove the now-meaningless `metadata.shared-rules:` frontmatter lines in those
  same 5 skills (no installer exists to act on them; assets/ is the single source).
- In `skills/spec-init/SKILL.md`, drop the read-reference to `init.json` (the file
  is deleted with spec.json; Task 8 rewrites this skill wholesale anyway — the drop
  keeps the intermediate state coherent).

- [ ] **Step 3: Verify**

Run: `grep -rn 'settings/rules\|settings/templates' skills/ --exclude-dir=steering | wc -l` → `0`.
(`skills/steering/SKILL.md` still contains `{{KIRO_DIR}}/settings/templates/steering*`
references by design — the whole skill is replaced wholesale in Task 13.)
Run: `ls assets/rules | wc -l` → `12`; `ls assets/templates` → 5 files flat, no
init.json, no subdirectories.
Run: `grep -rnE 'rules/[a-z-]+\.md' skills/ --exclude-dir=steering | grep -v 'PLUGIN_ROOT' | wc -l` → `0`.
Run: `grep -rn 'shared-rules' skills/ --exclude-dir=steering | wc -l` → `0`.
Run: `grep -c 'init.json' skills/spec-init/SKILL.md` → `0`.

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

In all files under `skills/`: `{{KIRO_DIR}}` → `.sdd` (≈69 occurrences across the
relocated skills — verified count; the Step 4 grep is the gate, not the number).
The two known hardcodes from the research (`.claude/skills/kiro-*` paths in the old
kiro-spec-batch subagent prompts and in the old docs/CLAUDE.md template) both
disappear via deletion — spec-batch is not relocated and docs/CLAUDE.md died with
`tools/`. No manual hardcode fixes remain expected; the Step 4 grep confirms.

- [ ] **Step 2: Invocation rename**

Replace `/kiro-<x>` → `/sdd:<x>` and bare `kiro-<x>` → the bare skill name or
`/sdd:<x>` as grammar requires, across `skills/`. Example:
`/kiro-spec-design {feature}` → `/sdd:spec-design` (no feature argument — spec 5.5).

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
  review verdict block `## Review Verdict` with `- VERDICT: APPROVED|REJECTED`;
  debug outcome block `## Debug Outcome` with `- OUTCOME:` line.

**Required sections (each with full content at execution):**
1. Frontmatter: `name: impl`, description, `allowed-tools: Read, Write, Edit, Glob,
   Grep, Bash, Agent, AskUserQuestion` (Bash restricted to read-only git — stated in
   body), `argument-hint: [task-id]`.
2. Loop (spec 5.2 + 5.5 semantics): resolve the active feature (the single
   `in-progress` epic — none: stop with a pointer to `/sdd:spec-init` or
   `/sdd:discovery`; more than one: stop and ask the user to fix beans first) →
   query beans for its next unblocked task → write
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
   to plan change / abort. Abort executes `beans update <epic> -s scrapped` plus the
   same for every task bean of the feature, then stops (spec §7). The user makes the
   commit — the skill text says "the user
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
Run: `grep -c 'scrapped' skills/impl/SKILL.md` → ≥1 (abort path updates beans).
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
  learning to `workspace/notes.md`; writes the fuller `workspace/task-N-report.md`
  before returning `## Status Report` + `- STATUS:`.
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

### Task 8: Rework — spec-init, spec-requirements

**Files:**
- Rewrite: `skills/spec-init/SKILL.md`, `skills/spec-requirements/SKILL.md`

**Interfaces:**
- Consumes: beans (`beans create ... -t epic`), Agent dispatch for drafting.
- Produces: `.sdd/specs/<feature>/` + epic bean (spec-init); `requirements.md`
  (spec-requirements).

**Requirements:**
- `spec-init`: accepts the new feature name/description (the ONLY place a feature is
  born); refuses if an `in-progress` epic already exists (offers complete/scrap
  first, per spec 5.5); creates `.sdd/specs/<name>/` and the epic bean with
  `-t epic -s in-progress`; no spec.json (deleted concept — text must not mention
  it); its completion summary names the next command (`/sdd:spec-requirements`).
- `spec-requirements`: interactive phase FIRST (clarifying questions in main
  context, one at a time, AskUserQuestion; user may paste context); then dispatch
  the DRAFTING to an Agent subagent (`model: opus`) carrying the Q&A digest + EARS
  rule path `${CLAUDE_PLUGIN_ROOT}/assets/rules/ears-format.md` + template path;
  confirm-only afterwards, naming the next command (`/sdd:spec-design`). Skill
  itself is NOT forked (frontmatter has no `context: fork`).
- NOTE: there is NO spec-quick skill — the user runs the full cycle phase by phase
  (quick one-off work happens in the main chat outside sdd, per the user's
  workflow). Phase transitions are the confirm gates + next-command naming.

- [ ] **Step 1: Write the two SKILL.md files**, complete.
- [ ] **Step 2: Verify**

Run: `grep -c 'spec.json\|phase:\|approvals' skills/spec-init/SKILL.md
  skills/spec-requirements/SKILL.md` → `0` per file.
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
  `> **For executors:** REQUIRED: execute via /sdd:impl. State lives in beans — never
  edit this document to record progress.`

- Confirm contract for both skills: on fork completion the result is presented in
  main context with a confirm-only AskUserQuestion ("review — any edits?") — a fork
  cannot ask; the confirm names the next phase command
  (`/sdd:spec-tasks` after design, `/sdd:impl` after tasks).

- [ ] **Step 1: Write both SKILL.md files**, complete.
- [ ] **Step 2: Verify**

Run: `grep -c 'context: fork' skills/spec-design/SKILL.md skills/spec-tasks/SKILL.md`
→ `1` each; same for `background: false` and `model: opus`.
Run: `grep -c 'beans create' skills/spec-tasks/SKILL.md` → ≥1.

- [ ] **Step 3: STOP** — user reviews and commits.

### Task 10: Rework — discovery (beans-native, sequential multi-spec)

**Files:**
- Rewrite: `skills/discovery/SKILL.md`

**Interfaces:**
- Consumes: beans milestone/epic + `--blocked-by`; `.sdd/brief.md`.
- Produces: routing decision; milestone bean + ordered epic queue; `brief.md`.

**Requirements:**
- Routing decision (extend existing spec / no spec needed / single new spec /
  multi-spec initiative / mixed) presented via AskUserQuestion with trade-offs.
- Multi-spec → milestone bean + epic beans as a STRICTLY SEQUENTIAL queue: each next
  epic `--blocked-by` its predecessor; no parallel waves; no batch generation (the
  deleted spec-batch concept). Follow-up features discovered mid-work are queued the
  same way, never started alongside the active feature (spec 5.5).
- Writes `.sdd/brief.md` (narrative: intent, scope, decisions, open questions).
- No mention of roadmap.md.

- [ ] **Step 1: Write the file**, complete.
- [ ] **Step 2: Verify**

Run: `grep -ci 'roadmap\|spec-batch' skills/discovery/SKILL.md` → `0`.
Run: `grep -c 'blocked-by' skills/discovery/SKILL.md` → ≥1.

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

Run: `grep -rnE 'git[ ]+(add|commit|push|checkout|switch|stash|mv|rm)\b' skills/ assets/` → empty.
Run: `grep -rln 'context: fork' skills/` → exactly: spec-design, spec-tasks,
  validate-gap, validate-design, validate-impl (5 files).
Run (probe): the ONE remaining inline→forked composition is impl invoking
  `validate-impl` via the Skill tool at feature end (Task 6 §5). With a stub
  validate-impl, confirm the Skill-tool call triggers the fork and returns
  in-turn from an inline context. If it does not, change Task 6 §5 to dispatch the
  validation via the Agent tool directly (same GO/NO-GO contract) and record the
  decision in the umbrella bean.

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
  semantics entirely — execution is strictly sequential (spec 5.5).
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
  skill index table with the 14 names from Task 3):** content = the workflow map:
  paths (`.sdd/specs/`, workspace, brief), phase flow (discovery → requirements →
  design → tasks → impl with approval gates), beans-only-tracking statement +
  one-line pointer to the global beans guide, AskUserQuestion-always rule,
  stop-per-task + user-commits rule, model table, single-active-feature rule
  (resolve from beans; only spec-init/discovery take a feature name). Wrapped for
  hook injection with
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
  → OK. `grep -ci 'exists' skills/init/SKILL.md` → ≥1 (the refuse-if-exists rule is
  present, not just the file name).
- [ ] **Step 5: STOP** — user reviews and commits.

### Task 15: Docs, README, CHANGELOG

**Files:**
- Rewrite: `README.md`; prune `docs/guides/` to skill-reference.md, spec-driven.md,
  why-cc-sdd.md (updated to fork reality: no CLI, no agents table, /sdd:* usage,
  beans, models, stop-per-task); delete command-reference.md, customization-guide.md,
  migration-guide.md, claude-subagents.md, `docs/README/`, `docs/RELEASE_NOTES/`;
  reset `CHANGELOG.md`
  to a fork-initial entry.

- [ ] **Step 1: Apply.**
- [ ] **Step 2: Verify** — run: `grep -rnE 'kiro-|\.kiro|npm[ ]+install[ ]+cc-sdd' README.md docs/guides/`
  → 0. (Character-class pattern so the command string cannot trip the user's
  dependency-install hook — the plain spelling was reproduced as blocked during
  review. Scope is docs/guides/, not docs/: docs/superpowers/ legitimately mentions
  the old names.)
- [ ] **Step 3: STOP** — user reviews and commits.

### Task 16: Final verification battery and housekeeping

**Files:** none created; verification + beans cleanup.

- [ ] **Step 1: Full invariant battery (spec §10.2-10.3)** — all greps from Tasks
  5, 8-12 re-run over the invariant scope (`skills/ assets/ hooks/ README.md
  CLAUDE.md docs/guides/` — NEVER `.github/`, `.zed/`, `.beans/`,
  `docs/superpowers/`: workflows carry literal `${{ secrets.* }}` that must stay,
  and the plan/spec/bean files legitimately mention old names); use the
  hook-blocker-safe grep forms (Task 15 pattern); `claude plugin validate .` clean;
  `claude -p --plugin-dir . "Reply with the exact list of your available /sdd:
  skills"` returns the 14 names. Untouched proof: `git status --porcelain .zed
  .github` → empty.
- [ ] **Step 2: E2E dry run (spec §10.5)** in a scratch project. Setup first: ask
  the USER to initialize the scratch repo and record an initial snapshot (agents
  don't — read-only git; the review-package step needs a HEAD to diff against).
  Then: `/sdd:init` → toy feature phase by phase: `/sdd:spec-init` →
  `/sdd:spec-requirements` (answer the offered questions) → `/sdd:spec-design` →
  `/sdd:spec-tasks` (approve each confirm) → `/sdd:impl` one task → verify STOP
  shape (short report, AskUserQuestion, no diff-list), beans state, workspace
  artifacts.
- [ ] **Step 3: Housekeeping**: verify the two research-agent beans
  (`cc-sdd-0gd1`, `cc-sdd-koql`) are completed (they already were at plan-review
  time — confirm, don't redo); update umbrella `cc-sdd-uwj4` with
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
- **Revision 2 (2026-09-23):** single-active-feature model per user clarification —
  spec-batch deleted (16→15 skills), feature arguments removed from all skills except
  spec-init/discovery (spec 5.5), spec-init refusal rule, cancellation path in the
  spec; /compact and session habits explicitly OUT of sdd's concerns (state on disk).
- **Revision 3 (2026-09-23):** spec-quick deleted (15→14 skills) per user — full
  cycle only, phase by phase; quick one-off work stays outside sdd in the main chat.
  Phase transitions = confirm gates + next-command naming; the inline→forked probe
  moved to Task 11 (the only remaining composition is impl → validate-impl).
