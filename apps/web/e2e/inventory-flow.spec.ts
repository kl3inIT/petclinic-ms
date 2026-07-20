import { expect, test, type Locator, type Page } from '@playwright/test';

import { login } from './support/auth';

test.setTimeout(120_000);

const runId = Date.now().toString().slice(-8);
const inboundReference = `PN-E2E-${runId}`;
const inboundReason = `Nhập kho nhiều dòng E2E ${runId}`;
const outboundReference = `PX-E2E-${runId}`;
const outboundReason = `Xuất kho nhiều dòng E2E ${runId}`;

test('inventory manager → multi-line receipt → issue → ledger', async ({ page }) => {
  page.setDefaultTimeout(15_000);
  await login(page, 'inventory1', 'inventory123');

  await page.goto('/inventory');
  await expect(page.getByRole('heading', { name: 'Tổng quan kho hàng' })).toBeVisible();
  await expect(page.getByText('Danh mục hoạt động', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Thuốc', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Vaccine', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Vật tư', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Dịch vụ', exact: true })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Hàng bán lẻ', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sổ cái kho', exact: true })).toBeVisible();

  await page.goto('/inventory/products?type=MEDICATION');
  await page.getByRole('main').getByRole('button', { name: 'Nhập kho' }).click();
  await submitStockDocument(page, {
    title: 'Phiếu nhập kho',
    reference: inboundReference,
    reason: inboundReason,
    firstQuantity: 3,
    secondQuantity: 4,
    submitLabel: 'Ghi phiếu nhập',
  });

  await page.getByRole('main').getByRole('button', { name: 'Xuất kho' }).click();
  await submitStockDocument(page, {
    title: 'Phiếu xuất kho',
    reference: outboundReference,
    reason: outboundReason,
    firstQuantity: 1,
    secondQuantity: 2,
    submitLabel: 'Ghi phiếu xuất',
  });

  const [ledgerResponse] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === '/api/v1/products/stock/movements' &&
        url.searchParams.get('size') === '50'
      );
    }),
    page.goto('/inventory/products?view=ledger'),
  ]);
  expect(ledgerResponse.status(), ledgerResponse.url()).toBe(200);
  expect(ledgerResponse.url()).not.toContain('sort%5B%5D');
  await expect(page.getByRole('heading', { name: 'Sổ cái kho' })).toBeVisible();
  await assertLedgerLine(page, inboundReason, 'MED_AMOX', 3, 'in');
  await assertLedgerLine(page, inboundReason, 'MED_META', 4, 'in');
  await assertLedgerLine(page, outboundReason, 'MED_AMOX', 1, 'out');
  await assertLedgerLine(page, outboundReason, 'MED_META', 2, 'out');

  await page.goto('/inventory');
  await expect(page.getByText(outboundReason, { exact: false }).first()).toBeVisible();
});

async function submitStockDocument(
  page: Page,
  options: {
    title: string;
    reference: string;
    reason: string;
    firstQuantity: number;
    secondQuantity: number;
    submitLabel: string;
  },
) {
  const dialog = page.getByRole('dialog', { name: options.title });
  await dialog.getByLabel('Mã chứng từ').fill(options.reference);
  await selectProduct(page, dialog.getByRole('combobox').first(), 'MED_AMOX');
  await dialog.getByRole('spinbutton').first().fill(String(options.firstQuantity));

  await dialog.getByRole('button', { name: 'Thêm dòng' }).click();
  await selectProduct(page, dialog.getByRole('combobox').nth(1), 'MED_META');
  await dialog.getByRole('spinbutton').nth(1).fill(String(options.secondQuantity));
  await dialog.getByLabel('Lý do *').fill(options.reason);
  await dialog.getByRole('button', { name: options.submitLabel }).click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });
}

async function selectProduct(page: Page, trigger: Locator, productCode: string) {
  await trigger.click();
  await page.getByRole('option', { name: new RegExp(`^${productCode} —`) }).click();
}

async function assertLedgerLine(
  page: Page,
  reason: string,
  productCode: string,
  quantity: number,
  direction: 'in' | 'out',
) {
  const row = page
    .getByRole('row')
    .filter({ hasText: reason })
    .filter({ hasText: productCode });
  await expect(row).toHaveCount(1);
  await expect(row.getByRole('cell').nth(direction === 'in' ? 3 : 4)).toHaveText(
    String(quantity),
  );
}
