import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useConnect, useAccount } from 'wagmi';

/**
 * Hook to handle seamless Farcaster authentication
 * Automatically signs in users who are in the Farcaster app
 * without prompting them to connect a wallet
 */
export function useFarcasterAuth() {
  const [isInFarcaster, setIsInFarcaster] = useState(false);
  const [farcasterUser, setFarcasterUser] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { connect } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    const setupFarcasterAuth = async () => {
      try {
        // Get the Farcaster context
        const context = await sdk.context;
        
        if (context?.user?.fid) {
          setIsInFarcaster(true);
          setFarcasterUser(context.user);
          
          // If in Farcaster and not already connected, try Quick Auth
          if (!isConnected && !isConnecting) {
            await attemptQuickAuth();
          }
        }
      } catch (err) {
        console.log('Not in Farcaster app or context not available');
        setIsInFarcaster(false);
      }
    };

    setupFarcasterAuth();
  }, []);

  const attemptQuickAuth = async () => {
    try {
      setIsConnecting(true);
      
      // Try to use the quick auth connector if available
      // This will attempt to connect using the Farcaster context
      const quickAuthConfig = {
        clientId: import.meta.env.VITE_FARCASTER_CLIENT_ID || '',
      };

      if (quickAuthConfig.clientId) {
        // Import quickAuth dynamically to avoid errors if not available
        const { quickAuth } = await import('@farcaster/quick-auth');
        
        const authResult = await quickAuth({
          clientId: quickAuthConfig.clientId,
          nonce: 'login-' + Date.now(),
          redirectUrl: window.location.href,
        });

        if (authResult) {
          console.log('Quick Auth successful:', authResult);
          // The wagmi connection should happen automatically with Quick Auth
        }
      }
    } catch (err) {
      console.log('Quick Auth not available or failed, falling back to wallet connection:', err);
      setIsConnecting(false);
    }
  };

  return {
    isInFarcaster,
    farcasterUser,
    isConnecting,
    isConnected,
  };
}
