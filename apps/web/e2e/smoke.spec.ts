import { expect, test } from '@playwright/test';

/**
 * Smoke E2E — verify Vite app booted + landing page renders.
 *
 * KHÔNG depend on BE container. CI chạy `pnpm dev` (Vite) + test FE-only path:
 * landing route renders, title chính xác, không có console error chí mạng.
 *
 * Khi nào cần test BE integration (login, chat) → mới spin up docker compose
 * trong CI riêng (slow job). Smoke giữ fast (~10s) chạy mỗi PR.
 */
test('landing page renders without error', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('/');
  await expect(page).toHaveTitle(/petclinic/i);
  await expect(page.locator('body')).toBeVisible();

  // Lọc bớt warning known acceptable (HMR, dev mode noise).
  const realErrors = consoleErrors.filter(
    (e) =>
      !e.includes('[vite]') &&
      !e.toLowerCase().includes('devtools') &&
      !e.includes('React DevTools'),
  );
  expect(realErrors, `Unexpected console errors:\n${realErrors.join('\n')}`).toHaveLength(
    0,
  );
});

test('login route accessible (FE-only — no BE required)', async ({ page }) => {
  await page.goto('/login');
  // Form fields render (auth login form). Không submit — BE không up trong smoke.
  await expect(page.getByRole('textbox').first()).toBeVisible({ timeout: 5000 });
});
