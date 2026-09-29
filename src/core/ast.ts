import { type ParsedScript, parse } from "unbash";

export interface CommandUnit {
  args: string[];
  name: string;
}

export interface ParsedCommand {
  raw: string;
  units: CommandUnit[];
  words: string[];
}

function wordLike(obj: Record<string, unknown>): boolean {
  return typeof obj.text === "string" && typeof obj.value === "string";
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

  const visit = (node: unknown): void => {
    if (node === null || typeof node !== "object") return;
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
  return { raw: command, units, words };
}

function wordValues(node: unknown): string[] {
  if (node === null || typeof node !== "object") return [];
  const obj = node as Record<string, unknown>;
  if (wordLike(obj)) return [obj.value as string];
  return Object.values(obj).flatMap(wordValues);
}
