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

import { MiniAppReady } from "@/components/MiniAppReady";
import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

function App() {
  useNotifications();

  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <ThemeProvider>
      <TooltipProvider>
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-secondary selection:text-secondary-foreground">
          <MiniAppReady />
          <Router />
          <Navigation />
          <Toaster />
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
