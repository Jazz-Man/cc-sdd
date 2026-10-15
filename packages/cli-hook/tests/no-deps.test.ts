import { describe, expect, it } from "bun:test";
import { noDepsPolicy } from "../src/policies/no-deps.ts";
import { policyCheck, reasonOf } from "./helpers/policy.ts";

const REASON =
  "Dependency install/update blocked: do not install, update, or remove packages (pip/uv/pipx/poetry, npm/npx/yarn/pnpm/bun/bunx, cargo/rustup, composer, gem, go get/install, swift package, brew). Ask the user to do it manually.";

const check = (command: string) => policyCheck(noDepsPolicy, command);

const DENY = [
  "pip install x",
  "pip3 install x",
  "python3 -m pip install x",
  "uv add x",
  "uv pip install x",
  "uv tool install x",
  "uv self update",
  "pipx install x",
  "poetry add x",
  "poetry self update",
  "npm install",
  "npm i",
  "npm ci",
  "npm uninstall x",
  "yarn add x",
  "yarn set version 4",
  "pnpm add x",
  "pnpm up",
  "bun add x",
  "bun i",
  "cargo add x",
  "rustup update",
  "composer require x",
  "composer global update",
  "gem install x",
  "go get x",
  "go mod tidy",
  "swift package resolve",
  "brew install x",
  "brew services start x",
  "npx create-thing",
  "bunx create-thing",
  "deno add x",
  "cd /x && npm install",
  "FOO=1 pip install x",
  "NPM i",
  "Pip3 install x",
  "Cargo ADD serde",
  "npx",
  "bunx",
  "uvx ruff",
  "uvx ruff@latest check .",
  "yarn global add x",
  "yarn global remove x",
  "npm exec --yes create-vite@latest",
  "npm create vite@latest",
  "npm init vite",
  "python3.12 -m pip install x",
];

const ALLOW = [
  "npm info x",
  "npm run build",
  "npm test",
  "pip --version",
  "python3 app.py",
  "cargo build",
  "cargo test",
  "go build ./...",
  "go mod verify",
  "brew list",
  "brew info x",
  "deno run x",
  "bun test",
  "cat package.json",
  "echo 'npm install x'",
  "man npm install",
  "NPM info x",
  "uv tool list",
  "python3.13 --version",
];

describe("no-deps policy", () => {
  it.each(DENY)("denies %s", (command) => {
    expect(reasonOf(check(command))).toBe(REASON);
  });

  it.each(ALLOW)("allows %s", (command) => {
    expect(check(command)).toBeNull();
  });
});
