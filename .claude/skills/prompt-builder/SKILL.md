---
name: prompt-builder
description: Build and edit prompts using @kasava/prompt-builder. Covers method selection, the pure-builder pattern, safety, anti-patterns, and abstract examples.
---

# Prompt Builder Skill

Use this skill when building, editing, or reviewing prompts that use `@kasava/prompt-builder`. The library provides a fluent API for constructing structured XML+markdown prompts. This skill is **library-focused and project-agnostic** — it teaches how to use the builder methods correctly, not how any particular project's prompts are organized.

## Workflow

1. **Analyze** — What kind of prompt? (scoring/classification, tool-using agent, multi-step analysis, Q&A, code/diff review, context-heavy, conditional, composable)
2. **Select pattern** — See [patterns.md](references/patterns.md) for method-to-pattern mapping
3. **Build** — Use high-level generators over basic methods. See [api-reference.md](references/api-reference.md) for every method
4. **Review** — Check against [best-practices.md](references/best-practices.md) and [anti-patterns.md](references/anti-patterns.md)

## Quick Reference

| Prompt Need | Method(s) |
|---|---|
| Agent persona | `.role()` |
| Multi-step process | `.protocol()` |
| Numbered investigation phases | `.investigationStrategy()` |
| Decision rules | `.arrowRules()` |
| Two-column reference / rubric | `.lookupTable()` |
| Tiered classification | `.severityScale()` |
| Confidence tiers | `.confidenceScale()` |
| Tool usage guidance | `.toolGuidance()` |
| Action → follow-up matrix | `.followThroughMatrix()` |
| Error handling | `.gracefulDegradation()` |
| Pre-return checks | `.verificationChecklist()` |
| Behavioral rules | `.guidelines()` |
| Analysis requirements | `.analysisRequirements()` |
| Worked examples | `.workedExample()`, `.workedExamples()` |
| Context injection | `.context()`, `.data()` |
| Instructions wrapper | `.instructions()` |
| Conditional sections | `.conditional()` |
| Reusable fragments | `section()` + `.include()` |
| File list with stats | `.filesList()` |
| Diff display | `.diffBlock()` |
| Simple output fields | `.outputFormat()` *(flat field list — see [api-reference.md](references/api-reference.md) for limits)* |

> Quick Reference maps a single need → one method. For a whole prompt type → a method chain, see [patterns.md](references/patterns.md).

## Key Rules

1. **Always start with `.role()`** — sets the persona in one line (`You are a/an {title}{, task}.`)
2. **Use generators, not basic methods** — `.protocol()` over `.heading()` + `.list()`; `.arrowRules()` over manual formatting
3. **Builders are pure synchronous functions** — take their data as parameters (including file contents already read by the caller) and return a `PromptBuilder` (or call `.build()` to return a string). Keep file I/O and other side effects OUT of the builder; the caller reads files and passes the content in. This makes builders deterministic, fast, and trivially testable. **Avoid `async`, `Promise<string>`, and `Bun.file()` / `fs.readFile` inside a builder.**
4. **Wrap final instructions in `.instructions()`** — the `<instructions>` XML tag gives a clear signal to the model
5. **`.outputFormat()` is a flat field spec** — `[{field, type, description}]` bullets; it can't represent rich JSON Schemas. For rich schema output, inject the schema directly. See [api-reference.md](references/api-reference.md) and [anti-patterns.md](references/anti-patterns.md).
6. **Tag-emitting methods are single-use (except the example family)** — `.context()`, `.data()`, `.instructions()`, … each emit one fixed-name tag. Call each at most once per prompt; for several distinct sources use `.tag(uniqueName, content)`. The example family is exempt. Details in [anti-patterns.md](references/anti-patterns.md).
7. **Generators emit their own heading** — `.protocol`/`.arrowRules`/`.lookupTable`(titled)/`.severityScale`/`.guidelines`/`.toolGuidance`/… each render `##` (`.severityScale()` renders `###`). Don't prepend `.heading()` — it makes two consecutive `##`. It's fine only when the next method emits no heading. Full exceptions in [anti-patterns.md](references/anti-patterns.md).
8. **`.raw()` for prose, tag methods for data** — `.data()`, `.context()`, `.instructions()` wrap content in XML tags. For a plain paragraph use `.raw()` (no formatting); reserve `.data()` for input schema/shape descriptions.

## Builder shape

A builder is a pure function. Inputs come in as arguments; the builder never does I/O.

```typescript
import { type PromptBuilder, prompt } from "@kasava/prompt-builder";

// Return PromptBuilder when the caller composes/extends it:
export function buildAnalyzerPrompt(data: AnalyzerInput): PromptBuilder {
  return prompt()
    .role("data analyzer")
    .context(data.background)        // caller already read the file
    .protocol({ /* steps */ })
    .instructions("Analyze and return the result.");
}

// Or return the finished string for standalone use:
export function buildSimplePrompt(question: string): string {
  return prompt()
    .role("assistant")
    .raw(question)
    .build();
}
```

Each builder:

- Exports a `build*Prompt()` function
- Takes its data as parameters (strings, configs, already-read file contents)
- Returns a `PromptBuilder` (composable) or a `string` (standalone)
- Can be tested standalone: `buildX(testData).build()`

## Reference Files

- [api-reference.md](references/api-reference.md) — consult when you need a method's exact signature, output, or skip rules
- [patterns.md](references/patterns.md) — consult when choosing methods for a whole prompt type (scoring, agent, analysis…)
- [best-practices.md](references/best-practices.md) — consult when reviewing a prompt for safety, clarity, structure, token cost
- [anti-patterns.md](references/anti-patterns.md) — consult when checking for common mistakes (duplicate tags, duplicate headings, I/O in builders)
- [examples.md](references/examples.md) — consult for a copy-paste starting point by prompt type
