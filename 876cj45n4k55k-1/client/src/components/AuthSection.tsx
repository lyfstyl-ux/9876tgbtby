import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { coinbaseWallet } from 'wagmi/connectors';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Wallet, CheckCircle2 } from 'lucide-react';
import { useFarcasterContext } from '@/hooks/use-farcaster-context';
import { useState, useEffect } from 'react';

export function AuthSection() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { user: farcasterUser, isInMiniApp, isLoading } = useFarcasterContext();
  const [displayName, setDisplayName] = useState<string>('');

  // Use Farcaster context if available (seamless auth in Mini App)
  const isAuthenticated = isConnected || (isInMiniApp && farcasterUser);

  useEffect(() => {
    if (farcasterUser) {
      setDisplayName(farcasterUser.displayName || farcasterUser.username || `FID: ${farcasterUser.fid}`);
    } else if (address) {
      setDisplayName(`${address.slice(0, 6)}...${address.slice(-4)}`);
    }
  }, [farcasterUser, address]);

  // Show loading state while checking Mini App context
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-muted/50">
        <div className="w-4 h-4 rounded-full bg-muted-foreground/30 animate-pulse" />
        <span className="text-xs text-muted-foreground">Authenticating...</span>
      </div>
    );
  }

  // Show authenticated state
  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        {farcasterUser?.pfpUrl && (
          <Avatar className="w-8 h-8">
            <AvatarImage src={farcasterUser.pfpUrl} alt={farcasterUser.username} />
            <AvatarFallback>{farcasterUser.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{displayName}</p>
          {farcasterUser && (
            <p className="text-xs text-muted-foreground">Farcaster</p>
          )}
        </div>
        {farcasterUser && (
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
        )}
      </div>
    );
  }

  // Show connection button if not authenticated and not in Mini App
  return (
    <Button 
      onClick={() => connect({ connector: coinbaseWallet({ preference: 'smartWalletOnly' }) })}
      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 rounded-2xl shadow-lg shadow-primary/20 group transition-all active:scale-95"
    >
      <Wallet className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
      Connect Wallet
    </Button>
  );
}
