import { useState, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { sdk } from "@farcaster/miniapp-sdk";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LogOut, User, Settings, Coins } from "lucide-react";
import { useCreatorCoinSettings } from "@/hooks/use-creator-coins";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function ProfileDropdown() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [user, setUser] = useState<any>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const getContext = async () => {
      const context = await sdk.context;
      if (context?.user) {
        setUser(context.user);
      }
    };
    getContext();
  }, []);

  const { data: coinSettings } = useCreatorCoinSettings(user?.username);

  const toggleMutation = useMutation({
    mutationFn: async (isEnabled: boolean) => {
      if (!user?.username) return;
      const response = await fetch(`/api/creators/${user.username.replace(/^@/, '')}/coin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled }),
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-coin-settings', user?.username] });
    },
  });

  if (!isConnected) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 flex items-center justify-center bg-transparent border-none hover:bg-white/10 active:scale-95 transition-transform">
          <Avatar className="h-10 w-10 border-2 border-primary/40 transition-all hover:border-primary">
            <AvatarImage src={user?.pfpUrl} alt={user?.username || 'User'} />
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              {user?.username?.substring(0, 2).toUpperCase() || <User className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" side="bottom" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.displayName || user?.username}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {address?.substring(0, 6)}...{address?.substring(address.length - 4)}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="flex items-center justify-between px-2 py-2 bg-secondary/10 rounded-md mx-1 my-1">
          <div className="flex items-center space-x-2">
            <Coins className="h-4 w-4 text-primary" />
            <div className="flex flex-col">
              <Label htmlFor="creator-coin" className="text-sm font-bold cursor-pointer">
                Creator Coin
              </Label>
              <span className="text-[10px] text-muted-foreground leading-tight">
                Use for challenge payouts
              </span>
            </div>
          </div>
          <Switch
            id="creator-coin"
            checked={coinSettings?.isEnabled || false}
            onCheckedChange={(checked) => toggleMutation.mutate(checked)}
            disabled={toggleMutation.isPending}
            className="data-[state=checked]:bg-primary"
          />
        </div>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => disconnect()} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
