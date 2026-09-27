# prompt-builder skill 0.3.0 update — design

Date: 2026-09-27
Status: approved design (brainstorming session; tracker bean `cc-sdd-fvuj`)
Scope: `.claude/skills/prompt-builder/` in this repository, plus a test suite and
one root `package.json` script.

## Context

The `prompt-builder` skill was written against `@kasava/prompt-builder` 0.2.2
(copied from the my-cv project). The repository now depends on 0.3.0 — a
"prompt ORM" release that keeps the entire 0.2.2 fluent surface
(source-compatible) and adds a schema layer, a template tag, combinators,
output dialects, token budgets, and two subpath exports. A deep comparison of
the two versions (recorded in bean `cc-sdd-fvuj` §Report) found:

- Four factually stale claims in the current skill (empty-rows `lookupTable`
  exception, no-arg-only `build()`, `include()` without `Fragment`, no mention
  of `|`-escaping in table cells).
- Six subsystems of the library completely untaught (schema/render, `p`,
  combinators, dialects/messages+cache, budget, `/presets` + `/zod`).
- Five methods the skill teaches as primary are now deprecated shims
  (removal at 1.0).

The library's own `PLAN-0.3.0.md` and README define the canonical framing:
fluent builder as foundation, schema layer "when a prompt needs runtime data".

## Goal

Rewrite the skill to fully cover every usage pattern of
`@kasava/prompt-builder` 0.3.0, factually accurate against the installed
package, with mechanically verified examples.

### Non-goals

- No project-specific usage context. The skill is library-focused and
  project-agnostic: nothing about Claude Code skills, MD-file generation, or
  any particular consumer project. (Explicit user decision during review.)
- No opinion locking: the skill does not prescribe one canonical usage path;
  architecture choice stays with the reader, per project.
- No changes to the library itself; no version string inside the skill text
  (the dependency in `package.json` pins the version implicitly).

## Decisions (from the brainstorming session)

| # | Decision |
|---|---|
| D1 | Framing: a complete, neutral map of 0.3.0 plus a separate architectures reference (menu of usage architectures with trade-offs). No single canonical path. |
| D2 | Examples are mechanically verified: a bun test suite executes the skill's code examples against the installed package (drift doc↔API becomes visible). Written using the `bun-test` skill. |
| D3 | File structure "module mirror": new API reference files mirror the library's `src/` modules; each file < ~20K; existing four reference files are updated in place. |
| D4 | SKILL.md frontmatter `description` stays as-is (no version, no feature enumeration). |
| D5 | `architectures.md` covers exactly four library-usage architectures; no external-context scenarios. |

## File-by-file design

### SKILL.md (router)

- Frontmatter unchanged (D4).
- Workflow: 1) Analyze — prompt kind plus four routing questions (runtime
  data? repeated renders? non-markdown output? token budget?); 2) Select
  architecture → `architectures.md`; 3) Build → the matching API file;
  4) Review → best-practices + anti-patterns.
- Routing table "need → file": fluent method → `api-fluent.md`; variables /
  templates / render → `api-schema.md`; dialects / cache / budget / AST →
  `api-output.md`; how to structure prompt code → `architectures.md`;
  pattern by prompt type → `patterns.md`; copy-paste starter → `examples.md`.
- Quick Reference: preset-family rows (`toolGuidance`, `workedExample(s)`,
  `gracefulDegradation`, `followThroughMatrix`, `analysisRequirements`) gain a
  "/presets + `.include()`; class shim deprecated until 1.0" marker; new rows
  for `definePrompt`+`.render()`, `p`/`placeholder()`,
  `when/unless/all/any/each`, `toMessages()`+`.cacheBoundary()`, `.$budget()`,
  each pointing at its file.
- Key Rules: existing rules stay; "pure builders" extends to `.render()`
  (still no I/O inside builders); new rules: `p` is composition and value
  serialization, NOT an injection defense; `$budget()` returns a new builder
  (no mutation); 0.3.0 output is the corrected format (pipe-escaping, empty
  `lookupTable` skips) — pre-0.3 bytes require `markdown({strict: true})`.

### references/api-fluent.md (rename of api-reference.md)

Structure preserved; corrections:

- `lookupTable`: remove the "does NOT skip on empty rows" exception — it now
  skips, matching `table()`; per-method "changed in 0.3.0" marker.
- Table methods: `|` in cells is escaped (0.2.x silently corrupted tables).
- `build(dialect?)` — default is corrected markdown; `markdown({strict:true})`
  reproduces pre-0.3.0 bytes.
- `include()` accepts `PromptBuilder | Fragment | string`; splices the child's
  AST nodes (still a snapshot at call time).
- Per-method markers for the formatting corrections: `section`/`field`
  unified (`**T:** v`), `filesList` pluralization, empty `keyValues`/
  `limitedList` skip, `separator` normalized, `severityScale` single list
  node, `workedExamples` tight XML.
- Deprecated section gains the five preset shims with the `/presets` pointer.
- `outputFormat`: unchanged (implementation verified byte-identical between
  versions); the flat-fields limitation note stays.

### references/api-schema.md (new — mirrors schema/template/combinators/prepared)

- `definePrompt(name, vars)`; var builders `text()/num()/list()/bool()/json<T>()`
  with `.notNull()/.default()/$type()`; `$inferVars` (required/optional split
  inferred, never hand-written).
