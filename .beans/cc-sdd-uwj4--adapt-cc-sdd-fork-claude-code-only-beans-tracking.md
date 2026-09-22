---
# cc-sdd-uwj4
title: 'Adapt cc-sdd fork: Claude Code-only, beans tracking, .claude/rules steering'
status: in-progress
type: task
priority: normal
created_at: 2026-09-22T15:57:37Z
updated_at: 2026-09-22T21:30:21Z
---

Umbrella bean for refactoring the cc-sdd fork:
- Remove everything not related to Claude Code (multi-agent templates, CLI, installer)
- Keep Claude Code skills + doc/spec/steering templates as the repo's core
- Migrate all task tracking from spec.json/tasks.md checkboxes to beans CLI (no duplicated beans instructions, just references)
- Replace .kiro/steering mechanism with native .claude/rules/ + integrate the global 'steering' skill into this project
- Remove all non-English instructions/docs/examples (ja, zh-TW, -ja spec examples)
- Target: future Claude Code plugin (no installer needed)
Status: research + prompt optimization + brainstorm phase

## Scope clarifications (from user, 2026-09-22)

- .github/workflows: DO NOT touch — separate future flow, out of scope
- .kiro/specs/: contains only demo examples (en/ja) — all deleted, none needed
- .kiro/settings/: rendered dogfood copy of tools/cc-sdd/templates/shared/settings (placeholders resolved) — content needed, must be consolidated to a single source of truth in the fork
- Non-English content: delete (docs/README_ja, zh-TW, docs/guides/ja/, tools/cc-sdd/README_ja|zh-TW, .kiro/specs/*-ja)
- AGENTS.md: multi-agent duplicate of CLAUDE.md — remove in Claude-only fork

## Brainstorm decisions (2026-09-22, round 1)

1. Repo layout: PLUGIN LAYOUT NOW — plugin manifest + plugin dir structure from day one, testable locally as a plugin. No .claude/skills dogfood layout. Plugin format facts being verified via docs before design.
2. Specs path: fixed .sdd/ at project root — all specs under .sdd/specs/, same path always, NO {{KIRO_DIR}} placeholder/config machinery (hardcode the path, delete resolver concept). User quote: 'всі спеки жили за одним і тим же шляхом завжди на рівні проекту'.
3. Skill names: RENAME kiro-* → sdd-* (all 17 skills, CLAUDE.md, docs, cross-refs).
4. spec.json: DROP entirely — no phase/approvals/updated_at, no language field. Feature name = directory name. English-only output.

- CORRECTION: .zed/ STAYS (user's IDE config — never delete)

## Brainstorm decisions (2026-09-22, round 2 — final)

5. Shared assets: PLUGIN ROOT — assets/ dir (rules/ + spec doc templates), referenced via ${CLAUDE_PLUGIN_ROOT}. Single source of truth, no per-skill duplication. (Mechanism verified in docs.)
6. Workflow map: NEW /sdd:init skill (user's design) — on explicit invocation writes .claude/rules/sdd.md into the TARGET project (workflow map: .sdd/ paths, phase flow, skill index, beans emphasis) AND injects the same instructions into the current session. Plugin never mutates target files otherwise. Old docs/CLAUDE.md template + {{DEV_GUIDELINES}} pipeline: deleted. Plugin itself verified UNABLE to ship CLAUDE.md/rules — this is the replacement.
7. Plugin name + granularity: plugin 'sdd', skills with BARE names (init, discovery, impl, spec-quick, validate-impl, steering...) → invocation /sdd:impl, /sdd:spec-quick, /sdd:init. The sdd- prefix lives in the namespace.
8. Execution: DIRECT, IN WAVES — 5 waves, each a child bean: (1) purge non-Claude/non-English, (2) plugin skeleton + relocation + rename + path hardcode .sdd/, (3) beans migration in skills + drop spec.json, (4) steering skill integration + /sdd:init, (5) docs/README.

Verified plugin facts (code.claude.com docs, 2026-09-22): .claude-plugin/plugin.json (only name required, marketplace.json not needed for local); components at plugin ROOT not in .claude-plugin/; skills namespaced /plugin:skill; local dev via claude --plugin-dir + /reload-plugins; ${CLAUDE_PLUGIN_ROOT}/${CLAUDE_SKILL_DIR}/${CLAUDE_PROJECT_DIR} substitutions in skill content; skills may ship arbitrary supporting files; SKILL.md frontmatter metadata is free-form; plugin CANNOT contribute CLAUDE.md or .claude/rules to host.

## Direction update (2026-09-22, user clarification)

NEW TOP PRIORITY: 'sdd-*' must execute ANY work in SUBAGENTS (user runs almost 100% of approved work in subagents — tasks are large).
- User's reference implementation: the superpowers plugin (installed from claude-plugins-official, v6.1.1) — its brainstorm → approved plan → subagent execution flow is the pattern to adopt. Deep research launched.
- Repo's own claude-code-agent variant (tools/cc-sdd/templates/agents/claude-code-agent: 9 agents + 12 commands) has subagent support — being mapped as second input.
- RESOLVED (user, final): skills/ DIRECTORIES with bare names — user first leaned toward commands, then confirmed skills after seeing the research ('давай краще все ж використовувати скіли'). Locked: /sdd:impl, /sdd:spec-quick, /sdd:init.
Research agents: superpowers-research (obra/superpowers architecture), cc-dispatch-guide (platform dispatch mechanics), cca-variant-map (claude-code-agent variant).

## Research input 1/3: claude-code-agent variant mapped (direct reads)

Architecture: commands = THIN WRAPPERS, agents = FULL EXECUTORS.
- commands/*.md (.claude/commands/kiro/ → /kiro:spec-impl): frontmatter {description, allowed-tools: Read, Task, argument-hint}; body = parse args → validate paths → parse task selection in MAIN context → Task(subagent_type=..., prompt) → display result + next-step guidance.
- agents/*.md (.claude/agents/kiro/, names like spec-tdd-impl-agent, spec-design-agent): frontmatter {name, description, tools allowlist, model: inherit, color}; body = full protocol: receive prompt with file path PATTERNS (not expanded lists) → Step 0 expand via Glob itself → load spec+steering → validate approvals → execute (TDD RED/GREEN/REFACTOR/VERIFY or design discovery full/light) → update tracking → concise report (<200 words).
Patterns worth adopting: pattern-based context handoff (subagent self-expands via Glob); model: inherit + per-agent tools allowlist; 'clear context before impl' hygiene notes; structured small handoff prompts.
Gaps vs skills variant: NO discovery, spec-batch, debug/review/verify-completion protocols, NO independent per-task reviewer (impl agent self-reports; modern kiro-impl has implementer/reviewer/debugger trio) — must merge the two designs.

## Research input 2/3: superpowers subagent architecture (obra/superpowers@main 6.4.1; local install 6.1.1 — cache stripped, mid-2026 refinements unverified locally)

CORE: NO named agent types, NO agents/*.md, NO commands/. Dispatch = plain general-purpose subagents via Agent/Task tool; role defined entirely by PROMPT-TEMPLATE FILES beside the skill (implementer-prompt.md, task-reviewer-prompt.md, re-review-prompt.md, code-reviewer.md). SKILL.md itself = orchestration program the controller follows.

File-based handoff in per-plan git-ignored workspace .superpowers/sdd/<plan-slug>/:
- task-brief script extracts '### Task N' from plan → task-N-brief.md
- implementer writes task-N-report.md, returns <=15-line status contract: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- review-package script writes commits+stat+diff into a file reviewer reads in ONE call
- append-only progress.md ledger survives compaction, drives resume

Loop: implementer → task review (spec+quality) → fix loop MAX 5 rounds (1-3 resume same agent, 4-5 fresh implementer on stronger model), scoped re-review each round → breaker adjudication ledgered → final whole-branch review on most capable model. Minor findings NEVER enter the loop (blocking only).

CONVERGENCE for our design: .sdd/specs/<feature>/ doubles as the per-plan workspace (briefs/reports/review-packages as ARTIFACTS on disk) while beans holds EXECUTION STATE (status/blocked/notes) — clean division: state=beans, artifacts=files. kiro-impl's implementer/reviewer/debugger trio + structured verdicts already mirrors this; superpowers adds: escalation policy (same→fresh+stronger model), scoped re-review, diff-bundle review packages, append-only ledger, whole-branch final review.

## superpowers addenda (full report)

1. BOOTSTRAP MECHANISM: plugin ships hooks/hooks.json with ONE SessionStart hook (matcher startup|clear|compact) that cats skills/using-superpowers/SKILL.md and injects it as additionalContext wrapped in <EXTREMELY_IMPORTANT>. 'The bootstrap is the entire integration. Without it, the skill files are inert.' Re-injection on clear|compact survives compaction. Includes <SUBAGENT-STOP> so dispatched subagents ignore it. → RELEVANT TO US: plugin-shipped SessionStart hook is a verified alternative/complement to /sdd:init rules-file for delivering the workflow map every session WITHOUT touching any target file. Present both options in synthesis.
2. PLAN FORMAT = DISPATCH CONTRACT: every plan starts with 'For agentic workers: REQUIRED SUB-SKILL: use superpowers:subagent-driven-development' header → our tasks.md equivalent should carry a mandatory sdd:impl invocation header.
3. Skill correspondence (superpowers ↔ ours): brainstorming≈discovery, writing-plans≈spec-tasks, subagent-driven-development≈impl, executing-plans≈inline-fallback, test-driven-development/systematic-debugging/verification-before-completion≈impl-TDD/kiro-debug/kiro-verify-completion, requesting+receiving-code-review≈kiro-review, using-git-worktrees + finishing-a-development-branch = no counterpart (candidates to adopt), writing-skills/diagnosing-superpowers = meta (not needed).
4. Brainstorm gating: 3 announced paths (spike/bounded/architectural, 'when in doubt take the heavier one'), <HARD-GATE> approval sequencing: conversational approval→write spec; written-spec approval→invoke writing-plans; plan approval→choose subagent vs inline execution.

## Docs verification: commands/skills/agents/subagent dispatch (round 2)
- [x] Verified commands/ vs skills/ status, plugin agents/ format, SKILL.md fork frontmatter (agent/context/background/model/effort), Agent-tool dispatch from skill bodies, subagent context inheritance, and documented limits against code.claude.com docs (plugins-reference, plugins, skills, sub-agents, tools-reference, permissions) — report delivered to team lead

## Research input 3/3: platform dispatch mechanics (code.claude.com docs, verified 2026-09-22)

COMMANDS VS SKILLS (sections 1-2 received):
- commands/ fully supported, NOT deprecated — but docs steer new plugins to skills/; 'Custom commands have been merged into skills'; in plugins commands/ LOAD AS SKILLS; skills = STRICT SUPERSET (directory with supporting files, name/paths frontmatter — commands are flat .md without name/paths).
- DECISIVE FOR US: our design ships prompt-template FILES beside each orchestrator skill (superpowers pattern) → requires directories → skills/ wins. User's invocation concern (/sdd:impl slash UX) is identical for skills. 'Forced user-only invocation' = disable-model-invocation: true (both forms).
- Plugin agents/ frontmatter (verified): name, description, model, effort, maxTurns, tools, disallowedTools, skills, memory, background, omitClaudeMd, isolation: 'worktree'. Plugin agents IGNORE hooks/mcpServers/permissionMode (security).
- Invocation: auto-delegation by description; @-mention 'plugin:agent'; claude --agent plugin:agent; Agent tool subagent_type = scoped 'plugin:agent' string [Inference — docs never show literal Agent call with scoped name].
Sections 3-6 (agent:/background:/context:fork semantics, in-body dispatch, inheritance, limits) requested — pending.

## Research complete: platform dispatch semantics (skills.md, tools-reference, sub-agents docs)

- context: fork — VERIFIED: skill starts a NEW subagent, fresh context ('doesn't see your conversation history'; NOT a conversation fork). Stacked-skill expansion stops at a forked skill; forked edits bypass checkpoints.
- agent: — ONLY meaningful WITH context: fork ('which subagent type to use when context: fork is set'); bare names only (Explore/Plan/general-purpose or .claude/agents/ custom); plugin-scoped names in agent: NOT documented.
- background: — forks default background:true (narrowed tool set!); background:false waits in-turn AND keeps full tools → use background:false for our generative skills. -p/SDK always waits.
- model: with fork = sets forked subagent's model; effort: likewise ('the skill it forked from' counts).
- Skills run INLINE in main conversation and keep normal tools incl. Agent tool → orchestrator pattern works; parallel dispatch documented; parent sees only final results; background delivers completion notification later; SendMessage follow-ups to running agents.
- [Inference] Agent tool subagent_type takes scoped 'plugin:agent' string (consistent with @-mention/--agent/hook matchers; no literal example in docs).
- OPEN MINOR GAPS (non-blocking): sections 5-6 not delivered (default context inheritance of subagents; concurrency/nesting limits) — pattern-based handoff makes them non-critical.

## SYNTHESIS — recommended architecture (all research merged)
1. skills/ DIRECTORIES (not flat commands): strict superset, supporting files required by prompt-template pattern; UX identical (/sdd:impl); disable-model-invocation available.
2. Two execution tiers: GENERATIVE skills (spec-init/requirements/design/tasks/batch/validate-*) run as subagents by design via context: fork + background: false (+ model/effort tuning); ORCHESTRATOR sdd:impl runs inline (loop, beans state, commits, UX gateways) and dispatches per-task implementer/reviewer/debugger subagents via Agent tool (general-purpose + prompt-template file), model param = escalation lever (superpowers rounds 4-5), isolation: worktree available directly as Agent tool param (platform-native, replaces agents/*.md need for now).
3. Interactive gateway moments (approvals, clarifications) stay in main context — subagents can't hold user dialogue.
4. State=beans, artifacts=files in .sdd/specs/<feature>/ (task briefs, reports, review packages, implementation notes).
5. tasks.md successor = static plan doc headed with REQUIRED: sdd:impl dispatch contract, no live checkboxes.
6. Bootstrap: SessionStart hook injecting workflow map (survives clear/compact, zero file mutation) as recommended default + /sdd:init opt-in writing .claude/rules/sdd.md for persistence-in-repo.

## Bootstrap refinement (FINAL, user 2026-09-22)

Hook-first WITH PRECEDENCE RULE: SessionStart hook injects the workflow map ONLY IF <project>/.claude/rules/sdd.md does NOT exist (hook = shell command, existence check trivial: [ ! -f ... ]). If the file exists (created via /sdd:init, possibly customized per project), hook stays SILENT — user's file overrides plugin default. /sdd:init remains the opt-in writer.

Wave 1 start: user NOT ready yet — discussion/adjustments pending. Do not start waves until explicit go.

## User motivation & final design deltas (2026-09-22)

Background: user tried GitHub's original SDD framework (too heavy, enterprise/token-budget), then cc-sdd (liked, but dropped from workflow due to the BUTs this refactor fixes), superpowers (good subagent execution, but chronic pains). Goal: best of cc-sdd (Kiro-derived structure) + superpowers (subagent execution) for personal workflow.

NEW LOCKED DECISIONS:
A. GIT READ-ONLY everywhere: delete ALL commit/branch/staging instructions from orchestrator and skills (current kiro-impl self-commits per task — removed). Only git log/status/diff allowed. User's global hooks ban git writes anyway.
B. STOP-PER-TASK default in /sdd:impl: task → review loop → verify → STOP with handoff report (files, diff summary, test results, beans state) → USER reviews/tests/commits manually → resume next task from beans. Autonomous multi-task runs NOT default.
C. DECLARATIVE MODEL MAPPING (hardwired, never agent's choice; kills tmux model-inheritance pain): requirements/design/tasks GENERATION=opus; ALL reviews & validations (task-reviewer, re-review, validate-*, whole-branch final)=opus; implementer=sonnet; fix-loop rounds 4-5 escalate implementer→opus. Encoded in forked-skill frontmatter model: + Agent-call model param in prompt templates.
D. QUESTION POLICY: clarifying questions ONLY in discovery + requirements phases; design & tasks are CONFIRM-ONLY ('review, any edits?'). Matches superpowers behavior user liked.
E. STRUCTURED DOCS + MERMAID stay core (design.md High-Level Architecture + mermaid); ADD conciseness discipline to authoring rules (diagrams/tables over prose walls — addresses 'approved but unread plans' failure mode).
F. SPLITTING: keep discovery/roadmap/spec-batch (dependency waves); LSP-first research guidance in discovery/design phases.

ARCHITECTURE REFINEMENT: two tiers → THREE interaction patterns:
1. Interactive (discovery, requirements questioning, approvals) — main context, research delegated to subagents
2. Generative-autonomous (spec-design, spec-tasks, validate-*, reviews) — context: fork + background: false + model: opus pinned
3. Orchestrator (impl) — inline loop + per-task subagents per templates, stop-per-task

Rationale notes: user picks Opus manually in main chat today — pinned model in forks is strictly more reliable; ~30% of their superpowers spec+plan runs had model-choice/hallucination gaps requiring extra correction cycles.

## Refinements round 3 (2026-09-22)

1. STOP REPORT SLIMMED: user watches changes live in IDE (runs Claude Code in terminal inside IDE) → NO diff summary, NO changed-files list, NO beans-state recap in the stop report. SHORT report only; test results = optional one-liner if tests ran. Keep superpowers-style task status output (user liked it).
2. ESCALATION POLICY (critical): NO BLIND DECISIONS EVER. Any concern/minor problem/deviation from plan during work — even when review passed and plan-conformance OK (DONE_WITH_CONCERNS path) — escalates to user with four-part format: (a) how it should be per plan, (b) what actually happened, (c) why it matters, (d) resolution options (accept as-is / fix / abort / other). User decides. Encode in implementer/reviewer prompt templates + orchestrator rules.
3. CONSISTENCY DISCIPLINE replaces conciseness discipline: brevity NOT a goal (big tasks need volume; compression loses architecture moments); walls of text acceptable. HARD requirement: tables and diagrams (mermaid) 100% consistent with the prose and with user's description + research findings. Fidelity over compression.
4. RESEARCH + OPTIONS PROPOSAL: during discovery/requirements/design the agent runs its own research (codebase, LSP, docs/API/web tools) and PROPOSES solution options with trade-offs (superpowers-style), never picks silently. Aligns with no-blind-decisions.
5. BEANS ROADMAP INTEGRATION (verified: beans roadmap renders milestones/epics → Markdown; flags --status/--include-done/--no-links; also exists: check, prime, init, graphql, tui): DESIGN — discovery's roadmap.md (checkbox state file) REPLACED by beans hierarchy: milestone bean = initiative, epic beans = specs (one per spec), --blocked-by = dependency waves; spec-batch queries beans (list/roadmap) instead of parsing markdown checkboxes. brief.md STAYS (narrative context, not state). Principle: state=beans applies to multi-spec level too.

## Refinement round 4 (2026-09-22): interaction format

POLICY — ALL choice-points/questions to the user go through AskUserQuestion, ALWAYS (superpowers does it mostly; user wants 100%). Hybrid format (user likes superpowers' style, keep it):
1. Detailed explanation FIRST in chat prose (approaches, trade-offs, reasoning) — the tool is not a substitute for the analysis
2. THEN AskUserQuestion with compact options: recommended option FIRST labeled '(Recommended)', short labels, <=4 questions per call, related questions batched, one-at-a-time only when next question depends on the answer; built-in 'Other' covers free text
3. NEVER plain-text 'which do you prefer?' endings

PLATFORM NUANCE to encode: subagents do NOT ask user questions directly — they return status contracts (NEEDS_CONTEXT / DONE_WITH_CONCERNS / BLOCKED + four-part explanation) and the ORCHESTRATOR in main context formulates the AskUserQuestion. Interactive gateways live in main context (established architecture decision); applies to impl stop-points and escalation resolution options (accept as-is / fix / abort).

Answer to user's question: cc-sdd/kiro skills have NO structured-question convention (free-form 'ask the user') — nothing better to import; the hybrid above formalizes the superpowers pattern with the always-tool guarantee. User's global steering skill already uses AskUserQuestion explicitly — consistent.

WHERE ENCODED: (1) workflow map (bootstrap hook + /sdd:init rules file), (2) interactive skills (discovery, spec-requirements questioning, approvals), (3) impl orchestrator stop/escalation points, (4) subagent prompt templates (route questions via status contracts).

## Brainstorm (superpowers:brainstorming v6.4.1, resumed after /reload-plugins)

Approach selected: A — MIGRATE IN PLACE (5 waves, repo loadable after each), with B-borrowing: skills whose internals transform >50% (impl, tracking parts of spec-*) rewritten fresh on the basis of old; proven content (templates/rules/protocols) ported verbatim. Spec scope: ONE spec. Next: sectioned design presentation → spec doc → self-review → user gate → writing-plans.

## Spec written (2026-09-22)

Design spec: docs/superpowers/specs/2026-09-22-sdd-plugin-conversion-design.md
- Sectioned design presented & approved (correction applied: /sdd:init writes ONLY sdd rules into .claude/rules/sdd.md — no session briefing in the file; one-line in-chat note after write)
- Self-review fixed 3 defects: (1) review-package built from WORKING-TREE diff (agents never make commits — none exist mid-task), (2) spec-requirements is inline-interactive, dispatches only drafting to opus subagent (forked skill cannot ask questions), (3) brief.md relocated to .sdd/brief.md (workstream-level)
- Spec file left uncommitted per user's read-only-git rule — user commits manually
- Status: USER REVIEW GATE — awaiting spec approval, then writing-plans
- Side note: .beans/ contains two agent-created beans (cc-sdd-0gd1 plugin-format-verification, cc-sdd-koql superpowers-research) — background research agents tracked their own work; housekeeping pending

Spec APPROVED by user (2026-09-22). Brainstorming skill complete. Transitioning to superpowers:writing-plans per skill's terminal state.

## Implementation plan written (2026-09-22)

Plan: docs/superpowers/plans/2026-09-22-sdd-plugin-conversion.md
- 16 tasks, bite-sized steps; template Commit steps replaced by STOP steps (user reviews/records snapshots manually per read-only-git); tests = grep invariants + claude plugin validate + behavior checklists + E2E dry-run
- Self-review caught and fixed ORDER BUG: purge-first would delete relocation sources; corrected execution order 3-4-5-1-2-6...16
- Declared adaptation 'Content discipline': short artifacts verbatim in plan; long prose rewrites as complete outlines with verbatim contract blocks
- Review Focus: 5 failure modes pinned to tasks (surviving git-write prose; missing background:false; stale identifiers; literal git-write adjacency tripping user's hook; beans-guide duplication)
- Execution method preserved: subagent-driven (user's standing choice)
- Status: PLAN REVIEW GATE — awaiting user approval, then superpowers:subagent-driven-development

## Revision 2 — single active feature (2026-09-23, user clarification)

User NEVER works multiple features in parallel: one branch per feature, full cycle, cancel = branch deleted with everything. /compact between features is personal session hygiene — NOT sdd's concern (state on disk makes sdd session-agnostic).
CHANGES applied to spec + plan:
- NEW spec §5.5 Single active feature: active feature = the single in-progress epic (resolved from beans, no arguments); spec-init/discovery alone accept a new feature name; spec-init refuses while an in-progress epic exists; follow-up features queued (todo + blocked-by active)
- spec-batch DELETED (16→15 skills): sequential epic queue replaces parallel wave generation
- Cancellation = first-class escalation outcome (epic+tasks scrapped; branch deletion by user carries artifacts+beans away)
- Plan: Tasks 3 (14 moves), 5 (hardcode note corrected), 6 (arg-hint [task-id], active-feature resolution), 8 (spec-init refusal), 10 rewritten discovery-only, 14 (map rules + 15 names), 16 (15 names); Global Constraints + self-review revision stamp
- Sanity grep: all spec-batch mentions are deletion-context; no feature-arg leftovers
