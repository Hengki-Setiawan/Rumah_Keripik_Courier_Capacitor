import { test, expect } from '@playwright/test';
import { installCourierApiMock, loginAs, type RoutesMockData } from './mock-api';
import type { CourierRoute } from '../src/lib/types';

const openRoute: CourierRoute = {
  id: 10,
  routeName: 'Jalur Makassar Selatan',
  routeDate: '2026-08-17',
  status: 'open',
  courierId: null,
  warehouseName: null,
  stopCount: 3,
  estimatedDistanceKm: '12.5',
  estimatedDurationMinutes: 45,
  createdAt: new Date().toISOString(),
  stops: [],
  areaPreview: ['Panakkukang', 'Rappocini'],
  inRadius: true,
};

function routesWith(extra: RoutesMockData): RoutesMockData {
  return {
    available: [],
    mine: [],
    history: [],
    other: [],
    assignedCount: 0,
    hasActiveRoute: false,
    ...extra,
  };
}

test('dashboard menampilkan aksi peta rute dan jalur tersedia di route picker', async ({ page }) => {
  await installCourierApiMock(page, { routes: routesWith({ available: [openRoute] }) });
  await loginAs(page);

  await expect(page.getByText('Buka Peta Rute Pengiriman')).toBeVisible();
  await expect(page.getByText('Buka peta real-time & optimasi rute')).toBeVisible();

  await page.goto('/route-picker');
  await expect(page.getByText('Pilih Jalur Hari Ini')).toBeVisible();
  await expect(page.getByText('Jalur Makassar Selatan')).toBeVisible();
  await expect(page.getByText('3 kiriman · ~12.5 km')).toBeVisible();
});

test('ambil jalur membuka halaman rute dengan titik pengiriman', async ({ page }) => {
  await installCourierApiMock(page, { routes: routesWith({ available: [openRoute] }) });
  await loginAs(page);

  await page.goto('/route-picker');
  await expect(page.getByText('Pilih Jalur Hari Ini')).toBeVisible();
  await expect(page.getByText('Jalur Makassar Selatan')).toBeVisible();
  await expect(page.getByText('3 kiriman · ~12.5 km')).toBeVisible();

  await page.getByRole('button', { name: 'Ambil', exact: true }).click();

  await expect(page.getByText('Jalur diambil — 4 kiriman. Selamat bekerja!')).toBeVisible();
  await expect(page.getByText('Rute Hari Ini')).toBeVisible();
  await expect(page.getByText('Budi Santoso')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Navigasi', exact: true }).first()).toBeVisible();
});

test('route picker menampilkan empty state saat tidak ada jalur tersedia', async ({ page }) => {
  await installCourierApiMock(page, { routes: routesWith() });
  await loginAs(page);

  await page.goto('/route-picker');
  await expect(page.getByText('Belum ada jalur tersedia')).toBeVisible();
});

test('dashboard membuka rute langsung saat jalur aktif', async ({ page }) => {
  await installCourierApiMock(page, {
    routes: routesWith({
      mine: [{ ...openRoute, id: 11, routeName: 'Jalur Makassar Utara', status: 'in_progress', courierId: 1 }],
      hasActiveRoute: true,
    }),
  });
  await loginAs(page);

  await expect(page.getByText('Lanjut navigasi rute aktif & panduan suara')).toBeVisible();
  await page.getByLabel('Buka rute peta hari ini').click();
  await expect(page.getByText('Rute Hari Ini')).toBeVisible();
});

test('route picker menampilkan kartu jalur aktif saat sudah punya jalur', async ({ page }) => {
  await installCourierApiMock(page, {
    routes: routesWith({
      mine: [{ ...openRoute, id: 11, routeName: 'Jalur Makassar Utara', status: 'in_progress', courierId: 1 }],
      hasActiveRoute: true,
    }),
  });
  await loginAs(page);

  await page.goto('/route-picker');
  await expect(page.getByText('Kamu sudah punya jalur aktif')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Buka Rute', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Buka Rute', exact: true }).click();
  await expect(page.getByText('Rute Hari Ini')).toBeVisible();
});