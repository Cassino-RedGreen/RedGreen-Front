import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = process.env.PERF_BASE_URL;
const samples = Number(process.env.PERF_BROWSER_RUNS || 5);
const directory = path.join(process.env.PERF_RUN_DIR, 'browser', 'metrics');

async function instrument(page) {
  const events = {
    pageErrors: [],
    failedRequests: [],
    cancelledAnimationImages: [],
    httpErrors: [],
    apiResponses: [],
    blockedExternal: 0,
  };
  const origin = new URL(base).origin;
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) {
      events.blockedExternal++;
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  page.on('pageerror', (error) =>
    events.pageErrors.push(error.message.slice(0, 400))
  );
  page.on('requestfailed', (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin) return;
    const detail = { path: url.pathname, reason: request.failure()?.errorText };
    // CardGameIcon replaces its image every 240 ms; Chromium can cancel the old request.
    // Keep that observable without misclassifying it as a failed server response.
    if (
      request.resourceType() === 'image' &&
      /\/assets\/CardIcon[1-7]-/.test(url.pathname) &&
      detail.reason === 'net::ERR_ABORTED'
    ) {
      events.cancelledAnimationImages.push(detail);
    } else events.failedRequests.push(detail);
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === origin && response.status() >= 400) {
      events.httpErrors.push({ path: url.pathname, status: response.status() });
    }
    if (url.origin === origin && url.pathname.startsWith('/api/')) {
      events.apiResponses.push({
        path: url.pathname,
        status: response.status(),
      });
    }
  });
  await page.addInitScript(() => {
    const metrics = { lcpMs: null, cls: 0, longTasks: [], contextLosses: 0 };
    globalThis.__redgreenPerf = metrics;
    let windowStart = 0;
    let previousShift = 0;
    let windowScore = 0;
    const observe = (type, callback) => {
      if (PerformanceObserver.supportedEntryTypes.includes(type)) {
        new PerformanceObserver((list) =>
          list.getEntries().forEach(callback)
        ).observe({ type, buffered: true });
      }
    };
    observe('largest-contentful-paint', (entry) => {
      metrics.lcpMs = entry.startTime;
    });
    observe('layout-shift', (entry) => {
      if (entry.hadRecentInput) return;
      if (
        !windowStart ||
        entry.startTime - previousShift > 1000 ||
        entry.startTime - windowStart > 5000
      ) {
        windowStart = entry.startTime;
        windowScore = 0;
      }
      windowScore += entry.value;
      previousShift = entry.startTime;
      metrics.cls = Math.max(metrics.cls, windowScore);
    });
    observe('longtask', (entry) => {
      if (metrics.longTasks.length < 1000)
        metrics.longTasks.push({
          startMs: entry.startTime,
          durationMs: entry.duration,
        });
    });
    document.addEventListener(
      'webglcontextlost',
      () => {
        metrics.contextLosses++;
      },
      true
    );
  });
  return events;
}

async function snapshot(page, events) {
  // Fixed observation window: do not wait for networkidle on animated games.
  const frames = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const intervals = [];
        const start = performance.now();
        let last = start;
        function frame(now) {
          intervals.push(now - last);
          last = now;
          if (now - start >= 2000) resolve(intervals);
          else requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      })
  );
  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    return {
      ...globalThis.__redgreenPerf,
      fcpMs:
        performance.getEntriesByName('first-contentful-paint')[0]?.startTime ??
        null,
      loadEventEndMs: nav?.loadEventEnd ?? null,
      domContentLoadedMs: nav?.domContentLoadedEventEnd ?? null,
      resources: resources.map((entry) => ({
        path: new URL(entry.name).pathname,
        durationMs: entry.duration,
        transferBytes: entry.transferSize,
        encodedBytes: entry.encodedBodySize,
        kind: entry.initiatorType,
      })),
      navigationTransferBytes: nav?.transferSize ?? 0,
      canvases: [...document.querySelectorAll('canvas')].map((canvas) => ({
        width: canvas.width,
        height: canvas.height,
      })),
      heapBytes: performance.memory?.usedJSHeapSize ?? null,
    };
  });
  const sorted = frames.slice().sort((a, b) => a - b);
  return {
    ...metrics,
    ...structuredClone(events),
    frameIntervalP95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
    frameSamples: frames.length,
  };
}

