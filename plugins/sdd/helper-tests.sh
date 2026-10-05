#!/bin/sh
# helper-tests.sh - sandbox test suite for the sdd bin/ helpers (tree model).
#
# Self-contained: builds a throwaway beans store + spec docs + a task tree
# in a mktemp sandbox, then walks the full phase/queue lifecycle against
# bin/ (sdd-phase, sdd-gate, sdd-next, sdd-promote). Read-only towards this
# repository; the sandbox is removed on exit.
#
# Native beans parent rules (verified against the installed CLI):
#   task parents: milestone | epic | feature ; feature under feature refused.
# So the task tree is: epic -> feature-type MAJOR containers -> task LEAVES,
# plus flat task children of the epic for undecomposed work.
set -u
BIN=$(CDPATH='' cd -- "$(dirname -- "$0")/bin" && pwd)

sandbox=$(mktemp -d "${TMPDIR:-/tmp}/sdd-helper-tests.XXXXXX")
trap 'rm -rf "$sandbox"' EXIT INT TERM
cd "$sandbox" || exit 2

beans init >/dev/null
mkdir -p .sdd/specs/t1/workspace
printf '# Requirements\ntest\n' > .sdd/specs/t1/requirements.md
printf '# Design\ntest\n' > .sdd/specs/t1/design.md
REQ_SHA=$(shasum -a 256 .sdd/specs/t1/requirements.md | cut -d' ' -f1)
DES_SHA=$(shasum -a 256 .sdd/specs/t1/design.md | cut -d' ' -f1)

pass=0; fail=0
check() { # check <desc> <want_rc> <grep-pattern> -- cmd...
    desc=$1; want=$2; pat=$3; shift 4
    out=$("$@" 2>&1); rc=$?
    if [ "$rc" = "$want" ] && printf '%s' "$out" | grep -qE "$pat"; then
        pass=$((pass+1)); echo "ok   $desc"
    else
        fail=$((fail+1)); echo "FAIL $desc (rc=$rc want=$want)"; printf '%s\n' "$out" | sed 's/^/     /'
    fi
}
newid() { sed -n 's/.*"id": "\([^"]*\)".*/\1/p' | head -1; }
mkbean() { # mkbean <type> <title> <status> <parent> [blocked-by] ; prints id
    typ=$1; title=$2; st=$3; par=$4; blk=${5:-}
    if [ -n "$blk" ]; then
        beans create --json "$title" -t "$typ" -s "$st" --parent "$par" --blocked-by "$blk" -d "## Brief" | newid
    else
        beans create --json "$title" -t "$typ" -s "$st" --parent "$par" -d "## Brief" | newid
    fi
}
phase_bean() { # phase_bean <title> <status> ; prints id (tagged `phase` at birth)
    beans create --json "$1" -t task -s "$2" --parent "$E" --tag phase -d "## Brief" | newid
}

E=$(beans create --json "t1 landing page" -t epic -s in-progress -d "Spec path: .sdd/specs/t1/" | newid)

# --- A: spec-design blocked while requirements phase is open -------------------
PR=$(phase_bean "Phase — requirements" in-progress)
check "A spec-design refused (req phase open)" 1 "phase-completed.*spec-requirements" -- "$BIN/sdd-phase" sdd:spec-design

# --- B: complete+validate requirements -> spec-design passes -------------------
beans update "$PR" -s completed --tag validated --body-append "## Validation

- Doc-hash: $REQ_SHA" >/dev/null
check "B spec-design passes (req completed+validated+fresh)" 0 "PHASE PASS" -- "$BIN/sdd-phase" spec-design

# --- C/D: design phase; stale hash caught; latest hash wins ---------------------
check "C spec-tasks refused (design phase missing)" 1 "Phase — design.*spec-init" -- "$BIN/sdd-phase" spec-tasks
PD=$(phase_bean "Phase — design" in-progress)
beans update "$PD" -s completed --tag validated --body-append "## Validation

- Doc-hash: $DES_SHA" >/dev/null
check "D1 spec-tasks passes" 0 "PHASE PASS" -- "$BIN/sdd-phase" spec-tasks
printf '\n<!-- edit -->\n' >> .sdd/specs/t1/design.md
check "D2 spec-tasks refused (design.md stale)" 1 "freshness.*spec-design" -- "$BIN/sdd-phase" spec-tasks
NEW_DES_SHA=$(shasum -a 256 .sdd/specs/t1/design.md | cut -d' ' -f1)
beans update "$PD" --body-append "- Doc-hash: $NEW_DES_SHA" >/dev/null   # later round wins
check "D3 spec-tasks passes after re-validation round" 0 "PHASE PASS" -- "$BIN/sdd-phase" spec-tasks

