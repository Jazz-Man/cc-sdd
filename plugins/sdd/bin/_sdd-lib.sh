#!/bin/sh
# _sdd-lib.sh - shared beans-query parsing for the sdd bin/ helpers.
# Sourced by sdd-gate / sdd-promote / sdd-phase / sdd-next, never executed
# directly. Every function is read-only: beans CLI queries and shasum only.
#
# Conventions:
#   - beans query --json prints pretty JSON, one field per physical line;
#     the awk parsers below depend on that shape (drift-guarded in callers).
#   - child/descendant records are TAB-separated lines:
#     children:     id <TAB> title <TAB> status <TAB> tags
#     descendants:  id <TAB> parentId <TAB> status <TAB> tags <TAB> title
#     tags normalized to a bare comma list (no spaces, no quotes).

TAB=$(printf '\t')
SDD_MAX_DEPTH=8

# sdd_bean_query <id> <graphql-fields> - print the raw JSON of one bean query.
sdd_bean_query() {
    beans query --json "{ bean(id: \"$1\") { $2 } }"
}

# sdd_bean_field <json> <field> - extract a top-level scalar from a
# pretty-printed single-bean query result (empty when absent).
sdd_bean_field() {
    printf '%s\n' "$1" | sed -n "s/^ *\"$2\": \"\\(.*\\)\",*$/\\1/p"
}

# sdd_children_records <bean-id> - one TAB record per child, nothing when the
# bean is missing or childless. Shared parser (was duplicated in sdd-gate and
# sdd-promote).
sdd_children_records() {
    beans query --json "{ bean(id: \"$1\") { children { id title status tags } } }" | awk '
        BEGIN { n = 0 }
        /^ *"bean": *null/ { exit }
        /^ *"children":/ { inch = 1; if ($0 ~ /: *\[\]/) exit; next }
        inch && /^ *"id": /     { s = $0; sub(/^ *"id": "/, "", s); sub(/",$/, "", s);     id[n] = s;  next }
        inch && /^ *"title": /  { s = $0; sub(/^ *"title": "/, "", s); sub(/",$/, "", s);  ti[n] = s;    next }
        inch && /^ *"status": / { s = $0; sub(/^ *"status": "/, "", s); sub(/",$/, "", s); st[n] = s;    next }
        inch && /^ *"tags": /   { s = $0; sub(/^ *"tags": \[/, "", s); sub(/\][, ]*$/, "", s); gsub(/"/, "", s); gsub(/ +/, "", s); tg[n] = s; n++; next }
        END { for (i = 0; i < n; i++) print id[i] "\t" ti[i] "\t" st[i] "\t" tg[i] }
    '
}

# sdd_walk <bean-id> <depth> - recursive descendant printer (internal).
# Emits id <TAB> parentId <TAB> status <TAB> tags <TAB> title lines in BFS
# discovery order. Depth-capped as a cycle guard. Positional parameters only:
# recursion restores $1/$2 per frame, while a named global would be clobbered
# by the recursive call mid-loop and shift every later record's parent.
_sdd_walk() {
    [ "$2" -le "$SDD_MAX_DEPTH" ] || return 0
    _w_kids=$(sdd_children_records "$1")
    [ -n "$_w_kids" ] || return 0
    while IFS="$TAB" read -r wcid wctitle wcstatus wctags; do
        [ -n "$wcid" ] || continue
        printf '%s\t%s\t%s\t%s\t%s\n' "$wcid" "$1" "$wcstatus" "$wctags" "$wctitle"
        _sdd_walk "$wcid" "$(($2 + 1))"
    done <<EOF
$_w_kids
EOF
}

# sdd_descendants_records <bean-id> - every descendant (task tree walk).
sdd_descendants_records() {
    _sdd_walk "$1" 1
}

# sdd_find_phases - read children records on stdin; set the phase globals.
# Matches sdd-gate's contract: exact "Phase - <name>" titles plus the
# `phase` tag.
# shellcheck disable=SC2034  # the PHASE_* globals are consumed by the sourcing scripts
# Sets PHASE_REQ/PHASE_DES/PHASE_TSK ids, PHASE_REQ_STATUS/
# PHASE_DES_STATUS/PHASE_TSK_STATUS statuses, PHASE_REQ_TAGS/PHASE_DES_TAGS.
# CALLER CONTRACT: feed via heredoc (`sdd_find_phases <<EOF ... EOF`), never
# via a pipe - the globals would be set in a subshell and lost.
sdd_find_phases() {
    PHASE_REQ=""; PHASE_DES=""; PHASE_TSK=""
    PHASE_REQ_STATUS=""; PHASE_DES_STATUS=""; PHASE_TSK_STATUS=""
    PHASE_REQ_TAGS=""; PHASE_DES_TAGS=""
    while IFS="$TAB" read -r pid ptitle pstatus ptags; do
        [ -n "$pid" ] || continue
        case ",$ptags," in
            *,phase,*) ;;
            *) continue ;;
        esac
        case $ptitle in
            "Phase — requirements") PHASE_REQ=$pid; PHASE_REQ_STATUS=$pstatus; PHASE_REQ_TAGS=$ptags ;;
            "Phase — design")       PHASE_DES=$pid; PHASE_DES_STATUS=$pstatus; PHASE_DES_TAGS=$ptags ;;
            "Phase — tasks")        PHASE_TSK=$pid; PHASE_TSK_STATUS=$pstatus ;;
        esac
    done
}

