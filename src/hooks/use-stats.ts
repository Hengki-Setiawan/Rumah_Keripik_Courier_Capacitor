import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import type { StatsMe } from '@/lib/types';

export const statsKeys = {
  me: (period: string) => ['stats', period] as const,
};

interface StatsResponse {
  ok: boolean;
  data: StatsMe;
}

export function useStats(period: 'week' | 'month' = 'week') {
  return useQuery({
    queryKey: statsKeys.me(period),
    queryFn: async () => {
      const res = await apiRequest<StatsResponse>(`/api/courier/stats/me?period=${period}`, { method: 'GET' });
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}