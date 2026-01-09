import { Link, useLocation } from "wouter";
import { Compass, Swords, Trophy, Coins, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileDropdown } from "./ProfileDropdown";

export function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Explore", icon: Compass },
    { href: "/challenges", label: "Challenges", icon: Swords },
    { href: "/pool", label: "Pool", icon: Coins },
    { href: "/leaderboard", label: "Rank", icon: Award },
    { href: "/mint", label: "Mint", icon: Trophy },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-safe">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = location === href;
          return (
            <Link key={href} href={href}>
              <div
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-full space-y-1 cursor-pointer transition-all duration-300",
                  isActive 
                    ? "text-secondary scale-110" 
                    : "text-muted-foreground hover:text-foreground active:scale-95"
                )}
              >
                <Icon className={cn("w-6 h-6", isActive && "text-secondary")} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
