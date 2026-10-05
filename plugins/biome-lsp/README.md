# biome-lsp

Biome language server for Claude Code, wired through the plugin's `.lsp.json`.

## What it provides

- **Live diagnostics** — lint/assist findings from the project's `biome.json`
  (e.g. `useSortedKeys` on JSON keys) arrive automatically as `<new-diagnostics>`
  while files are edited.
- **Formatting** and **code actions** for the extensions biome serves.
- Optional `textDocument/definition` exists in biome (module-graph based) but is
  off by default; not enabled here yet.

What it does **not** provide: symbols, hover, or references — biome implements
none of those. For TypeScript symbol navigation keep a TypeScript server
(tsgo/vtsls) registered; when both claim an extension, the first-registered
server handles it.

## Requirements

- The `biome` binary must exist on the machine — the plugin configures the
  connection, it never installs anything. `command` is the absolute Homebrew
  path `/opt/homebrew/bin/biome` because the `biome` name on this machine's
  PATH is a broken npm shim.
- Project rules come from each project's own `biome.json`; the plugin sets no
  biome configuration (`settings`/`initializationOptions` are empty on purpose).
