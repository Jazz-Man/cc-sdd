export type AgentType = 'claude-code' | 'gemini-cli' | 'qwen-code';

export interface AgentLayout {
  commandsDir: string;
  agentDir: string;
  docFile: string;
}

export interface CCSddConfig {
  agentLayouts?: Partial<Record<AgentType, Partial<AgentLayout>>>;
}

export const resolveAgentLayout = (agent: AgentType, config?: CCSddConfig): AgentLayout => {
  const defaults: Record<AgentType, AgentLayout> = {
    'claude-code': {
      commandsDir: '.claude/commands/kiro',
      agentDir: '.claude',
      docFile: 'CLAUDE.md',
    },
    'gemini-cli': {
      commandsDir: '.gemini/commands',
      agentDir: '.gemini',
      docFile: 'GEMINI.md',
    },
    'qwen-code': {
      commandsDir: '.qwen/commands',
      agentDir: '.qwen',
      docFile: 'QWEN.md',
    },
  };

  const base = defaults[agent];
  const override = config?.agentLayouts?.[agent] ?? {};
  return { ...base, ...override } as AgentLayout;
};
