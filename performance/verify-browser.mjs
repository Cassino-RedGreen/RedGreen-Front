import { chromium } from '@playwright/test';
import { accessSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
export const chromePath = chromium.executablePath();
accessSync(chromePath);
export const versions = {
  node: process.version,
  playwright: require('@playwright/test/package.json').version,
  lighthouseCI: require('@lhci/cli/package.json').version,
  lighthouse: require('lighthouse/package.json').version,
  chromium: execFileSync(chromePath, ['--version'], {
    encoding: 'utf8',
  }).trim(),
};
console.log(JSON.stringify(versions));
