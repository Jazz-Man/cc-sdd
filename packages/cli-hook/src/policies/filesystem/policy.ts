import { isAbsolute } from "node:path";
import type { CommandUnit } from "../../core/ast.ts";
import { ask, deny } from "../../core/decision.ts";
import type {
  Policy,
  PolicyCheckResult,
  PolicyContext,
} from "../../core/policy.ts";
import {
  type Intent,
  intentOf,
  outputTargetAt,
  redirectTargets,
} from "./intents.ts";
import {
  ASK_REASON,
  boundaryReason,
  PATH_RULE_REASON,
  SUDO_REASON,
  TIER_REASONS,
} from "./reasons.ts";
import {
  expandToken,
  HOME,
  inAllowedZone,
  pathCandidates,
  tildeUser,
  unresolvedVar,
} from "./resolve.ts";
import { type Tier, tierOf } from "./tiers.ts";

// Tiers that gate on intent: reads pass, writes/deletes deny. The remaining
// tiers (secrets, settings, git-hooks, macos-library) deny at ANY intent.
const WRITE_ONLY_TIERS = new Set<Tier>([
  "personal",
  "git-config",
  "macos-personal",
]);

// A glued short-flag path value (`tar -C/etc`, `tar -C=/etc`): tar's
// re-rooting directory rides the flag with no space, so pathCandidates sees
// a bare flag.
const GLUED_DIR_FLAG = /^-C.+/;
// The `=` separator a glued `-C=` value keeps after the flag slice.
const LEADING_EQUALS = /^=/;

// Scope rules above the zone boundary: the filesystem root denies for ANY
// intent (reads included), and the home directory as
// a whole denies writes and deletes. Whole-home READS ask instead, at the
// tail of candidateDecision.
function scopeDenyOrAsk(
  intent: Intent,
  abs: string,
  token: string,
): PolicyCheckResult {
  if (abs === "/") {
    return deny(
      `Filesystem policy: "${token}" targets the filesystem root — blocked.`,
    );
  }
  if (abs === HOME && (intent === "write" || intent === "delete")) {
    return deny(
      `Filesystem policy: "${token}" targets the home directory as a whole — ${intent} blocked.`,
    );
  }
  return null;
}

// One resolved path candidate of one argument, judged with the command's
// intent: a decision, or null. Unresolvable $-shapes and tilde-user
// spellings fail closed BEFORE classification — these
// name paths bash resolves outside every lexical class the guard has.
function candidateDecision(
  candidate: string,
  arg: string,
  intent: Intent | null,
  context: PolicyContext,
): PolicyCheckResult {
  if (unresolvedVar(candidate)) {
    return deny(
      `Filesystem policy: "${arg}" contains a shell variable the guard cannot resolve.`,
    );
  }
  if (tildeUser(candidate)) {
    return deny(
      `Filesystem policy: "${arg}" uses a tilde-user path — only ~ and ~/ are resolvable inside the guard.`,
    );
  }
  const abs = expandToken(candidate, context);
  if (abs === null) {
    return null;
  }
  const tier = tierOf(abs);
  if (tier !== null && !WRITE_ONLY_TIERS.has(tier)) {
    return deny(TIER_REASONS[tier](arg));
  }
  if (tier !== null && (intent === "write" || intent === "delete")) {
    return deny(TIER_REASONS[tier](arg));
  }
  if (intent !== null) {
    const scoped = scopeDenyOrAsk(intent, abs, arg);
    if (scoped !== null) {
      return scoped;
    }
  }
  if (!inAllowedZone(abs, context)) {
    return deny(boundaryReason(arg, abs));
  }
  if (intent === "read" && abs === HOME) {
    return ask(ASK_REASON("reading the home directory as a whole", arg));
  }
  return null;
}

// One argument's path candidates: an explicit output target wins (network
// commands), then the glued -C directory value, then the standard
// @/flag-value decomposition. Reasons quote the full original arg.
function argCandidates(arg: string, outputTarget: string | null): string[] {
  if (outputTarget !== null) {
    return [outputTarget];
  }
  if (GLUED_DIR_FLAG.test(arg)) {
    // slice(2) keeps a glued `=` separator on the value (`-C=/etc` →
    // "=/etc") — strip it so the value resolves absolute, like
    // pathCandidates' flag=value form.
    return [arg.slice(2).replace(LEADING_EQUALS, "")];
  }
  return pathCandidates(arg);
}

// One argument of one unwrapped command unit: a decision, or null. Network
// commands narrow this to explicit output targets and explicit path syntax
// (@-reads, flag=value, =@): URLs, headers and data words are not paths.
function argDecision(
  rest: string[],
  i: number,
  intent: Intent | null,
  context: PolicyContext,
): PolicyCheckResult {
  const arg = rest[i] ?? "";
  if (arg.includes("://")) {
    return null;
  }
  let outputTarget: string | null = null;
  if (intent === "network") {
    outputTarget = outputTargetAt(rest, i);
    if (outputTarget === null && pathCandidates(arg)[0] === arg) {
      return null;
    }
  }
  for (const candidate of argCandidates(arg, outputTarget)) {
    const hit = candidateDecision(candidate, arg, intent, context);
    if (hit !== null) {
      return hit;
    }
  }
  return null;
}

// One command unit: PATH rule first, then the sudo blanket rule, then the
// intent-aware walk over the unwrapped argument list.
function unitDecision(
  unit: CommandUnit,
  context: PolicyContext,
): PolicyCheckResult {
  if (isAbsolute(unit.name)) {
    return deny(PATH_RULE_REASON(unit.name));
  }
  const { intent, rest, sudo } = intentOf(unit.name, unit.args);
  if (sudo) {
    return deny(SUDO_REASON);
  }
  for (let i = 0; i < rest.length; i += 1) {
    const hit = argDecision(rest, i, intent, context);
    if (hit !== null) {
      return hit;
    }
  }
  return null;
}

// Tool-channel entry: file_path is a literal path — no $-decomposition,
// no unresolved gate.
export function checkFilePath(
  filePath: string,
  intent: "read" | "write",
  context: PolicyContext,
): PolicyCheckResult {
  const abs = expandToken(filePath, context);
  if (abs === null) {
    return null;
  }
  const tier = tierOf(abs);
  if (tier === null) {
    if (inAllowedZone(abs, context)) {
      return null;
    }
    return deny(boundaryReason(filePath, abs));
  }
  if (WRITE_ONLY_TIERS.has(tier)) {
    if (intent === "write") {
      return deny(TIER_REASONS[tier](filePath));
    }
    return null;
  }
  return deny(TIER_REASONS[tier](filePath));
}

export const filesystemPolicy: Policy = {
  check(cmd, context) {
    for (const unit of cmd.units) {
      const hit = unitDecision(unit, context);
      if (hit !== null) {
        return hit;
      }
    }
    for (const r of redirectTargets(cmd)) {
      const hit = candidateDecision(r.token, r.token, r.intent, context);
      if (hit !== null) {
        return hit;
      }
    }
    return null;
  },
  name: "filesystem",
};
