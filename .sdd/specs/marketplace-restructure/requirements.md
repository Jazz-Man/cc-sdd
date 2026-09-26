# Requirements Document

## Introduction

The repository root currently IS the single sdd plugin — the marketplace manifest resolves the plugin at the root itself, so no second plugin can land without colliding. This feature restructures the repository into a personal Claude Code plugin marketplace: every plugin, sdd today and any future one, lives in its own subfolder under `plugins/`, and the marketplace manifest references each plugin by its path.

The restructure is a relocation, not a rewrite. Plugin files move verbatim, the plugin behaves exactly as before once the local marketplace registration is re-pointed, and the repository's verification battery and documentation are re-scoped so the same guarantees keep being checked over the new layout.

## Boundary Context

- **In scope**: relocating the sdd plugin payload (skills, shared assets, bin helpers, hooks, plugin manifest) into `plugins/sdd/`; re-pointing the marketplace manifest to per-plugin paths; re-scoping the verification battery and the layout/verification documentation (CLAUDE.md, README, e2e runbook) to the new locations; re-pointing the user's local marketplace registration.
- **Out of scope**: adding any second plugin (separate follow-up features); modifying plugin file contents (files move verbatim); changes to `.zed/` and `.github/workflows/`; publishing to public marketplaces; renaming the marketplace identity; root cleanliness as a goal — the repo root need not end up free of plugin-payload files.
- **Adjacent expectations**: the Claude Code plugin/marketplace platform is taken as given — this feature conforms to its documented manifest and validation behavior and does not own changing it. Repo-level working state (`.sdd/`, `.beans/`, `.superpowers/`, `.claude/rules/`, `CLAUDE.md`, `docs/superpowers/`) is not plugin payload and is not required to move. The final placement of borderline items (`docs/guides/`, the README, the LICENSE) is not constrained by these requirements; wherever they land, their path references fall under Requirement 5.

## Requirements

### Requirement 1: Plugin placement

**Objective:** As the repository owner, I want each plugin in its own subfolder under a single plugins folder, so that future plugins can be added without colliding with existing content.

#### Acceptance Criteria

- The repository shall host each plugin in its own subfolder under `plugins/` at the repository root.
- The sdd plugin shall reside at `plugins/sdd/`.
- When an additional plugin is added to the repository, the additional plugin shall occupy a new subfolder under `plugins/` without requiring changes inside existing plugin subfolders.

### Requirement 2: Marketplace manifest validity

**Objective:** As the repository owner, I want the restructured repository to validate as a Claude Code plugin marketplace, so that the toolchain accepts the layout and plugins install cleanly from it.

#### Acceptance Criteria

- The marketplace manifest shall reference the sdd plugin by its path under `plugins/`.
- The sdd plugin's manifest shall be located inside the plugin's own subfolder.
- When `claude plugin validate` is run against the restructured repository, the repository shall pass validation with no errors.

### Requirement 3: Installation continuity after re-pointing

**Objective:** As the plugin's daily user, I want the plugin to work unchanged once I re-point my local marketplace registration, so that my daily workflow continues without interruption.

#### Acceptance Criteria

- The restructure shall preserve the marketplace name `sdd-local` and the installed plugin reference `sdd@sdd-local`.
- When the user re-adds the local marketplace under its existing name, the registration shall be replaced in place without a duplicate entry.
- While the re-pointed registration is active, the `/sdd:*` skills shall load in a Claude Code session.
- While the re-pointed registration is active, the SessionStart hook shall inject the workflow map.
- While the re-pointed registration is active, `${CLAUDE_PLUGIN_ROOT}` shall resolve to the sdd plugin's subfolder (`plugins/sdd`).
- If the user starts a session before re-adding the marketplace registration, the sdd plugin shall be unavailable for that session.

### Requirement 4: Move integrity and execution

**Objective:** As the repository owner, I want the relocation executed as user-run git moves of unmodified files, so that plugin behavior and git history survive the restructure unchanged.

#### Acceptance Criteria

- The restructure shall move the sdd plugin's files without modifying their contents.
- When a file move is required during the restructure, the restructure process shall hand the user a `git mv` command for execution instead of executing the move itself.
- The restructure shall preserve the git history of the moved files.

### Requirement 5: Verification battery and documentation alignment

**Objective:** As the repository owner, I want the verification battery and documentation re-scoped to the new layout, so that the repository's quality gates and instructions remain truthful after the move.

#### Acceptance Criteria

- The verification battery shall check the same invariants over the restructured layout as it checked over the previous layout.
- When the verification battery runs on the restructured repository, every invariant check shall return its pinned result — zero hits, or exactly six where six is pinned today.
- The repository documentation that describes the layout or the verification procedure — the CLAUDE.md layout and verification sections, the README, and the e2e runbook — shall reference the post-restructure file locations.
