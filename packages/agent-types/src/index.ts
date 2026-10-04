import type { HookEvent, Settings } from "@anthropic-ai/claude-agent-sdk";

export type {
  HookEvent,
  PreModelSwitchHookSpecificOutput,
  PreToolUseHookSpecificOutput,
  Settings,
  SyncHookJSONOutput,
} from "@anthropic-ai/claude-agent-sdk";

// The SDK declares the five declarative handler kinds inline inside
// Settings["hooks"] with no exported names — derive them by indexed access.
export type SkillHooksConfig = NonNullable<Settings["hooks"]>;
export type HookMatcherGroup = SkillHooksConfig[string][number];
export type DeclarativeHandler = NonNullable<HookMatcherGroup["hooks"]>[number];
export type HookHandler = DeclarativeHandler;
export type CommandHook = Extract<DeclarativeHandler, { type: "command" }>;
export type HttpHook = Extract<DeclarativeHandler, { type: "http" }>;
export type McpToolHook = Extract<DeclarativeHandler, { type: "mcp_tool" }>;
export type PromptHook = Extract<DeclarativeHandler, { type: "prompt" }>;
export type AgentHook = Extract<DeclarativeHandler, { type: "agent" }>;

// The SDK keys events loosely as `[k: string]`; tightening to its own
// HookEvent union is the single authored narrowing — field shapes stay
// SDK-derived (spec §6.1).
export type SkillHooks = Partial<Record<HookEvent, HookMatcherGroup[]>>;
