# prompt-builder skill 0.3.0 update — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `.claude/skills/prompt-builder/` to fully cover every usage pattern of `@kasava/prompt-builder` 0.3.0, with mechanically executed examples.

**Architecture:** Neutral map (no canonical path) + module-mirror API references (`api-fluent.md`, `api-schema.md`, `api-output.md`) + `architectures.md` menu of four library-only usage architectures. An extraction test runner executes every runnable ```` ```ts ```` block in the skill against the installed package, so doc↔API drift fails CI-style.

**Tech Stack:** Markdown skill files; Bun's built-in test runner (`bun test`, written via the `bun-test` skill); tsgo LSP for verification. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-27-prompt-builder-skill-030-update-design.md` — the plan argues from it; executors read both.

## Global Constraints

- Agents never write to git. Every "Commit" step below is a **user-run stop point** — the implementing agent stages nothing and runs no git command; it presents what changed and the user runs the listed command.
- No dependency installs, ever (user's `no-deps` rule). zod is NOT installed → `/zod` examples are ```` ```ts fragment ```` and the runner never imports `@kasava/prompt-builder/zod`.
- The skill text never claims a library version. Behavior-difference markers say "0.2.x" (the old behavior), never "0.3.0" as the skill's version. `grep -rn '0\.3\.0' .claude/skills/prompt-builder/` must return zero hits at every commit point from Task 6 on.
- Library-only content: nothing about Claude Code, skill generation, MD generation, or any consumer project (spec non-goals).
- SKILL.md frontmatter `description` stays byte-identical to today's.
- Code-block fence conventions (the runner's contract): ```` ```ts ```` or ```` ```typescript ```` = self-contained, top-level-executes-cleanly, imports included; ```` ```ts fragment ```` / ```` ```typescript fragment ```` = skipped fragment. No other fence language carries example code.
- Test files are written with the `bun-test` skill loaded (spec D2).
- Beans is the tracker: task progress goes into bean `cc-sdd-fvuj` (append-only `## Report`/`## Notes`), never TodoWrite, never checkboxes in the skill files.
- KISS / DRY / YAGNI govern the content edits: each rule or fact has ONE canonical home in the skill — the file that owns it; other files carry one-line pointers ("see api-schema.md §The p tag"), not restatements. Sanctioned exception: the `p`-is-not-injection-defense warning may appear as a single sentence at each point of risk (api-schema, best-practices, anti-patterns), the canonical wording living in api-schema. Nothing speculative: no content for unshipped versions (prompt-kit) or imagined futures. Never silence a failing check to finish a task — surface it (no-workarounds).

## Review Focus

1. **A code example that doesn't compile against 0.3.0** (renamed/removed API silently drifting into docs) — pinned by Task 1: the runner executes EVERY non-fragment block; its `runnable.length > 0` + per-block tests fail on any import/runtime error.
2. **A `/zod` example imported by the runner without zod installed** (false red) — pinned by Task 1's fragment-skip unit test and Task 4's rule that the zod section uses ONLY `ts fragment` fences.
3. **`p` presented as injection defense** (the library's own most-warned misconception) — pinned by Task 12's grep: `grep -rn "injection" .claude/skills/prompt-builder/` must hit the warning lines in `api-schema.md` AND `best-practices.md` AND `anti-patterns.md`.
4. **The four known-stale claims surviving the rewrite** — pinned by Task 12's zero-hit greps (exact phrases below).
5. **Snapshots asserting prose instead of real output** (expectations typed from memory, not from executed output) — pinned by Task 11's explicit step: run first, READ actual output, only then freeze `expect`; structural assertions (`toContain`, shape, length comparison) over full-string equality wherever exact bytes weren't verified in this plan.

---

### Task 1: Extraction test harness

**Files:**
- Create: `tests/helpers/extract.ts`
- Create: `tests/extract.test.ts`
- Create: `tests/examples-run.test.ts`
- Modify: `.claude/skills/prompt-builder/SKILL.md`, `references/*.md` (re-tag non-runnable blocks as `fragment`)

**Interfaces:**
- Consumes: the skill's markdown files as they exist today.
- Produces: `extractBlocks(mdPath): ExampleBlock[]` and `skillMarkdownFiles(): string[]` (helpers/extract.ts); the runner contract of Global Constraints; command `bun test tests/` used by every later task.

- [ ] **Step 1: Write the failing extraction test**

```ts
// tests/extract.test.ts
import { describe, expect, test } from "bun:test";
import { extractBlocks } from "./helpers/extract";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("extractBlocks", () => {
  test("parses ts and typescript fences, flags fragments", () => {
    const dir = mkdtempSync(join(tmpdir(), "pb-extract-"));
    const md = join(dir, "fixture.md");
    writeFileSync(md, [
      "# T",
      "",
      "```ts",
      "console.log(1);",
      "```",
      "",
      "```typescript",
      "console.log(2);",
      "```",
      "",
      "```ts fragment",
      "prompt().anythingGoes();",
      "```",
      "",
      "```text",
      "not code",
      "```",
      "",
    ].join("\n"));
    const blocks = extractBlocks(md);
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toMatchObject({ index: 0, fragment: false });
    expect(blocks[1]).toMatchObject({ index: 1, fragment: false });
    expect(blocks[2]).toMatchObject({ index: 2, fragment: true });
    rmSync(dir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun test tests/extract.test.ts`
Expected: FAIL — cannot resolve `./helpers/extract`.

- [ ] **Step 3: Implement the helper**

```ts
// tests/helpers/extract.ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface ExampleBlock {
  file: string;      // repo-relative markdown path
  index: number;     // nth code block in the file
  code: string;
  fragment: boolean; // true → not runnable standalone, skip
}

const SKILL_DIR = join(import.meta.dir, "..");        // .../prompt-builder
const REPO_ROOT = join(SKILL_DIR, "..", "..", "..");  // repo root

export function skillMarkdownFiles(): string[] {
  const refs = join(SKILL_DIR, "references");
  return [
    join(SKILL_DIR, "SKILL.md"),
    ...readdirSync(refs)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .map((f) => join(refs, f)),
  ];
}

export function extractBlocks(mdPath: string): ExampleBlock[] {
  const text = readFileSync(mdPath, "utf8");
  const blocks: ExampleBlock[] = [];
  const re = /```(?:ts|typescript)( fragment)?\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    blocks.push({
      file: mdPath.slice(REPO_ROOT.length + 1),
      index: i++,
      code: m[2],
      fragment: m[1] !== undefined,
    });
  }
  return blocks;
}
```

- [ ] **Step 4: Run the extraction test**

Run: `bun test tests/extract.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the runner over the real skill files**

```ts
// tests/examples-run.test.ts
import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractBlocks, skillMarkdownFiles } from "./helpers/extract";

const runnable = skillMarkdownFiles()
  .flatMap(extractBlocks)
  .filter((b) => !b.fragment);

describe("skill examples execute against the installed library", () => {
  test("there are runnable examples to check", () => {
    expect(runnable.length).toBeGreaterThan(0);
  });

  for (const block of runnable) {
    test(`${block.file} block #${block.index} runs`, async () => {
      const dir = mkdtempSync(join(tmpdir(), "pb-skill-"));
      const file = join(dir, `b${block.index}.ts`);
      writeFileSync(file, block.code);
      try {
        await import(file);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }
});
```

- [ ] **Step 6: Re-tag today's non-runnable blocks, reach green**

Rule: a block stays runnable ONLY if it is self-contained (own imports, no undefined identifiers like `AnalyzerInput`, top level executes cleanly). In today's files that means: `references/examples.md` blocks that start with `export function` but lack a library import get ` fragment` added to their fence; every snippet in `api-reference.md`, `patterns.md`, `best-practices.md`, `anti-patterns.md` and the builder-shape block in `SKILL.md` (references `AnalyzerInput`) get ` fragment` too. (These tags mostly disappear again in Tasks 6–10 when content is rewritten.)

Run: `bun test tests/`
Expected: PASS (extraction test + at least one executed example from `examples.md` block #1 which already imports and defines everything).

- [ ] **Step 7: Commit (user-run stop point)**

```bash
git add tests/ .claude/skills/prompt-builder/SKILL.md .claude/skills/prompt-builder/references/ .beans/
git commit -m "Add example-extraction test harness to prompt-builder skill"
```

---

### Task 2: `references/api-fluent.md` — rename + corrections

**Files:**
- Create: `.claude/skills/prompt-builder/references/api-fluent.md` (content of `api-reference.md` with the corrections below)
- Delete: `.claude/skills/prompt-builder/references/api-reference.md`
- Modify: every file linking `api-reference.md` → `api-fluent.md` (mechanical replace across `SKILL.md`, `references/patterns.md`, `references/best-practices.md`, `references/anti-patterns.md`, `references/examples.md`)

**Interfaces:**
- Produces: the file name `api-fluent.md` that Task 6's routing table and all later cross-links use.

- [ ] **Step 1: Write the corrected file**

Copy today's `api-reference.md` as the base, then apply exactly these changes:

1. Title/lead: `# API Reference — Fluent Builder`; lead sentence: "Every method on `PromptBuilder`. All methods return `this` for chaining. `build(dialect?)` returns the final string."
2. `.lookupTable()`: replace the **Note** with: "**Skips when `rows` is empty**, matching `.table()` — no header-only table. (0.2.x emitted a header-only table; `markdown({ strict: true })` reproduces it.)"
3. Lists section, `.table()`/`.lookupTable()` note: add "Cell content is escaped — a `|` in a cell cannot break the row (0.2.x corrupted the table silently)."
4. `.section(title, content)` / `.field(label, value)`: both render `**Title:** value` — unified (0.2.x used two different formats).
5. Formatting Primitives: `.separator()` — "Horizontal rule (`---`), normalized spacing (0.2.x emitted excess blank lines)."
6. `.keyValues(pairs)` / `.limitedList(items, max, overflowMsg?)`: "Empty input pushes nothing (0.2.x left a stray blank line)."
7. `.filesList(title, files)`: "Counts are pluralized correctly (`1 file` / `2 files`; 0.2.x printed `1 files`)."
8. `.severityScale(...)`: keep the `###` note; add "renders as a single tight list (0.2.x left blank lines between bullets)."
9. `.workedExample(s)`: "XML wrapper is tight (0.2.x had blank lines between tag and content)." Add the deprecated pointer: canonical form is `/presets` + `.include()`; the class method is a deprecated shim until 1.0.
10. `.include(other: PromptBuilder | Fragment | string)`: update signature; keep the snapshot semantics note ("takes a snapshot of the source at call time"), add "splices the child's AST nodes, so the prompt stays walkable".
11. `.build(dialect?: Dialect): string`: "Defaults to corrected markdown. `markdown({ strict: true })` reproduces pre-0.3 bytes exactly."
12. Deprecated (No-ops) section: extend the list with the five preset shims — `.toolGuidance()`, `.gracefulDegradation()`, `.analysisRequirements()`, `.followThroughMatrix()`, `.workedExample()`/`.workedExamples()` — each with "→ import from `@kasava/prompt-builder/presets` and `.include()`; removed in 1.0".
13. `.outputFormat()`: keep as-is including the flat-fields limitation (verified byte-identical implementation).
14. Static Utilities: keep `PromptBuilder.truncate` / `PromptBuilder.formatLimitedList`.
15. Every code fence that is a real runnable example gets `ts` with imports; option-shape snippets stay `ts fragment`.

- [ ] **Step 2: Remove the old file and fix inbound links**

Delete `api-reference.md`; replace `api-reference.md` → `api-fluent.md` in all inbound links (files listed above).

- [ ] **Step 3: Run the harness**

Run: `bun test tests/`
Expected: PASS (runnable blocks unchanged or improved; any block made runnable in step 1.15 executes).

- [ ] **Step 4: Version-string check**

Run: `grep -rn '0\.3\.0' .claude/skills/prompt-builder/ || echo CLEAN`
Expected: CLEAN.

- [ ] **Step 5: Commit (user-run stop point)**

```bash
git add .claude/skills/prompt-builder/
git commit -m "Rename api-reference to api-fluent with 0.3.0 corrections"
```

---

### Task 3: `references/api-schema.md` — new

**Files:**
- Create: `.claude/skills/prompt-builder/references/api-schema.md`

**Interfaces:**
- Produces: the file name `api-schema.md` (Task 6 routing, Tasks 7/9/10 cross-links). Documents the exact exports: `definePrompt`, `text/num/list/bool/json`, `Var.notNull/default/$type`, `$inferVars`, `PromptSchema.body`, `PromptTemplate.render/toAST/prepare`, `PreparedPrompt.render/params`, `p`, `p.raw/p.empty/p.join`, `placeholder`, `when/unless/all/any/each`, `MissingVarError`, `MissingParamError`, `Fragment`.

- [ ] **Step 1: Write the file**

Sections (each: prose per the directives + the code block given, verbatim):

**§ Schema — declaring what a prompt needs.** `definePrompt(name, vars)`; var builders `text()/num()/list()/bool()/json<T>()`; modifiers `.notNull()` (required), `.default(v)` (fallback, makes optional), `.$type<U>()` (compile-time retype); `$inferVars` derives the render payload — required exactly when `.notNull()` and no `.default()`; never hand-write the payload type. Code:

```ts
import { definePrompt, text, num, list, bool, prompt, p, when } from "@kasava/prompt-builder";

const userContext = definePrompt("user_context", {
  userName: text().notNull(),
  activeShows: list().default([]),
  totalWatched: num().default(0),
  isMobile: bool().default(false),
});

const template = userContext.body((v) =>
  prompt()
    .tag("user_context", p`Active shows (${v.activeShows.length}): ${v.activeShows}`)
    .include(when(v.isMobile, "Keep replies short — this is a phone.")),
);

console.log(template.render({ userName: "Ada", activeShows: ["Severance", "Andor"] }));
```

State: `.body()` receives resolved vars — required and defaulted keys are guaranteed present, others are `T | undefined` so the check is forced by types.

**§ Rendering.** `.render(values, dialect?)` → string (default markdown); throws `MissingVarError` when a required variable is absent; `.toAST(values)` → resolved `Node[]`.

**§ Prepared prompts.** TWO different `prepare()` methods — do not mix them:
- `PromptTemplate.prepare(values, dialect?)` — binds schema values once, returns `PreparedPrompt` (for rendering one bound prompt to several dialects).
- `PromptBuilder.prepare(name?, dialect?)` — compiles the built AST; slots (`placeholder()`) stay dynamic. Code:

```ts
import { prompt, p, placeholder } from "@kasava/prompt-builder";

const greeting = prompt().include(p`Hello ${placeholder("name")}`);
const prepared = greeting.prepare("greeting_v1");

console.log(prepared.params);               // ["name"]
console.log(prepared.render({ name: "Ada" })); // "Hello Ada"
```

`.render(values)` on a prepared prompt throws `MissingParamError` for an unbound slot. Rationale: the AST walk happens once; repeated renders only fill slots.

**§ The `p` tag.** Interpolation rules table (copy exactly): string/number/boolean → stringified; array → comma-joined; object → JSON; null/undefined → empty string; `Fragment`/`PromptBuilder` → inlined; `p.raw(x)` → verbatim; `placeholder('name')` → slot filled at render. Multi-line templates are dedented (common indentation stripped; interpolated values keep their shape). `p.join(fragments, separator)`, `p.empty()`. Warning box (exact claim): "`p` provides composition and consistent value serialization — it is NOT an injection defense. Natural language has no grammar to escape out of; treat untrusted input accordingly." Code:

```ts
import { p } from "@kasava/prompt-builder";

const shows = ["Severance", "Andor"];
const fragment = p`
  Active shows (${shows.length}): ${shows}
  Ratio: ${0.62}
  Meta: ${{ kind: "static" }}
  Missing: ${undefined}
  Verbatim: ${p.raw("raw  text")}
`;

console.log(fragment.toString());
```

Note: `Fragment.toString()` throws if a placeholder is unresolved — render through a template/prepared prompt instead.

**§ Combinators.** `when(condition, content)`, `unless(condition, content)`, `all(...items)`, `any(...items)` (first entry that produces content — fallback chain), `each(items, (item, index) => Includable)`. All accept `PromptBuilder | Fragment | string | null | undefined | false`; empty results are dropped outright (unlike `.include()` of an empty builder, which leaves a legacy marker). `.conditional()` stays as the chained form. Code:

```ts
import { prompt, p, all, when, unless, each } from "@kasava/prompt-builder";

const BASE_RULES = prompt().guidelines(["Be direct."]);
const TOOL_SEARCH = prompt().heading("Tool Search", 2).raw("Prefer targeted keyword queries.");
const TOOL_CATALOG = prompt().heading("Tool Catalog", 2).raw("Full list below.");
const toolSearch = true;

console.log(
  all(
    BASE_RULES,
    when(toolSearch, TOOL_SEARCH),
    unless(toolSearch, TOOL_CATALOG),
    each(["alpha", "beta"], (name) => p`- ${name}`),
  ).build(),
);
```

- [ ] **Step 2: Run the harness**

Run: `bun test tests/`
Expected: PASS — the four new blocks above execute (they are self-contained with imports).

- [ ] **Step 3: Commit (user-run stop point)**

```bash
git add .claude/skills/prompt-builder/references/api-schema.md
git commit -m "Add api-schema reference (definePrompt, p tag, combinators, prepared)"
```

---

### Task 4: `references/api-output.md` — new

**Files:**
- Create: `.claude/skills/prompt-builder/references/api-output.md`

**Interfaces:**
- Produces: the file name `api-output.md` (Task 6 routing). Documents: `build(dialect)`, `markdown({strict})`, `xml({sectionTags})`, custom `Dialect` (`{ name, renderNode(node): string | null, join(blocks): string }`), `toMessages`/`MessagesOptions`/`ChatMessage`, `.cacheBoundary()`, `toAST()`, `toPrompt()` (`{ text, params, dialect }`), `.node()`, `.params()`, node-kind overview, `walk()`, `.priority(level)` (`'required' | 'high' | 'normal' | 'low'`), `.$budget({ maxTokens, counter?, dialect? })`, `approximateTokens`, `applyBudget`, `BudgetExceededError`, `/presets` functions, `/zod` `createVarsSchema(schema, refinements)`.

- [ ] **Step 1: Write the file**

Sections:

**§ Dialects.** `build(dialect?)` defaults to corrected markdown; `markdown({ strict: true })` reproduces pre-0.3 bytes (each intentional change records its old rendering on the node — the audit trail); `xml()` renders fields as elements, `{ sectionTags: true }` also converts headings to tags (off by default — structural rewrite); custom dialects implement `Dialect`. Code:

```ts
import { prompt, markdown, xml } from "@kasava/prompt-builder";

const b = prompt().field("Owner", "Ada").list(["alpha", "beta"]);

console.log(b.build());                 // markdown (corrected)
console.log(b.build(markdown({ strict: true }))); // pre-0.3 bytes
console.log(b.build(xml()));            // <owner>Ada</owner> + markdown list
```

**§ Chat messages + cache boundaries.** `toMessages(source, { role?, dialect?, cacheControl? })` → `ChatMessage[]` (`role: 'system' | 'user' | 'assistant'`, `content`, optional `cache_control: { type: 'ephemeral' }`); splits at `.cacheBoundary()` nodes; the marker lands on the block BEFORE each boundary; `cacheControl` defaults on. Guidance: provider caches match an exact prefix — keep the stable half byte-identical between requests, put volatile content after the boundary. Code:

```ts
import { prompt, toMessages } from "@kasava/prompt-builder";

const messages = toMessages(
  prompt()
    .include(prompt().guidelines(["Be direct."]))
    .cacheBoundary()
    .include(prompt().tag("request", "Score this listing")),
);

console.log(messages[0].cache_control); // { type: 'ephemeral' }
console.log(messages[1].cache_control); // undefined
```

**§ Inspection.** `.toAST()` → `Node[]`; `.toPrompt(dialect?)` → `{ text, params, dialect }` (the `.toSQL()` analogue); `.params()` → placeholder names; `.node(node)` pushes an arbitrary AST node (the escape hatch custom generators are built on); node kinds: `text, heading, list, table, code, field, tag, tagOpen, tagClose, rule, step, arrows, example, examples, placeholder slots inside template nodes, cacheBoundary, empty`; `walk()` visits nodes.

**§ Token budget.** `.priority(level)` sets the priority carried by subsequently pushed nodes (`'required' | 'high' | 'normal' | 'low'`); `.$budget(options)` **returns a NEW builder** — it never mutates; drops whole nodes (never truncates text mid-node) least-important-first, latest-first within a tier; `required` is never dropped — `BudgetExceededError` if it alone overflows; `counter` defaults to `approximateTokens` (~4 chars/token — a rule of thumb, pass a real tokenizer when the margin matters); `dialect` must match the final rendering. Code:

```ts
import { prompt } from "@kasava/prompt-builder";

const full = prompt()
  .priority("required")
  .include(prompt().guidelines(["Answer only from the context."]))
  .priority("low")
  .include(prompt().heading("Worked Examples", 2).raw("…long demonstration content…"));

const trimmed = full.$budget({ maxTokens: 30 });

console.log(full.build().length > trimmed.build().length); // true — low dropped
```

**§ `/presets` subpath.** The domain generators live at `@kasava/prompt-builder/presets`, each returns a `PromptBuilder`, composed with `.include()`: `toolGuidance(tools, title?)`, `gracefulDegradation(rules, title?)`, `followThroughMatrix({ title, description?, rows, postRule })`, `analysisRequirements(description, requirements, jsonStructure?)`, `workedExample(example)`, `workedExamples(examples, title?)`. The same-named class methods are deprecated shims (removed in 1.0). Code:

```ts
import { prompt } from "@kasava/prompt-builder";
import { toolGuidance } from "@kasava/prompt-builder/presets";

console.log(
  prompt()
    .role("research agent")
    .include(toolGuidance([{ tool: "search", usage: "Find documents by keyword" }]))
    .build(),
);
```

**§ `/zod` subpath** — ALL fences in this section are `ts fragment` (zod is an optional peer dependency; import fails without it — the human installs zod, never the agent):

```ts fragment
import { createVarsSchema } from "@kasava/prompt-builder/zod";

const varsSchema = createVarsSchema(userContext, {
  userName: (s) => s.max(80),
});
const vars = varsSchema.parse(requestPayload);
template.render(vars);
```

Prose: required variables (`.notNull()`, no `.default()`) are required in the Zod schema, everything else optional — mirrors `$inferVars`; refinements are typed per variable (`(s) => s.max(80)` — no cast); `json<T>()` validates as `z.unknown()` (no runtime shape — refine explicitly for untrusted payloads); use when the render payload arrives from untyped sources.

- [ ] **Step 2: Run the harness**

Run: `bun test tests/`
Expected: PASS — the four runnable blocks execute; the zod block is skipped (fragment).

- [ ] **Step 3: Commit (user-run stop point)**

```bash
git add .claude/skills/prompt-builder/references/api-output.md
git commit -m "Add api-output reference (dialects, messages+cache, budget, presets, zod)"
```

---

### Task 5: `references/architectures.md` — new

**Files:**
- Create: `.claude/skills/prompt-builder/references/architectures.md`

**Interfaces:**
- Produces: the file name `architectures.md` (Task 6 routing; Task 10 cross-links).

- [ ] **Step 1: Write the file**

Opening frame (exact claims): "Four ways to structure prompt code around the library. A menu, not a hierarchy — they combine. Pick per project; nothing here is a prescription." One record per architecture in the format **When / How / Pros / Cons / How to test**:

1. **Static builder functions** — When: no runtime variables, few consumers. How: `export function buildX(data: Input): string` wrapping a `prompt()` chain (see `examples.md`). Pros: zero ceremony, pure and synchronous. Cons: the data contract is only a hand-written `Input` type; interpolation is manual. Test: call with fixture data, snapshot the string.
2. **Schema templates** — When: runtime data, several call sites, untrusted/external payload sources. How: `definePrompt(...).body(v => ...)` + `.render(values)`; `$inferVars` is the contract. Pros: typed payload, `MissingVarError` guard, combinators see resolved values. Cons: more ceremony than a one-off deserves. Test: `render()` with fixture vars; assert the thrown `MissingVarError` for a missing required var.
3. **Prepared prompts** — When: the same large prompt renders on every request, or one bound prompt goes to several dialects. How: `template.prepare(values)` / `builder.prepare(name)` → `PreparedPrompt.render(slots)`. Pros: AST walk paid once; slots only on re-render; the static half is stable for cache boundaries. Cons: one more indirection; slots are untyped (`Record<string, unknown>`). Test: `params` lists the expected slots; renders with fixture slots.
4. **AST pipelines** — When: introspection, structural diffing, token trimming, custom serialization. How: `.toAST()` / `walk()` / `.node()` / `applyBudget` / custom `Dialect`. Pros: full programmatic access; budget keeps output well-formed. Cons: couples code to the node shapes. Test: walk-based assertions (node counts, kinds) rather than string matching.

Closing — decision-criteria table (columns: Runtime data? / Repeated renders? / Cache boundaries matter? / Introspection or trimming? / Consumers): each row maps a combination to a starting architecture, ending line: "a starting point, not a prescription."

Code minis (one per record, verbatim):

```ts
import { prompt } from "@kasava/prompt-builder";

export function buildReviewerPrompt(document: string): string {
  return prompt().role("reviewer").tag("document", document).build();
}
```

```ts
import { definePrompt, text, prompt } from "@kasava/prompt-builder";

const reviewer = definePrompt("reviewer", { document: text().notNull() }).body((v) =>
  prompt().role("reviewer").tag("document", v.document),
);

reviewer.render({ document: "…" });
```

```ts
import { prompt, p, placeholder } from "@kasava/prompt-builder";

const prepared = prompt().include(p`Summary of ${placeholder("topic")}`).prepare("v1");
prepared.render({ topic: "caching" });
```

```ts
import { prompt } from "@kasava/prompt-builder";

const ast = prompt().role("agent").guidelines(["Be direct."]).toAST();
console.log(ast.map((n) => n.kind).join(","));
```

- [ ] **Step 2: Run the harness**

Run: `bun test tests/`
Expected: PASS — the four minis execute.

- [ ] **Step 3: Commit (user-run stop point)**

```bash
git add .claude/skills/prompt-builder/references/architectures.md
git commit -m "Add architectures reference (four usage architectures menu)"
```

---

### Task 6: `SKILL.md` — router rewrite

**Files:**
- Modify: `.claude/skills/prompt-builder/SKILL.md` (full body rewrite; frontmatter untouched)

**Interfaces:**
- Consumes: file names `api-fluent.md`, `api-schema.md`, `api-output.md`, `architectures.md`, `patterns.md`, `best-practices.md`, `anti-patterns.md`, `examples.md`.
- Produces: the routing table every later task keeps valid.

- [ ] **Step 1: Rewrite the body**

Structure (frontmatter byte-identical):

1. Intro paragraph: today's wording, minus "fluent API" as the only framing — "provides a fluent builder plus a schema layer, a template tag, combinators, and pluggable output dialects. Library-focused and project-agnostic."
2. `## Workflow`: 1. **Analyze** — prompt kind + four routing questions (runtime data? repeated renders? non-markdown output? token budget?); 2. **Select architecture** → `architectures.md`; 3. **Build** → the matching API file; 4. **Review** → `best-practices.md` + `anti-patterns.md`.
3. `## Where to look` routing table (exact rows): fluent method lookup → `api-fluent.md`; variables/templates/render → `api-schema.md`; dialects/messages/cache/budget/AST → `api-output.md`; structuring prompt code → `architectures.md`; pattern by prompt type → `patterns.md`; copy-paste starter → `examples.md`.
4. `## Quick Reference`: keep today's need→method table; preset-family rows get the marker "→ `/presets` + `.include()` (class shim deprecated until 1.0)"; append new rows: Runtime variables → `definePrompt` + `.render()`; Interpolation → ``p`…` `` + `placeholder()`; Conditional fragments → `when/unless/all/any/each`; Chat output + caching → `toMessages()` + `.cacheBoundary()`; Token trimming → `.priority()` + `.$budget()`; each with its file pointer.
5. `## Key Rules`: keep rules 1, 2, 4–8 as today; extend rule 3 (pure builders) with "`.render()` is pure too — still no I/O inside builders; the caller reads files and passes content in"; add rule 9: "`p` is composition and serialization, not an injection defense"; rule 10: "`$budget()` returns a new builder — it never mutates the one it trims"; rule 11: "0.3 output is the corrected format (escaped table cells, empty `lookupTable` skips); pre-0.3 bytes require `markdown({ strict: true })`".
6. `## Builder shape`: keep, re-tagged `ts fragment` (references `AnalyzerInput`-style abstractions is fine here).
7. `## Reference Files`: eight entries (the routing table's targets) with one-line "consult when" each.

- [ ] **Step 2: Run the harness + version check**

Run: `bun test tests/ && (grep -rn '0\.3\.0' .claude/skills/prompt-builder/ || echo CLEAN)`
Expected: PASS + CLEAN.

- [ ] **Step 3: Commit (user-run stop point)**

```bash
git add .claude/skills/prompt-builder/SKILL.md
git commit -m "Rewrite SKILL.md as neutral router for 0.3.0 surface"
```

---

### Task 7: `references/patterns.md` — update

**Files:**
- Modify: `.claude/skills/prompt-builder/references/patterns.md`

**Interfaces:**
- Consumes: `api-schema.md` / `api-output.md` terminology (Task 3/4).
- Produces: four new pattern entries + matrix rows used by `examples.md` cross-links.

- [ ] **Step 1: Apply changes**

1. Keep the eight existing patterns (verify each still compiles conceptually against 0.3 — no changes needed beyond fence tags from Task 1).
2. "Conditional / Dynamic Prompt" gains a combinator variant paragraph + code:

```ts
import { prompt, all, when, each } from "@kasava/prompt-builder";

const features = ["search", "expand"];

const dynamic = prompt()
  .role("listing analyzer")
  .include(all(when(features.length > 0, prompt().list("Features", features))))
  .include(each(features, (f) => prompt().raw(`Feature available: ${f}`)));
```

3. New patterns (same format as existing — When / chain sketch / Key methods):
   - **Runtime-Data Prompt** — `definePrompt` + `.body(v)` + `.render(vars)`; key: `definePrompt`, `text/list/bool`, `when`.
   - **Repeated-Render Prompt** — `template.prepare(values)` or builder `prepare(name)` + slot re-renders; key: `prepare`, `placeholder`.
   - **Multi-Target Output** — one prompt → `build()` + `toMessages()` (+ `.cacheBoundary()`); key: `toMessages`, `cacheBoundary`, `xml`.
   - **Budget-Constrained Prompt** — `.priority()` tiers + `.$budget({ maxTokens })`; key: `priority`, `$budget`, `approximateTokens`.
4. Matrix: add rows for `definePrompt/render`, `p`, `when/unless/all/any/each`, `toMessages/cacheBoundary`, `priority/$budget` with Y/– per pattern.
5. Preset-method mentions get the `/presets` pointer.

- [ ] **Step 2: Run the harness**

Run: `bun test tests/`
Expected: PASS.

- [ ] **Step 3: Commit (user-run stop point)**

```bash
git add .claude/skills/prompt-builder/references/patterns.md
git commit -m "Add 0.3.0 patterns (runtime data, prepared, multi-target, budget)"
```

---

### Task 8: `references/best-practices.md` — update

**Files:**
- Modify: `.claude/skills/prompt-builder/references/best-practices.md`

**Interfaces:** none new (consumes Task 3/4 terminology).

- [ ] **Step 1: Apply changes**

1. Safety §Prompt injection defense: keep the XML-boundary advice, append the honest line: "Tag boundaries help the model tell instructions from data; they are not a security boundary — and `p` interpolation is serialization, not escaping."
2. Token Efficiency: new subsection "Budgets and priorities" — `.priority('required'|'high'|'normal'|'low')` before the nodes it governs; `.$budget({ maxTokens })` returns a trimmed copy; `approximateTokens` is a ~4 chars/token rule of thumb, pass a real tokenizer when margins matter; code sketch (fragment fence).
3. Structure: new subsection "Cache boundaries" — stable content first, `.cacheBoundary()`, volatile content last; provider caches match exact prefixes — keep the stable half byte-identical between requests.
4. Testability: append — schema templates test via `render(fixtureVars)` snapshots; strict-vs-corrected output distinction (`markdown({ strict: true })`) when pinning legacy bytes.
5. Effectiveness Checklist: extend item 10 and add items: "11. Runtime data — `definePrompt` + `.render()`; 12. Caching — `cacheBoundary()` between stable and volatile; 13. Size — `.$budget()` with explicit priorities."

- [ ] **Step 2: Run the harness**

Run: `bun test tests/`
Expected: PASS.

- [ ] **Step 3: Commit (user-run stop point)**

```bash
git add .claude/skills/prompt-builder/references/best-practices.md
git commit -m "Extend best practices with budget, cache boundaries, p honesty"
```

---

### Task 9: `references/anti-patterns.md` — update

**Files:**
- Modify: `.claude/skills/prompt-builder/references/anti-patterns.md`

**Interfaces:** none new.

- [ ] **Step 1: Apply changes**

1. "Passing Empty Arrays": DELETE the lookupTable exception paragraph ("**Exception:** `.lookupTable({ rows: [] })` does NOT skip…" and "Always pass real data to `.lookupTable()`") — replace with "`.lookupTable()` now skips empty rows like every other method (0.2.x emitted a header-only table)."
2. "Using Deprecated Methods": extend the list with the five preset shims → `/presets` + `.include()`.
3. New anti-patterns (Wrong/Right pairs or a claim + correction, matching file style):
   - **Treating `p` as injection defense** — wrong: `` p`User said: ${untrusted}` `` believed safe; right: it is serialization only; delimit untrusted content with `.tag()`/`.context()` and design for it.
   - **Expecting `$budget()` to mutate** — wrong: `full.$budget({...}); full.build()`; right: `const trimmed = full.$budget({...})` — it returns a new builder.
   - **Relying on pre-0.3 bytes** — wrong: asserting exact legacy strings against `build()`; right: `build(markdown({ strict: true }))` when legacy bytes are required.
   - **Binding slots with template `.prepare()` vs builder `.prepare()` confusion** — `PromptTemplate.prepare(values)` binds schema variables; `PromptBuilder.prepare(name)` compiles the chain — call the one you meant.

- [ ] **Step 2: Run the harness**

Run: `bun test tests/`
Expected: PASS.

- [ ] **Step 3: Commit (user-run stop point)**

```bash
git add .claude/skills/prompt-builder/references/anti-patterns.md
git commit -m "Fix stale lookupTable claim; add 0.3.0 anti-patterns"
```

---

### Task 10: `references/examples.md` — update

**Files:**
- Modify: `.claude/skills/prompt-builder/references/examples.md`

**Interfaces:**
- Consumes: patterns from Task 7; API facts from Tasks 3–4.
- Produces: the skill's canonical runnable example set (largest feeder of the runner).

- [ ] **Step 1: Make existing examples self-contained**

Add the missing `import` line to every existing example block that lacks one (they already define their input types); remove Task 1's `fragment` tags from them. All eight existing examples become `ts` runnable.

- [ ] **Step 2: Add five new examples (verbatim)**

```ts
import { definePrompt, text, list, bool, prompt, p, when } from "@kasava/prompt-builder";

interface ListingInput {
  title: string;
  skills: string[];
  isRemote: boolean;
}

const listingAnalyzer = definePrompt("listing_analyzer", {
  title: text().notNull(),
  skills: list().default([]),
  isRemote: bool().default(false),
}).body((v) =>
  prompt()
    .role("listing analyzer")
    .tag("listing", p`Title: ${v.title}`)
    .include(when(v.skills.length > 0, prompt().list("Required Skills", v.skills)))
    .include(when(v.isRemote, prompt().section("Work Arrangement", "Remote"))),
);

console.log(listingAnalyzer.render({ title: "Platform Engineer", skills: ["ts", "sql"] }));
```

```ts
import { prompt, p, placeholder } from "@kasava/prompt-builder";

export function buildPreparedReportPrompt(): string {
  const prepared = prompt()
    .role("report writer")
    .include(p`Write the ${placeholder("kind")} report for ${placeholder("quarter")}.`)
    .prepare("report_v1");

  console.log(prepared.params); // ["kind", "quarter"]
  return prepared.render({ kind: "quarterly", quarter: "Q3" });
}
```

```ts
import { prompt, all, when, unless, each } from "@kasava/prompt-builder";

export function buildFlagGatedPrompt(flags: { tools: boolean; verbose: boolean }): string {
  return all(
    prompt().role("assistant"),
    when(flags.tools, prompt().heading("Tool Search", 2).raw("Prefer targeted queries.")),
    unless(flags.tools, prompt().heading("Tool Catalog", 2).raw("Full catalog below.")),
    each(["safety", "privacy"], (topic) => prompt().guidelines([`Respect ${topic}.`])),
  ).build();
}
```

```ts
import { prompt, toMessages } from "@kasava/prompt-builder";

const builder = prompt()
  .include(prompt().role("support agent").guidelines(["Be direct.", "Cite sources."]))
  .cacheBoundary()
  .include(prompt().tag("request", "How do I reset a token?"));

export const messages = toMessages(builder);
// messages[0] carries cache_control (stable prefix); messages[1] does not
```

```ts
import { prompt } from "@kasava/prompt-builder";

export function buildBudgetedPrompt(maxTokens: number): string {
  const full = prompt()
    .priority("required")
    .include(prompt().role("analyst").guidelines(["Answer only from the context."]))
    .priority("low")
    .include(prompt().heading("Worked Examples", 2).raw("…long demonstrations…"));

  return full.$budget({ maxTokens }).build();
}
```

- [ ] **Step 3: Run the harness**

Run: `bun test tests/`
Expected: PASS — thirteen runnable example blocks.

- [ ] **Step 4: Commit (user-run stop point)**

```bash
git add .claude/skills/prompt-builder/references/examples.md
git commit -m "Make examples runnable; add schema/prepared/combinator/messages/budget examples"
```

---

### Task 11: Snapshot tests + `test` script

**Files:**
- Create: `tests/snapshots.test.ts`
- Modify: `package.json` (scripts only)

**Interfaces:**
- Consumes: the library's installed 0.3.0 behavior.
- Produces: `bun test` at repo root running the skill suite (`"test": "bun test tests/"`).

- [ ] **Step 1: Load the `bun-test` skill, then write the tests**

Invoke the `bun-test` skill and follow it for the file below. Structural assertions over full-string equality (per Review Focus #5) — on first run, READ the actual console output and adjust any `toContain` strings to the verified reality before freezing:

```ts
// tests/snapshots.test.ts
import { describe, expect, test } from "bun:test";
import {
  prompt,
  definePrompt,
  text,
  toMessages,
  MissingVarError,
} from "@kasava/prompt-builder";

describe("canonical outputs", () => {
  test("role renders a persona line", () => {
    const out = prompt().role("match scorer", "with RAG tools").build();
    expect(out).toContain("You are a");
    expect(out).toContain("match scorer");
    expect(out).toContain("with RAG tools");
  });

  test("empty lookupTable skips entirely", () => {
    expect(
      prompt().lookupTable({ title: "T", columns: ["A", "B"], rows: [] }).build().trim(),
    ).toBe("");
  });

  test("pipe in a table cell is escaped", () => {
    const out = prompt()
      .table(["a", "b"], [["has | pipe", "ok"]])
      .build();
    expect(out).toContain("\\|");
    expect(out.match(/\n/g)?.length).toBeLessThan(5); // one row survived as one row
  });

  test("render throws MissingVarError for a required variable", () => {
    const t = definePrompt("x", { name: text().notNull() }).body((v) =>
      prompt().raw(`Hi ${v.name}`),
    );
    expect(() => t.render({} as never)).toThrow(MissingVarError);
  });

  test("toMessages marks only pre-boundary blocks", () => {
    const msgs = toMessages(
      prompt().guidelines(["Be direct."]).cacheBoundary().tag("req", "x"),
    );
    expect(msgs).toHaveLength(2);
    expect(msgs[0].cache_control).toEqual({ type: "ephemeral" });
    expect(msgs[1].cache_control).toBeUndefined();
  });

  test("$budget returns a new, trimmed builder", () => {
    const full = prompt()
      .priority("required")
      .include(prompt().guidelines(["Answer only from the context."]))
      .priority("low")
      .include(prompt().heading("Examples", 2).raw("…".repeat(400)));
    const trimmed = full.$budget({ maxTokens: 30 });
    expect(trimmed).not.toBe(full);
    expect(trimmed.build().length).toBeLessThan(full.build().length);
    expect(full.build()).toContain("Examples"); // original untouched
  });
});
```

- [ ] **Step 2: Run, read actual outputs, freeze**

Run: `bun test tests/snapshots.test.ts`
Expected: PASS. If any expectation mismatches real behavior, read the actual output (`console.log` the case), verify the behavior against the library source (`node_modules/@kasava/prompt-builder/dist/`), and correct the test to the verified reality — never weaken a test just to go green; a genuine mismatch is a finding to surface.

- [ ] **Step 3: Add the root script**

`package.json` `scripts` gains: `"test": "bun test tests/"` (Edit tool; scripts only — no dependency changes).

Run: `bun test`
Expected: the whole skill suite green.

- [ ] **Step 4: Commit (user-run stop point)**

```bash
git add tests/snapshots.test.ts package.json
git commit -m "Add canonical snapshot tests and root test script"
```

---

### Task 12: Final verification battery + close-out

**Files:**
- Modify: bean `cc-sdd-fvuj` (completion appends)

**Interfaces:** consumes everything.

- [ ] **Step 1: Stale-claim greps (all must be zero-hit)**

```bash
grep -rn "produces a table with headers but no body rows" .claude/skills/prompt-builder/ ; \
grep -rn "Always pass real data" .claude/skills/prompt-builder/ ; \
grep -rn '`\.build(): string`' .claude/skills/prompt-builder/ ; \
grep -rn '0\.3\.0' .claude/skills/prompt-builder/ ; \
echo DONE
```
Expected: only `DONE` printed.

- [ ] **Step 2: Warning-presence grep (must hit three files)**

```bash
grep -rln "injection" .claude/skills/prompt-builder/references/
```
Expected: `api-schema.md`, `best-practices.md`, `anti-patterns.md` listed.

- [ ] **Step 3: Full suite + plugin validate**

Run: `bun test && claude plugin validate .`
Expected: tests green; validate exit 0.

- [ ] **Step 4: Routing audit (manual)**

Read `SKILL.md` top to bottom: every routing-table row resolves to an existing file; every Quick Reference row points at the file that documents it. Fix any dangling pointer.

- [ ] **Step 5: Bean close-out + user commit**

Append `## Summary of Changes` to bean `cc-sdd-fvuj` (what shipped: files, tests, greps) and mark it `completed` only after the user's final commit lands:

```bash
git add .beans/ docs/superpowers/plans/2026-09-27-prompt-builder-skill-030-update.md
git commit -m "Complete prompt-builder skill 0.3.0 update"
```
