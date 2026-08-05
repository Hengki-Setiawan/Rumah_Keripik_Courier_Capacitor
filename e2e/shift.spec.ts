import { test, expect } from '@playwright/test';
import { installCourierApiMock, loginAs } from './mock-api';

test.beforeEach(async ({ page }) => {
  await installCourierApiMock(page);
});

test('clock-in mengaktifkan shift', async ({ page }) => {
  await loginAs(page);

  await page.goto('/shift');
  await expect(page.getByText('Belum Mulai')).toBeVisible();

  await page.getByRole('button', { name: 'Mulai Shift', exact: true }).click();

  await expect(page.getByText('Sedang Aktif')).toBeVisible();
  await expect(page.getByText('Tracking lokasi aktif')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Akhiri Shift', exact: true })).toBeVisible();
});

test('clock-out mengakhiri shift', async ({ page }) => {
  await loginAs(page);

  await page.goto('/shift');
  await page.getByRole('button', { name: 'Mulai Shift', exact: true }).click();
  await expect(page.getByText('Sedang Aktif')).toBeVisible();

  await page.getByRole('button', { name: 'Akhiri Shift', exact: true }).click();

  await expect(page.getByText('Belum Mulai')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mulai Shift', exact: true })).toBeVisible();
});
