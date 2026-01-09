import React from "react";
import { motion } from "framer-motion";
import { Award, TrendingUp, User, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const leaderboardData = [
  { rank: 1, user: "@degen_lord", score: "12,450", winRate: "88%" },
  { rank: 2, user: "@crypto_king", score: "9,820", winRate: "72%" },
  { rank: 3, user: "@base_pro", score: "7,540", winRate: "65%" },
  { rank: 4, user: "@bant_master", score: "5,210", winRate: "61%" },
  { rank: 5, user: "@onchain_god", score: "4,980", winRate: "59%" },
];

export default function Leaderboard() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full w-9 h-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1 text-center pr-9">
            <h1 className="text-2xl font-display font-black tracking-tighter italic text-primary">
              Leaderboard
            </h1>
            <p className="text-xs text-muted-foreground font-medium tracking-wide">
              Top Bant-A-Bros Onchain
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        <section className="space-y-4">
          {leaderboardData.map((item, index) => (
            <motion.div
              key={item.user}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-card border border-border overflow-hidden hover-elevate shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-bold ${
                      index === 0 ? "bg-secondary text-secondary-foreground" :
                      index === 1 ? "bg-primary text-primary-foreground" :
                      index === 2 ? "bg-accent text-accent-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {item.rank}
                    </div>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-border">
                        <AvatarFallback className="bg-muted text-xs">
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-bold text-foreground">{item.user}</div>
                        <div className="text-xs text-muted-foreground">Win Rate: {item.winRate}</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-secondary">{item.score}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Points</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </section>
      </main>
    </div>
  );
}
