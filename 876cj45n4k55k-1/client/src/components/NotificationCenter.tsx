import { useState, useEffect } from 'react';
import { useUnreadNotifications, useMarkNotificationRead, useNotificationStream } from '@/hooks/use-stakes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Bell } from 'lucide-react';
import type { Notification } from '@shared/schema';

interface NotificationCenterProps {
  username: string;
}

export function NotificationCenter({ username }: NotificationCenterProps) {
  const { data: notifications = [] } = useUnreadNotifications(username);
  const markAsReadMutation = useMarkNotificationRead();
  const { eventSource, connect, disconnect, isConnected } = useNotificationStream(username);
  const [liveNotifications, setLiveNotifications] = useState<Notification[]>([]);

  // Set up SSE connection for real-time notifications
  useEffect(() => {
    if (!username) return;

    const es = connect();
    if (!es) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.message === 'Connected to notifications') {
          console.log('Connected to notification stream');
          return;
        }

        // Handle new notification
        if (data.id) {
          setLiveNotifications((prev) => [data, ...prev]);
        }
      } catch (e) {
        console.error('Failed to parse notification:', e);
      }
    };

    es.addEventListener('message', handleMessage);

    return () => {
      es.removeEventListener('message', handleMessage);
      disconnect();
    };
  }, [username, connect, disconnect]);

  const allNotifications = [...liveNotifications, ...notifications];
  const unreadCount = allNotifications.filter(n => !n.read).length;

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'matched':
        return 'bg-green-50 border-green-200';
      case 'settled':
        return 'bg-blue-50 border-blue-200';
      case 'won':
        return 'bg-yellow-50 border-yellow-200';
      case 'challenge_created':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-muted';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'matched':
        return '🎯';
      case 'settled':
        return '✅';
      case 'won':
        return '🏆';
      case 'challenge_created':
        return '⚔️';
      default:
        return '📢';
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4" />
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
          <span className="text-xs text-muted-foreground">
            {isConnected ? 'Live' : 'Polling'}
          </span>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {allNotifications.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            No notifications yet
          </div>
        ) : (
          allNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg border ${getNotificationColor(notification.type)} space-y-1 ${
                !notification.read ? 'ring-1 ring-primary/30' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1">
                  <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{notification.title}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {notification.message}
                    </p>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 hover:bg-black/5"
                    onClick={() => markAsReadMutation.mutate(notification.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Status */}
      {allNotifications.length > 0 && (
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Showing {allNotifications.length} notification{allNotifications.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
