import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/Navigation";
import { ThemeProvider } from "@/components/ThemeProvider";

import Home from "@/pages/Home";
import Challenges from "@/pages/Challenges";
import Pool from "@/pages/Pool";
import Mint from "@/pages/Mint";
import Leaderboard from "@/pages/Leaderboard";
import ChallengeDetails from "@/pages/ChallengeDetails";
import NotFound from "@/pages/not-found";
import { useNotifications } from "@/hooks/use-notifications";
import { useFarcasterContext } from "@/hooks/use-farcaster-context";
import { MiniAppReady } from "@/components/MiniAppReady";
import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/challenges" component={Challenges} />
      <Route path="/challenges/:id" component={ChallengeDetails} />
      <Route path="/pool" component={Pool} />
      <Route path="/mint" component={Mint} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isReady, setIsReady] = useState(false);
  const { isLoading: isContextLoading, client } = useFarcasterContext();
  useNotifications();

  useEffect(() => {
    // Wait for context to load, then signal app ready to hide splash screen
    if (!isContextLoading) {
      // Small delay to ensure UI is fully rendered
      const timer = setTimeout(() => {
        sdk.actions.ready().catch(console.error);
        setIsReady(true);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isContextLoading]);

  // Calculate safe area insets for mobile
  const safeAreaStyle = client?.safeAreaInsets ? {
    paddingTop: `${client.safeAreaInsets.top}px`,
    paddingBottom: `${client.safeAreaInsets.bottom}px`,
    paddingLeft: `${client.safeAreaInsets.left}px`,
    paddingRight: `${client.safeAreaInsets.right}px`,
  } : {};

  return (
    <ThemeProvider>
      <TooltipProvider>
        <div 
          className="min-h-screen bg-background text-foreground font-sans selection:bg-secondary selection:text-secondary-foreground"
          style={safeAreaStyle}
        >
          <MiniAppReady />
          {isReady && (
            <>
              <Router />
              <Navigation />
            </>
          )}
          <Toaster />
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
