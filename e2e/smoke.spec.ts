import { test, expect } from '@playwright/test';

// Erros do browser nao aparecem na saida do Playwright por padrao. Sem isso,
// uma pagina que falha ao montar vira apenas "element not found".
test.beforeEach(async ({ page }) => {
  page.on('pageerror', (PageError) => {
    console.log(`[pageerror] ${PageError.message}`);
  });

  page.on('requestfailed', (FailedRequest) => {
    console.log(
      `[requestfailed] ${FailedRequest.url()} — ${FailedRequest.failure()?.errorText}`
    );
  });

  page.on('response', (HttpResponse) => {
    if (HttpResponse.status() >= 400) {
      console.log(`[http ${HttpResponse.status()}] ${HttpResponse.url()}`);
    }
  });
});

// Em uma falha, mostra onde a pagina parou e o que havia renderizado.
test.afterEach(async ({ page }, TestInfo) => {
  if (TestInfo.status === TestInfo.expectedStatus) {
    return;
  }

  console.log(`[url] ${page.url()}`);
  console.log(`[title] ${await page.title()}`);

  const RootHtml = await page
    .locator('#root')
    .innerHTML()
    .catch(() => '<#root ausente>');

  console.log(`[root length] ${RootHtml.length}`);
  console.log(`[root] ${RootHtml.slice(0, 600)}`);
});

test.describe('Setup smoke', () => {
  test('renders the login identify step', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByPlaceholder('Digite seu e-mail')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible();
  });

  test('shows a validation toast for a malformed email', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('Digite seu e-mail').fill('not-an-email');
    await page.getByRole('button', { name: 'Continuar' }).click();

    await expect(
      page.getByText('POR FAVOR, INSIRA UM EMAIL VÁLIDO')
    ).toBeVisible();
  });
});
