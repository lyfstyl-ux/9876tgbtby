import { ProfileDropdown } from "@/components/ProfileDropdown";
import { motion } from "framer-motion";
import { TrendingUp, Trophy, Moon, Sun } from "lucide-react";
import { CreateChallengeForm } from "@/components/CreateChallengeForm";
import { ChallengeCard } from "@/components/ChallengeCard";
import { useChallenges } from "@/hooks/use-challenges";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";

import { AuthSection } from "@/components/AuthSection";

import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownLink, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { Address, Avatar, Name, Identity, EthBalance } from '@coinbase/onchainkit/identity';
import { useAccount } from 'wagmi';

export default function Home() {
  const { isConnected } = useAccount();
  const { data: challenges, isLoading } = useChallenges();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-white/5 px-4 py-4">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <img src="/bantzzlogo.svg" alt="Bant-A-Bro Logo" className="w-10 h-10 drop-shadow-[0_0_8px_rgba(79,209,197,0.3)]" />
            <div>
              <h1 className="text-2xl font-display font-black tracking-tighter italic text-gradient">
                Bant-A-Bro
              </h1>
              <p className="text-xs text-muted-foreground font-medium tracking-wide">
                Tag. Bet. Settle Onchain.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ProfileDropdown />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full w-9 h-9"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        <AuthSection />
        {/* Pool Stats Card */}
        <section>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-card rounded-xl p-4 border border-border relative overflow-hidden shadow-sm"
          >
            <div className="absolute top-0 right-0 p-2 opacity-5">
              <TrendingUp className="w-12 h-12 text-primary" />
            </div>
            
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Live Pool</h2>
              <div className="text-xl font-display font-bold text-foreground">
                $42,069.00 <span className="text-xs text-muted-foreground font-normal">USDC</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="bg-muted rounded-lg px-2 py-1 flex-1 flex items-center justify-between">
                <span className="text-[10px] text-secondary font-bold uppercase">Yes</span>
                <span className="text-sm font-mono text-foreground">15.4k</span>
              </div>
              <div className="bg-muted rounded-lg px-2 py-1 flex-1 flex items-center justify-between">
                <span className="text-[10px] text-accent font-bold uppercase">No</span>
                <span className="text-sm font-mono text-foreground">26.6k</span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Create Challenge */}
        <section>
          <CreateChallengeForm />
        </section>

        {/* Recent Feed */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-bold">Live Feed</h3>
            <span className="text-xs text-secondary animate-pulse">● Live</span>
          </div>
          
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-card/50 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : challenges?.length === 0 ? (
              <div className="text-center py-10 bg-card/30 rounded-2xl border border-dashed border-white/10">
                <Trophy className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground font-medium">No active challenges</p>
                <p className="text-xs text-muted-foreground/60">Be the first to start a beef!</p>
              </div>
            ) : (
              challenges?.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
