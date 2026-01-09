import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export interface QuickAuthToken {
  token: string;
}

export interface QuickAuthState {
  token: string | null;
  isLoading: boolean;
  error: string | null;
  fid: number | null;
}

/**
 * Hook for Farcaster Quick Auth
 * Provides JWT token for secure backend authentication
 * Works in both Farcaster and Base mini apps
 */
export function useQuickAuth(): QuickAuthState {
  const [state, setState] = useState<QuickAuthState>({
    token: null,
    isLoading: true,
    error: null,
    fid: null,
  });

  useEffect(() => {
    let isMounted = true;

    const initQuickAuth = async () => {
      try {
        // Check if Quick Auth is available
        const capabilities = await sdk.getCapabilities?.();
        const hasQuickAuth = capabilities?.includes('quickAuth.getToken');

        if (!hasQuickAuth) {
          if (isMounted) {
            setState(prev => ({
              ...prev,
              isLoading: false,
              error: 'Quick Auth not available',
            }));
          }
          return;
        }

        // Get the JWT token from Quick Auth
        const { token } = await sdk.quickAuth.getToken();

        if (!isMounted) return;

        // Extract FID from context if available
        const context = sdk.context;
        const fid = context?.user?.fid || null;

        setState({
          token,
          fid,
          isLoading: false,
          error: null,
        });

        console.log('Quick Auth token obtained for FID:', fid);
      } catch (error) {
        console.error('Quick Auth error:', error);
        if (isMounted) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Quick Auth failed',
          }));
        }
      }
    };

    initQuickAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}

/**
 * Make authenticated fetch requests using Quick Auth
 */
export async function quickAuthFetch(
  url: string,
  options?: RequestInit & { token: string }
): Promise<Response> {
  const { token, ...fetchOptions } = options || { token: '' };

  return sdk.quickAuth.fetch(url, {
    ...fetchOptions,
    headers: {
      ...fetchOptions?.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}
