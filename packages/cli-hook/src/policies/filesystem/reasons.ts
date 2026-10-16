import { isTmpPath, TMP_HINT } from "./resolve.ts";
import type { Tier } from "./tiers.ts";

export function boundaryReason(token: string, absPath: string): string {
  let reason = `Filesystem policy: "${token}" is outside the allowed zone ($HOME or the project) — reads and writes there are blocked.`;
  if (isTmpPath(absPath)) {
    reason += TMP_HINT;
  }
  return reason;
}

// Keyed by Tier so the compiler enforces a reason for every tier.
export const TIER_REASONS: Record<Tier, (token: string) => string> = {
  "git-config": (token) =>
    `Filesystem policy: writing "${token}" is blocked — git configuration changes belong to the user (git-readonly owns the CLI path too).`,
  "git-hooks": (token) =>
    `Filesystem policy: "${token}" lives under .git/hooks — reading, writing, or running hook files is blocked (hooks execute as the user, outside the guard).`,
  "macos-library": (token) =>
    `Filesystem policy: "${token}" is inside ~/Library (Keychains, Safari, Mail, app data) — blocked in all channels.`,
  "macos-personal": (token) =>
    `Filesystem policy: writing "${token}" (a macOS personal folder: Desktop, Documents, Downloads, Movies, Music, Pictures, Public) is blocked.`,
  personal: (token) =>
    `Filesystem policy: writing "${token}" (personal config) is blocked — persistence vector.`,
  secrets: (token) =>
    `Filesystem policy: "${token}" is a protected secrets path — reads and writes are blocked in all channels.`,
  settings: (token) =>
    `Filesystem policy: "${token}" is a protected Claude settings file — agents must not read or change the guard's own configuration.`,
};

// The ask verdict keeps its confirm-with-user instruction by owner
// exception (DENY reasons carry no advisory tails; asks must tell the user
// what confirming means) — the exception covers that phrasing, never a
// disable tail.
export const ASK_REASON = (verb: string, token: string) =>
  `Filesystem policy: confirm with the user before ${verb} ("${token}"). This call needs explicit user approval.`;

export const PATH_RULE_REASON = (bin: string) =>
  `Filesystem policy: running binaries by absolute path ("${bin}") is blocked — commands are on PATH by name.`;

export const SUDO_REASON =
  "Filesystem policy: sudo is blocked — privilege escalation is never an agent operation; every needed command runs under the user account.";
