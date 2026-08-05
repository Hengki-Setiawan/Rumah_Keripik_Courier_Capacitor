import { test, expect } from '@playwright/test';
import { installCourierApiMock, loginAs, defaultDeliveries } from './mock-api';
import type { CourierDelivery } from '../src/lib/types';

test.beforeEach(async ({ page }) => {
  await installCourierApiMock(page);
});

test('riwayat menampilkan semua pengiriman dengan badge status', async ({ page }) => {
  await loginAs(page);

  await page.getByRole('button', { name: 'History', exact: true }).click();

  await expect(page.getByText('Budi Santoso')).toBeVisible();
  await expect(page.getByText('Andi Kurniawan')).toBeVisible();
  await expect(page.getByText('Rudi Hermawan')).toBeVisible();
  await expect(page.getByText('Terkirim', { exact: true })).toBeVisible();
});

test('filter Terkirim hanya menampilkan pengiriman terkirim', async ({ page }) => {
  await loginAs(page);

  await page.getByRole('button', { name: 'History', exact: true }).click();
  await page.getByRole('button', { name: /^Terkirim/ }).click();

  await expect(page.getByText('Andi Kurniawan')).toBeVisible();
  await expect(page.getByText('Budi Santoso')).not.toBeVisible();
});

test('filter Gagal menampilkan empty state saat tidak ada', async ({ page }) => {
  await loginAs(page);

  await page.getByRole('button', { name: 'History', exact: true }).click();
  await page.getByRole('button', { name: /^Gagal/ }).click();

  await expect(page.getByText('Belum ada riwayat')).toBeVisible();
});

test('filter Gagal menampilkan pengiriman gagal dari data custom', async ({ page }) => {
  const failed: CourierDelivery = {
    id: 99,
    id_transaksi: 'TXN-99',
    kode_pesanan: 'RK-1099',
    status: 'Gagal',
    created_at: new Date().toISOString(),
    customer_name: 'Joko Gagal',
    customer_phone: '081299988877',
    address: 'Jl. Perintis No. 1',
    latitude: '-5.1300',
    longitude: '119.4100',
    distance_km: '1.1',
    notes: 'Alamat tidak ditemukan',
    route_order: 5,
  };
  await installCourierApiMock(page, { deliveries: [...defaultDeliveries(), failed] });
  await loginAs(page);

  await page.getByRole('button', { name: 'History', exact: true }).click();
  await page.getByRole('button', { name: /^Gagal/ }).click();

  await expect(page.getByText('Joko Gagal')).toBeVisible();
  await expect(page.getByText('Gagal', { exact: true })).toBeVisible();
});