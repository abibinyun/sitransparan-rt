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
  return useQuery<PublicTenantInfo | null, Error>({
    queryKey: ['public-tenant-info', slug],
    queryFn: async () => {
      try {
        const res = await axios.get<{ data: PublicTenantInfo }>(`/api/v1/t/${slug}/info`);
        return res.data.data;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}
