import { expect, test, type Page } from '@playwright/test';

import { login } from './support/auth';

test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

const runId = Date.now().toString().slice(-8);
const petName = `E2E-${runId}`;
const reason = `Khám tổng quát E2E ${runId}`;
const diagnosis = `Viêm da dị ứng E2E ${runId}`;
const treatment = `Dùng thuốc theo đơn trong 3 ngày E2E ${runId}`;
const ratingComment = `Bác sĩ tư vấn rõ ràng E2E ${runId}`;
const retailProductName = 'Bóng nhai cho chó';
const retailProductCode = 'MCH_TOY_BALL';

function nextWeekday(): Date {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  do {
    date.setDate(date.getDate() + 1);
  } while (date.getDay() === 0 || date.getDay() === 6);
  return date;
}

async function chooseDate(page: Page, target: Date) {
  const timeSection = page.locator('section').filter({ hasText: 'Chọn thời gian' });
  const monthTitle = timeSection.getByText(/^Tháng \d+ \d{4}$/);
  const targetMonth = target.getMonth() + 1;
  const targetYear = target.getFullYear();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const title = (await monthTitle.textContent()) ?? '';
    if (title.includes(`Tháng ${targetMonth} ${targetYear}`)) break;
    await monthTitle.locator('..').getByRole('button').last().click();
  }

  await timeSection
    .getByRole('button', { name: String(target.getDate()), exact: true })
    .click();
}

async function authHeaders(page: Page) {
  const accessToken = await page.evaluate(() => {
    const raw = window.localStorage.getItem('petclinic.auth');
    if (!raw) return null;
    return (JSON.parse(raw) as { state?: { accessToken?: string } }).state?.accessToken;
  });
  if (!accessToken) throw new Error('Không tìm thấy access token cho E2E API setup');
  return { Authorization: `Bearer ${accessToken}` };
}

async function removeExistingCustomerRating(
  page: Page,
  vetId: number,
  customerName: string,
) {
  const headers = await authHeaders(page);
  const response = await page.request.get(
    `/api/v1/vets/${vetId}/ratings?page=0&size=100&sort=rateDate,desc`,
    { headers },
  );
  expect(response.ok(), `List ratings trả HTTP ${response.status()}`).toBe(true);
  const ratings = (await response.json()) as {
    content?: Array<{ id?: number; customerName?: string }>;
  };
  const existing = ratings.content?.find(
    (rating) => rating.customerName === customerName,
  );
  if (!existing?.id) return;

  const deleteResponse = await page.request.delete(
    `/api/v1/vets/${vetId}/ratings/${existing.id}`,
    { headers },
  );
  expect(deleteResponse.ok(), `Delete rating trả HTTP ${deleteResponse.status()}`).toBe(
    true,
  );
}

