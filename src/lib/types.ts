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
  route_id?: number | null;
  route_name?: string | null;
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
  statusPembayaran?: string | null;
  paymentStatus?: string | null;
  tipePenjualan?: string | null;
  paymentMethod?: string | null;
  createdAt: string;
  notes?: string | null;
  totalQty?: number;
  totalBeratGram?: number;
  routePoints: { lat: string; lng: string; address: string; sequenceNo: number }[];
  items?: {
    namaProduk: string | null;
    varian?: string | null;
    qty: number;
    harga: number;
    subtotal: number;
    beratGram?: number | null;
  }[];
}

export interface RouteWaypoint {
  lat: number;
  lng: number;
  sequence: number;
  deliveryId: number;
  idTransaksi?: string;
  customerName?: string;
}

export interface RoutePolylinePoint {
  lat: number;
  lng: number;
}

export interface OptimizedRoute {
  waypoints: RouteWaypoint[];
  totalStops: number;
  totalEstimatedKm: number;
  source?: 'osrm' | 'local';
  routePolyline?: RoutePolylinePoint[] | null;
  routeDurationMin?: number;
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

export type CourierRouteStatus = 'open' | 'claimed' | 'in_progress' | 'completed' | 'cancelled';

export interface CourierRouteStop {
  id: number;
  id_transaksi: string;
  sequence_no: number;
  lat: string | null;
  lng: string | null;
  address: string | null;
}

export interface CourierRoute {
  id: number;
  routeName: string;
  routeDate: string;
  status: CourierRouteStatus;
  courierId: number | null;
  warehouseName: string | null;
  stopCount: number;
  estimatedDistanceKm: string | null;
  estimatedDurationMinutes: number | null;
  createdAt: string;
  stops: CourierRouteStop[];
  areaPreview: string[];
  inRadius: boolean;
}

export interface CourierRoutesResponse {
  ok: boolean;
  data: {
    available: CourierRoute[];
    mine: CourierRoute[];
    history: CourierRoute[];
    other: CourierRoute[];
    assignedCount: number;
    hasActiveRoute: boolean;
  };
}