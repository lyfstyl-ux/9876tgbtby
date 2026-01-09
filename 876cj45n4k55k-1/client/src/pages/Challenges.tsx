import { useChallenges } from "@/hooks/use-challenges";
import { useUserSearch } from "@/hooks/use-user-search";
import { ChallengeCard } from "@/components/ChallengeCard";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";

export default function Challenges() {
  const { data: challenges, isLoading } = useChallenges();
  const [searchInput, setSearchInput] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'active'|'pending'|'ended'>('active');
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Extract query for user search (remove @ if present)
  const searchQuery = searchInput.replace("@", "");
  const { data: searchUsers = [], isLoading: isSearching } = useUserSearch(searchQuery);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.trimStart();
    if (val && !val.startsWith("@")) {
      val = "@" + val;
    }
    setSearchInput(val);
    setIsSearchOpen(val.length > 0);
  };

  const handleSelectUser = (username: string) => {
    const withAt = username.startsWith("@") ? username : `@${username}`;
    setSearchInput(withAt);
    setIsSearchOpen(false);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setIsSearchOpen(false);
  };

  // Mock cards for common scenarios (used when API returns no challenges)
  const mockChallenges: any[] = [
    {
      id: 1001,
      challenger: '@crypto_king',
      opponent: '@bear_market',
      name: 'P2P Duel',
      type: 'p2p',
      amount: 50,
      currency: 'USDC',
      status: 'active',
      source: 'WEB',
    },
    {
      id: 1002,
      challenger: '@degen_lord',
      opponent: '@vitalik',
      name: 'Crowd Bet',
      type: 'crowd',
      amount: 100,
      currency: 'USDC',
      status: 'active',
      source: 'WEB',
    },
    {
      id: 1003,
      challenger: '@alice',
      opponent: '@you',
      name: 'Accepted Duel',
      type: 'p2p',
      amount: 25,
      currency: 'USDC',
      status: 'escrowed',
      source: 'WEB',
    },
    {
      id: 1004,
      challenger: '@bob',
      opponent: '@carol',
      name: 'Settled — you won',
      type: 'p2p',
      amount: 10,
      currency: 'USDC',
      status: 'settled',
      source: 'WEB',
      result: 'you_won',
    },
    {
      id: 1005,
      challenger: '@ev',
      opponent: '@frank',
      name: 'Settled — you lost',
      type: 'p2p',
      amount: 20,
      currency: 'USDC',
      status: 'settled',
      source: 'WEB',
      result: 'you_lost',
    },
    {
      id: 1006,
      challenger: '@gamer',
      opponent: null,
      name: 'Open Challenge (pending)',
      type: 'p2p',
      amount: 15,
      currency: 'USDC',
      status: 'pending',
      source: 'WEB',
    },
    {
      id: 1007,
      challenger: '@hype',
      opponent: '@oppo',
      name: 'Escrowed — accepted',
      type: 'p2p',
      amount: 30,
      currency: 'USDC',
      status: 'escrowed',
      source: 'WEB',
    },
  ];

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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input 
            ref={inputRef}
            value={searchInput}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchOpen(searchInput.length > 0)}
            placeholder="Search @username or tag..." 
            className="pl-9 bg-card border-white/5 rounded-xl h-12 focus:border-secondary/50"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          <AnimatePresence>
            {isSearchOpen && searchInput.length > 0 && (
              <motion.div
                ref={searchDropdownRef}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden"
              >
                {isSearching ? (
                  <div className="flex items-center justify-center gap-2 p-3 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Searching...
                  </div>
                ) : searchUsers.length > 0 ? (
                  <ul className="max-h-64 overflow-y-auto">
                    {searchUsers.map((user, idx) => (
                      <li key={`${user.username}-${idx}`}>
                        <button
                          type="button"
                          onClick={() => handleSelectUser(user.username)}
                          className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-xs flex items-center gap-2 border-b border-border/50 last:border-b-0"
                        >
                          {user.pfp && (
                            <img
                              src={user.pfp}
                              alt={user.username}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">@{user.username}</div>
                            {user.displayName && (
                              <div className="text-xs text-muted-foreground truncate">
                                {user.displayName}
                              </div>
                            )}
                          </div>
                          {user.followerCount !== undefined && (
                            <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                              {user.followerCount > 1000
                                ? `${(user.followerCount / 1000).toFixed(1)}k`
                                : user.followerCount}
                            </div>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-3 text-xs text-muted-foreground text-center">
                    No users found
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2 mt-2">
            {([
              ['active', 'Active'],
              ['pending', 'Pending'],
              ['ended', 'Ended'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`text-sm px-3 py-1 rounded-full font-medium ${statusFilter === key ? 'bg-secondary/10 text-secondary' : 'bg-card/30 text-muted-foreground'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            // choose source list then filter by selected status tab for compactness
            ((challenges && challenges.length ? challenges : mockChallenges) || [])
              .filter((c) => {
                const map: Record<string, string[]> = {
                  active: ['active'],
                  pending: ['escrowed', 'pending'],
                  ended: ['settled', 'ended'],
                };
                return map[statusFilter].includes(c.status);
              })
              .filter((c) => {
                // If no search input, show all
                if (!searchInput) return true;
                // Filter by challenger or opponent username
                const searchLower = searchInput.toLowerCase().replace("@", "");
                return (
                  c.challenger?.toLowerCase().includes(searchLower) ||
                  c.opponent?.toLowerCase().includes(searchLower)
                );
              })
              .map((challenge, i) => (
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