# --- E/F: tasks phase; impl gate before/after promotion ------------------------
check "E impl gate fails (tasks phase missing)" 1 "Phase — tasks.*spec-init" -- "$BIN/sdd-phase" impl
PT=$(phase_bean "Phase — tasks" in-progress)
beans update "$PT" -s completed >/dev/null
check "F1 gate fails (no task beans)" 1 "no task beans" -- "$BIN/sdd-gate" "$E"

# --- H: the task tree (drafts): majors = feature containers, leaves = tasks -----
M1=$(mkbean feature "1 Project initialization" draft "$E")
L11=$(mkbean task "1.1 Dependencies install" draft "$M1")
L12=$(mkbean task "1.2 Linters setup" draft "$M1" "$L11")
M2=$(mkbean feature "2 Navigation section" draft "$E" "$M1")
L21=$(mkbean task "2.1 Nav bar component" draft "$M2")
F3=$(mkbean task "3 Footer section" draft "$E" "$M2")
check "F2 gate fails (drafts not promoted)" 1 "draft.*spec-tasks" -- "$BIN/sdd-gate" "$E"

# --- J: promote the whole tree ---------------------------------------------------
out=$("$BIN/sdd-promote" "$E" --all 2>&1); rc=$?
n=$(printf '%s\n' "$out" | grep -c '^.')
if [ "$rc" = 0 ] && [ "$n" = 6 ]; then pass=$((pass+1)); echo "ok   J promote --all promotes 6 tree beans"; else fail=$((fail+1)); echo "FAIL J (rc=$rc n=$n)"; printf '%s\n' "$out" | sed 's/^/     /'; fi
check "J2 promote refuses non-draft" 1 "not draft" -- "$BIN/sdd-promote" "$E" "$L11"

# --- K: gates pass with the promoted tree ----------------------------------------
check "K1 gate passes with tree queue" 0 "GATE PASS" -- "$BIN/sdd-gate" "$E"
check "K2 sdd-phase impl passes" 0 "GATE PASS" -- "$BIN/sdd-phase" impl

# --- L-P: the execution walk -----------------------------------------------------
check "L next = 1.1" 0 "NEXT: $L11 - 1\.1" -- "$BIN/sdd-next"
beans update "$L11" -s completed >/dev/null
check "M next = 1.2 after 1.1 done" 0 "NEXT: $L12 - 1\.2" -- "$BIN/sdd-next"
beans update "$L12" -s completed >/dev/null
check "N1 rollup pending for major 1" 0 "ROLLUP: $M1" -- "$BIN/sdd-next"
check "N2 rollup-pending guidance (leaves of 2 gated via major chain)" 0 "ROLLUP-PENDING" -- "$BIN/sdd-next"
beans update "$M1" -s completed >/dev/null
check "O1 next = 2.1 after rollup" 0 "NEXT: $L21 - 2\.1" -- "$BIN/sdd-next"
beans update "$L21" -s completed >/dev/null
check "O2 rollup pending for major 2" 0 "ROLLUP: $M2" -- "$BIN/sdd-next"
beans update "$M2" -s completed >/dev/null
check "P0 next = 3 (flat task) after major 2" 0 "NEXT: $F3 - 3 " -- "$BIN/sdd-next"
beans update "$F3" -s completed >/dev/null
check "P1 finished" 0 "FINISHED" -- "$BIN/sdd-next"
check "P2 gate reports feature finished" 0 "feature finished" -- "$BIN/sdd-gate" "$E"

# --- Q/R: single-active-feature guards -------------------------------------------
check "Q spec-init refused (active exists)" 1 "single active feature" -- "$BIN/sdd-phase" spec-init
E2=$(beans create --json "another feature" -t epic -s in-progress -d x | newid)
check "R next refuses two active epics" 1 "single-active-feature" -- "$BIN/sdd-next"
beans update "$E2" -s scrapped >/dev/null
check "S unrestricted skill passes" 0 "no phase precondition" -- "$BIN/sdd-phase" sdd:review

echo "----"
echo "pass=$pass fail=$fail"
[ "$fail" = 0 ]
