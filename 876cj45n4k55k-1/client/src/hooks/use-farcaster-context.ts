import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface ClientFeatures {
  haptics: boolean;
  cameraAndMicrophoneAccess?: boolean;
}

export interface MiniAppLocation {
  type: 'cast_embed' | 'cast_share' | 'notification' | 'launcher' | 'channel' | 'open_miniapp';
  cast?: {
    author?: FarcasterUser;
    hash?: string;
    text?: string;
  };
  notification?: {
    notificationId?: string;
    title?: string;
    body?: string;
  };
  channel?: {
    key?: string;
    name?: string;
  };
  referrerDomain?: string;
}

export interface FarcasterContextInfo {
  user?: FarcasterUser;
  location?: MiniAppLocation;
  client?: {
    platformType?: 'web' | 'mobile';
    clientFid?: number;
    added?: boolean;
    safeAreaInsets?: SafeAreaInsets;
  };
  features?: ClientFeatures;
  isInMiniApp: boolean;
  isLoading: boolean;
}

/**
 * Hook to access full Farcaster Mini App context
 * Provides seamless authentication and launch context without requiring user interaction
 */
export function useFarcasterContext(): FarcasterContextInfo {
  const [context, setContext] = useState<FarcasterContextInfo>({
    isLoading: true,
    isInMiniApp: false,
  });

  useEffect(() => {
    let isMounted = true;

    const initContext = async () => {
      try {
        // Check if running in Mini App
        const inMiniApp = await sdk.isInMiniApp();
        
        if (!isMounted) return;

        if (inMiniApp) {
          // Get the full SDK context
          const sdkContext = sdk.context;
          
          setContext({
            user: sdkContext?.user ? {
              fid: sdkContext.user.fid,
              username: sdkContext.user.username,
              displayName: sdkContext.user.displayName,
              pfpUrl: sdkContext.user.pfpUrl,
            } : undefined,
            location: sdkContext?.location ? {
              type: sdkContext.location.type as any,
              cast: sdkContext.location.type === 'cast_embed' || sdkContext.location.type === 'cast_share' 
                ? {
                    author: (sdkContext.location as any).cast?.author,
                    hash: (sdkContext.location as any).cast?.hash,
                    text: (sdkContext.location as any).cast?.text,
                  }
                : undefined,
              notification: sdkContext.location.type === 'notification'
                ? {
                    notificationId: (sdkContext.location as any).notification?.notificationId,
                    title: (sdkContext.location as any).notification?.title,
                    body: (sdkContext.location as any).notification?.body,
                  }
                : undefined,
              channel: sdkContext.location.type === 'channel'
                ? {
                    key: (sdkContext.location as any).channel?.key,
                    name: (sdkContext.location as any).channel?.name,
                  }
                : undefined,
              referrerDomain: sdkContext.location.type === 'open_miniapp'
                ? (sdkContext.location as any).referrerDomain
                : undefined,
            } : undefined,
            client: sdkContext?.client ? {
              platformType: sdkContext.client.platformType,
              clientFid: sdkContext.client.clientFid,
              added: sdkContext.client.added,
              safeAreaInsets: sdkContext.client.safeAreaInsets,
            } : undefined,
            features: sdkContext?.features ? {
              haptics: sdkContext.features.haptics,
              cameraAndMicrophoneAccess: sdkContext.features.cameraAndMicrophoneAccess,
            } : undefined,
            isInMiniApp: true,
            isLoading: false,
          });
        } else {
          setContext({
            isInMiniApp: false,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Error accessing Farcaster context:', error);
        if (isMounted) {
          setContext({
            isInMiniApp: false,
            isLoading: false,
          });
        }
      }
    };

    initContext();

    return () => {
      isMounted = false;
    };
  }, []);

  return context;
}
