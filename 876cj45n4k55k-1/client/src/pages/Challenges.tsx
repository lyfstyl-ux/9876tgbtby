import { useChallenges } from "@/hooks/use-challenges";
import { ChallengeCard } from "@/components/ChallengeCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { motion } from "framer-motion";

export default function Challenges() {
  const { data: challenges, isLoading } = useChallenges();

  return (
    <div className="min-h-screen bg-background pb-24 pt-6 px-4">
      <div className="max-w-md mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-display font-black text-primary mb-2">
            Arena
          </h1>
          <p className="text-muted-foreground">Find and settle bets.</p>
        </header>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search @username or tag..." 
            className="pl-9 bg-card border-white/5 rounded-xl h-12 focus:border-secondary/50"
          />
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            challenges?.map((challenge, i) => (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <ChallengeCard challenge={challenge} />
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
