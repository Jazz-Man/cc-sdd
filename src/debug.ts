import { inspect } from "bun";

export function debug(
  // biome-ignore: lint/suspicious/noExplicitAny
  object: any,
  options: Bun.BunInspectOptions = {},
) {
  const debug = inspect(object, {
    colors: true,
    depth: 2,
    ...options,
  });

  console.log(debug);
}
