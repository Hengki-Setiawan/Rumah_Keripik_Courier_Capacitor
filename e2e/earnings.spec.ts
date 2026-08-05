import { test, expect } from '@playwright/test';
import { installCourierApiMock, loginAs } from './mock-api';

test.beforeEach(async ({ page }) => {
  await installCourierApiMock(page);
});

test('pendapatan menampilkan total dan empty state', async ({ page }) => {
  await loginAs(page);

  await page.getByRole('button', { name: 'Pendapatan', exact: true }).click();

  await expect(page.getByText('Total Pendapatan Terkonfirmasi')).toBeVisible();
  await expect(page.getByText('Rp 40.000')).toBeVisible();
  await expect(page.getByText('Belum ada pendapatan')).toBeVisible();
});

test('pendapatan menampilkan daftar entri', async ({ page }) => {
  await installCourierApiMock(page, {
    earnings: {
      entries: [
        { id: 1, courierId: 1, baseFee: 30000, bonusAmount: 5000, status: 'confirmed', createdAt: '2026-08-01T08:00:00.000Z', note: 'Kemasan besar' },
        { id: 2, courierId: 1, baseFee: 25000, bonusAmount: 0, status: 'confirmed', createdAt: '2026-08-02T08:00:00.000Z', note: null },
      ],
      summary: { totalConfirmed: 60000, pendingTotal: 10000, deliveryCount: 2, period: 'week' },
    },
  });
  await loginAs(page);

  await page.getByRole('button', { name: 'Pendapatan', exact: true }).click();

  await expect(page.getByText('Rp 60.000')).toBeVisible();
  await expect(page.getByText('+ Rp 10.000 belum dikonfirmasi')).toBeVisible();
  await expect(page.getByText('Pengiriman #1 · Kemasan besar')).toBeVisible();
  await expect(page.getByText('Pengiriman #2')).toBeVisible();
  await expect(page.getByText('+Rp 35.000')).toBeVisible();
  await expect(page.getByText('+Rp 25.000')).toBeVisible();
});

test('filter periode pendapatan', async ({ page }) => {
  await loginAs(page);

  await page.getByRole('button', { name: 'Pendapatan', exact: true }).click();

  await page.getByRole('button', { name: '30 Hari', exact: true }).click();
  await expect(page.getByText('Total Pendapatan Terkonfirmasi')).toBeVisible();

  await page.getByRole('button', { name: 'Harian', exact: true }).click();
  await expect(page.getByText('Total Pendapatan Terkonfirmasi')).toBeVisible();
});