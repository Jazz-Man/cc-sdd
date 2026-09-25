# Design Spec: Content Normalization — sdd Plugin Skills (Revision 9)

- **Date:** 2026-09-25
- **Status:** awaiting user review
- **Method:** usage-index walk (user-led, 37 knowledge-items in 8 categories; index at
  `.superpowers/usage-index.md` with per-item decisions recorded in WALK DECISIONS blocks)
- **Authority:** the walk decisions are binding for this spec; the global rules
  (git-readonly, no-deps, kiss-dry-yagni, no-workarounds, principles) own everything
  delegated upward

## 1. Goal

Eliminate cross-skill knowledge duplication and wording drift in the sdd plugin's
15 skills + 5 templates + workflow-map + assets, per the normalization model that
emerged from the index walk. No new indirection files; no behavior changes —
text consolidation and drift repair only.

## 2. The emerged model

Four mechanisms, zero new files:

1. **Canonical twins** — identical text replicated wherever fresh-context readers
   need it. Drift prevented mechanically (battery counts exact copies).
2. **Parameterized twins** — identical core text with per-phase slots, in the two
   phase skills. Verified by paired diff.
3. **Delegation upward** — copies deleted where an owner above already covers the
   knowledge (global constitutions, workflow-map, named asset files).
4. **Per-reader instantiation kept** — the healthy majority: each copy stays
   because its reader (main/fork/dispatched/human) needs it in-context, with
   role-specific content that is variation, not duplication.

## 3. Change inventory (binding, from the walk)

### 3.1 Canonical twins (exact text, N copies)

| Item | Canonical text (source of wording) | Copies |
|---|---|---|
| GP-1 active-feature resolution (fork half) | spec-design:47–57 block as-is | spec-design, spec-tasks, validate-design, validate-gap, validate-impl, validate-requirements — 6 identical |
| RS-1 FORK identity line | "You are a FORK: a fresh subagent with no conversation history. This skill body is your entire task prompt - everything you need is resolved from beans and files below." | same 6 forks; validate-impl regains the full second sentence (its Entry-paths section stays as-is) |

Inline copies (impl, spec-requirements) of GP-1 stay richer — they are operational
algorithms, not duplicates of the map policy.

### 3.2 Parameterized twin (one pair)

GP-5 + GP-6 + GP-8 approve-gate mechanics in spec-requirements Phase 3 ↔
spec-design Return contract: identical block with slots
`{phase-name} {document} {next-command} {validator-skill}`. The block covers:
validator-first dispatch, GO sequence (tag → shasum-at-GO → `## Validation` round
with `Doc-hash:` → `-s completed`), NO_GO four-part + phase-stays-open, BLOCKED
handling (absorbing the GP-9 merge — spec-design's BLOCKED bullet+footer collapse
into the twin), latest-`Doc-hash:`-wins clause, legacy-heal note.

### 3.3 Deletions & upward delegations (deletes, or rewords into a pointer/compression whose owner sits above)

| Item | Deleted from | Owner |
|---|---|---|
| RS-4 role+git halves | ALL skills' Hard-rules-1 role sentences + ALL 5 templates' "Read-only git … only git you run" sentences | global git-readonly constitution + map Interaction line |
| RS-4 Bash ceilings | — NOT deleted; per-skill operational scopes stay (init narrowest … impl broadest) | each skill |
| RS-5 rule-sentence | "Do not run the next command yourself; the user drives…" from init/spec-init/discovery closes | map Phase-flow line |
| GP-2 skill copies | spec-design:182,185 + spec-tasks:137,141–142 loop restatements → one pointer line each: "Review gate: apply `${CLAUDE_PLUGIN_ROOT}/assets/rules/<gate>.md` — bounded at 2 repair passes." | the 3 gate asset files |
| O-2 EARS enumeration | templates/requirements.md numbered pattern list → section headers + "Patterns: `assets/rules/ears-format.md`" pointer | ears-format.md |
| GP-7 validator presenter-hints | validate-requirements:231–235, validate-design:206–210 escalation-shape restatements → "Present the four-part escalation (impl Step 9 shape) with payload <findings>." | impl Step 9 verbatim template |
| GP-7 map options drift | map:39 escalation options reworded to impl's canonical set ("accept as-is / fix now / change the plan / abort") — net-zero line count | map line stays canonical summary |
| GP-12 validate-impl budget line | validate-impl:252 → "The orchestrator owns all loop budgets." | impl Steps 5/6/FF |

