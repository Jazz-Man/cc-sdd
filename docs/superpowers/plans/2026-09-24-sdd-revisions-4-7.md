# sdd Revisions 4–7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.
> STOP steps replace commits (git read-only for agents; the user reviews and commits).
> Beans tracks the work; task briefs/reports live in bean bodies per Revision 7.

**Goal:** Implement spec Revisions 4–7 + follow-ups: beans-only tasks, phase gates,
validation gates, workspace migration, cleanups — bringing the plugin from v0.1.0 to
its second edition.

**Architecture:** Five dependency-ordered waves (A cleanup → B tasks-in-beans+phase
gates → C validation gates → D workspace migration → E docs+final battery). Each wave
ends STOPped for user review/commit; battery items of each wave must pass before the
next starts.

**Spec:** docs/superpowers/specs/2026-09-22-sdd-plugin-conversion-design.md — base +
Revisions 4–7 + §8.1 contract grammar (authoritative). Work-item cross-ref: beans
`cc-sdd-wgk2` (28 items) and `cc-sdd-73kb` (10 items).

**E2E:** runs AFTER this wave, on the final form (the pre-revision plugin is
superseded; testing it wastes a cycle). The old runbook gets a Rev-4-7 addendum at
Wave E.

## Global Constraints

- Git read-only for agents; STOP per task; the user commits.
- Models: implementer sonnet (opus for design-bearing prose tasks), reviewer opus,
  fix rounds 4-5 opus.
- Contract grammar §8.1 is law: `- FIELD: VALUE` lines, exact enums, stable body
  section headers (`## Brief/Report/Notes/Validation/Parking lot`), lowercase-hyphen
  mirror tags.
- beans v0.4.2 traps (all prose-enforced): search phrases ALWAYS quoted; never
  `--ready` for gating; etags on concurrent-capable paths; status changes CLI-only
  (GraphQL corrupts); tags lowercase-hyphen only.
- Untouchable: `.zed/`, `.github/workflows/`, `skills/steering/` (verbatim port —
  its allowed-tools stays), `assets/design-system_flow.png`.
- Every verify step runs the full battery scope incl. bin/ and the §10.2 convention
  invariants.

## Review Focus

1. Unquoted colon search phrases silently returning [] → all skill texts quote.
2. Hash recorded before validator fixes (self-invalidating) → hash at GO, after fixes.
3. Mirror-tag/verdict-line drift (dual-write missing one side) → battery greps both.
4. Stale base references surviving rewrites (tasks.md, brief/report files, 14-count)
   → battery zero-hits.
5. Phase gates bypassed (draft auto-selected, impl without validated phases) →
   Step-0 checks tested by grep presence + dry-run.

---

### Task A1: allowed-tools strip + dead assets + nits (73kb #2-9)

**Files:** all 13 sdd-native SKILL.md (frontmatter only); rm
`assets/templates/requirements-init.md`, `assets/rules/tasks-parallel-analysis.md`,
`assets/rules/steering-principles.md`; skills/spec-tasks (prohibition line);
skills/impl (~:87 example + blockedByIds); skills/validate-impl (-i flag, ~:115
fallback phrasing); skills/verify-completion (~:22 garbled sentence); 6 skills'
steering re-read lines (spec-design:68, spec-requirements:60+146, discovery:63,
validate-design:69, validate-gap:68, validate-impl:113).

**Steps:** strip `allowed-tools` lines from the 13 (steering keeps its verbatim
copy); delete the three dead files; drop the tasks-parallel-analysis prohibition
sentence; apply the four nit fixes; replace the 7 steering-read lines with the
apply-don't-reread one-liner.
**Verify:** `grep -rn 'allowed-tools' skills/ | grep -v steering` → empty; the three
files gone; `grep -rn 'tasks-parallel-analysis' skills/` → empty; battery clean.
**STOP.**

### Task B1: spec-init — phase beans (wgk2 #8)

**Files:** skills/spec-init/SKILL.md
**Steps:** after epic creation, create exactly three phase beans — `beans create
"Phase — requirements|design|tasks" -t task -s todo --tag phase --parent <epic>`
with the blocked-by chain (design←requirements, tasks←design) using update
`--blocked-by`; bodies note their phase name.
**Verify:** `grep -c 'tag phase' skills/spec-init/SKILL.md` ≥3; chain instructions
present. **STOP.**

### Task B2: spec-tasks rewrite — bean-only generator (wgk2 #1, #10)

**Files:** skills/spec-tasks/SKILL.md; rm assets/templates/tasks.md (dies here, not
in A — spec-tasks references it until rewritten).
**Steps:** fork reads requirements+design+tasks-generation rule → creates task beans
born `-s draft` (bodies: `## Brief` with number/title/description/detail bullets
incl. observable completion, `_Requirements:`, `_Boundary:`; deps via update
`--blocked-by`); re-sync preserves statuses, never resets todo/in-progress, numbering
discipline; approve gate = approve-all or selective promotion draft→todo via CLI;
Return contract per §8.1; completes the tasks phase bean ONLY via the
approve/promotion gate (no validator — Rev 6 scoping).
**Verify:** zero `tasks.md` references; `draft` creation + promotion present; `##
Brief` header in templates of bodies. **STOP.**

### Task B3: phase gates in spec-requirements + spec-design (wgk2 #9)

