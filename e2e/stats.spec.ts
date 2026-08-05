import { test, expect } from '@playwright/test';
import { installCourierApiMock, loginAs } from './mock-api';

test.beforeEach(async ({ page }) => {
  await installCourierApiMock(page);
});

test('stats menampilkan skor, peringkat, dan ringkasan', async ({ page }) => {
  await loginAs(page);

  await page.getByRole('button', { name: 'Statistik', exact: true }).click();

  await expect(page.getByText('Skor Kinerja')).toBeVisible();
  await expect(page.getByText('Peringkat 2 dari 10 kurir')).toBeVisible();
  await expect(page.getByText('Diterima')).toBeVisible();
  await expect(page.getByText('90%')).toBeVisible();
  await expect(page.getByText('25 km')).toBeVisible();
  await expect(page.getByText('80%')).toBeVisible();
});

test('filter 30 hari pada halaman stats', async ({ page }) => {
  await loginAs(page);

  await page.getByRole('button', { name: 'Statistik', exact: true }).click();
  await page.getByRole('button', { name: '30 Hari', exact: true }).click();

  await expect(page.getByText('Skor Kinerja')).toBeVisible();
  await expect(page.getByText('Peringkat 2 dari 10 kurir')).toBeVisible();
});

test('stats menampilkan data custom', async ({ page }) => {
  await installCourierApiMock(page, {
    stats: { score: 100, rank: 1, totalCouriers: 5, totalAssigned: 9, onTimeRate: 97, totalDistanceKm: 40, completionRate: 100 },
  });
  await loginAs(page);

  await page.getByRole('button', { name: 'Statistik', exact: true }).click();

  await expect(page.getByText('Peringkat 1 dari 5 kurir')).toBeVisible();
  await expect(page.getByText('97%')).toBeVisible();
  await expect(page.getByText('40 km')).toBeVisible();
  await expect(page.getByText('100%')).toBeVisible();
});
