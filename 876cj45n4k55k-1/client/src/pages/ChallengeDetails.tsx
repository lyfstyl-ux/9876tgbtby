import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Challenge } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function ChallengeDetails() {
  const [, params] = useRoute("/challenges/:id");
  const id = params?.id;

  const { data: challenge, isLoading } = useQuery<Challenge>({
    queryKey: [`/api/challenges/${id}`],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="max-w-md mx-auto p-4 text-center space-y-4">
        <h2 className="text-xl font-bold">Challenge not found</h2>
        <Link href="/">
          <a className="text-primary hover:underline">Go back home</a>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-24 space-y-6">
      <Link href="/">
        <button className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Explore
        </button>
      </Link>

      <div className="bg-card border border-border rounded-3xl p-6 shadow-lg space-y-6">
        <div className="space-y-2">
          <Badge variant="outline" className="bg-secondary/10 text-secondary uppercase tracking-widest text-[10px]">
            {challenge.type === 'p2p' ? 'P2P Duel' : 'Crowd Bet'}
          </Badge>
          <h1 className="text-2xl font-display font-black tracking-tighter italic">
            {challenge.name || 'Unnamed Challenge'}
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-2xl p-4 flex flex-col items-center justify-center space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Amount</span>
            <span className="text-xl font-display font-bold text-primary">{challenge.amount} {challenge.currency}</span>
          </div>
          <div className="bg-muted/50 rounded-2xl p-4 flex flex-col items-center justify-center space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Status</span>
            <span className="text-sm font-bold uppercase text-secondary">{challenge.status}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-xl font-black text-primary border-2 border-primary/10">
                {challenge.challenger.charAt(1).toUpperCase()}
              </div>
              <span className="text-xs font-bold">{challenge.challenger}</span>
            </div>
            <div className="text-muted-foreground font-display font-black italic text-lg opacity-20">VS</div>
            <div className="flex flex-col items-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-xl font-black text-accent border-2 border-accent/10">
                {challenge.opponent.charAt(1).toUpperCase()}
              </div>
              <span className="text-xs font-bold">{challenge.opponent}</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Source</span>
            <span className="font-bold uppercase tracking-tighter italic">{challenge.source || 'Web'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Created</span>
            <span className="font-mono text-[10px]">{challenge.createdAt ? new Date(challenge.createdAt).toLocaleDateString() : 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
