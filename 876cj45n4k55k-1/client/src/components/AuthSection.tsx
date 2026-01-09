import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { coinbaseWallet } from 'wagmi/connectors';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Wallet } from 'lucide-react';
import { sdk } from "@farcaster/miniapp-sdk";
import { useState, useEffect } from 'react';

export function AuthSection() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [fid, setFid] = useState<number | null>(null);

  useEffect(() => {
    const getContext = async () => {
      const context = await sdk.context;
      if (context?.user?.fid) {
        setFid(context.user.fid);
      }
    };
    getContext();
  }, []);

  if (isConnected) {
    return null;
  }

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
