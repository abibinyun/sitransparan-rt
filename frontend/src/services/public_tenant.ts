import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { getTenantSlugFromHost } from '../utils/tenant';

export interface PublicTenantInfo {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo_url?: string;
}

export function usePublicTenantQuery() {
  const slug = getTenantSlugFromHost();
  return useQuery<PublicTenantInfo, Error>({
    queryKey: ['public-tenant-info', slug],
    queryFn: async () => {
      if (!slug) throw new Error('No tenant slug on platform root');
      const res = await axios.get<{ data: PublicTenantInfo }>(`/api/v1/t/${slug}/info`);
      return res.data.data;
    },
    enabled: Boolean(slug),
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 1;
    },
    staleTime: 5 * 60 * 1000,
  });
}
