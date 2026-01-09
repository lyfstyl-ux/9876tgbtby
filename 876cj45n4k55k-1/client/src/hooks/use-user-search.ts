import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export interface SearchUser {
  username: string;
  displayName?: string;
  pfp?: string;
  fid?: number;
  followerCount?: number;
}

export function useUserSearch(query: string) {
  return useQuery({
    queryKey: ["users-search", query],
    queryFn: async () => {
      if (!query || query.trim().length < 1) return [];
      
      const params = new URLSearchParams({ q: query });
      const url = `${api.users.search.path}?${params.toString()}`;
      
      try {
        const response = await fetch(url);
        if (!response.ok) {
          const err = await response.text();
          console.error(`Search failed: ${response.status}`, err);
          return [];
        }
        const data = await response.json();
        console.log(`Search for '${query}' returned ${data.length} results`, data);
        return data as SearchUser[];
      } catch (err) {
        console.error(`Search error for '${query}':`, err);
        return [];
      }
    },
    enabled: !!query && query.trim().length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}
