# Tech — the stack and its verification

There is no application code here. The "source" is:

- **Markdown skill texts** — `skills/<name>/SKILL.md`, each with YAML frontmatter: `name`, `description`, optionally `argument-hint` and `disable-model-invocation` (user-invoked skills such as `discovery` and `init` set the latter). The claude CLI parses this frontmatter; `claude plugin validate .` is the compiler.
- **POSIX sh** — `bin/sdd-gate`, `bin/sdd-verdict`, `bin/sdd-promote`. Read them before changing bean-body formats: they mechanically parse `## Validation` lines and `Doc-hash:` records.
- **JSON** — `.claude-plugin/plugin.json` (name `sdd`), the co-located `marketplace.json`, and `hooks/hooks.json`.

No package manager, no build step, no test framework. Assume this toolchain: the `claude` CLI, the `beans` CLI, standard `sh`/`grep`/`shasum`. Anything beyond it is missing — report it, never install it.

## Plugin variable resolution

- `${CLAUDE_PLUGIN_ROOT}` — the plugin checkout root; the ONLY way skill texts reference `assets/` and `bin/`.
- `${CLAUDE_SKILL_DIR}` — the invoking skill's directory; used by impl for its `templates/` role prompts.
- Both expand in the main conversation only. Subagent dispatch prompts are plain text: resolve to absolute paths before dispatching (impl Hard rule 3).

## Hook mechanics

`hooks/hooks.json` wires SessionStart (matcher `startup|clear|compact`): if the target project has no `.claude/rules/sdd.md`, the hook cats `${CLAUDE_PLUGIN_ROOT}/assets/workflow-map.md` — the wrapped default map. `beans prime` also runs on SessionStart and PreCompact so tracker context survives compression. Precedence is by design: a user-owned rules file silences the injection, even when stale.

## bin/ helper contracts

| Helper | Writes | Contract |
|---|---|---|
| `sdd-gate <epic-id>` | nothing | exit 0 iff the epic is impl-ready: three completed phase beans, `validated` tags plus current `Doc-hash:` on requirements/design, and a runnable or finished task queue |
| `sdd-verdict <bean-id> [field]` | nothing | prints the latest `- FIELD: TOKEN` token from the bean body; rounds append, so the last match wins |
| `sdd-promote <epic-id> --all \| <bean-id>...` | `beans update <id> -s todo` only | the sole write helper in the plugin; everything else stays read-only |

Adding a second write path or broadening `sdd-promote`'s writes is a design change, not a convenience — raise it, don't slip it in.

## Verify before claiming done

After any content change to `skills/`, `assets/`, `hooks/`, or `bin/`:

1. `claude plugin validate .` — must pass.
2. The invariant grep battery and the Revision 9 twin checks — scope, exact patterns, and the paired-diff method are pinned in `CLAUDE.md` §Verification (which points into the two design docs under `docs/superpowers/specs/`). Run them from there; do not copy patterns into summaries — copies drift.

For manual testing: `claude --plugin-dir /path/to/cc-sdd`; `/reload-plugins` in-session then picks up skill-text edits without a restart.

## Conventions that keep the plugin loadable

- Reference shared content, never inline it: skill texts point at `${CLAUDE_PLUGIN_ROOT}/assets/...`; the global beans guide gets one-line references only (CLAUDE.md §Editing rules).
- Document templates under `assets/templates/` are instruction-style — fork skills fill them by writing content; a double-brace placeholder is an invariant-grep failure.
- Keep user-facing docs (`docs/guides/`: skill reference, workflow walkthrough, rationale) in step with behavior changes.

_Intent: treat prompts, shell helpers, and the validate-plus-grep battery as this project's language, compiler, and tests — and run them before every "done"._
