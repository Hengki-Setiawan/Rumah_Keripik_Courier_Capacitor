import { test, expect } from '@playwright/test';
import { installCourierApiMock } from './mock-api';

test('menampilkan error saat PIN salah', async ({ page }) => {
  await installCourierApiMock(page, { pin: '123456' });
  await page.goto('/');

  await page.getByText('Masukkan PIN untuk masuk').waitFor();

  for (const digit of '111111') {
    await page.getByRole('button', { name: digit, exact: true }).click();
  }

  await expect(page.getByText('PIN salah')).toBeVisible();
  await expect(page.getByText('Masukkan PIN untuk masuk')).toBeVisible();
});

test('login PIN benar masuk ke dashboard', async ({ page }) => {
  await installCourierApiMock(page);
  await page.goto('/');

  await page.getByText('Masukkan PIN untuk masuk').waitFor();

  for (const digit of '123456') {
    await page.getByRole('button', { name: digit, exact: true }).click();
  }

  await expect(page.getByText('Selamat datang,')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Rizky Kurir' })).toBeVisible();
  await expect(page.getByText('Mulai Lacak Lokasi Real-Time')).toBeVisible();
});

test('masuk ke dashboard langsung jika sesi tersimpan', async ({ page }) => {
  await installCourierApiMock(page);

  await page.addInitScript(() => {
    window.localStorage.setItem('rk.access_token', 'mock-access-token');
    window.localStorage.setItem('rk.refresh_token', 'mock-refresh-token');
    window.localStorage.setItem(
      'rk.courier_profile',
      JSON.stringify({ id: 1, name: 'Rizky Kurir', phone: '081234567890', vehicle: 'Motor', plat_no: 'DD 1234 AB', is_active: true }),
    );
  });

  await page.goto('/');

  await expect(page.getByText('Selamat datang,')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Rizky Kurir' })).toBeVisible();
});
