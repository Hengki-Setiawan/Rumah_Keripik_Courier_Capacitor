import { test, expect } from '@playwright/test';
import { installCourierApiMock, loginAs } from './mock-api';

test.beforeEach(async ({ page }) => {
  await installCourierApiMock(page);
});

test('halaman SOS menampilkan elemen utama', async ({ page }) => {
  await loginAs(page);

  await page.goto('/sos');

  await expect(page.getByText('SOS Darurat')).toBeVisible();
  await expect(page.getByText('Keadaan Darurat')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Kirim SOS (tahan untuk konfirmasi)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hubungi Admin via Telepon' })).toBeVisible();
});

test('kirim SOS sukses menampilkan konfirmasi', async ({ page }) => {
  await loginAs(page);

  await page.goto('/sos');
  await page.getByRole('button', { name: 'Kendaraan Mogok', exact: true }).click();

  const sendBtn = page.getByRole('button', { name: 'Kirim SOS (tahan untuk konfirmasi)' });
  await sendBtn.dispatchEvent('pointerdown');
  await page.waitForTimeout(900);
  await sendBtn.dispatchEvent('pointerup');

  await expect(page.getByText('Laporan Terkirim')).toBeVisible();
  await expect(page.getByText('Laporan SOS terkirim. Tim akan segera menghubungi Anda.')).toBeVisible();
});