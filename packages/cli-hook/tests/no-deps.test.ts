import { describe, expect, it } from "bun:test";
import { noDepsPolicy } from "../src/policies/no-deps.ts";
import { ALLOW, DENY } from "./fixtures/no-deps.ts";
import { policyCheck, reasonOf } from "./helpers/policy.ts";

const REASON =
  "Dependency install/update blocked: do not install, update, or remove packages (pip/uv/pipx/poetry, npm/npx/yarn/pnpm/bun/bunx, cargo/rustup, composer, gem, go get/install, swift package, brew). Ask the user to do it manually.";

const check = (command: string) => policyCheck(noDepsPolicy, command);

describe("no-deps policy", () => {
  it.each(DENY)("denies %s", (command) => {
    expect(reasonOf(check(command))).toBe(REASON);
  });

  it.each(ALLOW)("allows %s", (command) => {
    expect(check(command)).toBeNull();
  });
});
