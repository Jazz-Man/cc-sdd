# Code style

## No file-path label comments

No comment that is only a file path — `// src/core/payload.ts`, `// # src/x.ts`, `/* FILE: ... */` — may land in any source file. The filesystem already knows the path, and the label goes stale the moment the file moves. Comments in code carry knowledge (why, invariants, quirks), never identity.

Plans, briefs, and review packages that hold several code blocks label each block in the surrounding document text (heading or sentence naming the file) — never as a first-line comment inside the block, so verbatim transcription cannot carry the label into files.

Background (2026-09-29): biome 2.5.14 cannot enforce this mechanically — no built-in comment-content rule exists, and GritQL plugins cannot see comments (CST trivia; verified empirically). A mechanical guard may replace this rule later; until then it binds by convention.

## No trailing export blocks

Never end a module with an `export { ... }` re-export statement. The
`export` keyword goes inline on the declaration itself (`export function
foo`, `export const BAR`), and the file is ordered private-helpers-first,
exported-declarations-last — that ordering satisfies biome's
`useExportsLast` (preset "all") without any export block.

Owner directive (2026-10-16), during the filesystem-policy-v2 module
decomposition: the trailing `export { inAllowedZone, … }` form is
forbidden; inline exports with bottom-of-file ordering are the only
accepted shape.
