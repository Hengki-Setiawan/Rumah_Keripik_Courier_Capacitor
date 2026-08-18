import type { Page, Route } from '@playwright/test';
import type { CourierDto, CourierDelivery, CourierRoute, DeliveryDetail, EarningsEntry, NotificationItem, StatsMe } from '../src/lib/types';

export interface RoutesMockData {
  available?: CourierRoute[];
  mine?: CourierRoute[];
  history?: CourierRoute[];
  other?: CourierRoute[];
  assignedCount?: number;
  hasActiveRoute?: boolean;
}

export interface CourierMockOptions {
  pin?: string;
  courier?: CourierDto;
  deliveries?: CourierDelivery[];
  deliveryDetail?: Partial<DeliveryDetail>;
  stats?: Partial<StatsMe>;
  earnings?: { entries: EarningsEntry[]; summary: { totalConfirmed: number; pendingTotal: number; deliveryCount: number; period: string } };
  notifications?: { notifications: NotificationItem[]; unreadCount: number };
  routes?: RoutesMockData;
}

export function defaultCourier(): CourierDto {
  return {
    id: 1,
    name: 'Rizky Kurir',
    phone: '081234567890',
    vehicle: 'Motor',
    plat_no: 'DD 1234 AB',
    is_active: true,
  };
}

export function defaultDeliveries(): CourierDelivery[] {
  return [
    {
      id: 1,
      id_transaksi: 'TXN-1',
      kode_pesanan: 'RK-1001',
      status: 'Siap_Dikirim',
      created_at: new Date().toISOString(),
      customer_name: 'Budi Santoso',
      customer_phone: '081112223333',
      address: 'Jl. Perintis Kemerdekaan No. 10',
      latitude: '-5.1340',
      longitude: '119.4135',
      distance_km: '3.2',
      notes: null,
      route_order: 1,
    },
    {
      id: 2,
      id_transaksi: 'TXN-2',
      kode_pesanan: 'RK-1002',
      status: 'Siap_Dikirim',
      created_at: new Date().toISOString(),
      customer_name: 'Siti Aminah',
      customer_phone: '081233445566',
      address: 'Jl. Ahmad Yani No. 22',
      latitude: '-5.1330',
      longitude: '119.4120',
      distance_km: '1.8',
      notes: null,
      route_order: 2,
    },
    {
      id: 3,
      id_transaksi: 'TXN-3',
      kode_pesanan: 'RK-1003',
      status: 'Terkirim',
      created_at: new Date().toISOString(),
      customer_name: 'Andi Kurniawan',
      customer_phone: '081355667788',
      address: 'Jl. Gunung Merapi No. 5',
      latitude: '-5.1320',
      longitude: '119.4110',
      distance_km: '4.5',
      notes: null,
      route_order: 3,
    },
    {
      id: 4,
      id_transaksi: 'TXN-4',
      kode_pesanan: 'RK-1004',
      status: 'Dalam_Pengiriman',
      created_at: new Date().toISOString(),
      customer_name: 'Rudi Hermawan',
      customer_phone: '081244556677',
      address: 'Jl. Urip Sumoharjo No. 88',
      latitude: '-5.1360',
      longitude: '119.4150',
      distance_km: '2.1',
      notes: null,
      route_order: 4,
    },
  ];
}

export function defaultStats(): StatsMe {
  return {
    period: 'week',
    totalAssigned: 5,
    totalCompleted: 4,
    totalFailed: 1,
    onTimeRate: 90,
    totalDistanceKm: 24.5,
    incidentCount: 0,
    score: 92,
    rank: 2,
    totalCouriers: 10,
    completionRate: 80,
  };
}

export function defaultRoutes(): Required<RoutesMockData> {
  return {
    available: [] as CourierRoute[],
    mine: [] as CourierRoute[],
    history: [] as CourierRoute[],
    other: [] as CourierRoute[],
    assignedCount: 0,
    hasActiveRoute: true,
  };
}

export function buildDeliveryDetail(id: number, extra: Partial<DeliveryDetail> = {}): DeliveryDetail {
  const names: Record<number, { nama: string; hp: string; alamat: string; kode: string }> = {
    1: { nama: 'Budi Santoso', hp: '081112223333', alamat: 'Jl. Perintis Kemerdekaan No. 10', kode: 'RK-1001' },
    2: { nama: 'Siti Aminah', hp: '081233445566', alamat: 'Jl. Ahmad Yani No. 22', kode: 'RK-1002' },
    3: { nama: 'Andi Kurniawan', hp: '081355667788', alamat: 'Jl. Gunung Merapi No. 5', kode: 'RK-1003' },
    4: { nama: 'Rudi Hermawan', hp: '081244556677', alamat: 'Jl. Urip Sumoharjo No. 88', kode: 'RK-1004' },
  };
  const info = names[id] ?? { nama: 'Pelanggan Test', hp: '080000000000', alamat: 'Alamat test', kode: `RK-${1000 + id}` };
  return {
    id,
    idTransaksi: `TXN-${id}`,
    status: 'Siap_Dikirim',
    orderStatus: 'completed',
    kodePesanan: info.kode,
    namaPenerima: info.nama,
    noHpPenerima: info.hp,
    alamatPenerima: info.alamat,
    catatan: null,
    totalBayar: 85000,
    createdAt: new Date().toISOString(),
    notes: null,
    routePoints: [{ lat: '-5.1340', lng: '119.4135', address: info.alamat, sequenceNo: 1 }],
    ...extra,
  };
}

