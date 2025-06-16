
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface FeatureLock {
  id: string;
  feature_name: string;
  description: string;
  category: string;
  is_locked: boolean;
  locked_by?: string;
  locked_at?: string;
  unlocked_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function useFeatureLocks() {
  return useQuery({
    queryKey: ["feature-locks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_locks")
        .select("*")
        .order("category, feature_name");
      
      if (error) throw error;
      return data as FeatureLock[];
    }
  });
}

export function useFeatureLock(featureName: string) {
  return useQuery({
    queryKey: ["feature-lock", featureName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_locks")
        .select("*")
        .eq("feature_name", featureName)
        .maybeSingle();
      
      if (error) throw error;
      return data as FeatureLock | null;
    }
  });
}

export function useToggleFeatureLock() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, isLocked, notes }: { id: string; isLocked: boolean; notes?: string }) => {
      const updateData: any = {
        is_locked: isLocked,
        notes
      };

      if (isLocked) {
        updateData.locked_at = new Date().toISOString();
        updateData.locked_by = "admin"; // À améliorer avec l'utilisateur connecté
        updateData.unlocked_at = null;
      } else {
        updateData.unlocked_at = new Date().toISOString();
        updateData.locked_by = null;
        updateData.locked_at = null;
      }

      const { data, error } = await supabase
        .from("feature_locks")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["feature-locks"] });
      queryClient.invalidateQueries({ queryKey: ["feature-lock", data.feature_name] });
      toast({
        title: "Statut mis à jour",
        description: `La fonctionnalité "${data.feature_name}" a été ${data.is_locked ? 'verrouillée' : 'déverrouillée'}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut de verrouillage.",
        variant: "destructive",
      });
    }
  });
}

// Hook pour vérifier si une fonctionnalité est verrouillée
export function useIsFeatureLocked(featureName: string) {
  const { data: featureLock } = useFeatureLock(featureName);
  return featureLock?.is_locked || false;
}
