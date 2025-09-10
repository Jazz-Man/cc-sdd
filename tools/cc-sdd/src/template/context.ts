import { resolveKiroDir, type KiroDirOptions } from '../resolvers/kiroDir.js';
import { resolveAgentLayout, type AgentType, type CCSddConfig } from '../resolvers/agentLayout.js';

export interface BuildTemplateContextOptions {
  agent: AgentType;
  lang: 'ja' | 'en' | 'zh-TW';
  kiroDir?: KiroDirOptions;
  config?: CCSddConfig;
}

export type TemplateContext = {
  LANG_CODE: string;
  DEV_GUIDELINES: string;
  KIRO_DIR: string;
  AGENT_DIR: string;
  AGENT_DOC: string;
  AGENT_COMMANDS_DIR: string;
};

const guidelinesMap: Record<'ja' | 'en' | 'zh-TW', string> = {
  en: '- Think in English, generate responses in English',
  ja: '- Think in English, but generate responses in Japanese (思考は英語、回答の生成は日本語で行うように)',
  'zh-TW': '- 以英文思考，但以繁體中文生成回應（Think in English, generate in Traditional Chinese）',
};

export const getDevGuidelines = (lang: 'ja' | 'en' | 'zh-TW'): string => guidelinesMap[lang];


export const buildTemplateContext = (opts: BuildTemplateContextOptions): TemplateContext => {
  const kiro = resolveKiroDir(opts.kiroDir ?? {});
  const layout = resolveAgentLayout(opts.agent, opts.config);
  return {
    LANG_CODE: opts.lang,
    DEV_GUIDELINES: getDevGuidelines(opts.lang),
    KIRO_DIR: kiro,
    AGENT_DIR: layout.agentDir,
    AGENT_DOC: layout.docFile,
    AGENT_COMMANDS_DIR: layout.commandsDir,
  };
};
