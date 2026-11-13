import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromePath, versions } from './verify-browser.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const output = path.resolve(
  process.env.PERF_OUTPUT_DIR || path.join(root, 'artifacts')
);
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const directory = path.join(output, runId);
await mkdir(directory, { recursive: true });
const summary = {
  runId,
  status: 'failed',
  versions,
  environment: {
    platform: os.platform(),
    arch: os.arch(),
    kernel: os.release(),
    logicalCPUs: os.cpus().length,
    memoryBytes: os.totalmem(),
  },
  parameters: {},
  stages: {},
  lighthouse: {},
  browser: {},
  limitations: [
    'Baseline only: no score or latency gate; Lighthouse scores are not code coverage.',
    'Headless SwiftShader software WebGL; frame intervals are not displayed GPU frame times.',
    'Third-party Google Fonts blocked in Lighthouse; Playwright blocks all cross-origin HTTP. This isolated baseline uses fallback fonts, not the online-font experience.',
    'No authenticated account/table/session: Slot/Gambit integration and gameplay are blocked; guest diagnostics are not functional success.',
    '/register, /dashboard and /roulette-room are placeholders and are excluded.',
    'Short repeated observations cannot prove absence of memory leaks or real-user Core Web Vitals/INP.',
  ],
};
for (const [key, file] of Object.entries({
  cpuMax: '/sys/fs/cgroup/cpu.max',
  memoryMax: '/sys/fs/cgroup/memory.max',
})) {
  summary.environment[key] = await readFile(file, 'utf8')
    .then((value) => value.trim())
    .catch(() => 'unavailable');
}

function privateIP(address) {
  if (address.startsWith('::ffff:')) return privateIP(address.slice(7));
  if (isIP(address) === 6)
    return address === '::1' || /^(fc|fd|fe[89ab])/i.test(address);
  const [a, b] = address.split('.').map(Number);
  return (
    isIP(address) === 4 &&
    (a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168))
  );
}

async function validateTarget(value) {
  const url = new URL(value);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error(
      'PERF_BASE_URL must be an http(s) origin without credentials, query or path'
    );
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true });
  if (
    !addresses.length ||
    addresses.some(({ address }) => !privateIP(address))
  ) {
    throw new Error(
      'Performance runner refuses public targets: use loopback/private Docker network'
    );
  }
  return url.origin;
}

function integer(name, fallback, max) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value < 1 || value > max)
    throw new Error(`Invalid ${name}: expected 1..${max}`);
  return value;
}

async function ready(base, seconds) {
  const deadline = Date.now() + seconds * 1000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(base + '/healthz', {
        redirect: 'manual',
        signal: AbortSignal.timeout(3000),
      });
      if (response.status === 200 && (await response.text()).trim() === 'ok') {
        const page = await fetch(base + '/', {
          redirect: 'manual',
          signal: AbortSignal.timeout(5000),
        });
        if (page.status === 200 && (await page.text()).includes('id="root"'))
          return;
      }
    } catch {
      /* retry until bounded deadline */
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(
    'Frontend readiness timed out (healthz and React index required)'
  );
}

async function command(name, args, cwd, env) {
  const log = createWriteStream(path.join(directory, name + '.log'));
  const started = Date.now();
  console.log(`Starting ${name}`);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 1_200_000,
    });
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    child.on('error', (error) => {
      log.end();
      reject(error);
    });
    child.on('close', (code, signal) => {
      log.end();
      summary.stages[name] = {
        exitCode: code,
        signal,
        durationMs: Date.now() - started,
      };
      console.log(`${name}: exit=${code} signal=${signal || 'none'}`);
      resolve(code === 0 && !signal);
    });
  });
}

const aggregate = (values) => {
  const sorted = values
    .filter((v) => typeof v === 'number' && Number.isFinite(v))
    .sort((a, b) => a - b);
  const n = sorted.length;
  return n
    ? {
        count: n,
        min: sorted[0],
        median:
          n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2,
        max: sorted[n - 1],
      }
    : null;
};

