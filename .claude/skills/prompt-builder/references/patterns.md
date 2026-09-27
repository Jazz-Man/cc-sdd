# Prompt Patterns

Which methods to use for which kind of prompt. Start here when building a new prompt.

## Pattern Selection Guide

### Scoring / Classification Prompt

Use when the model must evaluate something against criteria and produce a score or classification.

```typescript
prompt()
  .role(...)
  .context(...)                          // input data
  .toolGuidance([...])                   // if RAG/tools needed
  .protocol({ name, steps, followThrough })  // scoring process
  .arrowRules({ title, types })          // decision priority
  .heading("Scoring Rubric")
  .lookupTable(...)                      // each scoring dimension
  .severityScale("Recommendation", [...]) // final classification
  .analysisRequirements(desc, reqs)      // what to analyze
  .guidelines([...])                     // behavioral rules
  .instructions("Follow the protocol and return the scoring result.")
  .build()
```

**Key methods:** `lookupTable`, `severityScale`, `arrowRules`, `protocol`

---

### Tool-Using Agent Prompt

Use when the model has access to external tools (RAG, search, APIs) and must decide when/how to use them.

```typescript
prompt()
  .role(...)
  .context(...)
  .data(...)                             // input schema description
  .toolGuidance([...])                   // tool reference table
  .protocol({ name, steps, followThrough })  // decision process
  .arrowRules({ title, types })          // error handling rules
  .gracefulDegradation([...])            // fallback behavior
  .verificationChecklist([...])          // pre-return checks
  .guidelines([...])
  .instructions("Follow the protocol and return results.")
  .build()
```

**Key methods:** `toolGuidance`, `protocol`, `gracefulDegradation`

---

### Multi-Step Analysis Prompt

Use when the model must perform a sequence of analysis steps in order.

```typescript
prompt()
  .role(...)
  .context(...)
  .protocol({ name, steps, followThrough })
  .investigationStrategy([...])          // numbered phases
  .gracefulDegradation([...])
  .guidelines([...])
  .instructions("Follow the protocol and return results.")
  .build()
```

**Key methods:** `protocol`, `investigationStrategy`, `gracefulDegradation`

---

### Simple Q&A / Research Prompt

Use when the model answers questions using available tools without complex scoring.

```typescript
prompt()
  .role(...)
  .toolGuidance([...])                   // or .heading("Tools").list([...])
  .guidelines([...])
  .build()
```

**Key methods:** `role`, `guidelines`, `list`

---

### Code Review / Diff Analysis Prompt

Use when the model analyzes code changes or diffs.

```typescript
prompt()
  .role(...)
  .context(...)
  .diffBlock(content, maxLength?)
  .filesList("Changed files", [...])
  .protocol({ name, steps })
  .arrowRules({ title, types })
  .verificationChecklist([...])
  .build()
```

**Key methods:** `diffBlock`, `filesList`, `protocol`

---

### Context-Heavy Prompt (documents, profiles, etc.)

Use when injecting large external content into the prompt. The caller reads the files; the builder receives their contents as parameters.

```typescript
interface Input {
  document: string; // caller already read the file
  profile: string; // caller already read the file
}

function buildPrompt(input: Input): string {
  return prompt()
    .role("reviewer")
    .tag("document", input.document) // unique tag per source
    .tag("profile", input.profile) // distinct name — never reuse a fixed-name tag
    .data("Input schema: ...") // single <data> block
    // ... rest of prompt
    .build();
}
```

**Key methods:** `context`, `data`, `include` (for reusable fragments)

---

### Conditional / Dynamic Prompt

Use when prompt content varies based on runtime data.

```typescript
prompt()
  .role(...)
  .conditional(data.features?.length, (b, features) => b
    .heading("Features")
    .list(features.map(f => f.name))
  )
  .conditional(data.config, (b, config) => b
    .section("Config", config.settings)
  )
  .build()
```

**Key methods:** `conditional`

---

### Composable / Reusable Prompt

Use when building prompts from shared fragments.

```typescript
const safetyRules = section("Safety")
  .list(["No harmful content", "Respect privacy"]);

const styleRules = section("Communication Style")
  .list(["Be direct", "No preamble"]);

prompt()
  .role(...)
  .include(safetyRules)
  .include(styleRules)
  .build()
```

**Key methods:** `section`, `include`

---

## Method-to-Pattern Matrix

| Method | Scoring | Tool Agent | Analysis | Q&A | Code Review | Context-Heavy |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `.role()` | Y | Y | Y | Y | Y | Y |
| `.context()` | Y | Y | Y | - | Y | Y |
| `.data()` | Y | Y | - | - | - | Y |
| `.protocol()` | Y | Y | Y | - | Y | - |
| `.arrowRules()` | Y | Y | - | - | Y | - |
| `.toolGuidance()` | Y | Y | Y | Y | - | - |
| `.lookupTable()` | Y | - | - | - | - | - |
| `.severityScale()` | Y | - | - | - | - | - |
| `.guidelines()` | Y | Y | Y | Y | Y | Y |
| `.analysisRequirements()` | Y | - | Y | - | Y | - |
| `.gracefulDegradation()` | - | Y | Y | - | - | - |
| `.verificationChecklist()` | - | Y | Y | - | Y | - |
| `.investigationStrategy()` | - | - | Y | - | Y | - |
| `.confidenceScale()` | - | - | Y | - | - | - |
| `.workedExample()` | - | Y | - | - | - | - |
| `.conditional()` | Y | Y | Y | - | Y | Y |
| `.include()` | - | - | - | - | - | Y |
