import { type ParsedScript, parse } from "unbash";

function wordLike(obj: Record<string, unknown>): boolean {
  return typeof obj.text === "string" && typeof obj.value === "string";
}

// Strip a trailing version suffix from a command name: python3.13 → python,
// node20 → node, perl5.34 → perl. Policies look tools up by this base name so
// versioned binaries cannot sidestep a table keyed on the plain name.
const VERSION_SUFFIX = /\d+(?:\.\d+)*$/;

// A word value that IS a substitution, whole token: command substitution
// ($(...), arithmetic $((...)) matches the same shape), legacy backticks,
// process substitution (<(...), >(...)). ONLY whole words drop from the
// args view: the substitution's own Command units are walked in full, so
// the raw text is already represented — and left in place it would trip
// the filesystem policy's raw-$ fail-closed deny on daily commands
// (`echo $(git log --oneline)`). A substitution SPLICED into a larger
// word (`/etc/pass$(echo wd)`) must KEEP riding the arg: the concatenated
// path exists in no unit's args, and the fail-closed gate must see it
// (dropping any marker-bearing token turned such splices deny→allow —
// probe-proven, fixed 2026-10-16). Plain $VAR/${VAR} stay: the fail-closed
// variable gate classifies THOSE.
const WHOLE_WORD_SUBST =
  /^(?:\$\([\s\S]*\)|`[\s\S]*`|<\([\s\S]*\)|>\([\s\S]*\))$/;

function wordValues(node: unknown): string[] {
  if (node === null || typeof node !== "object") {
    return [];
  }
  const obj = node as Record<string, unknown>;
  if (wordLike(obj)) {
    if (WHOLE_WORD_SUBST.test(obj.value as string)) {
      return []; // whole word: inner units already carry its commands
    }
    return [obj.value as string];
  }
  // Redirect targets are never arguments: unbash 5.1.0 nests the Redirect
  // node inside the same `suffix` array (4.0.11 kept the two apart), and
  // the structured `redirects` view already carries them.
  if (obj.type === "Redirect") {
    return [];
  }
  return Object.values(obj).flatMap(wordValues);
}

// Redirection targets: the structured view comes from Command.redirects
// (a 5.1.0 prototype accessor returning the same Redirect nodes the own
// `suffix` array nests). wordValues keeps them out of unit args, so this
// collection is additive to the args view, not double-counting; the
// visited-identity set keeps target words single-counted in `words`.
function collectRedirects(
  node: Record<string, unknown>,
  out: CommandRedirect[],
): void {
  const list = node.redirects;
  if (Array.isArray(list)) {
    for (const r of list) {
      if (r !== null && typeof r === "object") {
        const redirect = r as Record<string, unknown>;
        const { operator, target, delimiter } = redirect;
        // Heredocs (5.1.0): a HereDoc Redirection has NO target — the
        // wordLike HereDocDelimiter rides `.delimiter` instead (value is
        // the UNQUOTED delimiter, `quoted` flags the <<'EOF' form; `<<-`
        // folds into the operator). Emitting it with the same
        // {operator, target} record keeps one redirection view downstream.
        const word = (target ?? delimiter) as Record<string, unknown> | null;
        if (
          typeof operator === "string" &&
          word !== null &&
          typeof word === "object" &&
          wordLike(word)
        ) {
          out.push({ operator, target: word.value as string });
        }
      }
    }
  }
}

export interface CommandUnit {
  args: string[];
  name: string;
}

// One redirection of one command: the direction lives in the operator
// (`>`/`>>`/`2>` write, `<` read) and the target is the word redirected to.
// These are NOT arguments — CommandUnit deliberately excludes them.
export interface CommandRedirect {
  operator: string;
  target: string;
}

export interface ParsedCommand {
  functionDefs: string[]; // inline function definition names (any form)
  raw: string;
  redirects: CommandRedirect[];
  units: CommandUnit[];
  words: string[];
}

