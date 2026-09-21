import type { BrowserContext } from '@playwright/test';

// Playwright disables the HTTP cache while routing is enabled. Without this,
// Firefox and WebKit expose revalidated GETs (ETag) as a bodiless 304.
export const DisableHttpCache = (Context: BrowserContext) =>
  Context.route('**/*', (Route) => Route.continue());