- `.body(v => …)`, `.render(vars)` (`MissingVarError` on missing required),
  `.toAST(vars)`, `.prepare() → PreparedPrompt.render()` (`MissingParamError`
  for unbound placeholders).
- The `p` tag: interpolation rules table (string/number/boolean serialized;
  arrays comma-join; objects JSON; nullish → empty; `Fragment`/
  `PromptBuilder` inline; `p.raw()` verbatim; `placeholder()` param slot);
  `p.join`, `p.empty`; multi-line dedent behavior; warning box: `p` is not an
  injection defense.
- Combinators `when/unless/all/any/each` (empty results dropped outright);
  relationship to the retained `.conditional()`.

### references/api-output.md (new — mirrors dialects/budget/zod/presets)

- Dialects: `markdown()` (default, corrected), `markdown({strict: true})`,
  `xml({sectionTags})`, custom `Dialect` interface (`name`/`renderNode`/`join`).
- `build(dialect)`, `toPrompt() → {text, params}`, `toAST() → Node[]`,
  `.node()` (AST escape hatch), node-kind overview, `walk()`.
- `toMessages()` → `ChatMessage[]` with `cache_control`; `MessagesOptions`
  (`role`, `dialect`, `cacheControl`); `.cacheBoundary()` placement guidance
  (stable prefix first, volatile content last).
- Budget: `.priority()`, `.$budget({maxTokens, counter, dialect})` — returns
  a new builder; `approximateTokens` default counter; `BudgetExceededError`
  (`required` nodes are never dropped).
- `/presets` subpath: the six generator functions + `.include()` composition.
- `/zod` subpath: `createVarsSchema` with per-variable typed refinements;
  note that zod is an optional peer dependency the human installs.

### references/architectures.md (new)

Four library-usage architectures, one record format each
(When / How (minimal code) / Pros / Cons / How to test), explicitly framed as
a combinable menu, not a hierarchy:

1. Static builder functions — `buildX(data): string | PromptBuilder`.
2. Schema templates — `definePrompt` + `.body(v)` + `.render(vars)`.
3. Prepared prompts — `.prepare()` for repeated renders of a compiled skeleton.
4. AST pipelines — `toAST()/walk()/.node()/$budget` for introspection,
   trimming, custom rendering.

Closing: a decision-criteria table (runtime data? repeated renders? cache
boundaries? introspection? number of consumers?) mapping to a starting point,
explicitly "a starting point, not a prescription".

### references/patterns.md (update)

Existing eight patterns stay (checked against 0.3.0). Added: runtime-data
prompt (schema template), repeated render (prepare), multi-target output
(markdown + messages), budget-constrained prompt (priority + `$budget`).
The conditional/dynamic pattern gains a combinator-based variant alongside
`.conditional()`. The method×pattern matrix gains the new surface. Preset
methods point to `/presets`.

### references/best-practices.md (update)

Structure and most rules stay. Added: `p` is not an injection defense
(Safety); budgeting in Token Efficiency (`priority`/`$budget`/
`approximateTokens`); `cacheBoundary` placement; Testability extended with
render-time snapshots and the strict-vs-corrected output distinction.

### references/anti-patterns.md (update)

Remove the stale empty-rows `lookupTable` exception; update the
passing-empty-arrays section accordingly. New anti-patterns: treating `p`
interpolation as an injection defense; expecting `$budget()` to mutate;
writing new code on deprecated preset shims; relying on pre-0.3 byte-exact
output without `markdown({strict: true})`.

### references/examples.md (update)

Existing eight examples stay. Added, one each: schema template, prepared,
combinators, `toMessages()` + `cacheBoundary()`, budget. Every example is
self-contained and runnable (imports included) — they feed the test suite.
No project-context examples.

### tests/ (new, inside the skill folder)

- Extraction runner (modeled on the library's own `test/readme.test.ts`):
  pulls fenced ```` ```ts ```` blocks from SKILL.md and all references/,
  executes each as an ESM module against the installed package. Non-runnable
  fragments are marked ```` ```ts fragment ```` and skipped.
- Selected canonical outputs get snapshot tests (second tier).
- Run with `bun test .claude/skills/prompt-builder/tests/`; add a root
  `package.json` script `"test"` pointing there.
- MUST be written using the `bun-test` skill.

## Verification

1. `bun test` — extraction runner green over all example blocks.
2. Snapshot review on first run (outputs recorded deliberately).
3. Manual read-through: routing table resolves every need; no stale claims
   remain (grep for the four known-stale phrases must return zero hits).
4. `claude plugin validate .` unaffected (skill is project-local, not plugin
   payload; run anyway since CLAUDE.md §Verification requires it after
   content changes — this skill is outside `plugins/sdd/`, so the battery
   does not apply, but validate is cheap).

## Migration notes

- `api-reference.md` → `api-fluent.md` is a rename with edits; links in
  SKILL.md and cross-references in other reference files update accordingly.
- The old copy in the my-cv project is untouched (that project stays on
  0.2.2 with its matching old skill).

## Out of scope

- Library changes, version bumps, dependency installs (zod included).
- Any Claude-Code-skill-generation or MD-generation content (D5).
- Updating the my-cv copy of the skill.
