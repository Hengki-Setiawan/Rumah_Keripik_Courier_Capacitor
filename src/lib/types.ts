export interface CourierDto {
  id: number;
  name: string;
  phone: string;
  vehicle: string | null;
  plat_no: string | null;
  is_active: boolean;
  photo_url?: string | null;
}

export type DeliveryStatus = 'Siap_Dikirim' | 'Dalam_Pengiriman' | 'Terkirim' | 'Gagal';

export interface CourierDeliveryItem {
  name: string;
  quantity: number;
  price: number;
}

export interface CourierDelivery {
  id: number;
  id_transaksi: string;
  kode_pesanan: string;
  status: DeliveryStatus;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  latitude: string | null;
  longitude: string | null;
  distance_km: string | null;
  notes: string | null;
  route_order: number | null;
  items?: CourierDeliveryItem[];
}

export interface DeliveryDetail {
  id: number;
  idTransaksi: string;
  status: DeliveryStatus;
  orderStatus: string;
  kodePesanan: string;
  namaPenerima: string;
  noHpPenerima: string;
  alamatPenerima: string;
  catatan?: string | null;
  totalBayar: number;
  createdAt: string;
  notes?: string | null;
  routePoints: { lat: string; lng: string; address: string; sequenceNo: number }[];
}

export interface RouteWaypoint {
  lat: number;
  lng: number;
  sequence: number;
  deliveryId: number;
  idTransaksi?: string;
  customerName?: string;
}

export interface StatsMe {
  period: string;
  totalAssigned: number;
  totalCompleted: number;
  totalFailed: number;
  onTimeRate: number;
  totalDistanceKm: number;
  incidentCount: number;
  score: number;
  rank: number;
  totalCouriers: number;
  completionRate: number;
}

export interface NotificationItem {
  id: number;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  relatedDeliveryId: number | null;
  createdAt: string;
}

export interface IncidentItem {
  id: number;
  type: string;
  severity: string;
  status: string | null;
  created_at: string;
  description: string | null;
}

export interface AttendanceRecord {
  id: number;
  clockInAt: string | null;
  clockInWithinGeofence: number | null;
  clockOutAt: string | null;
  clockOutWithinGeofence: number | null;
  totalWorkMinutes: number | null;
  status: string;
}

export interface ShiftState {
  id: number;
  status: 'active' | 'ended' | 'forced_end';
  clockInAt?: string | null;
  clockOutAt?: string | null;
  totalDeliveries?: number | null;
}

export interface EarningsEntry {
  id: number;
  courierId: number;
  baseFee: number;
  bonusAmount: number;
  status: string;
  createdAt: string;
  period?: string | null;
  note?: string | null;
}

export interface EarningsSummary {
  totalConfirmed: number;
  pendingTotal: number;
  deliveryCount: number;
  period: string;
}