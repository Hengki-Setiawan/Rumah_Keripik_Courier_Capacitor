import { test, expect } from '@playwright/test';
import { installCourierApiMock, loginAs } from './mock-api';

test.beforeEach(async ({ page }) => {
  await installCourierApiMock(page);
});

test('notifikasi kosong menampilkan empty state', async ({ page }) => {
  await loginAs(page);

  await page.goto('/notifications');

  await expect(page.getByText('Semua sudah dibaca')).toBeVisible();
  await expect(page.getByText('Tidak ada notifikasi')).toBeVisible();
});

test('notifikasi menampilkan daftar dan badge unread', async ({ page }) => {
  await installCourierApiMock(page, {
    notifications: {
      unreadCount: 1,
      notifications: [
        { id: 1, title: 'Pengiriman baru', body: 'RK-1004 menunggu diambil', type: 'delivery', isRead: false, relatedDeliveryId: 4, createdAt: '2026-08-05T08:00:00.000Z' },
        { id: 2, title: 'Shift dimulai', body: 'Shift 08:00 berjalan lancar', type: 'info', isRead: true, relatedDeliveryId: null, createdAt: '2026-08-05T07:00:00.000Z' },
      ],
    },
  });
  await loginAs(page);

  await page.goto('/notifications');

  await expect(page.getByText('1 belum dibaca')).toBeVisible();
  await expect(page.getByText('Pengiriman baru')).toBeVisible();
  await expect(page.getByText('RK-1004 menunggu diambil')).toBeVisible();
  await expect(page.getByText('Shift dimulai')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tandai semua dibaca', exact: true })).toBeVisible();
});

test('tandai semua dibaca mengosongkan badge unread', async ({ page }) => {
  await installCourierApiMock(page, {
    notifications: {
      unreadCount: 2,
      notifications: [
        { id: 1, title: 'Pengiriman baru', body: 'RK-1004 menunggu diambil', type: 'delivery', isRead: false, relatedDeliveryId: 4, createdAt: '2026-08-05T08:00:00.000Z' },
        { id: 2, title: 'SOS diterima admin', body: 'Laporan Anda diproses', type: 'sos', isRead: false, relatedDeliveryId: null, createdAt: '2026-08-05T09:00:00.000Z' },
      ],
    },
  });
  await loginAs(page);

  await page.goto('/notifications');
  await expect(page.getByText('2 belum dibaca')).toBeVisible();

  await page.getByRole('button', { name: 'Tandai semua dibaca', exact: true }).click();

  await expect(page.getByText('Semua sudah dibaca')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tandai semua dibaca', exact: true })).not.toBeVisible();
});