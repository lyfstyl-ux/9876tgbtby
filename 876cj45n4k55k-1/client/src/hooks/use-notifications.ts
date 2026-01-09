import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export function useNotifications() {
  const { toast } = useToast();

  useEffect(() => {
    if (!(window as any).EventSource) return;
    const es = new EventSource('/api/notifications/stream');

    es.addEventListener('challenge:matched', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        toast({ title: 'Challenge matched', description: `Challenge ${data.challengeId} was matched by ${data.matcher}` });
      } catch (err) {
        // ignore
      }
    });

    es.addEventListener('challenge:declined', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        toast({ title: 'Challenge declined', description: `Challenge ${data.challengeId} was declined` });
      } catch (err) {
        // ignore
      }
    });

    return () => es.close();
  }, [toast]);
}