**Files:** both SKILL.md
**Steps:** start-gate: previous phase bean completed else stop naming the command;
after confirm-approve → `beans update <own-phase> -s completed`; re-entering a
completed phase → escalation AskUserQuestion (reopen downstream / accept risk /
cancel). spec-requirements' drafter summary gains the AMBIGUITY contract (§8.1 #12
already there — verify wording).
**Verify:** gate + completion + escalation instructions greppable in both.
**STOP.**

### Task B4: impl — briefs from beans, three-phase gate (wgk2 #2, #11)

**Files:** skills/impl/SKILL.md + templates/implementer-prompt.md
**Steps:** Step 0 gate = all three phase beans completed (+validated per Task C2)
else stop with named commands; task resolution = first `todo` task bean (draft never
auto-selected); brief = the bean's `## Brief` section; dispatch carries the task-bean
id + path patterns (subagent reads the bean itself via CLI); no brief files.
**Verify:** zero task-N-brief references; three-phase + draft-not-actionable
greppable. **STOP.**

### Task C1: validate-requirements — 15th skill (wgk2 #14)

**Files:** new skills/validate-requirements/SKILL.md (+ workflow-map/README rows in
E; CLAUDE.md layout row here)
**Steps:** generative fork (context:fork, background:false, model:opus); EARS
format, completeness, contradictions, steering alignment (apply-in-context — no
re-reads); evidence-based verdicts per §8.1; writes findings to
`.sdd/specs/<feature>/workspace/validation-requirements.md` (>100-line rule) with a
pointer line into the requirements phase bean body.
**Verify:** fork frontmatter 3/3; `ls skills | wc -l` = 15. **STOP.**

### Task C2: confirm-gate auto-validation + doc-hash (wgk2 #15-18)

**Files:** skills/spec-requirements, skills/spec-design (gate rework); both
validators' SKILL.md (fix-boundary + fixes-listed + hash-at-GO contracts)
**Steps:** "approve" auto-dispatches the phase validator FIRST; GO → set tag
`validated` on the phase bean + append `## Validation` round (date, verdict,
`Doc-hash:` = sha256 of the doc computed AFTER validator fixes, at GO) → then phase
completed; NO-GO → four-part escalation, phase stays open; validator auto-fixes only
zero-semantics items, every fix listed; stale hash at any later gate = escalation.
impl Step 0 adds the freshness check (Task B4 hook point).
**Verify:** validated/Doc-hash/hash-after-fixes/stale-escalate greppable; impl Step
0 references both tag and hash. **STOP.**

### Task D1: task-bean lifecycle sections + verdict dual-write (wgk2 #21-22)

**Files:** skills/impl/SKILL.md + all five templates
**Steps:** implementer appends `## Report` to the task bean + returns the contract;
debugger/reviewer outcomes flip single lines (`## Validation` rounds); notes = `##
Notes` appends; every §8.1 verdict line written ALSO as a mirror tag (update --tag);
review package stays a file with verdict block + one-line pointer in the bean.
**Verify:** section headers + mirror-tag dual-write in templates; zero report-file
references. **STOP.**

### Task D2: bin/ helpers (wgk2 #25)

**Files:** bin/sdd-gate, bin/sdd-verdict, bin/sdd-promote (shell, executable)
**Steps:** sdd-gate `<epic>` exits 0 iff three phases completed+validated+hash-fresh
(beans CLI + shasum; quoted searches); sdd-verdict `<bean> [field]` prints the
authoritative line; sdd-promote `<epic> [--all|ids...]` draft→todo. Each tiny, one
responsibility, `set -eu`; skills call them instead of inline trap-prone commands.
**Verify:** run each against the scratch-lab fixtures (create epic+phases+tasks,
exercise all three, verify exit codes + outputs). **STOP.**

### Task D3: safety prose sweep (wgk2 #26)

**Files:** all skills + templates
**Steps:** every search phrase quoted; no `--ready`; etag note on concurrent paths;
CLI-only statuses; apply-don't-reread steering (from A1, verify).
**Verify:** `grep -rn '\-\-ready' skills/ bin/` empty; `grep -rn 'filter.search\|beans
list -S' skills/` shows quoted forms only. **STOP.**

### Task E1: docs + final battery (wgk2 #19, 27-28; CLAUDE.md fixes)

**Files:** assets/workflow-map.md, README.md, docs/guides/*, CLAUDE.md, runbook
addendum
**Steps:** map/README/guides to the new flow (15 skills, phase gates, validation,
beans bodies, bin/); CLAUDE.md: author-warning line out, battery list updated,
marketplace validate-behavior note; runbook gets the post-Revision additions (spec
§10.5 note already lists them — mirror it).
**Verify:** full battery (§10.2 incl. conventions + bin/) zero; `claude plugin
validate .` clean; 15-name probe; docs greps. **STOP — wave complete.**

## Execution Order

A1 → B1 → B2 → B3 → B4 → C1 → C2 → D1 → D2 → D3 → E1. E2E walkthrough (updated
runbook) after E1 user commit. Then: umbrella cc-sdd-uwj4 closure, wgk2/73kb
completed, rulings list, branch to user's merge.

## Self-Review

- Spec coverage: Rev4=B2/B4, Rev5=B1/B3/B4+escalation, Rev6=C1/C2+scope-fix,
  Rev7=D1-D3+two-tier, annex traps=D2/D3, 73kb=A1, docs=E1. Gaps: none found.
- B1-blocking resolved in spec before this plan (validator scoped reqs/design).
- Grammar §8.1 single-sourced; plan references it, never redefines.
- Wave battery-pass gating prevents the review-hostile single-commit the spec
  reviewer flagged (E5 adopted).