async function save(name, data, info) {
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, name + '.json');
  await writeFile(file, JSON.stringify(data, null, 2));
  await info.attach(name, { path: file, contentType: 'application/json' });
}

for (const scenario of [
  {
    id: 'home',
    route: '/',
    ready: (page) => page.getByRole('button', { name: 'Entrar', exact: true }),
  },
  {
    id: 'login',
    route: '/login',
    ready: (page) => page.getByPlaceholder('Digite seu e-mail'),
  },
]) {
  test(`public ${scenario.id}`, async ({ browser }, info) => {
    const results = [];
    for (let i = 0; i < samples; i++) {
      const context = await browser.newContext({
        viewport: { width: 1365, height: 768 },
      });
      try {
        const page = await context.newPage();
        const events = await instrument(page);
        const start = performance.now();
        const response = await page.goto(base + scenario.route, {
          waitUntil: 'load',
        });
        expect(response.status()).toBe(200);
        await expect(scenario.ready(page)).toBeVisible();
        const interfaceReadyMs = performance.now() - start;
        const metrics = await snapshot(page, events);
        results.push({ sample: i + 1, interfaceReadyMs, ...metrics });
        expect(events.pageErrors).toEqual([]);
        expect(events.failedRequests).toEqual([]);
        expect(events.httpErrors).toEqual([]);
      } finally {
        await context.close();
      }
    }
    await save(scenario.id, results, info);
  });
}

test('SPA navigation home to login', async ({ browser }, info) => {
  const results = [];
  for (let i = 0; i < samples; i++) {
    const context = await browser.newContext({
      viewport: { width: 1365, height: 768 },
    });
    try {
      const page = await context.newPage();
      const events = await instrument(page);
      await page.goto(base + '/');
      const entry = page.getByRole('button', { name: 'Entrar', exact: true });
      await expect(entry).toBeVisible();
      const start = performance.now();
      await entry.click();
      await expect(page.getByPlaceholder('Digite seu e-mail')).toBeVisible();
      expect(new URL(page.url()).pathname).toBe('/login');
      const interactionToReadyMs = performance.now() - start;
      results.push({
        sample: i + 1,
        interactionToReadyMs,
        ...(await snapshot(page, events)),
      });
      expect(events.pageErrors).toEqual([]);
    } finally {
      await context.close();
    }
  }
  await save('navigation', results, info);
});

test('games: guest diagnostics; authenticated gameplay is blocked', async ({
  browser,
}, info) => {
  const diagnostics = [];
  for (const route of ['/slot-machine-room', '/gambit-room']) {
    const context = await browser.newContext({
      viewport: { width: 1365, height: 768 },
    });
    try {
      const page = await context.newPage();
      const events = await instrument(page);
      const response = await page.goto(base + route, { waitUntil: 'load' });
      expect(response.status()).toBe(200);
      await expect(page.locator('main')).toBeVisible();
      let interaction = null;
      if (route === '/slot-machine-room') {
        const zoom = page.getByRole('button', {
          name: 'Aproximar da Slot Machine',
        });
        if (await zoom.isVisible()) {
          const start = performance.now();
          await zoom.click();
          await expect(zoom).toHaveCount(0);
          interaction = {
            kind: 'guest-view-only',
            interactionToReadyMs: performance.now() - start,
          };
        }
      }
      const before = await snapshot(page, events);
      await page.waitForTimeout(3000);
      const after = await snapshot(page, events);
      diagnostics.push({
        route,
        status: 'blocked-integrated-gameplay',
        reason:
          'No authenticated test account/table/session supplied; guest interface is not proof of a playable game.',
        interaction,
        observations: [before, after],
      });
    } finally {
      await context.close();
    }
  }
  await save('games', diagnostics, info);
  info.annotations.push({
    type: 'limitation',
    description:
      'Gameplay/API response benchmarks blocked; diagnostic guest observations only.',
  });
});
