// Canonical-output snapshot tests for @kasava/prompt-builder 0.3.0.
// Structural assertions over full-string equality: pin the shape of the
// rendering contract (persona line, table escaping, cache boundaries, budget
// trimming) without freezing byte-exact markdown.
import { describe, expect, test } from "bun:test";
import {
  definePrompt,
  MissingVarError,
  prompt,
  text,
  toMessages,
} from "@kasava/prompt-builder";

describe("canonical outputs", () => {
  test("role renders a persona line", () => {
    const out = prompt().role("match scorer", "with RAG tools").build();
    expect(out).toContain("You are a");
    expect(out).toContain("match scorer");
    expect(out).toContain("with RAG tools");
  });

  // Verified against 0.3.0 source (chunk lookupTable): an empty `rows` skips the
  // table node only — the title heading is still emitted.
  test("lookupTable with empty rows renders no table", () => {
    const out = prompt()
      .lookupTable({ columns: ["A", "B"], rows: [], title: "T" })
      .build();
    expect(out).not.toContain("|"); // the empty table itself is skipped
    expect(out).toContain("## T"); // the title heading survives
  });

  test("pipe in a table cell is escaped", () => {
    const out = prompt()
      .table(["a", "b"], [["has | pipe", "ok"]])
      .build();
    expect(out).toContain("\\|");
    expect(out.match(/\n/g)?.length).toBeLessThan(5); // one row survived as one row
  });

  test("render throws MissingVarError for a required variable", () => {
    const t = definePrompt("x", { name: text().notNull() }).body((v) =>
      prompt().raw(`Hi ${v.name}`),
    );
    expect(() => t.render({} as never)).toThrow(MissingVarError);
  });

  test("toMessages marks only pre-boundary blocks", () => {
    const msgs = toMessages(
      prompt().guidelines(["Be direct."]).cacheBoundary().tag("req", "x"),
    );
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toMatchObject({ cache_control: { type: "ephemeral" } });
    expect(msgs[1]).not.toHaveProperty("cache_control");
  });

  test("$budget returns a new, trimmed builder", () => {
    const full = prompt()
      .priority("required")
      .include(prompt().guidelines(["Answer only from the context."]))
      .priority("low")
      .include(prompt().heading("Examples", 2).raw("…".repeat(400)));
    const trimmed = full.$budget({ maxTokens: 30 });
    expect(trimmed).not.toBe(full);
    expect(trimmed.build().length).toBeLessThan(full.build().length);
    expect(full.build()).toContain("Examples"); // original untouched
  });
});
