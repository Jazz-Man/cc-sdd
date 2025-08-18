#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runCli } from './index.js';

// Execute when run as a script
void (async () => {
  const here = fileURLToPath(new URL('.', import.meta.url));
  // dist -> package root
  const packageRoot = path.resolve(here, '..');
  const defaultManifest = path.resolve(packageRoot, 'templates/manifests/claude-code.json');

  const orig = process.argv.slice(2);
  const hasManifest = orig.some((t) => t === '--manifest' || t.startsWith('--manifest='));
  const argv = hasManifest ? orig : [...orig, '--manifest', defaultManifest];

  const exitCode = await runCli(
    argv,
    { platform: process.platform, env: process.env },
    undefined,
    {},
    { templatesRoot: packageRoot },
  );
  if (Number.isInteger(exitCode)) process.exit(exitCode);
})();
