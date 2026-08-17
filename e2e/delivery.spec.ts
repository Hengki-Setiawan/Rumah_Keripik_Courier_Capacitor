import { test, expect } from '@playwright/test';
import { installCourierApiMock, loginAs } from './mock-api';

test.beforeEach(async ({ page }) => {
  await installCourierApiMock(page);
});

test('buka detail pengiriman dari dashboard', async ({ page }) => {
  await loginAs(page);

  await page.getByText('Berikutnya').waitFor();
  await page.getByText('Rudi Hermawan').click();

  await expect(page.getByText('Detail Pengiriman')).toBeVisible();
  await expect(page.getByText('RK-1004')).toBeVisible();
  await expect(page.getByText('Rudi Hermawan')).toBeVisible();
  await expect(page.getByText('Jl. Urip Sumoharjo No. 88')).toBeVisible();
  await expect(page.getByText('Rp 85.000').first()).toBeVisible();
});

test('selesaikan pengiriman kembali ke dashboard', async ({ page }) => {
  await loginAs(page);

  await page.getByText('Berikutnya').waitFor();
  await page.getByText('Rudi Hermawan').click();
  await expect(page.getByText('Detail Pengiriman')).toBeVisible();

  await page.getByRole('button', { name: 'Selesaikan Pengiriman', exact: true }).click();

  await expect(page.getByText('Pengiriman selesai')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Beranda' })).toBeVisible();
});

test('foto penerima membuka halaman foto', async ({ page }) => {
  await loginAs(page);

  await page.getByText('Berikutnya').waitFor();
  await page.getByText('Rudi Hermawan').click();
  await expect(page.getByText('Detail Pengiriman')).toBeVisible();

  await page.getByRole('button', { name: 'Foto Penerima (opsional)', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Foto Penerima' })).toBeVisible();
});

test('telpon & whatsapp tersedia di detail pengiriman', async ({ page }) => {
  await loginAs(page);

  await page.getByText('Berikutnya').waitFor();
  await page.getByText('Rudi Hermawan').click();

  await expect(page.getByText('Telepon')).toBeVisible();
  await expect(page.getByText('WhatsApp')).toBeVisible();
});