async function collectReports() {
  const lhdir = path.join(directory, 'lighthouse', '.lighthouseci');
  let files = [];
  try {
    files = await readdir(lhdir);
  } catch {
    /* stage may have failed */
  }
  const individual = [];
  for (const file of files.filter(
    (f) => f.endsWith('.json') && f.startsWith('lhr-')
  )) {
    const report = JSON.parse(await readFile(path.join(lhdir, file), 'utf8'));
    const audits = report.audits;
    const row = {
      route: new URL(report.requestedUrl).pathname,
      score: report.categories.performance.score,
      fcpMs: audits['first-contentful-paint']?.numericValue ?? null,
      lcpMs: audits['largest-contentful-paint']?.numericValue ?? null,
      cls: audits['cumulative-layout-shift']?.numericValue ?? null,
      tbtMs: audits['total-blocking-time']?.numericValue ?? null,
      resourceBytes: audits['total-byte-weight']?.numericValue ?? null,
      runtimeError: report.runtimeError ?? null,
      warnings: report.runWarnings,
      report: path.relative(directory, path.join(lhdir, file)),
    };
    individual.push(row);
  }
  summary.lighthouse.individual = individual;
  summary.lighthouse.aggregates = Object.fromEntries(
    ['/', '/login'].map((route) => [
      route,
      Object.fromEntries(
        ['score', 'fcpMs', 'lcpMs', 'cls', 'tbtMs', 'resourceBytes'].map(
          (key) => [
            key,
            aggregate(
              individual
                .filter((r) => r.route === route && !r.runtimeError)
                .map((r) => r[key])
            ),
          ]
        )
      ),
    ])
  );
  const metrics = path.join(directory, 'browser', 'metrics');
  let names = [];
  try {
    names = await readdir(metrics);
  } catch {
    /* stage may have failed */
  }
  for (const name of names.filter((f) => f.endsWith('.json'))) {
    const rows = JSON.parse(await readFile(path.join(metrics, name), 'utf8'));
    summary.browser[name.replace('.json', '')] = {
      samples: rows.length,
      aggregates: Object.fromEntries(
        [
          'interfaceReadyMs',
          'interactionToReadyMs',
          'loadEventEndMs',
          'fcpMs',
          'lcpMs',
          'cls',
          'frameIntervalP95Ms',
          'heapBytes',
        ].map((key) => [key, aggregate(rows.map((r) => r[key]))])
      ),
      file: 'browser/metrics/' + name,
    };
  }
}

try {
  const base = await validateTarget(
    process.env.PERF_BASE_URL || 'http://redgreen-frontend:8080'
  );
  const runs = integer('PERF_RUNS', 5, 10);
  const browserRuns = integer('PERF_BROWSER_RUNS', 5, 10);
  const wait = integer('PERF_WAIT_SECONDS', 60, 300);
  summary.target = base;
  summary.parameters = {
    lighthouseRunsPerRoute: runs,
    browserRunsPerScenario: browserRuns,
    waitSeconds: wait,
    lighthouseProfile: 'mobile simulated slow4G CPU x4 390x844',
    playwrightProfile: 'desktop unthrottled 1365x768; cold context per sample',
    webgl: 'SwiftShader',
    scoreGates: false,
  };
  await ready(base, wait);
  summary.stages.readiness = { exitCode: 0 };
  try {
    const api = await fetch(base + '/api/slot/machine', {
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
    });
    summary.apiProbe = {
      status: api.status,
      integratedGames: 'blocked-no-authenticated-fixture',
    };
  } catch {
    summary.apiProbe = {
      status: null,
      integratedGames: 'blocked-api-unavailable-and-no-authenticated-fixture',
    };
  }
  const env = {
    PERF_BASE_URL: base,
    PERF_RUN_DIR: directory,
    PERF_RUNS: String(runs),
    PERF_BROWSER_RUNS: String(browserRuns),
    CHROME_PATH: chromePath,
  };
  const lhdir = path.join(directory, 'lighthouse');
  await mkdir(lhdir, { recursive: true });
  const lh = await command(
    'lighthouse',
    [
      require.resolve('@lhci/cli/src/cli.js'),
      'collect',
      '--config=' + path.join(root, 'lighthouserc.cjs'),
    ],
    lhdir,
    env
  );
  const pw = await command(
    'playwright',
    [
      require.resolve('@playwright/test/cli'),
      'test',
      '--config=' + path.join(root, 'playwright.config.mjs'),
    ],
    root,
    env
  );
  await collectReports();
  const reports = summary.lighthouse.individual;
  const countsValid = ['/', '/login'].every(
    (route) =>
      reports.filter(
        (r) => r.route === route && !r.runtimeError && r.score !== null
      ).length === runs
  );
  summary.status =
    lh && pw && countsValid ? 'passed-with-limitations' : 'failed';
  if (!countsValid) summary.error = 'Missing or invalid Lighthouse samples';
} catch (error) {
  // Errors never include environment dumps or credentials.
  summary.error = error.message;
  await collectReports().catch(() => {});
} finally {
  summary.finishedAt = new Date().toISOString();
  await writeFile(
    path.join(directory, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );
  const markdown = `# RedGreen performance baseline\n\nStatus: **${summary.status}**\n\nTarget: ${summary.target || 'rejected/unavailable'}\n\nVersions: ${JSON.stringify(versions)}\n\n## Lighthouse aggregates\n\n\`\`\`json\n${JSON.stringify(summary.lighthouse.aggregates || {}, null, 2)}\n\`\`\`\n\n## Limitations\n\n${summary.limitations.map((s) => '- ' + s).join('\n')}\n\n${summary.error ? 'Error: ' + summary.error : ''}\n`;
  await writeFile(path.join(directory, 'summary.md'), markdown);
  const escaped = markdown
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
  await writeFile(
    path.join(directory, 'index.html'),
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>RedGreen baseline</title><body><p><a href="browser/html/index.html">Playwright HTML</a> | <a href="summary.json">Summary JSON</a></p><pre>${escaped}</pre></body></html>`
  );
  console.log(`Reports: ${directory}\nStatus: ${summary.status}`);
  process.exitCode = summary.status === 'passed-with-limitations' ? 0 : 1;
}
