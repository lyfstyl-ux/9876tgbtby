import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { Stake, Match } from '@shared/schema';

export function useStakeAcceptance() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [accepting, setAccepting] = useState(false);

  const acceptStakeMutation = useMutation({
    mutationFn: async (payload: {
      challengeId: number;
      username: string;
      side: 'yes' | 'no';
      amount: number;
      escrowId?: number;
      escrowTxHash?: string;
      opponentAddress?: string;
    }) => {
      const res = await fetch(
        `/api/challenges/${payload.challengeId}/accept/${payload.side}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to accept stake');
      }

      return res.json();
    },
    onSuccess: (stake: Stake) => {
      toast({
        title: 'Stake Created!',
        description: `Your ${stake.side.toUpperCase()} stake of ₦${stake.amount} is recorded.`,
      });

      // Invalidate challenges and stakes queries
      queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
      queryClient.invalidateQueries({ queryKey: [`/api/challenges/${stake.challengeId}/stakes`] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    acceptStake: acceptStakeMutation.mutate,
    isAccepting: acceptStakeMutation.isPending || accepting,
    setAccepting,
  };
}

export function useStakesByChallenge(challengeId: number) {
  return useQuery<Stake[]>({
    queryKey: [`/api/challenges/${challengeId}/stakes`],
    queryFn: async () => {
      const res = await fetch(`/api/challenges/${challengeId}/stakes`);
      if (!res.ok) throw new Error('Failed to fetch stakes');
      return res.json();
    },
    staleTime: 10 * 1000, // 10 seconds
  });
}

export function useMatchesByChallenge(challengeId: number) {
  return useQuery<Match[]>({
    queryKey: [`/api/challenges/${challengeId}/matches`],
    queryFn: async () => {
      const res = await fetch(`/api/challenges/${challengeId}/matches`);
      if (!res.ok) throw new Error('Failed to fetch matches');
      return res.json();
    },
    staleTime: 10 * 1000, // 10 seconds
  });
}

export function useNotifications(username: string) {
  return useQuery({
    queryKey: ['/api/notifications', username],
    queryFn: async () => {
      const res = await fetch(`/api/notifications?username=${username}`);
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
    staleTime: 5 * 1000, // 5 seconds
    enabled: !!username,
  });
}

export function useUnreadNotifications(username: string) {
  return useQuery({
    queryKey: ['/api/notifications/unread', username],
    queryFn: async () => {
      const res = await fetch(`/api/notifications?username=${username}&unreadOnly=true`);
      if (!res.ok) throw new Error('Failed to fetch unread notifications');
      return res.json();
    },
    staleTime: 5 * 1000, // 5 seconds
    enabled: !!username,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (notificationId: number) => {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to mark as read');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to subscribe to real-time notifications via SSE
 * Usage:
 * const notifications = useNotificationStream('alice');
 * useEffect(() => {
 *   notifications?.addEventListener('message', (e) => {
 *     const data = JSON.parse(e.data);
 *     console.log('New notification:', data);
 *   });
 * }, [notifications]);
 */
export function useNotificationStream(username: string) {
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const connect = () => {
    if (eventSource) return; // Already connected

    const es = new EventSource(`/api/notifications/subscribe/${username}`);
    setEventSource(es);

    es.onerror = () => {
      es.close();
      setEventSource(null);
    };

    return es;
  };

  const disconnect = () => {
    eventSource?.close();
    setEventSource(null);
  };

  return {
    eventSource,
    connect,
    disconnect,
    isConnected: !!eventSource,
  };
}
