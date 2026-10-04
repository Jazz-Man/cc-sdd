// SKILL.md frontmatter — the full Claude Code field set, typed for a
// JSON-object -> Bun.YAML.stringify pipeline. Sources: the frontmatter
// reference at code.claude.com/docs/en/skills (checked 2026-10-02, behavior
// up to v2.1.28x), the "Hooks in skills and agents" section of the hooks
// reference, and the installed @anthropic-ai/claude-agent-sdk (sdk.d.ts
// declarative hooks config + the HookEvent union; the SDK ships no
// frontmatter schema of its own).

// Smoke demo: a valid metadata object flowing through the future pipeline.
const HOOK_TIMEOUT_S = 30;

const demo: SkillFrontmatter = {
  "allowed-tools": ["Read", "Bash(git diff:*)"],
  description:
    "Use when generating SKILL.md frontmatter as a typed JSON object and rendering it to YAML.",
  hooks: {
    // biome-ignore lint/style/useNamingConvention: literal Claude Code event name
    PreToolUse: [
      {
        hooks: [
          {
            // biome-ignore lint/suspicious/noTemplateCurlyInString: placeholder substituted by Claude Code, not a template
            command: "${CLAUDE_PROJECT_DIR}/scripts/check.sh",
            timeout: HOOK_TIMEOUT_S,
            type: "command",
          },
        ],
        matcher: "Write|Edit",
      },
    ],
  },
  name: "building-skill-metadata",
  // biome-ignore lint/style/useNamingConvention: the one underscored frontmatter key
  when_to_use: "Drafting or validating skill metadata for Claude Code",
};

console.log(Bun.YAML.stringify(demo, null, 2));

/** Fields shared by all five handler kinds. */
interface HookCommon {
  /**
   * Permission rule ("Bash(git *)") gating the run — tool events only.
   * Exactly one rule, no chaining; a non-matching call never spawns the hook.
   */
  if?: string;
  /**
   * Remove the hook after its first successful run.
   * Honored ONLY in skill frontmatter; ignored in settings and agents.
   */
  once?: boolean;
  /** Custom spinner message shown while the hook runs. */
  statusMessage?: string;
  /** Timeout in seconds. Defaults: 600 command/http/mcp_tool, 30 prompt, 60 agent. */
  timeout?: number;
}

/** Discriminated handler union — the `type` tag picks the variant. */
export interface CommandHook extends HookCommon {
  /** Exec form: spawn directly, one argument per element, no shell parser. */
  args?: string[];
  /** Run in background without blocking. Command hooks only. */
  async?: boolean;
  /** Background run that wakes the model on exit code 2. Command hooks only. */
  asyncRewake?: boolean;
  /**
   * Shell command (shell form) or executable path (exec form with args).
   * Placeholders: ${CLAUDE_PROJECT_DIR}, ${CLAUDE_PLUGIN_ROOT},
   * ${CLAUDE_PLUGIN_DATA}.
   */
  command: string;
  shell?: "bash" | "powershell";
  type: "command";
}

export interface HttpHook extends HookCommon {
  /** Env var names that may be interpolated into header values. */
  allowedEnvVars?: string[];
  /** Header values may use $VAR / ${VAR}; only allowedEnvVars interpolate. */
  headers?: Record<string, string>;
  type: "http";
  /** Endpoint receiving the hook input JSON as POST body. */
  url: string;
}

export interface McpToolHook extends HookCommon {
  /** Tool arguments; string values support ${path} from the hook input
   *  (e.g. "${tool_input.file_path}"). */
  input?: Record<string, unknown>;
  /** Already-configured MCP server to invoke. */
  server: string;
  /** Tool name on that server. */
  tool: string;
  type: "mcp_tool";
}

export interface PromptHook extends HookCommon {
  /** true: an ok:false result feeds the reason back and the turn continues
   *  instead of ending. Prompt hooks only. */
  continueOnBlock?: boolean;
  model?: string;
  /** Prompt evaluated by the small fast model; $ARGUMENTS = hook input JSON. */
  prompt: string;
  type: "prompt";
}

export interface AgentHook extends HookCommon {
  model?: string;
  /** Verification agent (Read/Grep/Glob, up to 50 turns). */
  prompt: string;
  type: "agent";
}

export type HookHandler =
  | AgentHook
  | CommandHook
  | HttpHook
  | McpToolHook
  | PromptHook;

