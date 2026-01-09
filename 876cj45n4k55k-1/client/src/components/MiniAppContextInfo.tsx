import { useFarcasterContext } from '@/hooks/use-farcaster-context';
import { ExternalLink } from 'lucide-react';

/**
 * Shows information about how the Mini App was launched
 * Useful for debugging and understanding user journey
 */
export function MiniAppContextInfo() {
  const { location, client } = useFarcasterContext();

  if (!location && !client?.platformType) {
    return null;
  }

  return (
    <div className="text-xs text-muted-foreground space-y-1 p-2 rounded bg-muted/50">
      {location && (
        <div>
          <span className="font-medium">Launched from:</span>
          {' '}
          {location.type === 'cast_embed' && (
            <span>Cast Embed {location.cast?.text && `"${location.cast.text.substring(0, 30)}..."`}</span>
          )}
          {location.type === 'cast_share' && (
            <span>Cast Share</span>
          )}
          {location.type === 'notification' && (
            <span>Notification: {location.notification?.title}</span>
          )}
          {location.type === 'launcher' && (
            <span>App Launcher</span>
          )}
          {location.type === 'channel' && (
            <span>Channel: {location.channel?.name}</span>
          )}
          {location.type === 'open_miniapp' && (
            <span>Mini App: {location.referrerDomain}</span>
          )}
        </div>
      )}
      {client?.platformType && (
        <div>
          <span className="font-medium">Platform:</span> {client.platformType}
        </div>
      )}
    </div>
  );
}