test('customer → vet → cashier → invoice details → rating', async ({ page }) => {
  page.setDefaultTimeout(15_000);
  await login(page, 'customer1', 'customer123');

  await page.goto('/customer/pets');
  await page.getByRole('button', { name: 'Thêm thú cưng' }).click();
  const petDialog = page.getByRole('dialog', { name: 'Thêm thú cưng' });
  await petDialog.getByLabel('Tên *').fill(petName);
  await petDialog.getByLabel('Loài').click();
  await page.getByRole('option').first().click();
  await petDialog.getByLabel('Giống *').fill('Chó E2E');
  await petDialog.getByLabel('Cân nặng (kg)').fill('8.5');
  await petDialog.getByRole('button', { name: 'Lưu' }).click();
  await expect(petDialog).toBeHidden({ timeout: 15_000 });
  await expect(page.getByText(petName, { exact: true })).toBeVisible();

  await page.goto('/customer/book');
  const petSection = page.locator('section').filter({ hasText: 'Chọn thú cưng' });
  await petSection.getByPlaceholder('Tìm theo tên hoặc loài…').fill(petName);
  await petSection.getByPlaceholder('Tìm theo tên hoặc loài…').press('Enter');
  await petSection.getByText(petName, { exact: true }).click();

  const vetSection = page.locator('section').filter({ hasText: 'Chọn bác sĩ' });
  await vetSection.getByText('BS. Thanh Nguyễn', { exact: true }).click();
  await chooseDate(page, nextWeekday());

  const timeSection = page.locator('section').filter({ hasText: 'Chọn thời gian' });
  const availableSlot = timeSection
    .locator('button:enabled')
    .filter({ hasText: /^\d+ - \d+h/ })
    .first();
  await expect(availableSlot).toBeVisible({ timeout: 15_000 });
  await availableSlot.click();
  await page.getByLabel('Lý do khám').fill(reason);
  await page.getByRole('button', { name: 'Xác nhận đặt lịch' }).click();
  await expect(page).toHaveURL(/\/customer\/visits/, { timeout: 15_000 });
  await page.getByPlaceholder('Tìm kiếm lịch khám...').fill(petName);

  const customerVisitRow = page
    .getByRole('heading', { name: `${petName} — ${reason}` })
    .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
  await customerVisitRow.getByRole('button', { name: 'Xem chi tiết' }).click();
  const visitDialog = page.getByRole('dialog', { name: /Chi tiết lịch khám #/ });
  const visitTitle = await visitDialog.getByRole('heading').textContent();
  const visitId = Number(visitTitle?.match(/#(\d+)/)?.[1]);
  expect(visitId).toBeGreaterThan(0);
  await visitDialog.getByRole('button', { name: 'Đóng' }).click();

  await login(page, 'vet1', 'vet123');
  await page.goto('/vet/visits');
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Đã đặt' }).click();
  const vetRow = page.locator('tr').filter({ hasText: `#${visitId}` });
  await expect(vetRow).toBeVisible({ timeout: 15_000 });
  await vetRow.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('menuitem', { name: 'Bắt đầu khám' }).click();
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Đang khám' }).click();
  await expect(vetRow).toContainText('Đang khám', { timeout: 15_000 });

  await vetRow.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('menuitem', { name: 'Hoàn thành & lập hoá đơn' }).click();
  const examDialog = page.getByRole('dialog', { name: /Hoàn tất khám/ });
  await examDialog.getByLabel('Chẩn đoán *').fill(diagnosis);
  await examDialog.getByLabel('Điều trị').fill(treatment);
  await examDialog.getByLabel('Dịch vụ khám (catalog)').selectOption({ index: 1 });

  const medicationSelect = examDialog.locator('select').nth(1);
  const amoxicillinValue = await medicationSelect
    .locator('option')
    .filter({ hasText: 'Amoxicillin' })
    .first()
    .getAttribute('value');
  if (!amoxicillinValue)
    throw new Error('Không tìm thấy thuốc Amoxicillin trong catalog');
  await medicationSelect.selectOption(amoxicillinValue);
  await examDialog.getByPlaceholder('250mg').fill('250mg');
  await examDialog.getByPlaceholder('2 lần/ngày').fill('2 lần/ngày');
  await examDialog.locator('input[type="number"]').nth(1).fill('3');
  await examDialog.locator('input[type="number"]').nth(2).fill('2');
  await examDialog.getByPlaceholder('Uống sau ăn').fill('Uống sau ăn');
  await examDialog.getByLabel('Ghi chú đơn').fill(`Đơn thuốc E2E ${runId}`);
  await examDialog.getByRole('button', { name: 'Tiếp tục — lập hoá đơn' }).click();

  const invoiceDialog = page.getByRole('dialog', { name: `Hoá đơn — visit #${visitId}` });
  const invoiceLabel = invoiceDialog.getByText(/^Hoá đơn #\d+$/);
  await expect(invoiceLabel).toBeVisible({ timeout: 30_000 });
  const invoiceId = Number((await invoiceLabel.textContent())?.match(/#(\d+)/)?.[1]);
  expect(invoiceId).toBeGreaterThan(0);
  await expect(invoiceDialog).toContainText('Khám tổng quát', { timeout: 15_000 });
  await expect(invoiceDialog).toContainText('Amoxicillin', { timeout: 30_000 });
  await invoiceDialog
    .getByRole('button', { name: 'Hoàn tất — chuyển quầy thu tiền' })
    .click();

  await login(page, 'staff1', 'vet123');
  await page.goto('/staff/invoices');
  const invoiceListButton = page.getByRole('button').filter({ hasText: `#${invoiceId}` });
  await expect(invoiceListButton).toBeVisible({ timeout: 20_000 });
  await invoiceListButton.click();
  const invoicePanel = page
    .getByText(new RegExp(`^Hoá đơn #${invoiceId} ·`))
    .locator('xpath=ancestor::*[@data-slot="card"][1]');
  await expect(invoicePanel).toContainText('Amoxicillin');

  const retailEditor = invoicePanel.getByText(/^Thêm hàng bán lẻ/).locator('..');
  const retailSelect = retailEditor.locator('select');
  const retailProductId = await retailSelect
    .locator('option')
    .filter({ hasText: retailProductName })
    .getAttribute('value');
  if (!retailProductId)
    throw new Error(`Không tìm thấy ${retailProductName} trong catalog`);
  await retailSelect.selectOption(retailProductId);
  await retailEditor.locator('input[type="number"]').fill('2');
  const [addRetailResponse] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === `/api/v1/invoices/${invoiceId}/items`;
    }),
    retailEditor.getByRole('button', { name: 'Thêm', exact: true }).click(),
  ]);
  expect(addRetailResponse.status(), addRetailResponse.url()).toBeLessThan(300);
  await expect(invoicePanel).toContainText(retailProductName, { timeout: 15_000 });

  await invoicePanel.getByRole('button', { name: /^Thanh toán/ }).click();
  await expect(invoicePanel).toContainText('Đã thanh toán', { timeout: 20_000 });

  const headers = await authHeaders(page);
  const visitResponse = await page.request.get(`/api/v1/visits/${visitId}`, { headers });
  expect(visitResponse.ok(), `Visit detail trả HTTP ${visitResponse.status()}`).toBe(
    true,
  );
  const completedVisit = (await visitResponse.json()) as { vetId?: number };
  expect(completedVisit.vetId).toBeGreaterThan(0);
  await removeExistingCustomerRating(page, completedVisit.vetId!, 'customer1');

  await login(page, 'customer1', 'customer123');
  await page.goto('/customer/visits');
  await page.getByPlaceholder('Tìm kiếm lịch khám...').fill(petName);
  const completedVisitRow = page
    .getByRole('heading', { name: `${petName} — ${reason}` })
    .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
  await completedVisitRow.getByRole('button', { name: 'Đánh giá', exact: true }).click();
  const ratingDialog = page.getByRole('dialog', { name: 'Đánh giá bác sĩ' });
  await ratingDialog.getByRole('button', { name: '5 sao' }).click();
  await ratingDialog.getByLabel('Nhận xét (tuỳ chọn)').fill(ratingComment);
  await ratingDialog.getByRole('button', { name: 'Gửi đánh giá' }).click();
  await expect(ratingDialog).toBeHidden({ timeout: 15_000 });
  await expect(
    completedVisitRow.getByRole('button', { name: 'Đã đánh giá' }),
  ).toBeDisabled();
  await expect(
    completedVisitRow.getByRole('button', { name: 'Đánh giá', exact: true }),
  ).toHaveCount(0);

  await page.reload();
  await page.getByPlaceholder('Tìm kiếm lịch khám...').fill(petName);
  await expect(
    completedVisitRow.getByRole('button', { name: 'Đã đánh giá' }),
  ).toBeDisabled();
  await expect(
    completedVisitRow.getByRole('button', { name: 'Đánh giá', exact: true }),
  ).toHaveCount(0);

  await login(page, 'vet1', 'vet123');
  await page.goto('/vet/ratings');
  await expect(page.getByText(ratingComment, { exact: false })).toBeVisible({
    timeout: 20_000,
  });

  await login(page, 'customer1', 'customer123');
  await page.goto('/customer/profile/payments');
  const paidInvoice = page
    .getByText(`#${invoiceId}`, { exact: true })
    .locator('xpath=ancestor::*[contains(@class,"rounded-xl")][1]');
  await expect(paidInvoice).toContainText('Đã thanh toán');
  await paidInvoice.getByRole('button', { name: 'Xem chi tiết' }).click();
  await expect(paidInvoice).toContainText(diagnosis);
  await expect(paidInvoice).toContainText(treatment);
  await expect(paidInvoice).toContainText('Amoxicillin');
  const retailInvoiceLine = paidInvoice
    .getByRole('row')
    .filter({ hasText: retailProductName });
  await expect(retailInvoiceLine).toHaveCount(1);
  await expect(retailInvoiceLine.getByRole('cell').nth(3)).toHaveText('2');

  await login(page, 'inventory1', 'inventory123');
  await page.goto('/inventory/products?view=ledger');
  const retailMovement = page
    .getByRole('row')
    .filter({ hasText: retailProductCode })
    .filter({ hasText: 'Checkout merchandise' })
    .filter({ has: page.getByText(String(invoiceId), { exact: true }) });
  await expect(retailMovement).toHaveCount(1);
  await expect(retailMovement.getByRole('cell').nth(4)).toHaveText('2');
});
