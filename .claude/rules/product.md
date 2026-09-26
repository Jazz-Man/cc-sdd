# Product — what sdd is and must stay

sdd is a prompt-only Claude Code plugin for Kiro-style spec-driven development: discovery → requirements → design → tasks → implementation, run as fifteen skills invoked `/sdd:<name>`, with subagent-first execution and beans as the only tracker. This repository IS the plugin — no separate runtime, installer, build, or shipped artifact. Editing a skill text IS editing the product.

## Honest scope

A personal plugin written for one user's daily workflow. English-only, loaded locally with `claude --plugin-dir /path/to/cc-sdd`, no claim of general support or published availability (`.claude-plugin/marketplace.json` is manifest metadata that `claude plugin validate .` checks — not a publication claim). Scope honesty is a feature: do not add "for other users" abstractions, config knobs, or feature flags nobody asked for.

## Core capabilities

- Route incoming work honestly: extend an existing spec, answer directly with no spec, one new feature, or a sequential multi-spec initiative.
- Shape specs under document discipline: EARS requirements, boundary-first design with mermaid, one task bean per sub-task.
- Execute through subagents: fresh implementer and reviewer per task, status contracts, bounded fix/debug loops, hard stops where the human decides.
- Gate quality: phase approvals backed by validators, document freshness hashes, adversarial review, feature-level GO/NO_GO.
- Keep state in beans and blob artifacts under `.sdd/` of the target project — never in documents.

## Invariants — break one and it is a different product

1. **Prompt-only.** All behavior lives in skill texts, shared assets under `assets/`, three shell helpers in `bin/`, and one SessionStart hook. No runtime code, no installer, no data directory in user projects beyond `.sdd/` and the rules file `/sdd:init` writes.
2. **Subagent-first.** The main conversation is for decisions: routing, gating, adjudication. Subagents do the heavy reading and writing; they never ask the user anything — they return status contracts (`DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT`).
3. **beans is the only tracker.** State, verdicts, briefs, and notes live in beans; documents carry artifacts only. No progress writes, no approval writes, no checkbox flips into documents, no plan document — the task beans ARE the plan.
4. **The human holds git.** impl stops after every task; the user reviews, tests, and commits. The plugin never stages, commits, or branches.
5. **Models are pinned** in the skill texts — never a runtime choice. The model table's home is the workflow map (`.claude/rules/sdd.md`, "Models"); apply it, don't fork it.
6. **One active feature, ever.** The active feature is the single `in-progress` epic bean; follow-ups queue behind it. Sequential, never parallel.
7. **Templates are instruction-style.** No double-brace placeholders anywhere; fork skills fill templates by writing content, not by substitution.

The phase flow, gate mechanics, interaction rules, and escalation format are owned by `.claude/rules/sdd.md` (the workflow map) — apply them, don't restate them. The enumerated editing prohibitions are owned by `CLAUDE.md` §Editing rules.

## When editing this repo

- Treat every skill-text change as user-visible behavior: it ships verbatim.
- A change that bends an invariant above is a product decision, not a refactor — surface it for the user to decide (four-part escalation, per the workflow map); never quietly absorb it.
- Keep the honest scope: solve the stated problem; say no to speculative generality.

_Intent: everyone editing this repo preserves what sdd IS — prompts, not runtime; subagents, not main-context dumps; beans, not document state; the human, not the agent, on git._
