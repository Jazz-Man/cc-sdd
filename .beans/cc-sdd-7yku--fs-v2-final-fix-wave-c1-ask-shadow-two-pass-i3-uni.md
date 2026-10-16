---
# cc-sdd-7yku
title: fs v2 final fix wave — C1 ask-shadow two-pass, I3 unit-name gates, I4 boundary fall-through, I6 scratch delete, spec sync
status: completed
type: task
priority: normal
created_at: 2026-10-16T17:21:01Z
updated_at: 2026-10-16T17:30:51Z
parent: cc-sdd-20zn
---

Six contained items from the whole-branch review of packages/cli-hook: C1 ask shadows later denies in one command line (two-pass check), I3 unit names escape unresolvedVar/tildeUser gates, I4 tool-channel read of write-only tier outside zone skips boundary, I6 delete src/test.ts, tiers.ts:43 comment garble, spec sync (openssl 12th network tool, SAFE_DEVICES row 5, T8 ask-under-bypass fact). TDD for C1/I3/I4; uncommitted; bun test green.

## Summary of Changes

All six wave items done, TDD-first, all uncommitted:

- C1 (critical): severityUnion in filesystem/policy.ts — deny anywhere on the line beats an earlier ask, across units, args within a unit, and redirects. Preserved the early-return denies (injection, absolute name, sudo, network). Fixture rows: ls ~; cat /etc/passwd, ls ~ && cat ~/.ssh/id_rsa, ls ~; curl example.com, ls ~ > /tmp/x (all flipped ask→deny), plus ls ~ /etc/passwd pinning the within-unit form of the same shadow.
- I3: unresolvedVar/tildeUser gates at the top of unitDecision (before intentOf); reasons extracted to UNRESOLVED_VAR_REASON/TILDE_USER_REASON constants shared with candidateDecision. Fixtures: EVIL-var tool args and ~root/evil.sh args (both deny). ~/bin/tool verified still allow.
- I4: checkFilePath read of a write-only tier now falls through to the boundary check instead of early-null; pins Read /opt/repo/.git/config deny + Read /proj/.git/config allow in run-hook.test.ts.
- I6: deleted src/test.ts (imported by nothing; its tsc error cleared).
- tiers.ts comment garble fixed (case-insensitive restored).
- Spec sync: openssl as 12th §7.3 tool, three extra SAFE_DEVICES in §7.5 row 5, §3 ask-under-bypass replaced with the answered T8 fact.

Battery: bun test 445 pass / 0 fail (436 + 9 new), tsc clean, rtk biome check ok.
