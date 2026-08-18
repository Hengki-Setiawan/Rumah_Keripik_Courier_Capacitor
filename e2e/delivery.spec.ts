import { test, expect, type Locator, type Page } from '@playwright/test';
import { installCourierApiMock, loginAs } from './mock-api';

test.beforeEach(async ({ page }) => {
  await installCourierApiMock(page);
});

async function openNextDelivery(page: Page) {
  await page.getByText('Berikutnya').waitFor();
  await page.getByText('Rudi Hermawan').click();
  await expect(page.getByText('Detail Pengiriman')).toBeVisible();
}

async function swipeToComplete(page: Page) {
  const track: Locator = page.locator('.relative.flex.h-14.w-full.select-none');
  await track.scrollIntoViewIfNeeded();
  const box = await track.boundingBox();
  if (!box) throw new Error('SwipeAction track not found');
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 30, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 20, y, { steps: 15 });
  await page.mouse.up();
}

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

test('selesaikan pengiriman dengan geser kembali ke dashboard', async ({ page }) => {
  await loginAs(page);

  await openNextDelivery(page);
  await expect(page.getByText('Geser untuk Selesaikan')).toBeVisible();

  await swipeToComplete(page);

  await expect(page.getByText('Pengiriman selesai')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Beranda' })).toBeVisible();
});

test('buka halaman bukti serah terima', async ({ page }) => {
  await loginAs(page);

  await openNextDelivery(page);

  await page.getByRole('button', { name: 'Foto / Bukti', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Bukti Serah Terima' })).toBeVisible();
  await expect(page.getByText('Sentuh untuk Ambil Foto')).toBeVisible();
  await expect(page.getByText('Selesaikan & Simpan Bukti')).toBeVisible();
});

test('telpon & whatsapp tersedia di detail pengiriman', async ({ page }) => {
  await loginAs(page);

  await openNextDelivery(page);

  await expect(page.getByLabel('Telepon penerima')).toBeVisible();
  await expect(page.getByLabel('Chat WhatsApp penerima')).toBeVisible();
  await expect(page.getByText('Segera Tiba')).toBeVisible();
  await expect(page.getByText('Sudah Sampai')).toBeVisible();
});