/** Every lifecycle event a hook can subscribe to (33; SDK sdk.d.ts:971). */
export type HookEvent =
  | "PreToolUse"
  | "PostToolUse"
  | "PostToolUseFailure"
  | "PostToolBatch"
  | "Notification"
  | "UserPromptSubmit"
  | "UserPromptExpansion"
  | "SessionStart"
  | "SessionEnd"
  | "Stop"
  | "StopFailure"
  | "SubagentStart"
  | "SubagentStop"
  | "PreCompact"
  | "PostCompact"
  | "PreModelSwitch"
  | "PostModelSwitch"
  | "PermissionRequest"
  | "PermissionDenied"
  | "Setup"
  | "TeammateIdle"
  | "TaskCreated"
  | "TaskCompleted"
  | "Elicitation"
  | "ElicitationResult"
  | "ConfigChange"
  | "WorktreeCreate"
  | "WorktreeRemove"
  | "InstructionsLoaded"
  | "CwdChanged"
  | "FileChanged"
  | "DirectoryAdded"
  | "MessageDisplay";

/**
 * One matcher group. Matcher: exact tool name, a |- or ,-separated list, or a
 * JS regex. Silently ignored on events that carry no matcher (Stop,
 * TaskCreated/Completed, PostToolBatch, UserPromptSubmit, TeammateIdle,
 * WorktreeCreate/Remove, MessageDisplay, CwdChanged).
 */
export interface HookMatcherGroup {
  hooks: HookHandler[];
  matcher?: string;
}

/** The `hooks:` block of SKILL.md frontmatter — same format as settings.json.
 *  Skill hooks register on skill invocation and live for the session. */
export type SkillHooks = Partial<Record<HookEvent, HookMatcherGroup[]>>;

/** The six fields the Agent Skills spec accepts (claude.ai / Skills API
 *  uploads hard-error on anything outside this subset). */
export type SkillSpecFrontmatter = Pick<
  SkillFrontmatter,
  | "allowed-tools"
  | "compatibility"
  | "description"
  | "license"
  | "metadata"
  | "name"
>;

export interface SkillFrontmatter {
  /** Subagent type under context: fork. Default "general-purpose";
   *  built-ins "Explore" and "Plan". */
  agent?: string;
  /** Tools pre-approved during the invoking turn, e.g. "Bash(git add:*) Read".
   *  Space/comma string or YAML list. */
  "allowed-tools"?: string | string[];
  /** Autocomplete hint for arguments, e.g. "[issue-number]". */
  "argument-hint"?: string;
  /** Named positional arguments substituted as $name in the body.
   *  Space-separated string or YAML list. */
  arguments?: string | string[];
  /** context: fork only. false: wait for the fork's result in the turn.
   *  Default true. */
  background?: boolean;
  /** Environment requirements, <=500 chars (spec field; not acted on). */
  compatibility?: string;
  /** "fork": run the skill in an isolated forked subagent. */
  context?: "fork";
  /** What the skill does and when to use it — the only recommended field.
   *  Fallback: first non-empty body line. No angle brackets; combined with
   *  when_to_use it is truncated at 1536 chars in the listing. */
  description?: string;
  /** true: Claude never auto-invokes the skill (/name only). Default false. */
  "disable-model-invocation"?: boolean;
  /** Tools removed from the pool while the skill is active. */
  "disallowed-tools"?: string | string[];
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  hooks?: SkillHooks;
  /** License (Agent Skills spec field; accepted, not acted on). */
  license?: string;
  /** Free-form YAML map for own tooling. Claude Code does not read it and
   *  drops non-map values; skill field names must not be used as keys. */
  metadata?: Record<string, unknown>;
  /** Model override while active, or "inherit" to keep the session model. */
  model?: string;
  /** Command name in the / menu; defaults to the directory name.
   *  <=64 chars, [a-z0-9-] only, no XML tags, no "claude"/"anthropic". */
  name?: string;
  /** Glob patterns limiting auto-activation (e.g. "docs/**" or "*.test.ts"),
   *  comma string or YAML list. */
  paths?: string | string[];
  /** Shell for !`cmd` injections into the model context. Default "bash". */
  shell?: "bash" | "powershell";
  /** false: hidden from the / menu; only Claude can invoke it. Default true. */
  "user-invocable"?: boolean;
  /** Extra triggers/examples appended to description in the listing.
   *  Underscored — the ONE non-hyphenated key. */
  // biome-ignore lint/style/useNamingConvention: literal frontmatter key, cannot be camelCase
  when_to_use?: string;
}
