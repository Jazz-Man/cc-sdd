// tests/examples-run.test.ts
import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { extractBlocks, skillMarkdownFiles } from "./helpers/extract.ts";

// Temp dir inside the tests tree so block imports resolve the repo's
// node_modules — the system tmpdir has no node_modules ancestor.
const TMP_BASE = join(import.meta.dir, ".tmp");

const runnable = skillMarkdownFiles()
  .flatMap(extractBlocks)
  .filter((b) => !b.fragment);

afterAll(() => {
  rmSync(TMP_BASE, { force: true, recursive: true });
});

describe("skill examples execute against the installed library", () => {
  test("there are runnable examples to check", () => {
    expect(runnable.length).toBeGreaterThan(0);
  });

  for (const block of runnable) {
    test(`${block.file} block #${block.index} runs`, async () => {
      mkdirSync(TMP_BASE, { recursive: true });
      const dir = mkdtempSync(join(TMP_BASE, "pb-skill-"));
      const file = join(dir, `b${block.index}.ts`);
      writeFileSync(file, block.code);
      try {
        await import(file);
      } finally {
        rmSync(dir, { force: true, recursive: true });
      }
    });
  }
});
