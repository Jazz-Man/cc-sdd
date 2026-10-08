import { homedir } from "node:os";
import { resolve } from "node:path";
import { name as packageName } from "./package.json";

const binName = packageName.split("/").at(1) as string;

const outfile = resolve(homedir(), ".local/bin", binName);

try {
  const res = await Bun.build({
    bytecode: true,
    compile: {
      outfile,
      target: "bun-darwin-arm64",
    },
    entrypoints: ["./src/main.ts"],
    minify: true,
    // sourcemap: "linked",
  });

  console.info(res);
} catch (e) {
  console.error(e);
}
