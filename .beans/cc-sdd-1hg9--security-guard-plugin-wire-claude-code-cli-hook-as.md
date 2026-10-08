---
# cc-sdd-1hg9
title: 'security-guard plugin: wire claude-code-cli-hook as PreToolUse hook'
status: in-progress
type: feature
created_at: 2026-10-08T13:02:15Z
updated_at: 2026-10-08T13:02:15Z
---

Plugin plugins/security-guard wiring the claude-code-cli-hook binary (~/.local/bin, built from packages/cli-hook via bun run build-bin) as PreToolUse/Bash hook. Three policies: filesystem, no-deps, git-readonly; fail-open; first-decision-wins order. User decisions: invoke by name from PATH; user removes old settings.json hooks themselves. WebSearch/WebFetch hook out of scope.
