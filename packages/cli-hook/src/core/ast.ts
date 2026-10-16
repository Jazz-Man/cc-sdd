import { type ParsedScript, parse } from "unbash";

function wordLike(obj: Record<string, unknown>): boolean {
  return typeof obj.text === "string" && typeof obj.value === "string";
}

// Strip a trailing version suffix from a command name: python3.13 → python,
// node20 → node, perl5.34 → perl. Policies look tools up by this base name so
// versioned binaries cannot sidestep a table keyed on the plain name.
const VERSION_SUFFIX = /\d+(?:\.\d+)*$/;

function wordValues(node: unknown): string[] {
  if (node === null || typeof node !== "object") {
    return [];
  }
  const obj = node as Record<string, unknown>;
  if (wordLike(obj)) {
    return [obj.value as string];
  }
  return Object.values(obj).flatMap(wordValues);
}

// Redirection targets never appear in a command's suffix (unbash keeps
// them on Command.redirects), so collecting them is additive to the
// args/words views, not double-counting.
function collectRedirects(
  node: Record<string, unknown>,
  out: CommandRedirect[],
): void {
  const list = node.redirects;
  if (Array.isArray(list)) {
    for (const r of list) {
      if (r !== null && typeof r === "object") {
        const redirect = r as Record<string, unknown>;
        const { operator, target } = redirect;
        if (
          typeof operator === "string" &&
          target !== null &&
          typeof target === "object" &&
          wordLike(target as Record<string, unknown>)
        ) {
          out.push({
            operator,
            target: (target as Record<string, unknown>).value as string,
          });
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
// unbash 4.0.11 never throws on malformed input — it returns a best-effort
// script with a non-empty `errors` array. Partial ASTs are deliberately still
// walked (a typo'd quote must not let /etc/passwd through); null is returned
// only on an actual throw.
// unbash quirks this walk already handles: WordImpl keeps .value/.parts on the
// PROTOTYPE (so .parts needs explicit descent, Object.values never sees it),
// and ArithmeticCommand/ArithmeticFor hide children behind non-enumerable
// prototype accessors (so prototype own names are walked too).
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

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: walk semantics frozen by two reviews; splitting risks reordering the units/words traversal
  const visit = (node: unknown): void => {
    if (node === null || typeof node !== "object") {
      return;
    }
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
