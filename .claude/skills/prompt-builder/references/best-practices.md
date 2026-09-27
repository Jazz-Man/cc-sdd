# Best Practices

Prompt engineering rules mapped to builder methods. Incorporates safety review principles from ai-prompt-engineering-safety-review.

## Safety

### No harmful content
Use `.guidelines()` to set boundaries:
```typescript
.guidelines([
  "Never generate content that could harm individuals or groups.",
  "If a request is ambiguous, ask for clarification rather than assuming.",
])
```

### Prompt injection defense
Wrap user-controlled content in XML tags via `.context()` or `.data()`:
```typescript
.context(userContent)  // <context>...</context>
```
XML tags create clear boundaries that help the model distinguish instructions from data.

### Bias mitigation
Avoid assumptions in `.role()` and `.guidelines()`:
```typescript
.role("candidate evaluator")  // NOT "evaluate candidates like a senior male engineer"
.guidelines(["Evaluate based on stated criteria only, not inferred characteristics."])
```

### Privacy
Use `.data()` for structured input descriptions, not raw sensitive data:
```typescript
.data("Input fields: name (public), title (public), email (excluded from analysis)")
```

## Clarity

### Unambiguous task
Start with `.role()` that defines WHO and WHAT:
```typescript
.role("job-candidate match scorer", "with access to the candidate's GitHub portfolio via RAG tools")
```

### Sufficient context
Use `.context()` for a single background block, `.data()` for input schema:
```typescript
.context(background)
.data("Input is a JSON object with: title, company_name, long_description, ...")
```
For several distinct sources, give each a unique `.tag()` — see [Distinct XML tags](#distinct-xml-tags).

### Defined constraints
Use `.arrowRules()` for hard boundaries, `.guidelines()` for soft rules:
```typescript
.arrowRules({
  title: "Scoring Priority",
  types: [
    { name: "Hard rejections", description: "From profile", rules: ["Always score 0, no exceptions."] },
  ],
})
```

### `.raw()` for prose, tag methods for data
`.data()`, `.context()`, `.instructions()` wrap content in XML tags. Don't use them for an ordinary paragraph — the XML wrapper is semantic noise. Use `.raw()` for unformatted text; reserve `.data()` for input schema/shape descriptions.

```typescript
.raw("First, read the profile carefully.") // plain text, no wrapper
// NOT .data("First, read the profile carefully.") → wraps it in <data>…</data>
```

## Structure

### XML for boundaries
The library wraps content in semantic XML tags automatically:
- `<context>` — background info
- `<data>` — input descriptions
- `<instructions>` — final directives
- `<example>` — worked examples

These create clear signal boundaries for the model.

### Distinct XML tags
Each tag-emitting shorthand (`.context()`, `.data()`, `.instructions()`, …) produces one fixed-name tag. Use each at most once per prompt (the example family — `.example()`, `.examples()`, `.workedExample()`, `.workedExamples()` — is exempt; multiple `<example>` tags are a valid few-shot pattern). When you have several distinct sources, give each a unique tag name so the model can tell them apart:

```typescript
.tag("candidate_cv", cv)
.tag("job_profile", profile)
```

### One heading per section
The generators (`.protocol`, `.arrowRules`, `.lookupTable` when titled, `.severityScale`, `.guidelines`, `.toolGuidance`, `.gracefulDegradation`, `.verificationChecklist`, `.analysisRequirements`, `.investigationStrategy`, `.workedExamples`, `.confidenceScale`) each emit their own `##` heading — `.severityScale()` emits `###` and is meant to nest under a `##`. Pass your section label via the method's `title`; don't add a separate `.heading()` in front, or you get two consecutive headings.

```typescript
.guidelines(rules, "Hard Rejections") // → ## Hard Rejections
// NOT: .heading("Hard Rejections").guidelines(rules) → ## Hard Rejections + ## Important Guidelines
```

Rule of thumb: `.heading()` is fine **unless** the following method also emits a `##`. It's valid with `.raw()` (no heading), with a title-less `.lookupTable({...})` (no heading), or as a `##` parent over `.severityScale()` (which emits `###`). A higher-level `.heading(..., 1)` as a deliberate parent is fine but rare.

### Tables for data
Use `.lookupTable()` for scoring rubrics, reference tables, and decision matrices:
```typescript
.lookupTable({
  title: "Inferred work arrangement",
  columns: ["Signal in JD", "Arrangement"],
  rows: [
    ["'remote-first'", "Remote"],
    ["'hybrid, 2 days in office'", "Hybrid"],
  ],
})
```

### Protocols for processes
Use `.protocol()` for multi-step workflows — it gives numbered steps with actions:
```typescript
.protocol({
  name: "Job Match Scoring",
  steps: [
    { label: "Step 1 — Check hard rejections", actions: ["Check avoid list against required tech"] },
    { label: "Step 2 — RAG lookup", actions: ["search_documents for matching projects"] },
  ],
  followThrough: "Provide final score with breakdown.",
})
```

## Token Efficiency

### Auto-skip on null
All methods silently skip when given null/undefined/empty values. Use this for optional sections:
```typescript
.section("Optional field", maybeNull)  // skipped entirely if null
```

### Limited lists
Use `.limitedList()` for potentially large collections:
```typescript
.limitedList(tags, 10, (remaining) => `... and ${remaining} more`)
```

### Truncation
Use `PromptBuilder.truncate()` for long content:
```typescript
.raw(PromptBuilder.truncate(longText, 2000))
```

### High-level generators over basic methods
`.protocol()` is more token-efficient than manual `.heading()` + `.numberedList()` because it uses a consistent, compact format the model recognizes.

## Consistency

### Role for persona
Always use `.role()` — never manually write "You are a...":
```typescript
.role("technical research assistant", "with access to indexed GitHub repository analyses")
```

### SeverityScale for levels
Use `.severityScale()` for any tiered classification:
```typescript
.severityScale("Recommendation", [
  { level: "Strong Match", description: "80-100" },
  { level: "Good Match", description: "70-79" },
])
```

### Guidelines for rules
Use `.guidelines()` for behavioral rules, not loose `.list()`:
```typescript
.guidelines([
  "Always read profile BEFORE scoring.",
  "Score generously for transferable skills within the same paradigm.",
])
```

## Testability

### Pure, synchronous builders
Builders are pure functions: data in as parameters, no I/O inside; the caller reads files and passes content in. See the Wrong/Right pair in [anti-patterns.md](anti-patterns.md) ("Doing I/O Inside the Builder").

### Test file
Iterate quickly by calling the builder with test data — no I/O, no await:
```typescript
console.log(buildPrompt(testInput).build());
```

### Never hardcode content in CLI
CLI files call the prompt builder — they don't construct prompt content directly.

## Effectiveness Checklist

Before finalizing a prompt, verify:

1. **Task clarity** — `.role()` defines who and what
2. **Context sufficiency** — `.context()` for background, `.data()` for input schema
3. **Process definition** — `.protocol()` for multi-step workflows
4. **Decision rules** — `.arrowRules()` for hard boundaries
5. **Scoring/classification** — `.lookupTable()` + `.severityScale()` for rubrics
6. **Tool usage** — `.toolGuidance()` for available tools
7. **Error handling** — `.gracefulDegradation()` for fallbacks
8. **Behavioral rules** — `.guidelines()` for soft rules
9. **Final instructions** — `.instructions()` to wrap the last directive
10. **Output** — `.outputFormat()` for simple field specs; for rich/validated JSON Schemas, inject the schema directly and drive JSON output at the API layer