function json(route: Route, status: number, body: unknown): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

export async function installCourierApiMock(page: Page, opts: CourierMockOptions = {}): Promise<void> {
  const pin = opts.pin ?? '123456';
  const courier = opts.courier ?? defaultCourier();
  const deliveries = opts.deliveries ?? defaultDeliveries();
  const stats: StatsMe = { ...defaultStats(), ...opts.stats };
  const earnings = opts.earnings ?? {
    entries: [] as EarningsEntry[],
    summary: { totalConfirmed: 40000, pendingTotal: 0, deliveryCount: 4, period: 'week' },
  };
  const notifications = opts.notifications ?? { notifications: [] as NotificationItem[], unreadCount: 0 };
  const routes: Required<RoutesMockData> = { ...defaultRoutes(), ...opts.routes };

  await page.route('**/api/courier/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();
    const post = () => route.request().postDataJSON();

    if (method === 'POST' && path === '/api/courier/auth/login') {
      const body = post() ?? {};
      if (body.pin !== pin) {
        return json(route, 401, { ok: false, error: 'PIN salah' });
      }
      return json(route, 200, {
        ok: true,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        courier,
      });
    }
    if (method === 'GET' && path === '/api/courier/auth/me') {
      return json(route, 200, { ok: true, courier });
    }
    if (method === 'POST' && path === '/api/courier/auth/logout') {
      return json(route, 200, { ok: true });
    }
    if (method === 'POST' && path === '/api/courier/auth/refresh') {
      return json(route, 401, { ok: false, error: 'Sesi tidak valid' });
    }

    if (method === 'GET' && path === '/api/courier/deliveries/today') {
      return json(route, 200, { ok: true, deliveries });
    }

    const detail = path.match(/^\/api\/courier\/deliveries\/(\d+)$/);
    if (method === 'GET' && detail) {
      const delivery = buildDeliveryDetail(Number(detail[1]), opts.deliveryDetail);
      return json(route, 200, { ok: true, delivery });
    }

    const action = path.match(/^\/api\/courier\/deliveries\/(\d+)\/(start|arrived|complete|fail)$/);
    if (method === 'POST' && action) {
      return json(route, 200, { ok: true });
    }

    if (method === 'GET' && path.startsWith('/api/courier/stats/me')) {
      return json(route, 200, { ok: true, data: stats });
    }

    if (method === 'GET' && path.startsWith('/api/courier/earnings')) {
      return json(route, 200, { ok: true, earnings: earnings.entries, summary: earnings.summary });
    }

    if (method === 'GET' && path.startsWith('/api/courier/notifications')) {
      return json(route, 200, { ok: true, data: notifications });
    }
    if (method === 'PATCH' && path === '/api/courier/notifications') {
      const body = post() ?? {};
      if (body.markAllRead) {
        for (const n of notifications.notifications) n.isRead = true;
        notifications.unreadCount = 0;
      } else if (typeof body.notificationId === 'number') {
        const target = notifications.notifications.find((n) => n.id === body.notificationId);
        if (target && !target.isRead) {
          target.isRead = true;
          notifications.unreadCount = Math.max(0, notifications.unreadCount - 1);
        }
      }
      return json(route, 200, { ok: true });
    }

    if (method === 'GET' && path === '/api/courier/routes') {
      return json(route, 200, { ok: true, data: routes });
    }
    const routeAction = path.match(/^\/api\/courier\/routes\/(\d+)$/);
    if (method === 'POST' && routeAction) {
      return json(route, 200, { ok: true, data: { stopCount: 4 } });
    }
    const routeOptimize = path.match(/^\/api\/courier\/routes\/(\d+)\/optimize$/);
    if (method === 'POST' && routeOptimize) {
      return json(route, 200, { ok: true, data: { waypoints: [], totalStops: 0, totalEstimatedKm: 0, source: 'mock' } });
    }

    if (method === 'POST' && path === '/api/courier/route/optimize') {
      return json(route, 200, { ok: true, data: { waypoints: [] } });
    }
    if (method === 'POST' && path === '/api/courier/incidents') {
      return json(route, 200, { ok: true, data: { id: 1 } });
    }
    if (method === 'POST' && path === '/api/courier/sos') {
      return json(route, 200, { ok: true, data: { id: 99, receivedAt: new Date().toISOString() } });
    }
    if (method === 'POST' && path === '/api/courier/push-tokens') {
      return json(route, 200, { ok: true });
    }
    if (method === 'POST' && path === '/api/courier/offers/respond') {
      return json(route, 200, { ok: true });
    }

    return json(route, 404, { ok: false, error: `mock: unhandled ${method} ${path}` });
  });
}

export async function loginAs(page: Page, pin = '123456'): Promise<void> {
  await page.goto('/');
  await page.getByText('Masukkan PIN untuk masuk').waitFor();
  for (const digit of pin) {
    await page.getByRole('button', { name: digit, exact: true }).click();
  }
  await page.getByText('Selamat bertugas,').waitFor();
}
