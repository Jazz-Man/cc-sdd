# sdd Content Normalization (Revision 9) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.
> STOP steps replace commits (git read-only for agents; the user reviews and commits).
> Battery greps must stay green at every task boundary; twin checks join the battery in Task 6.

**Goal:** Enact the usage-index walk decisions — canonical twins, one parameterized twin, upward delegations, drift fixes — with zero new files and zero behavior changes.

**Architecture:** Six ordered tasks by mechanism: deletions first (shrink before insert), twins second/third, remaining delegations fourth, drift package fifth, twin-verification battery sixth (then permanent). File families never overlap across tasks except where a later task verifies an earlier one's output.

**Tech Stack:** prompt-only plugin (markdown skill texts); verification = battery greps + `claude plugin validate .` + census counts (15 skills / 6 forks / map 60 lines).

**Spec:** `docs/superpowers/specs/2026-09-25-content-normalization-design.md` — binding change inventory in §3; twin verification in §4. Decisions source: `.superpowers/usage-index.md` WALK DECISIONS blocks.

## Global Constraints

- Git read-only for agents; STOP per task; the user commits.
- NO new files; no behavior changes — text distribution and wording only.
- skills/steering/** untouched; read-only git USES (diff/status/log/merge-base in impl flows) untouched.
- Map pins: 60 lines, first-3 + closing fence byte-unchanged, `^<EXTREMELY_IMPORTANT>$` count 1 (only Task 4's escalation reword touches the map, net-zero).
- Deletion targets are SENTENCES (role/git prohibitions), never usage instructions.
- Battery: existing §10.2 set + conventions stays green in every task's verify.
- Census: 15 skills, 6 `context: fork` files, unchanged.

## Review Focus

1. **Twin erosion** — a future edit changes one GP-1/RS-1 copy and silently breaks the twin → Task 6 adds count-greps (exactly 6) as permanent battery; pin now.
2. **Parameterized-twin slot leak** — the approve-gate twin's slots ({phase}/{doc}/{next}/{validator}) substituted inconsistently, e.g. design's gate naming /sdd:spec-design → Task 3 verify re-reads both blocks after slot-normalization.
3. **Over-deletion** — RS-4 sweep eats a Bash ceiling or a usage line ("only git you run" appears in VALID usage contexts?) → Task 1 verify distinguishes: deleted sentence forms grep to 0; ceilings/uses re-grepped positive.
4. **Delegation orphaning** — pointer added but target renamed/moved (GP-2 → gate assets, O-2 → ears-format.md) → Task 4 verify resolves every new pointer path (test -f).
5. **Map pin breach** — the net-zero escalation reword changes line count/wrappers → Task 4 verify runs the full pin set + strip pipeline dry-run.

---

### Task 1: Upward deletions (RS-4 role+git halves, RS-5 rule-sentences)

**Files:** Modify all 13 sdd-native SKILL.md (not steering) + all 5 skills/impl/templates/*.md. No file creations.

**Interfaces:**
- Consumes: usage-index RS-4/RS-5 occurrence lists (spec §3.3 rows 1-3).
- Produces: Hard-rules-1 lines that begin with the Bash-ceiling sentence only (role half gone); template Ground-rules with no git sentence; closes that name the next command without the "Do not run…" rule-sentence.

**Steps:**
- [ ] **Step 1: Read the exact occurrence sites** — usage-index RS-4 Va list: skills' Hard rules 1 lines (impl:28, discovery:26, spec-tasks:29, validate-design:27, validate-gap:28, validate-requirements:32, spec-design:27, spec-init:26, spec-requirements:26, validate-impl:46, init:26) and all 5 templates' ground-rule git sentences ("Read-only git (diff, status, log) is the only git you run."). Also resolve the discovery:26 mkdir question (read the file; note its true Bash ceiling for Step 2's kept-sentence).
- [ ] **Step 2: Delete the role+git halves.** In each skill's Hard rule 1: keep ONLY the Bash-ceiling sentence (e.g. "Bash use is limited to read-only git (git diff, git status, git log, git merge-base), the beans CLI, the plugin's bin/ helpers … and file operations." in impl; "Bash is limited to the beans CLI and read-only inspection." in validators; init keeps its file-inspection line). In templates: delete the whole "Read-only git …" sentence (the constitution owns it). Where a ground rule becomes empty, remove the rule number and renumber within that file's rule list.
- [ ] **Step 3: RS-5 thinning** — in init, spec-init, discovery closes: delete the "Do not run the next command yourself; the user drives the cycle one command at a time." / "Do not run it yourself; …" / "Do not run it; …" sentence; the command-naming stays verbatim.
- [ ] **Step 4: Verify (all must hold; record verbatim):**
  - `grep -rn 'only git you run' skills/` → 0
  - `grep -rn 'The user reviews and commits\.\|The user reviews, tests, and commits' skills/` → 0 (the map keeps ITS Interaction line — scope excludes assets/workflow-map.md)
  - `grep -rn 'Do not run the next command yourself\|Do not run it yourself\|Do not run it;' skills/init skills/spec-init skills/discovery` → 0
  - Ceilings survive: `grep -c 'Bash is limited to\|Bash use is limited to' skills/` ≥ 10
  - Usage survives: `grep -c 'merge-base' skills/impl/SKILL.md` ≥ 3
  - Full battery green; census 15/6; `claude plugin validate .` passes
- [ ] **Step 5: STOP** — user reviews and commits.

### Task 2: Canonical twins (GP-1 fork resolution, RS-1 FORK line)

**Files:** Modify spec-design, spec-tasks, validate-design, validate-gap, validate-impl, validate-requirements (6 SKILL.md).

**Interfaces:**
- Consumes: spec §3.1; canonical GP-1 text = spec-design:47–57 block verbatim; canonical RS-1 sentence (spec §3.1, quoted).
- Produces: exactly-6 twin counts (Task 6 pins them).

**Steps:**
- [ ] **Step 1: GP-1 twin.** Replace each fork's Step-1 resolution block (spec-tasks:41–52, validate-design:52–63, validate-gap:43–54, validate-requirements:58–69, validate-impl:69–80) with the spec-design:47–57 text VERBATIM (Query beans line; Exactly one → active feature + Spec-path resolution; None → BLOCKED + the two commands; More than one → BLOCKED + single-active-feature violated + main context resolves). spec-design's own block unchanged. Terminology fixes ride along: validate-impl "invoking context" → "the main context"; spec-tasks regains "that epic is".
- [ ] **Step 2: RS-1 twin.** Ensure all six Role sections carry the identical sentence: "You are a FORK: a fresh subagent with no conversation history. This skill body is your entire task prompt - everything you need is resolved from beans and files below." (validate-impl:28 regains the second clause; its Entry-paths section untouched).
- [ ] **Step 3: Verify:**
  - `grep -c 'Query beans: \`beans list --json -t epic -s in-progress\`' skills/` → exactly 6
  - `grep -c 'This skill body is your entire task prompt' skills/` → exactly 6
  - `grep -c 'Exactly one -> that epic is the active feature' skills/` → 6
  - Inline copies untouched: impl:103 / spec-requirements Step 0 blocks still present (richer variants, `grep -c 'Exactly one' skills/impl/SKILL.md` ≥ 1)
  - Battery + census + validate green
- [ ] **Step 4: STOP** — user reviews and commits.

### Task 3: Parameterized twin (approve-gate mechanics, GP-5+6+8+9)

**Files:** Modify skills/spec-requirements/SKILL.md (Phase 3), skills/spec-design/SKILL.md (Return contract — Approve/GO/NO_GO/BLOCKED).

**Interfaces:**
- Consumes: spec §3.2 — slots `{phase} {document} {next-command} {validator}`.
- Produces: twin blocks that Task 6's paired check compares; also absorbs GP-9 merge (spec-design BLOCKED bullet+footer → one).

**Steps:**
- [ ] **Step 1: Draft the parameterized block once** (in the report), from the CURRENT spec-requirements Phase 3 + spec-design Return contract union, keeping every existing semantic: validator-first dispatch (paths-only, model opus, one SendMessage resume); GO sequence (tag validated → shasum NOW post-fixes → `## Validation` round w/ `Doc-hash:` → `-s completed`); only-latest Doc-hash clause; NO_GO four-part + "The phase stays open - no tag, no hash, no completion."; BLOCKED merged form (present blocker + named command → AskUserQuestion (resolve via that command / adjust inputs / stop); phase stays open); legacy-heal note; `The user reads the document in the IDE` presentation line; next-command naming in a code block.
- [ ] **Step 2: Substitute per skill** — spec-requirements: {requirements}{requirements.md}{/sdd:spec-design}{validate-requirements}; spec-design: {design}{design.md}{/sdd:spec-tasks}{validate-design}. Replace the two gate sections with the twin; delete spec-design's now-merged BLOCKED footer (GP-9).
- [ ] **Step 3: Verify (paired):**
  - Extract both blocks; diff after normalizing the four slots (sed the slot values to placeholders) → identical
  - `grep -c 'validator FIRST' skills/spec-requirements/SKILL.md skills/spec-design/SKILL.md` → 1 each
  - `grep -c 'no tag, no hash, no completion' skills/spec-requirements/SKILL.md skills/spec-design/SKILL.md` → 1 each
  - spec-design no longer has separate BLOCKED footer: `grep -c 'On BLOCKED:' skills/spec-design/SKILL.md` → 0
  - Doc-hash/validated/shasum counts in both files unchanged from pre-task (3/3/1 pattern)
  - Battery + census + validate green
- [ ] **Step 4: STOP** — user reviews and commits.

### Task 4: Remaining delegations (GP-2, O-2, GP-7 hints + map reword, GP-12)

**Files:** Modify spec-design, spec-tasks (GP-2 pointers); assets/templates/requirements.md (O-2); validate-requirements, validate-design (GP-7 hints); skills/validate-impl/SKILL.md (GP-12); assets/workflow-map.md (options reword, NET-ZERO).

**Interfaces:**
- Consumes: spec §3.3 rows 4–8.
- Produces: pointer lines whose targets MUST exist (verify resolves them).

**Steps:**
- [ ] **Step 1: GP-2 pointers** — spec-design:182,185 and spec-tasks:137,141–142 loop restatements → single line each: "Review gate: apply `${CLAUDE_PLUGIN_ROOT}/assets/rules/design-review-gate.md" (design) / "`.../tasks-generation.md`" (tasks) — "bounded at 2 repair passes." (keep exactly one bound mention per file).
- [ ] **Step 2: O-2 pointer** — assets/templates/requirements.md: delete the numbered EARS pattern enumeration (lines ~32–37); keep section headers and add one line: "Patterns: follow `${CLAUDE_PLUGIN_ROOT}/assets/rules/ears-format.md` exactly."
- [ ] **Step 3: GP-7 hints + map** — validate-requirements:231–235 and validate-design:206–210 → "Present the four-part escalation (impl Step 9 shape) with payload <findings>." Map line 39 options → "accept as-is / fix now / change the plan / abort" (reword only; NO line-count change).
- [ ] **Step 4: GP-12** — validate-impl:252 budget sentence → "The orchestrator owns all loop budgets."
- [ ] **Step 5: Verify:**
  - Pointers resolve: `test -f assets/rules/design-review-gate.md assets/rules/tasks-generation.md assets/rules/ears-format.md` → all exist (test each)
  - `grep -c 'four-part escalation (impl Step 9 shape)' skills/validate-requirements/SKILL.md skills/validate-design/SKILL.md` → 1 each
  - Map pins FULL: `wc -l < assets/workflow-map.md` = 60; head -3 + last fence byte-unchanged vs HEAD; `grep -c '^<EXTREMELY_IMPORTANT>$'` = 1; strip dry-run starts at `# sdd`
  - `grep -c 'When \[event\]' assets/templates/requirements.md` → 0 (enumeration gone)
  - Battery + census + validate green
- [ ] **Step 6: STOP** — user reviews and commits.

### Task 5: Drift-fix package (15 items, spec §3.4)

**Files:** impl+spec-requirements+spec-design (PC-1 caller-side); templates+review (G-4); map+impl (MP word); validate-design (O-4, PR-5); re-review (O-6); validate-impl+validate-requirements (PI-2); validate-gap (PI-3); docs/guides/skill-reference.md (PR-2); forks (SR-2 word); templates (SR-4 form).

**Steps:**
- [ ] **Step 1:** Apply each of the spec §3.4 items 1–15 verbatim (each is a one-to-few-line edit at the exact locations the spec names). Item 14 (discovery:26 mkdir) — resolve per Task 1's finding: align its ceiling to its true family wording.
- [ ] **Step 2: Verify (spot the fixed forms):**
  - `grep -c 'ambiguous, or replaced with prose' skills/spec-requirements/SKILL.md` → 1; spec-design same pattern → 1
  - G-4 field name single-spelling: the two spellings grep → 1 and 0
  - `grep -c 'hardwired' assets/workflow-map.md` → 0 (pinned/hardwired unified to pinned)
  - `grep -c 'Revalidation Triggers' skills/validate-design/SKILL.md` → ≥1
  - PR-5: `grep -c 'Final assessment' skills/validate-design/SKILL.md` → 0
  - PI-2: `grep -c 'from Step 1' skills/validate-impl/SKILL.md skills/validate-requirements/SKILL.md` → present
  - PI-3: `grep -c 'append-only' skills/validate-gap/SKILL.md` → ≥1
  - Battery + census + validate green
- [ ] **Step 3: STOP** — user reviews and commits.

### Task 6: Twin-verification battery + final run

**Files:** No repo file changes unless a battery line belongs in CLAUDE.md's Verification section — add the twin checks there (2 lines, scoping as §10 does); run everything.

**Steps:**
- [ ] **Step 1: Add twin checks to CLAUDE.md Verification** — after the existing invariant sentence: "Twin checks (Revision 9): the GP-1 resolution opening and the RS-1 FORK sentence each appear exactly 6 times in skills/; the approve-gate twin blocks in spec-requirements/spec-design are slot-substitution-identical; deleted delegation sentences return zero hits."
- [ ] **Step 2: Full battery run** (existing §10.2 + conventions + the four §4 additions from the spec) — all green, record verbatim: twin counts 6/6; paired gate diff identical; delegation-absence greps 0 (`only git you run`, Hard-rule-1 role sentence forms, `Do not run the next command yourself`); census 15/6; map pins; `claude plugin validate .` passes.
- [ ] **Step 3: Cross-check vs walk decisions** — the usage-index WALK DECISIONS blocks correspond 1:1 to tree state (spot-read 8 items: one per category).
- [ ] **Step 4: STOP** — final user review and commit.

## Execution Order

1 → 2 → 3 → 4 → 5 → 6 (deletions shrink first; twins insert into cleaned files; battery pins last).

## Self-Review

- Spec coverage: §3.1→Task 2; §3.2→Task 3 (absorbs GP-9); §3.3→Tasks 1+4; §3.4→Task 5; §3.5→no-op (verified by Tasks' keeps); §4→Task 6; §5 guards→Global Constraints; §6-7→Task 6 + per-task verifies. No gaps.
- Placeholders: none (locations exact; canonical texts sourced from named lines).
- Consistency: twin counts (6) used identically in Tasks 2/6; slots {phase}{document}{next-command}{validator} defined once (Task 3) and reused in Task 6's paired check; deletion sentence-forms named once (Task 1) and re-grepped in Task 6.
- Review Focus: each line pinned (erosion→T6 counts; slot leak→T3 diff; over-deletion→T1 ceiling/usage greps; orphaning→T4 test -f; map breach→T4 pins).
