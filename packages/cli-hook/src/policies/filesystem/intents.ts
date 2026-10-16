import { parseEnv } from "node:util";
import { baseName, type ParsedCommand } from "../../core/ast.ts";

// NAME=VALUE assignment token: a wrapper's variable assignments ride the
// prefix region, they are never the command. node:util parseEnv detects
// them gracefully ({}) on non-assignments and handles quoted values
// (X="a b").
function isAssignment(token: string): boolean {
  return Object.keys(parseEnv(token)).length > 0;
}

// Intent per command base name (baseName strips version suffixes). Keys are
// sorted per assist convention — the grouping lives in the VALUES: reads,
// writes, deletes.
const INTENTS: Record<string, Intent> = {
  cat: "read",
  chmod: "write",
  chown: "write",
  cp: "write",
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
  rg: "read",
  rm: "delete",
  rmdir: "delete",
  rsync: "write",
  shasum: "read",
  shred: "delete",
  stat: "read",
  tail: "read",
  tar: "write",
  tee: "write",
  touch: "write",
  tree: "read",
  truncate: "write",
  unlink: "delete",
  wc: "read",
};

// Network tools deny on the unwrapped unit name alone (spec §7.3 blanket):
// no network command runs, so nothing about one is parsed. The wrapper scan
// flags them wherever seen — like sudo — so `env curl …` denies like
// `env sudo …` does.
const NETWORK_TOOLS = new Set([
  "curl",
  "wget",
  "nc",
  "ssh",
  "scp",
  "sftp",
  "ping",
  "dig",
  "host",
  "nslookup",
  "whois",
  "openssl",
]);

// Wrappers: the real command is args[0] (unbash flattens `env rm …`).
// `sudo` is NOT a wrapper here — any unit reaching sudo denies outright
// (SUDO_REASON). Deliberately NOT shared with
// no-inline-scripts' WRAPPERS: the sets encode different rules (interpreter
// adjacency vs intent unwrapping — e.g. `find` is a wrapper there but a
// read-intent command here); merging couples them.
const WRAPPERS = new Set(["env", "nice", "nohup", "timeout", "xargs"]);

export type Intent = "read" | "write" | "delete";

// Unwrap transparent wrappers across their own options and env assignments
// (`env X=1 tee`, `nice -n 5 cp`, `timeout 10 rm`, `xargs -I{} rm`,
// `env -u X sudo …`). The scan walks the prefix region left-to-right:
// `-`-tokens, NAME=VALUE assignments, and UNKNOWN bare tokens (option
// values like `-u X`'s X — an unknown command has null intent anyway, so
// skipping it loses nothing) are noise; the first INTENTS-known token is
// the command. sudo and NETWORK_TOOLS names are flagged wherever seen in
// the region — both deny on the unwrapped name, before any argument walk.
// None found → intent null and rest = the full args (any-intent
// tier/boundary checks still see them).
export function intentOf(
  name: string,
  args: string[],
): {
  intent: Intent | null;
  rest: string[];
  sudo: boolean;
  network: string | null;
} {
  let sudo = name === "sudo";
  const base = baseName(name);
  const intent: Intent | null = INTENTS[base] ?? null;
  let network: string | null = null;
  if (NETWORK_TOOLS.has(base)) {
    network = base;
  }
  if (!WRAPPERS.has(name) && name !== "sudo") {
    return { intent, network, rest: args, sudo };
  }
  let i = 0;
  while (i < args.length) {
    const t = args[i] ?? "";
    if (t === "sudo") {
      sudo = true;
    } else if (!(t.startsWith("-") || isAssignment(t))) {
      const known = INTENTS[baseName(t)];
      if (known !== undefined) {
        return { intent: known, network, rest: args.slice(i + 1), sudo };
      }
      if (network === null) {
        const tool = baseName(t);
        if (NETWORK_TOOLS.has(tool)) {
          network = tool;
        }
      }
      // unknown bare token: possible option value — noise, keep scanning
    }
    i += 1;
  }
  return { intent: null, network, rest: args, sudo };
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
