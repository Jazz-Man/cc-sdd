import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface ExampleBlock {
  code: string;
  file: string; // repo-relative markdown path
  fragment: boolean; // true → not runnable standalone, skip
  index: number; // nth code block in the file
}

const SKILL_DIR = join(
  import.meta.dir,
  "..",
  "..",
  ".claude",
  "skills",
  "prompt-builder",
);
const REPO_ROOT = join(import.meta.dir, "..", "..");

export function skillMarkdownFiles(): string[] {
  const refs = join(SKILL_DIR, "references");
  return [
    join(SKILL_DIR, "SKILL.md"),
    ...readdirSync(refs)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .map((f) => join(refs, f)),
  ];
}

export function extractBlocks(mdPath: string): ExampleBlock[] {
  const text = readFileSync(mdPath, "utf8");
  const blocks: ExampleBlock[] = [];
  const re = /```(?:ts|typescript)( fragment)?\n([\s\S]*?)```/g;
  let i = 0;
  for (const m of text.matchAll(re)) {
    blocks.push({
      code: m[2] ?? "",
      file: mdPath.slice(REPO_ROOT.length + 1),
      fragment: m[1] !== undefined,
      index: i++,
    });
  }
  return blocks;
}
