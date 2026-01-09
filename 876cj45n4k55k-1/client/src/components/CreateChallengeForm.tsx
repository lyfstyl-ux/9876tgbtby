import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateChallenge } from "@/hooks/use-challenges";
import { useCreatorCoins } from "@/hooks/use-creator-coins";
import { insertChallengeSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sword, Users, Send } from "lucide-react";
import { motion } from "framer-motion";
import { useWallet } from "@/hooks/use-wallet";
import { approveToken, createEscrowERC20, parseEscrowCreatedFromReceipt } from "@/lib/eth";
import { useToast } from "@/hooks/use-toast";

// Extend the schema to ensure we coerce the amount and require a name
const formSchema = insertChallengeSchema.extend({
  name: z.string().min(1, "Challenge name is required"),
  amount: z.coerce.number().min(1, "Amount must be at least 1 USDC"),
  settlementToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateChallengeForm() {
  const { mutateAsync, isPending } = useCreateChallenge();
  const { data: creatorCoins, isLoading: coinsLoading } = useCreatorCoins();
  const [activeTab, setActiveTab] = useState("p2p");
  const [token, setToken] = useState<{ address?: string; symbol: string; decimals: number }>(
    { address: import.meta.env.VITE_USDC_ADDRESS as string || '', symbol: 'USDC', decimals: 6 }
  );
  const [settlementToken, setSettlementToken] = useState<string>("");
  const { connect, provider, address } = useWallet();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      challenger: "@me",
      opponent: "",
      name: "",
      amount: 10,
      type: "p2p",
      status: "active",
      settlementToken: "",
    },
  });

  async function onSubmit(data: FormValues) {
    try {
      // scale to minor units based on selected token decimals
      const scaled = BigInt(Math.round(Number(data.amount) * Math.pow(10, token.decimals)));

      // create off-chain challenge record (stores amount as minor units)
      const created = await mutateAsync({ 
        ...data, 
        type: activeTab, 
        amount: Number(scaled),
        settlementToken: settlementToken || undefined,
      });

      // ensure wallet connected
      let signer: any = null;
      if (!address || !provider) {
        try {
          const r = await connect();
          signer = r.provider.getSigner();
        } catch (e) {
          toast({ title: 'Wallet required', description: 'Connect wallet to create escrow', variant: 'destructive' });
          return;
        }
      } else {
        signer = provider!.getSigner();
      }

      const escrowAddress = (import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS as string) || '';
      if (!escrowAddress || !token.address) {
        toast({ title: 'Configuration error', description: 'Escrow or token address not configured', variant: 'destructive' });
        return;
      }

      // approve token transfer
      const approveTx = await approveToken(token.address!, escrowAddress, scaled, signer);
      toast({ title: 'Approval sent', description: `Tx: ${approveTx.hash}` });
      const approveReceipt = await approveTx.wait();

      // create escrow on-chain
      const tx = await createEscrowERC20(escrowAddress, created.id, token.address!, scaled, signer);
      toast({ title: 'Escrow Tx sent', description: `Tx: ${tx.hash}` });
      const receipt = await tx.wait();

      const parsed = parseEscrowCreatedFromReceipt(receipt);
      const escrowId = parsed.escrowId;

      // report escrow to backend
      await fetch(`/api/challenges/${created.id}/escrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: receipt.transactionHash || tx.hash, escrowId: escrowId, tokenAddress: token.address }),
      });

      toast({ title: 'Escrow created', description: 'Your escrow was created on-chain' });
      form.reset();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed', variant: 'destructive' });
      console.error(err);
    }
  }

  return (
    <div className="w-full bg-card border border-border rounded-xl p-4 relative overflow-hidden shadow-sm">
      <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 blur-2xl rounded-full -mr-8 -mt-8" />
      
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-display font-bold flex items-center text-foreground">
          <Send className="w-4 h-4 mr-2 text-secondary" />
          New Challenge
        </h3>
      </div>

      <Tabs defaultValue="p2p" onValueChange={setActiveTab} className="mb-4">
        <TabsList className="grid w-full grid-cols-2 bg-muted p-1 rounded-lg h-9">
          <TabsTrigger value="p2p" className="rounded-md text-xs data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
            <Sword className="w-3.5 h-3.5 mr-1.5" /> P2P Duel
          </TabsTrigger>
          <TabsTrigger value="crowd" className="rounded-md text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="w-3.5 h-3.5 mr-1.5" /> Crowd Bet
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="challenger"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      placeholder="@you" 
                      {...field} 
                      readOnly
                      className="bg-muted border-border focus:border-secondary/50 rounded-lg text-xs h-9 px-3"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="opponent"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      placeholder="@opponent" 
                      {...field} 
                      className="bg-muted border-border focus:border-secondary/50 rounded-lg text-xs h-9 px-3"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder='"50 PUSHUPS IN 2 MINS"'
                      {...field}
                      className="bg-muted border-border focus:border-secondary/50 rounded-lg text-xs h-9 px-3"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex gap-3">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type="number" 
                        placeholder="Amount" 
                        {...field} 
                        className="bg-muted border-border focus:border-secondary/50 rounded-lg text-xs h-9 pr-32 pl-3"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground flex items-center gap-2">
                        <Select onValueChange={(val) => {
                          if (val === 'USDC') setToken({ address: import.meta.env.VITE_USDC_ADDRESS as string || '', symbol: 'USDC', decimals: 6 });
                          if (val === 'USDT') setToken({ address: import.meta.env.VITE_USDT_ADDRESS as string || '', symbol: 'USDT', decimals: 6 });
                        }}>
                          <SelectTrigger className="h-7 w-20 text-xs bg-muted border-border">
                            <SelectValue placeholder={token.symbol} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USDC">USDC</SelectItem>
                            <SelectItem value="USDT">USDT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="pt-1">
            <label className="text-[10px] font-bold text-muted-foreground mb-2 block">
              Settlement Token (Optional Creator Coin)
            </label>
            <Select value={settlementToken || "default"} onValueChange={(val) => {
              const actualVal = val === "default" ? "" : val;
              setSettlementToken(actualVal);
              form.setValue("settlementToken", actualVal);
            }}>
              <SelectTrigger className="h-9 text-xs bg-muted border-border">
                <SelectValue placeholder={coinsLoading ? "Loading coins..." : "USDC (Default)"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">USDC (Default)</SelectItem>
                {coinsLoading ? (
                  <div className="p-2 text-xs text-muted-foreground">Loading...</div>
                ) : creatorCoins && creatorCoins.length > 0 ? (
                  creatorCoins.map((coin) => (
                    <SelectItem key={coin.id} value={coin.contractAddress}>
                      {coin.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-xs text-muted-foreground">No creator coins available</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <Button 
            type="submit" 
            disabled={isPending}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            {isPending ? (
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
              />
            ) : (
              "Deploy Challenge Onchain"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
