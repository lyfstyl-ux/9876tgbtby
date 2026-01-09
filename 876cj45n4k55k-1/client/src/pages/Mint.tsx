import { motion } from "framer-motion";
import { Trophy, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Mint() {
  const { toast } = useToast();

  const handleMint = () => {
    toast({
      title: "Minting Initiated",
      description: "Check your wallet to confirm the transaction.",
      duration: 3000,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24 pt-6 px-4">
      <div className="max-w-md mx-auto h-full flex flex-col items-center justify-center space-y-8 text-center mt-10">
        
        <motion.div
          animate={{ 
            rotate: [0, 5, -5, 0],
            y: [0, -10, 0]
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative w-48 h-48 bg-primary rounded-3xl shadow-lg flex items-center justify-center border-4 border-white/10"
        >
          <Trophy className="w-24 h-24 text-primary-foreground drop-shadow-md" />
          
          <div className="absolute -top-4 -right-4 bg-secondary text-secondary-foreground font-bold px-3 py-1 rounded-full text-xs shadow-lg transform rotate-12">
            WINNER
          </div>
        </motion.div>

        <div className="space-y-4">
          <h1 className="text-4xl font-display font-black uppercase italic text-foreground">
            Brag NFT
          </h1>
          <p className="text-muted-foreground max-w-xs mx-auto">
            Won a bet? Mint a permanent proof of your victory on-chain. Show them who's boss.
          </p>
        </div>

        <div className="w-full bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-secondary/10 p-2 rounded-lg">
              <Star className="w-5 h-5 text-secondary" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-foreground">Season 1 Winner</div>
              <div className="text-xs text-muted-foreground">Rare Edition</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-foreground">0.00 ETH</div>
            <div className="text-xs text-green-500 font-medium">Free Mint</div>
          </div>
        </div>

        <Button 
          onClick={handleMint}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold text-xl rounded-xl shadow-md"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Mint Now
        </Button>
      </div>
    </div>
  );
}
