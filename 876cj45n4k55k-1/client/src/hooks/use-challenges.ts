import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type ChallengeInput } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useChallenges() {
  return useQuery({
    queryKey: [api.challenges.list.path],
    queryFn: async () => {
      const res = await fetch(api.challenges.list.path);
      if (!res.ok) throw new Error("Failed to fetch challenges");
      return api.challenges.list.responses[200].parse(await res.json());
    },
  });
}

export function useChallenge(id: number) {
  return useQuery({
    queryKey: [api.challenges.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.challenges.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch challenge");
      return api.challenges.get.responses[200].parse(await res.json());
    },
  });
}

export function useCreateChallenge() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ChallengeInput) => {
      const res = await fetch(api.challenges.create.path, {
        method: api.challenges.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.challenges.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create challenge");
      }
      return api.challenges.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.challenges.list.path] });
      toast({
        title: "Success",
        description: "Challenge deployed on-chain!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
