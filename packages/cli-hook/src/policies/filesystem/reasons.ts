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
