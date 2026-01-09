import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Activity } from "lucide-react";

export default function Pool() {
  return (
    <div className="min-h-screen bg-background pb-24 pt-6 px-4">
      <div className="max-w-md mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-display font-black text-foreground mb-2">
            Liquidity Pool
          </h1>
          <p className="text-muted-foreground">Provide liquidity, earn yield from settlement fees.</p>
        </header>

        {/* Main Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-3xl p-8 relative overflow-hidden shadow-sm"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          
          <div className="relative z-10 text-center">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2">Total Value Locked</p>
            <h2 className="text-5xl font-display font-bold text-foreground mb-6">
              $142,069
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted p-4 rounded-2xl">
                <div className="text-secondary font-bold text-lg">+12.4%</div>
                <div className="text-xs text-muted-foreground">APY</div>
              </div>
              <div className="bg-muted p-4 rounded-2xl">
                <div className="text-foreground font-bold text-lg">24h</div>
                <div className="text-xs text-muted-foreground">Lock Period</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Activity Chart Placeholder */}
        <div className="bg-card border border-border rounded-2xl p-6 h-64 flex flex-col items-center justify-center text-center">
          <Activity className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">Pool Activity Chart</p>
          <p className="text-xs text-muted-foreground/50 mt-2">Coming soon in v2</p>
        </div>

        <button className="w-full h-14 bg-primary text-primary-foreground font-display font-bold text-lg rounded-xl shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform">
          Stake USDC
        </button>
      </div>
    </div>
  );
}
