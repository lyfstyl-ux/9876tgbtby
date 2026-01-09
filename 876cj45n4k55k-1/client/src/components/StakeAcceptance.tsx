import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStakeAcceptance, useStakesByChallenge, useMatchesByChallenge } from '@/hooks/use-stakes';
import { useToast } from '@/hooks/use-toast';
import type { Challenge } from '@shared/schema';
import { Zap, Users } from 'lucide-react';

interface StakeAcceptanceProps {
  challenge: Challenge;
  currentUser?: string; // e.g., '@alice'
}

export function StakeAcceptance({ challenge, currentUser }: StakeAcceptanceProps) {
  const { toast } = useToast();
  const { acceptStake, isAccepting, setAccepting } = useStakeAcceptance();
  const { data: stakes } = useStakesByChallenge(challenge.id);
  const { data: matches } = useMatchesByChallenge(challenge.id);
  const [selectedSide, setSelectedSide] = useState<'yes' | 'no' | null>(null);
  const [customAmount, setCustomAmount] = useState<number>(challenge.amount);

  const yesStakes = stakes?.filter(s => s.side === 'yes') || [];
  const noStakes = stakes?.filter(s => s.side === 'no') || [];
  const yesTotal = yesStakes.reduce((sum, s) => sum + s.amount, 0);
  const noTotal = noStakes.reduce((sum, s) => sum + s.amount, 0);

  async function handleAcceptStake(side: 'yes' | 'no') {
    if (!currentUser) {
      toast({
        title: 'Login required',
        description: 'Connect your wallet to place a stake',
        variant: 'destructive',
      });
      return;
    }

    setAccepting(true);
    try {
      // For Phase 3, we'll accept the stake and the auto-matching engine will pair it
      acceptStake({
        challengeId: challenge.id,
        username: currentUser,
        side,
        amount: customAmount,
        // escrowId and txHash would be set after wallet approval
        // For now, the backend will handle storing the stake
      });

      setSelectedSide(null);
      setCustomAmount(challenge.amount);
    } finally {
      setAccepting(false);
    }
  }

  // Calculate pools for display
  const totalStaked = yesTotal + noTotal;
  const yesPercentage = totalStaked > 0 ? (yesTotal / totalStaked) * 100 : 50;
  const noPercentage = totalStaked > 0 ? (noTotal / totalStaked) * 100 : 50;

  return (
    <div className="space-y-4">
      {/* Pools Display */}
      {stakes && stakes.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Current Stakes
          </div>

          <div className="space-y-1">
            {/* YES Pool */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">YES: ₦{yesTotal}</span>
                <Badge variant="outline" className="text-xs">
                  {yesStakes.length} stake{yesStakes.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">{yesPercentage.toFixed(1)}%</span>
            </div>

            {/* YES Pool Bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${yesPercentage}%` }}
              />
            </div>

            {/* NO Pool */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium">NO: ₦{noTotal}</span>
                <Badge variant="outline" className="text-xs">
                  {noStakes.length} stake{noStakes.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">{noPercentage.toFixed(1)}%</span>
            </div>

            {/* NO Pool Bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all"
                style={{ width: `${noPercentage}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Accept Stake Section */}
      <div className="space-y-3 pt-4 border-t border-border">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Place Your Stake
        </div>

        {/* Amount Input */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Amount (₦)</label>
          <input
            type="number"
            value={customAmount}
            onChange={(e) => setCustomAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm"
            min={1}
            placeholder="Enter amount"
          />
        </div>

        {/* YES/NO Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => handleAcceptStake('yes')}
            disabled={isAccepting || customAmount <= 0}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            {isAccepting ? 'Placing...' : `YES (₦${customAmount})`}
          </Button>
          <Button
            onClick={() => handleAcceptStake('no')}
            disabled={isAccepting || customAmount <= 0}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            size="sm"
          >
            {isAccepting ? 'Placing...' : `NO (₦${customAmount})`}
          </Button>
        </div>

        {selectedSide && (
          <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground">
            You're about to stake ₦{customAmount} on {selectedSide.toUpperCase()}
          </div>
        )}
      </div>

      {/* Matched Pairs Display */}
      {matches && matches.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-border">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Matched Pairs ({matches.length})
          </div>
          <div className="space-y-1">
            {matches.map((match) => {
              const yesStake = stakes?.find(s => s.id === match.yesStakeId);
              const noStake = stakes?.find(s => s.id === match.noStakeId);

              return (
                <div
                  key={match.id}
                  className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                      {yesStake?.username} YES
                    </Badge>
                    <span className="text-muted-foreground">vs</span>
                    <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                      {noStake?.username} NO
                    </Badge>
                  </div>
                  <span className="text-muted-foreground">
                    ₦{yesStake?.amount || 0}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
