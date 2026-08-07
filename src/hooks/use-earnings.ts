import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import type { EarningsEntry, EarningsSummary } from '@/lib/types';

export const earningsKeys = {
  all: ['earnings'] as const,
  period: (period: string) => ['earnings', period] as const,
};

interface EarningsResponse {
  ok: boolean;
  earnings: EarningsEntry[];
  summary: EarningsSummary;
}

export function useEarnings(period: 'daily' | 'weekly' | 'monthly' = 'weekly') {
  return useQuery({
    queryKey: earningsKeys.period(period),
    queryFn: async () => {
      const res = await apiRequest<EarningsResponse>(`/api/courier/earnings?period=${period}`, { method: 'GET' });
      return res;
    },
    staleTime: 60_000,
  });
}