// One unbash parse, two views: `units` (name+args per Command node — pipelines,
// &&/||, subshells, function bodies, $(...) scripts, env-prefixed commands)
// and `words` (every word-like string, including quoted-literal fragments).
// unbash never throws on malformed input — it returns a best-effort script
// (4.0.11 carried a non-empty `errors` array; 5.1.0 no longer exposes one).
// Partial ASTs are deliberately still walked (a typo'd quote must not let
// /etc/passwd through); null is returned only on an actual throw.
// unbash quirks this walk handles (re-verified against 5.1.0 by probe,
// 2026-10-16; the 4.0.11-era findings are kept for history):
//   - WordImpl keeps .value/.parts on the PROTOTYPE (so .parts needs explicit
//     descent, Object.values never sees it) — unchanged in 5.1.0.
//   - ArithmeticCommand/ArithmeticFor hide children behind prototype
//     accessors (expression / initialize+test+update) — unchanged in 5.1.0,
//     so prototype own names are walked too.
//   - NEW in 5.1.0: CommandImpl exposes `args`/`redirects` accessors over
//     the very instances the own `suffix` array holds (which now nests
//     Redirect nodes — 4.0.11 kept redirect targets out of the suffix). The
//     prototype descent would re-enter those subtrees and double-emit every
//     arg-position substitution; the visited-identity set below dedupes.
//   - `<<` heredocs: 5.1.0 nests a HereDoc node in Command.suffix (the
//     redirects accessor surfaces it) — operator "<<"|"<<-", no target;
//     the wordLike HereDocDelimiter rides `.delimiter` (value = unquoted
//     delimiter, `quoted` flags the <<'EOF' form) AND unit args
//     (`cat <<EOF` → args ["EOF"]). collectRedirects emits it as a normal
//     {operator, target} record; the body itself is a HereDocBody that
//     reaches neither units nor words (probe 2026-10-16; consumed by
//     no-inline-scripts' heredoc-fed rule).
export function parseCommand(command: string): ParsedCommand | null {
  let ast: ParsedScript;
  try {
    ast = parse(command);
  } catch {
    return null;
  }
  const units: CommandUnit[] = [];
  const words: string[] = [];
  const redirects: CommandRedirect[] = [];
  const functionDefs: string[] = [];

  // Visited-identity, not value equality: 5.1.0's prototype accessors hand
  // back the SAME nodes the own properties hold, so a revisited object is
  // by definition the same subtree re-emitted. Equal-valued distinct
  // commands (`FOO=$(git status) git status` — substitution script plus the
  // real command) are two runtime commands and must both survive.
  const seen = new Set<object>();
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: walk semantics frozen by two reviews; splitting risks reordering the units/words traversal
  const visit = (node: unknown): void => {
    if (node === null || typeof node !== "object") {
      return;
    }
    if (seen.has(node)) {
      return;
    }
    seen.add(node);
    const obj = node as Record<string, unknown>;
    if (wordLike(obj)) {
      words.push(obj.value as string);
      visit(obj.parts);
      return;
    }
    if (
      obj.type === "Command" &&
      obj.name !== null &&
      typeof obj.name === "object"
    ) {
      const name = obj.name as Record<string, unknown>;
      if (typeof name.value === "string") {
        units.push({ args: wordValues(obj.suffix), name: name.value });
      }
      collectRedirects(obj, redirects);
    }
    // unbash types EVERY definition form (parens, named, `function` keyword,
    // mutual) as a Function node — one branch covers them all.
    if (obj.type === "Function") {
      const fname = obj.name as Record<string, unknown> | null;
      if (fname !== null && typeof fname.value === "string") {
        functionDefs.push(fname.value);
      }
    }
    for (const child of Object.values(obj)) {
      visit(child);
    }
    const proto = Object.getPrototypeOf(obj);
    if (proto !== null) {
      for (const key of Object.getOwnPropertyNames(proto)) {
        visit(obj[key]);
      }
    }
  };
  visit(ast.commands);
  return { functionDefs, raw: command, redirects, units, words };
}

export function baseName(name: string): string {
  return name.replace(VERSION_SUFFIX, "");
}
