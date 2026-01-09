import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Zap, Skull, Users } from "lucide-react";
import type { Challenge } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/hooks/use-wallet";
import { useCreatorCoins } from "@/hooks/use-creator-coins";
import { matchEscrowERC20 } from "@/lib/eth";
import { useLocation } from "wouter";

interface ChallengeCardProps {
  challenge: Challenge;
}

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { connect, provider } = useWallet();
  const { data: creatorCoins } = useCreatorCoins();
  const [, setLocation] = useLocation();

  // Get coin name from settlement token address
  const settlementCoinName = challenge.settlementToken 
    ? creatorCoins?.find(c => c.contractAddress.toLowerCase() === challenge.settlementToken?.toLowerCase())?.name
    : null;

  async function doAccept() {
    try {
      if (!challenge.escrowContractId) {
        toast({ title: 'Not ready', description: 'No creator escrow found yet — wait for the creator or indexer to report escrow.', variant: 'destructive' });
        return;
      }

      let signer: any = null;
      try {
        const r = await connect();
        signer = r.provider.getSigner();
      } catch (e) {
        toast({ title: 'Wallet required', description: 'Connect wallet to accept', variant: 'destructive' });
        return;
      }

      const escrowAddress = (import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS as string) || '';
      const tokenAddress = challenge.tokenAddress || (import.meta.env.VITE_USDC_ADDRESS as string) || '';
      if (!tokenAddress || !escrowAddress) {
        toast({ title: 'Config error', description: 'Escrow or token not configured', variant: 'destructive' });
        return;
      }

      // approve then match
      const amount = BigInt(challenge.amount);
      const approveTx = await (await import('@/lib/eth')).approveToken(tokenAddress, escrowAddress, amount, signer);
      toast({ title: 'Approval sent', description: `Tx: ${approveTx.hash}` });
      await approveTx.wait();

      const matchTx = await matchEscrowERC20(escrowAddress, challenge.escrowContractId as number, signer);
      toast({ title: 'Match tx sent', description: `Tx: ${matchTx.hash}` });
      const receipt = await matchTx.wait();

      // report acceptance to backend
      await fetch(`/api/challenges/${challenge.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: receipt.transactionHash || matchTx.hash, escrowId: challenge.escrowContractId, tokenAddress }),
      });

      toast({ title: 'Accepted', description: 'You matched the challenge — good luck!' });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to accept', variant: 'destructive' });
      console.error(err);
    }
  }

  async function doDecline() {
    try {
      const res = await fetch(`/api/challenges/${challenge.id}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'declined by opponent' }),
      });
      if (!res.ok) throw new Error('Failed to decline');
      toast({ title: 'Declined', description: 'You declined the challenge' });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to decline', variant: 'destructive' });
      console.error(err);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-2xl bg-card border border-border p-5 shadow-sm transition-all hover:border-secondary/30"
    >
      <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
          <div>
            <div className="flex gap-2 mb-1">
              <Badge 
                variant="outline" 
                className="bg-muted/50 border-secondary/20 text-secondary font-display uppercase tracking-wider"
              >
                {challenge.type === "p2p" ? "P2P Duel" : "Crowd Bet"}
              </Badge>
              {settlementCoinName && (
                <Badge 
                  variant="outline" 
                  className="bg-amber-50 border-amber-200/50 text-amber-700 font-display uppercase tracking-wider"
                >
                  Settles in ${settlementCoinName}
                </Badge>
              )}
            </div>
            <div className="font-display font-bold text-lg leading-tight">{challenge.name}</div>
          </div>

          <div className="text-right">
            <div className="text-xl font-display font-bold text-primary">
              {challenge.amount} {challenge.currency ?? 'USDC'}
            </div>
            <div className="text-xs text-muted-foreground">{challenge.source ? challenge.source.toUpperCase() : 'WEB'}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2"> 
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {challenge.challenger.charAt(1).toUpperCase()}
              </div>
              <span className="font-medium text-foreground">{challenge.challenger}</span>
            </div>
            <div className="text-muted-foreground font-display text-xs">VS</div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-foreground">{challenge.opponent}</span>
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">
                {challenge.opponent.charAt(1).toUpperCase()}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center text-xs text-muted-foreground">
              {challenge.type === 'p2p' ? <Skull className="w-4 h-4 mr-1" /> : <Users className="w-4 h-4 mr-1" />}
              <span>{challenge.status}</span>
            </div>

            <div className="flex items-center gap-3">
              {challenge.status === 'active' && challenge.opponent ? (
                <div className="flex items-center gap-2">
                  <button
                    className="text-xs font-bold text-secondary bg-secondary/5 px-3 py-1 rounded-md hover:bg-secondary/10"
                    onClick={(e) => {
                      e.preventDefault();
                      setLocation(`/challenges/${challenge.id}`);
                    }}
                  >
                    View Details →
                  </button>
                  <button
                    className="text-xs font-bold text-green-700 bg-green-50 px-3 py-1 rounded-md hover:opacity-90"
                    id={`accept-${challenge.id}`}
                    onClick={(e) => { e.preventDefault(); doAccept(); }}
                  >Accept</button>
                  <button
                    className="text-xs font-bold text-red-700 bg-red-50 px-3 py-1 rounded-md hover:opacity-90"
                    id={`decline-${challenge.id}`}
                    onClick={(e) => { e.preventDefault(); doDecline(); }}
                  >Decline</button>
                </div>
              ) : (
                <button 
                  className="text-xs font-bold text-secondary hover:text-secondary/80 hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation(`/challenges/${challenge.id}`);
                  }}
                >
                  View Details →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
