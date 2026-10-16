import { baseName, type ParsedCommand } from "../../core/ast.ts";

// Glued output-flag value: the file rides `-o` with no separator, so
// pathCandidates sees a bare flag (breaker-round gap).
const GLUED_OUTPUT_FLAG = /^-o.+/;
const OUTPUT_DOCUMENT_PREFIX = "--output-document=";
// NAME=VALUE assignment token: a wrapper's variable assignments ride the
// prefix region, they are never the command.
const ASSIGNMENT_HEAD = /^[A-Za-z_][A-Za-z0-9_]*=/;

// Intent per command base name (baseName strips version suffixes). Keys are
// sorted per assist convention — the grouping lives in the VALUES: reads,
// writes, deletes, then network commands.
const INTENTS: Record<string, Intent> = {
  cat: "read",
  chmod: "write",
  chown: "write",
  cp: "write",
  curl: "network",
  dd: "write",
  df: "read",
  diff: "read",
  du: "read",
  file: "read",
  find: "read",
  grep: "read",
  head: "read",
  install: "write",
  less: "read",
  ln: "write",
  ls: "read",
  md5sum: "read",
  mkdir: "write",
  more: "read",
  mv: "write",
  nc: "network",
  rg: "read",
  rm: "delete",
  rmdir: "delete",
  rsync: "write",
  scp: "network",
  sftp: "network",
  shasum: "read",
  shred: "delete",
  ssh: "network",
  stat: "read",
  tail: "read",
  tar: "write",
  tee: "write",
  touch: "write",
  tree: "read",
  truncate: "write",
  unlink: "delete",
  wc: "read",
  wget: "network",
};

// Wrappers: the real command is args[0] (unbash flattens `env rm …`).
// `sudo` is NOT a wrapper here — any unit reaching sudo denies outright
// (SUDO_REASON, owner decision 2026-10-15). Deliberately NOT shared with
// no-inline-scripts' WRAPPERS: the sets encode different rules (interpreter
// adjacency vs intent unwrapping — e.g. `find` is a wrapper there but a
// read-intent command here); merging couples them.
const WRAPPERS = new Set(["env", "nice", "nohup", "timeout", "xargs"]);

export type Intent = "read" | "write" | "delete" | "network";

// Unwrap transparent wrappers across their own options and env assignments
// (`env X=1 tee`, `nice -n 5 cp`, `timeout 10 rm`, `xargs -I{} rm`,
// `env -u X sudo …`). The scan walks the prefix region left-to-right:
// `-`-tokens, NAME=VALUE assignments, sudo (flagged wherever seen), and
// UNKNOWN bare tokens (option values like `-u X`'s X — an unknown command
// has null intent anyway, so skipping it loses nothing) are noise; the
// first INTENTS-known token is the command. None found → intent null and
// rest = the full args (any-intent tier/boundary checks still see them).
export function intentOf(
  name: string,
  args: string[],
): { intent: Intent | null; rest: string[]; sudo: boolean } {
  let sudo = name === "sudo";
  const intent: Intent | null = INTENTS[baseName(name)] ?? null;
  if (!WRAPPERS.has(name) && name !== "sudo") {
    return { intent, rest: args, sudo };
  }
  let i = 0;
  while (i < args.length) {
    const t = args[i] ?? "";
    if (t === "sudo") {
      sudo = true;
    } else if (!(t.startsWith("-") || ASSIGNMENT_HEAD.test(t))) {
      const known = INTENTS[baseName(t)];
      if (known !== undefined) {
        return { intent: known, rest: args.slice(i + 1), sudo };
      }
      // unknown bare token: possible option value — noise, keep scanning
    }
    i += 1;
  }
  return { intent: null, rest: args, sudo };
}

// The value of an explicit output flag — separated (-o X, --output-document
// X), self-contained (--output-document=X), or GLUED (-oVALUE — the
// breaker-round gap: `curl -o/tmp/pwned` writes outside the zone when the
// value rides the flag with no separator); null when args[i] is not one.
export function outputTargetAt(args: string[], i: number): string | null {
  const a = args[i] ?? "";
  if (a.startsWith(OUTPUT_DOCUMENT_PREFIX)) {
    return a.slice(OUTPUT_DOCUMENT_PREFIX.length);
  }
  if (GLUED_OUTPUT_FLAG.test(a)) {
    return a.slice(2);
  }
  const prev = args[i - 1];
  if (prev === "-o" || prev === "--output-document") {
    return a;
  }
  return null;
}

// Redirect targets with their direction (parseCommand surfaces the exact
// operator+target pairs; unit args never carry them): `< x` is a read,
// every other redirection is a write.
export function redirectTargets(
  cmd: ParsedCommand,
): { intent: Intent; token: string }[] {
  const out: { intent: Intent; token: string }[] = [];
  for (const r of cmd.redirects) {
    if (r.operator === "<") {
      out.push({ intent: "read", token: r.target });
    } else {
      out.push({ intent: "write", token: r.target });
    }
  }
  return out;
}
