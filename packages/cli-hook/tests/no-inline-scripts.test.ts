import { describe, expect, it } from "bun:test";
import { parseCommand } from "../src/core/ast.ts";
import { noInlineScriptsPolicy } from "../src/policies/no-inline-scripts.ts";

const REASON =
  "Inline scripts are blocked (interpreter -e/-c/--eval, shell -c/eval, stdin-fed scripts): inline code cannot be reviewed for safety. Write the script to a file under ./tmp/ and run that file instead — project linters and checkers can then review it.";

const check = (command: string) => {
  const cmd = parseCommand(command);
  if (cmd === null) {
    return null;
  }
  return noInlineScriptsPolicy.check(cmd, { cwd: "/proj" });
};

const DENY = [
  "bun -e 'console.log(1)'",
  // biome-ignore lint/security/noSecrets: shell command fixture, not a secret
  // biome-ignore lint/suspicious/noTemplateCurlyInString: literal JS template syntax inside the shell payload
  "bun -e '\n  let a = 0n, b = 1n;\n  for (let i = 0; i < 100; i++) { const nx = a + b; a = b; b = nx; if (i === 78 || i === 99) console.log(`F(${i+1}) = ${a}`); }\n  console.log(\"MAX_SAFE =\", Number.MAX_SAFE_INTEGER);'",
  "bun --eval 'console.log(1)'",
  "node -e 'console.log(1)'",
  "node --eval 'console.log(1)'",
  "node -p '1 + 1'",
  "node --print '1 + 1'",
  "python -c 'print(1)'",
  "python3 -c 'print(1)'",
  "python -uc 'print(1)'",
  "ruby -e 'puts 1'",
  "perl -e 'print 1'",
  "perl -E 'say 1'",
  "php -r 'echo 1;'",
  "deno eval 'console.log(1)'",
  "osascript -e 'display notification \"hi\"'",
  "bash -c 'echo hi'",
  "bash -ic 'echo hi'",
  "sh -c 'echo hi'",
  "zsh -c 'echo hi'",
  "eval 'echo hi'",
  "env python -c 'print(1)'",
  "sudo bash -c 'echo hi'",
  "FOO=1 python -c 'print(1)'",
  "cd tmp && python -c 'print(1)'",
  "echo $(python -c 'print(1)')",
  "echo 'print(1)' | python",
  "echo 'console.log(1)' | node",
  "cat script.sh | bash",
  "python -",
  "node -",
  // biome-ignore lint/security/noSecrets: heredoc fixture, not a secret
  "python - <<'EOF'\nprint(1)\nEOF",
  "find . -type f | xargs sh -c 'echo $0'",
  // versioned interpreter names
  "python3.13 -c 'print(1)'",
  "python3.12 -c 'print(1)'",
  "node20 -e 'console.log(1)'",
  "perl5.34 -e 'print 1'",
  "ruby3.2 -e 'puts 1'",
  "env python3.13 -c 'print(1)'",
  // fish was missing entirely
  "fish -c 'echo hi'",
];

const ALLOW = [
  "sed 's/a/b/' file.txt",
  "awk '{print $1}' file.txt",
  "grep -c pattern file.txt",
  "sort -c file.txt",
  "head -c 100 file.txt",
  "tail -c 50 file.txt",
  "cut -c 1-5 file.txt",
  "node --version",
  "python3 --version",
  "python3 tmp/fib.py",
  "python -u tmp/fib.py",
  "python -m venv .venv",
  "bun tmp/fib.ts",
  "bun run build",
  "bun test",
  "bash plugins/sdd/helper-tests.sh",
  "sh generate.sh",
  'echo "use python -c carefully"',
  "man bash",
  "git status",
  "python3.13 --version",
  "node22 --version",
];

describe("no-inline-scripts policy", () => {
  it.each(DENY)("denies %s", (command) => {
    const out = check(command)?.hookSpecificOutput;
    let reason: string | undefined;
    if (out?.hookEventName === "PreToolUse") {
      reason = out.permissionDecisionReason;
    }
    expect(reason).toBe(REASON);
  });

  it.each(ALLOW)("allows %s", (command) => {
    expect(check(command)).toBeNull();
  });
});
