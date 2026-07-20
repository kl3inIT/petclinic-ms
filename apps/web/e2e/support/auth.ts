import { expect, type Page } from '@playwright/test';

export async function login(page: Page, username: string, password: string) {
  await resetSession(page);
  await page.goto('/login');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/v1/auth/login') &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    const response = await responsePromise;
    if (response.ok()) break;

    const canRetry = response.status() === 429 && attempt === 0;
    if (!canRetry) {
      expect(response.ok(), `Đăng nhập ${username} trả HTTP ${response.status()}`).toBe(
        true,
      );
    }

    // Gateway intentionally limits public auth to 10 requests/minute. This
    // only affects repeated local/CI suites; honor its Retry-After contract.
    const retryAfterSeconds = Number(response.headers()['retry-after']);
    const waitSeconds = Number.isFinite(retryAfterSeconds)
      ? Math.min(Math.max(retryAfterSeconds, 1), 60)
      : 60;
    await page.waitForTimeout(waitSeconds * 1000 + 250);
  }

  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem('petclinic.auth');
        if (!raw) return null;
        return (JSON.parse(raw) as { state?: { user?: { username?: string } } }).state
          ?.user?.username;
      }),
    )
    .toBe(username);
}

async function resetSession(page: Page) {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}
