# Why sdd? A design note

This is the long answer to "why does this plugin exist and what trade-off is it
making". The [README](../../README.md) is the faster path if you just want to
use it. Come here for the reasoning.

Some history that frames the choices: `sdd` started as a fork of `cc-sdd`, a
multi-agent toolkit distributed through npm that installed the same skill set
onto eight different coding agents. The structure survived the conversion —
phase gates, EARS requirements, design documents, task discipline. Everything
else was rebuilt around one user working in Claude Code: the installer is gone,
the multi-agent surface is gone, and execution follows the subagent-driven
model instead.

## The short version

The spec is a contract between parts of the system, not a master command
document handed to an agent. Code remains the source of truth. Specs exist to
make the boundaries between parts explicit, so work can proceed without
constant re-synchronization — and so every generated line traces back to
something a human approved.

Five commitments carry that:

1. **Structured, Kiro-style documents.** Requirements in EARS format, designs
   with considered alternatives and diagrams, a static task plan with
   boundaries — not walls of text. The structure is what makes a spec
   reviewable at a gate.
2. **Subagent-first execution.** The main conversation is for decisions.
   Implementation, review, and debugging run in fresh subagents that return
   status contracts — keeping contexts clean over long runs and giving every
   task an independent reviewer rather than the author grading their own work.
3. **beans as the only tracker.** State (progress, blockers, dependencies)
   lives in the issue tracker, artifacts in files. No checkbox-flipping in
   documents, no re-parsing prose to figure out what is done. Resume is a
   query.
4. **Pinned models.** Generation, review, and validation run on opus;
   implementation on sonnet, raised to opus only when a fix loop escalates.
   This is encoded in the skill texts, not left to an agent's judgment —
   model choice is a cost and quality decision the user already made.
5. **Stop-per-task user control.** After every task, the run stops: the user
   reviews the diff, tests, and commits. Agents never touch git. Autonomy is
   bounded by gates that a human actually passes through.

## Specification vs design

Two things often get collapsed that shouldn't be:

- **Specification** — the contract: the boundary, the preconditions, what a
  piece of work must respect. In sdd: `requirements.md`, the boundary
  commitments in `design.md`, the `_Boundary:_`/`_Depends:_` annotations in
  `tasks.md`.
- **Design** — the free exploration space inside that contract: components,
  interfaces, implementation decisions. In sdd: the internals of `design.md`
  and everything an implementer does within a task's boundary.

The human reviews and approves at the specification layer; the agent is free
inside the design layer. This split is what keeps review load sane — you
audit boundaries and contracts, not line-by-line behavior — while still
auditing the final diff against the approved contract at every stop.

## Why this matters with agents specifically

Agents are fast. They will generate thousands of lines across multiple
modules in one session. The bottleneck is not capability; it is coordination
and trust — and for a single user, trust is the whole problem.

When an agent changes module A and module B and nothing written says what the
contract between them is, breakage surfaces late and review becomes
archaeology. Explicit boundaries are the decades-old answer to this in large
engineering teams; sdd applies the same principle to agent-authored work for
one person. Inside a boundary the agent refactors and iterates freely; across
boundaries there is a contract, so nothing silently breaks when something
moves.

Two failure modes of long agent runs get specific treatment:

- **Context rot.** Long sessions drift; an agent that has read everything
  remembers badly. sdd's answer is fresh contexts per concern (forked
  generation, per-task implementers and reviewers, a debugger that receives
  evidence rather than history) plus state on disk — beans and files — so
  nothing depends on session memory.
- **Self-grading.** An agent that both writes and judges its own work tends
  to approve it. Independent review passes — a different context applying an
  adversarial protocol, and verification gates that re-run commands instead
  of trusting reports — are structural, not optional.

## What was deliberately left out

The upstream toolkit optimized for breadth: eight agents, fourteen languages,
npm distribution, parallel spec batches, multi-agent claims. This fork
optimizes for depth on one workflow, which meant deleting:

- **Parallel work.** One active feature, one task at a time, strictly
  sequential initiative chains. Parallelism multiplies coordination cost —
  exactly the thing the specs exist to control — and one user cannot review
  two streams at once anyway.
- **Installer and configuration.** The repository is the plugin, loaded with
  `--plugin-dir`. Paths under `.sdd/` are fixed. There is nothing to
  configure, which is also why there is nothing to configure wrong.
- **Quick/one-shot spec modes.** A full cycle per feature, phase by phase.
  Small work does not enter the pipeline at all — discovery says "no spec
  needed" and it happens in the chat.

## When sdd fits

- The work is a feature or an initiative too large to hold in your head but
  small enough to ship as a unit in days — medium grain.
- You want to audit agent-generated code back to an approved contract, not
  read every line cold.
- You want long runs that stay correct when interrupted — state on disk,
  fresh contexts, bounded loops.
- You prefer deciding at gates over steering continuously.

## When it does not fit

- One-off fixes and small changes — the overhead is real; use the main chat
  (discovery will tell you the same).
- Throwaway prototypes where writing down boundaries buys nothing.
- Work you want to hand to an agent unattended with no review rhythm — the
  stop points are the point.

> If the discipline feels like overhead, the spec is probably too big. Break
> it smaller.

## See also

- [Spec-Driven Workflow](spec-driven.md) — how the ideas here run phase by
  phase
- [Skill Reference](skill-reference.md) — the 14 skills and their contracts
- [README](../../README.md) — the plugin overview