### 3.4 Drift-fix package (wording alignments; no structural change)

1. PC-1 caller-side parse discipline → fullest form (impl:273–277 wording) in
   spec-requirements:213–216 (add "ambiguous") and spec-design:237–239 (add prose case)
2. G-4: RED-evidence field name unified (one spelling across templates/review)
3. MP-1: "pinned"/"hardwired" → "pinned" everywhere prose uses either
4. O-4: validate-design:136 boundary doctrine regains "Revalidation Triggers"
5. O-6: re-review:26 compression → full precedence sentence
6. PR-5: "Final assessment" → "Verdict" (validate-design:174)
7. PI-2: "from Step 1" anchor restored in validate-impl:99, validate-requirements:75
8. PI-3: validate-gap:104 gains the term "append-only"
9. PR-2: skill-reference table row texts aligned to map row texts (backticks allowed)
10. SR-2: "any document" → "documents" unified
11. SR-4 template input one-liners → "paths, ids, and Glob patterns — never contents" form
12. GP-1 inline drifts (impl/spec-requirements/spec-tasks/validate-impl forks) → canonical fork text where fork; inline variants keep their richer semantics but align terminology
13. GP-3: spec-tasks "Never re-sync an approved plan silently" — keep (correct instantiation); no change beyond twin terminology alignment
14. discovery:26 mkdir question → resolve by reading the file; align to its true family
15. GP-10/PC-6 parking-lot destinations (task vs epic) — verified correct per role; align surrounding wording only

### 3.5 Explicitly kept (no change beyond 3.4 alignments)

GP-3, GP-4, GP-10, GP-11, GP-13, GP-14, GP-15; RS-2, RS-3; SR-1…SR-6;
PR-1…PR-5; PI-1…PI-5; PC-2…PC-8; G-1, G-2, G-3 (per KDY-whitelist #5:
point-of-risk restatement, canonical owner = global no-workarounds); MP-1
structure; O-1, O-3, O-5, O-6, O-7.

## 4. Twin verification (how twins stay twins)

Battery additions (extend §10.2 convention set):

1. **GP-1 twin count**: the canonical resolution opening
   ("Query beans: `beans list --json -t epic -s in-progress`. Exactly one")
   appears exactly 6 times in skills/ (once per fork family file).
2. **RS-1 twin count**: the FORK identity sentence appears exactly 6 times.
3. **Approve-gate twin diff**: spec-requirements and spec-design gate blocks are
   identical after slot substitution — verified by a script comparing the two
   blocks with the four slots normalized (or a grep checklist of 6 anchor lines
   present in both).
4. **Delegation absence**: the deleted sentences return zero hits
   ("only git you run", "The user reviews and commits." as a Hard-rule-1 sentence,
   "Do not run the next command yourself", templates' git sentence).
5. Existing battery (placeholders/kiro/checkbox/git-write/beans-dup/conventions)
   must stay green throughout.

## 5. Scope guards

- No behavior changes: every gate, contract, budget, and parse surface keeps its
  semantics; only text distribution and wording change.
- No new files anywhere (the walk rejected indirection files).
- Map stays 60 lines, wrappers intact (strip-coupling pin); only the escalation
  options rewording touches it (net-zero).
- skills/steering/** untouched (verbatim port).
- Read-only git USES (diff/status/log/merge-base in impl flows) untouched —
  RS-4 deletes prohibition SENTENCES, not usage instructions.

## 6. Testing

Prompt-only plugin: verification is the battery (§4) plus
`claude plugin validate .` plus fork-count/skills census (6/15). Each execution
task runs the full battery before STOP; the wave's final task re-runs everything
and the twin checks become permanent battery members.

## 7. Success criteria

1. All §3 changes landed; walk-decision table fully enacted.
2. §4 battery additions green and added to the standing battery.
3. Existing battery green; validate passes; 15 skills; 6 forks; map pins intact.
4. The usage-index WALK DECISIONS blocks correspond 1:1 to the tree state.
