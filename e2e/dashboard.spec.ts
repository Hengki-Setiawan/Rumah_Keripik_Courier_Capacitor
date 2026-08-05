import { test, expect } from '@playwright/test';
import { installCourierApiMock, loginAs } from './mock-api';

test.beforeEach(async ({ page }) => {
  await installCourierApiMock(page);
});

test('dashboard menampilkan statistik hari ini', async ({ page }) => {
  await loginAs(page);

  await expect(page.getByText('Pengiriman Hari Ini')).toBeVisible();
  await expect(page.getByText('Menunggu')).toBeVisible();
  await expect(page.getByText('Terkirim')).toBeVisible();
  await expect(page.getByText('Pendapatan Minggu Ini')).toBeVisible();
});

test('dashboard menampilkan pengiriman berikutnya', async ({ page }) => {
  await loginAs(page);

  await expect(page.getByText('Berikutnya')).toBeVisible();
  await expect(page.getByText('Rudi Hermawan')).toBeVisible();
  await expect(page.getByText(/Jarak: \d+\.\d km/)).toBeVisible();
});

test('dashboard kosong menampilkan empty state', async ({ page }) => {
  await installCourierApiMock(page, { deliveries: [] });
  await loginAs(page);

  await expect(page.getByText('Tidak ada pengiriman')).toBeVisible();
});

test('kartu shift di dashboard membuka halaman shift', async ({ page }) => {
  await loginAs(page);

  await page.getByRole('button', { name: 'Shift', exact: true }).click();
  await expect(page.getByText('Mulai shift untuk menerima pengiriman')).toBeVisible();
});
