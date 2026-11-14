module.exports = {
  ci: {
    collect: {
      url: [
        process.env.PERF_BASE_URL + '/',
        process.env.PERF_BASE_URL + '/login',
      ],
      numberOfRuns: Number(process.env.PERF_RUNS || 5),
      chromePath: process.env.CHROME_PATH,
      settings: {
        onlyCategories: ['performance'],
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 390,
          height: 844,
          deviceScaleFactor: 1,
          disabled: false,
        },
        throttlingMethod: 'simulate',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
          requestLatencyMs: 562.5,
          downloadThroughputKbps: 1474.56,
          uploadThroughputKbps: 675,
        },
        blockedUrlPatterns: [
          '*://fonts.googleapis.com/*',
          '*://fonts.gstatic.com/*',
        ],
        chromeFlags:
          '--headless --no-sandbox --disable-dev-shm-usage --use-angle=swiftshader --enable-unsafe-swiftshader',
      },
    },
    // Baseline only: no score/latency gates and no remote upload.
  },
};
