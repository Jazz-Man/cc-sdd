// Obfuscation/injection substrings. Pipe-to-exec, eval, and dot-sourcing
// are owned by no-inline-scripts; these are the signals that hide intent.
const INJECTION_SUBSTRINGS = [
  "/dev/tcp/",
  "/dev/udp/",
  "LD_PRELOAD",
  "LD_LIBRARY_PATH",
  "HISTFILE",
  ".bash_history",
  "HISTSIZE=0",
];

// Raw control bytes are never legitimate command text; \v and \f are
// invisible to that byte class and ride the whitespace rule instead —
// whitespace outside " \t\n\r" hides word boundaries from a visual read.
function isControlByte(code: number): boolean {
  return (
    (code >= 0x01 && code <= 0x08) ||
    (code >= 0x0e && code <= 0x1f) ||
    code === 0x7f
  );
}

const ASCII_WHITESPACE = " \t\n\r";
const ANY_WHITESPACE = /\s/;
const WORD_SPLIT = /\s+/;

export function injectionHit(raw: string): string | null {
  for (const s of INJECTION_SUBSTRINGS) {
    if (raw.includes(s)) {
      return s;
    }
  }
  if (raw.includes("\0")) {
    return "null byte";
  }
  for (const ch of raw) {
    if (isControlByte(ch.codePointAt(0) ?? 0)) {
      return "control characters";
    }
  }
  for (const word of raw.split(WORD_SPLIT)) {
    if (word.startsWith("PATH=") && !word.includes("$PATH")) {
      return "PATH override";
    }
  }
  for (const ch of raw) {
    if (ANY_WHITESPACE.test(ch) && !ASCII_WHITESPACE.includes(ch)) {
      return "non-ASCII whitespace";
    }
  }
  return null;
}
