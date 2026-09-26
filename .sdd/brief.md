# Workstream Brief

## marketplace-restructure (2026-09-26)

### Intent
The user wants one personal repo hosting multiple Claude Code plugins/skills under
separate namespaces, each plugin in its own subfolder. Today the repo root IS the
single sdd plugin (`.claude-plugin/marketplace.json` lists it with `source: "./"`),
so nothing else can be added without colliding. When done, the repo is a
marketplace: sdd lives in its own namespaced subfolder as the first plugin, the
manifest and verification battery reflect the new structure, and future plugins
have a place to land.

### Scope
- **In**: target layout design (plugin subfolder vs repo-level split for every
  current root item), marketplace.json re-pointing to the plugin subfolder,
  plugin.json relocation, re-scoping the verification battery and CLAUDE.md
  (§Layout, §Verification) to new paths, README/e2e-runbook path updates,
  ordered `git mv` batches handed to the user at stop points, re-pointing the
  local marketplace registration (`sdd@sdd-local`).
- **Out**: adding any second plugin (separate follow-up features); changes to
  skill texts themselves (files move verbatim); `.zed/` and
  `.github/workflows/`; publishing/public-marketplace distribution.

### Decisions
- **Route: single new feature `marketplace-restructure`**, full sdd cycle.
  Rationale: beyond the moves themselves there is real correctness surface —
  manifest schema, plugin-vs-repo-level split, re-scoping every invariant grep —
  that deserves design review; no genuine seams for a multi-spec split;
  "no spec" rejected because unreviewed battery re-scoping is drift risk.
- **Moves execute as `git mv` only.** The agent issues the commands at the
  right moments; the user runs them (git stays human-owned; agents are
  git read-only by global rule).
- **Future plugins are separate follow-up features**, queued later — not part
  of this boundary.
- **Discovery survey subagent skipped**: session context plus CLAUDE.md already
  covered the module layout (verified this session: 15 skills, `bin/` x3,
  `hooks/hooks.json`, marketplace `source: "./"`).
- **Folder/namespace naming deferred to design** (`plugins/sdd/` vs root-level
  `sdd/`, marketplace identity naming).

### Open Questions
- Target folder convention for plugins — resolved in design.
- Repo/marketplace naming (`sdd-local`, repo `cc-sdd`) — requirements or design.
- Destination of `docs/guides`, README, LICENSE — plugin payload or repo
  level — design.
- Manifest placement: plugin.json inside the plugin subfolder, marketplace.json
  at repo root only — design.

### Queue
Empty — no beans yet. `/sdd:spec-init "marketplace-restructure"` births the
epic and phase beans; beans becomes the source of truth from that point.
