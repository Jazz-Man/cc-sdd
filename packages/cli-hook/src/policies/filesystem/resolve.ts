import { homedir } from "node:os";
import { isAbsolute, join, normalize } from "node:path";
import type { PolicyContext } from "../../core/policy.ts";

// $HOME with a name boundary: $HOMEevil is a DIFFERENT (unset) variable.
const HOME_HEAD = /^\$HOME(?![A-Za-z0-9_])/;
// Flag-headed token: bare flags stay skipped, --flag=value yields its value.
const FLAG_HEAD = /^-/;

function expandHomeToken(t: string): string | null {
  const h = homedir();
  if (h === "") {
    return null;
  }
  if (t === "~") {
    return normalize(h);
  }
  return normalize(join(h, t.slice(2)));
}

// The allowed zone is $HOME ∪ projectRoot (owner decision 2026-10-15):
// ordinary reads AND writes inside it pass; outside it both deny. The
// /dev/null family is exempt — `2>/dev/null` is daily bash plumbing.
const SAFE_DEVICES = new Set([
  "/dev/null",
  "/dev/stdin",
  "/dev/stdout",
  "/dev/stderr",
  "/dev/zero",
  "/dev/urandom",
  "/dev/random", // v1 parity (owner list 2026-10-16)
]);

const TMP_PREFIXES = [
  "/tmp/",
  "/private/tmp/",
  "/var/tmp/",
  "/private/var/tmp/",
];

// ONLY the two exact spellings anchor: `${HOME}` and boundary-checked
// `$HOME` ($HOMEevil is a DIFFERENT, unset variable — name boundary).
// Every other braced form (`${HOMEPATH}`, `${HOMEBREW_PREFIX}`,
// `${HOME:0:1}` which expands to "/") returns null and falls through to
// the raw-$ fail-closed deny — an open `${HOME` prefix strip was a zone
// escape (full opus re-review, 2026-10-16).
export function homeVarToTilde(token: string): string | null {
  if (token.startsWith("${HOME}")) {
    return `~${token.slice(7)}`;
  }
  if (HOME_HEAD.test(token)) {
    return `~${token.slice(5)}`;
  }
  return null;
}

// Tilde-user spellings (~root, ~admin, ~- → $OLDPWD) resolve to OTHER
// users' homes at runtime — only ~ and ~/… belong to this user's zone.
export function tildeUser(token: string): boolean {
  return token.startsWith("~") && token !== "~" && !token.startsWith("~/");
}

// A path-shaped token still carrying a variable after home-anchoring
// cannot be classified lexically — fail closed (Bash channel only; the
// tool channel's file_path is literal, no expansion). GLUED expansions
// (~secret from ${HOME}secret / ${HOME^}secret) expand to a SIBLING of
// home at runtime, not a path under it — one rule covers both families.
export function unresolvedVar(token: string): boolean {
  const anchored = homeVarToTilde(token);
  if (anchored === null) {
    return token.includes("$");
  }
  return (
    anchored.includes("$") || (anchored !== "~" && !anchored.startsWith("~/"))
  );
}

// Path candidates hidden inside glued argument tokens. The `=@` shapes
// matter as much as the bare ones: `curl -d=@/etc/passwd` (flag-glued) and
// `curl -F f=@/etc/hosts` (NAME=@path in a non-flag token) both carry the
// path on the value side. Plain prose `foo=/etc` (no @) stays a value word
// and never decomposes — the spec pins prose mentions as allowed.
export function pathCandidates(arg: string): string[] {
  if (arg.startsWith("@")) {
    return [arg.slice(1)];
  }
  if (FLAG_HEAD.test(arg)) {
    const eq = arg.indexOf("=");
    if (eq === -1) {
      return [];
    }
    const v = arg.slice(eq + 1);
    if (v.startsWith("@")) {
      return [v.slice(1)];
    }
    return [v];
  }
  const at = arg.indexOf("=@");
  if (at === -1) {
    return [arg];
  }
  return [arg.slice(at + 2)];
}

export function inAllowedZone(
  absPath: string,
  context: PolicyContext,
): boolean {
  if (SAFE_DEVICES.has(absPath)) {
    return true;
  }
  const h = homedir();
  if (h !== "" && (absPath === h || absPath.startsWith(`${h}/`))) {
    return true;
  }
  const root = normalize(context.projectRoot);
  return absPath === root || absPath.startsWith(`${root}/`);
}

export function isTmpPath(absPath: string): boolean {
  const p = absPath.toLowerCase(); // /TMP is /tmp on the case-insensitive root
  return p === "/tmp" || TMP_PREFIXES.some((pre) => p.startsWith(pre));
}

// Same teaching language as no-inline-scripts (which points script files at
// ./tmp/): scratch files belong at the project root's git-ignored tmp/.
export const TMP_HINT =
  " For scratch files, write to ./tmp/ at the project root — it is git-ignored there.";

// Resolve one shell token to an absolute path, or null when it is not
// path-shaped. ~ and $HOME expand; bare words resolve against cwd (they
// are file arguments of the command being inspected).
export function expandToken(
  token: string,
  context: PolicyContext,
): string | null {
  const t = homeVarToTilde(token) ?? token;
  if (t === "~" || t.startsWith("~/")) {
    return expandHomeToken(t);
  }
  if (isAbsolute(t)) {
    return normalize(t);
  }
  // Path-shaped or bare: both are file arguments of the inspected command
  // and resolve against its working directory.
  return normalize(join(context.cwd, t));
}
