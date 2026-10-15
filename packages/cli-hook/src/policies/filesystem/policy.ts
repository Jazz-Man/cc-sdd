import { deny } from "../../core/decision.ts";
import type {
  Policy,
  PolicyCheckResult,
  PolicyContext,
} from "../../core/policy.ts";
import { boundaryReason, TIER_REASONS } from "./reasons.ts";
import {
  expandToken,
  inAllowedZone,
  pathCandidates,
  tildeUser,
  unresolvedVar,
} from "./resolve.ts";
import { type Tier, tierOf } from "./tiers.ts";

// Write-only tiers until intent arrives: the Bash channel cannot tell read
// from write in an argument list, so Task 2 lets their reads pass.
const writeOnlyTier = (tier: Tier) =>
  ["personal", "git-config", "macos-personal"].includes(tier);

// One resolved path candidate of one argument: a decision, or null.
function candidateDecision(
  candidate: string,
  arg: string,
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
  if (tier === null) {
    if (inAllowedZone(abs, context)) {
      return null;
    }
    return deny(boundaryReason(arg, abs));
  }
  if (writeOnlyTier(tier)) {
    return null; // intent-aware handling arrives in Task 3
  }
  return deny(TIER_REASONS[tier](arg));
}

// One argument of one command unit: a decision, or null for "no opinion".
// The Bash channel walks pathCandidates so glued tokens (@/etc/passwd,
// --file=/tmp/x.tar) classify their value side; bare flags stay skipped.
function argDecision(arg: string, context: PolicyContext): PolicyCheckResult {
  if (arg.includes("://")) {
    return null;
  }
  for (const candidate of pathCandidates(arg)) {
    const decision = candidateDecision(candidate, arg, context);
    if (decision !== null) {
      return decision;
    }
  }
  return null;
}

// Tool-channel entry (Task 6 wires Read/Edit/Write/NotebookEdit here).
// file_path is a literal path — no $-decomposition, no unresolved gate.
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
  if (writeOnlyTier(tier)) {
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
      for (const arg of unit.args) {
        const decision = argDecision(arg, context);
        if (decision !== null) {
          return decision;
        }
      }
    }
    return null;
  },
  name: "filesystem",
};
