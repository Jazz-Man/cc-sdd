# Code style — no file-path label comments

No comment that is only a file path — `// src/core/payload.ts`, `// # src/x.ts`, `/* FILE: ... */` — may land in any source file. The filesystem already knows the path, and the label goes stale the moment the file moves. Comments in code carry knowledge (why, invariants, quirks), never identity.

Plans, briefs, and review packages that hold several code blocks label each block in the surrounding document text (heading or sentence naming the file) — never as a first-line comment inside the block, so verbatim transcription cannot carry the label into files.

Background (2026-09-29): biome 2.5.14 cannot enforce this mechanically — no built-in comment-content rule exists, and GritQL plugins cannot see comments (CST trivia; verified empirically). A mechanical guard may replace this rule later; until then it binds by convention.
