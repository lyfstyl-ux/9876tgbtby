import { useQuery } from '@tanstack/react-query';

export interface CreatorCoin {
  id: number;
  name: string;
  contractAddress: string;
  decimals: number;
  dexAddress?: string;
  chainId: number;
  isActive: boolean;
  createdAt: string;
}

export function useCreatorCoins() {
  return useQuery<CreatorCoin[]>({
    queryKey: ['creator-coins'],
    queryFn: async () => {
      const response = await fetch('/api/coins');
      if (!response.ok) {
        throw new Error('Failed to fetch creator coins');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

export function useCreatorCoinSettings(username?: string) {
  return useQuery<{ id: number; username: string; creatorCoinId: number; isEnabled: boolean; createdAt: string }>({
    queryKey: ['creator-coin-settings', username],
    queryFn: async () => {
      if (!username) throw new Error('Username required');
      const normalized = username.replace(/^@/, '');
      const response = await fetch(`/api/creators/${normalized}/coin`);
      if (!response.ok) {
        if (response.status === 404) {
          return undefined;
        }
        throw new Error('Failed to fetch creator coin settings');
      }
      return response.json();
    },
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
