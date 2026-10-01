import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractBlocks } from "./helpers/extract.ts";

describe("extractBlocks", () => {
  test("parses ts and typescript fences, flags fragments", () => {
    const dir = mkdtempSync(join(tmpdir(), "pb-extract-"));
    const md = join(dir, "fixture.md");
    writeFileSync(
      md,
      [
        "# T",
        "",
        "```ts",
        "console.log(1);",
        "```",
        "",
        "```typescript",
        "console.log(2);",
        "```",
        "",
        "```ts fragment",
        "prompt().anythingGoes();",
        "```",
        "",
        "```text",
        "not code",
        "```",
        "",
      ].join("\n"),
    );
    const blocks = extractBlocks(md);
    const expectedBlockCount = 3;
    expect(blocks).toHaveLength(expectedBlockCount);
    expect(blocks[0]).toMatchObject({ fragment: false, index: 0 });
    expect(blocks[1]).toMatchObject({ fragment: false, index: 1 });
    expect(blocks[2]).toMatchObject({ fragment: true, index: 2 });
    rmSync(dir, { force: true, recursive: true });
  });
});