# sdd_epic_spec_dir <epic-id> - print the epic's `Spec path:` value (empty
# when the body carries none).
sdd_epic_spec_dir() {
    sdd_bean_query "$1" "body" | sed -n 's/.*Spec path: \([^\\"]*\).*/\1/p' | head -n 1
}

# sdd_latest_doc_hash <phase-bean-id> - print the LATEST `Doc-hash: <sha256>`
# value from the bean body (empty when none). Validation rounds append, so
# only the last line counts.
sdd_latest_doc_hash() {
    sdd_bean_query "$1" "body" | awk '
        /^ *"body": / {
            s = $0
            sub(/^ *"body": "/, "", s)
            sub(/",?$/, "", s)
            gsub(/\\n/, "\n", s)
            n = split(s, lines, "\n")
            for (i = n; i >= 1; i--)
                if (lines[i] ~ /^[- ]*Doc-hash: [0-9a-fA-F][0-9a-fA-F]*$/) {
                    v = lines[i]
                    sub(/^[- ]*Doc-hash: /, "", v)
                    print v
                    exit
                }
        }
    '
}

# sdd_check_doc_fresh <phase-bean-id> <spec-dir> <doc-name> - verify the
# recorded hash exists and equals the current sha256 of <spec-dir>/<doc-name>.
# Prints nothing; returns 0 fresh, 1 stale/missing (diagnosis on stdout:
# "nohash" | "nodoc" | "stale").
sdd_check_doc_fresh() {
    _cf_phase=$1 _cf_dir=$2 _cf_doc=$3
    _cf_doc_path="$_cf_dir/$_cf_doc"
    [ -f "$_cf_doc_path" ] || { echo nodoc; return 1; }
    _cf_recorded=$(sdd_latest_doc_hash "$_cf_phase")
    [ -n "$_cf_recorded" ] || { echo nohash; return 1; }
    _cf_current=$(shasum -a 256 "$_cf_doc_path")
    _cf_current=${_cf_current%% *}
    [ "$_cf_recorded" = "$_cf_current" ] || { echo stale; return 1; }
    return 0
}

# sdd_blocked_ids - read a bean-query JSON on stdin; print one blocker id
# per line from `blockedByIds`. Handles every observed shape: inline
# arrays (["a","b"]), empty arrays ([]), null, and pretty multiline arrays.
sdd_blocked_ids() {
    awk '
        /"blockedByIds":/ {
            if ($0 ~ /: null/) next
            s = $0
            sub(/^.*"blockedByIds": *\[/, "", s)
            if (s ~ /^\]/) next
            while (s !~ /\]/ && (getline more) > 0) s = s " " more
            gsub(/[\[\]"]/, " ", s)
            gsub(/,/, " ", s)
            n = split(s, arr, / +/)
            for (i = 1; i <= n; i++) if (arr[i] != "") print arr[i]
        }
    '
}

# sdd_active_epics - print one line per in-progress epic bean:
# id <TAB> title. Mirrors impl Step 0 (`beans list -t epic -s in-progress`).
sdd_active_epics() {
    beans list --json -t epic -s in-progress | awk '
        /^ *"id": /    { s = $0; sub(/^ *"id": "/, "", s);    sub(/",$/, "", s); id = s; next }
        /^ *"title": / { s = $0; sub(/^ *"title": "/, "", s); sub(/",$/, "", s); print id "\t" s; id = ""; next }
    '
}
